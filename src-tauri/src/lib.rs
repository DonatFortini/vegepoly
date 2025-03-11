use chrono::Local;
use geo::{Contains, Point, Polygon};
use geo_types::Coord;
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::fs::File;
use std::io::{BufReader, BufWriter, Write};
use std::sync::Mutex;
use tauri::State;

struct VegetationProcessingState {
    processed_rows: Mutex<usize>,
    total_rows: Mutex<usize>,
    errors: Mutex<Vec<String>>,
    created_items: Mutex<usize>,
}

#[derive(Serialize, Deserialize, Clone)]
struct VegetationParams {
    vegetation_type: u8,
    density: f64,
    variation: f64,
    type_value: u8,
}

#[derive(Serialize, Clone)]
struct VegetationProgressInfo {
    current_row: usize,
    total_rows: usize,
    created_items: usize,
    errors: Vec<String>,
}

struct SpatialDistributionSampler {
    min_distance: f64,
    max_attempts: usize,
    cell_size: f64,
    grid_width: usize,
    grid_height: usize,
    grid: Vec<Option<usize>>,
    points: Vec<Point<f64>>,
    active_indices: Vec<usize>,
    bounds: (f64, f64, f64, f64),
}

impl SpatialDistributionSampler {
    fn new(min_distance: f64, bounds: (f64, f64, f64, f64)) -> Self {
        let (min_x, min_y, max_x, max_y) = bounds;
        let width = max_x - min_x;
        let height = max_y - min_y;

        let cell_size = min_distance / std::f64::consts::SQRT_2;

        let grid_width = (width / cell_size).ceil() as usize + 1;
        let grid_height = (height / cell_size).ceil() as usize + 1;

        SpatialDistributionSampler {
            min_distance,
            max_attempts: 30,
            cell_size,
            grid_width,
            grid_height,
            grid: vec![None; grid_width * grid_height],
            points: Vec::new(),
            active_indices: Vec::new(),
            bounds,
        }
    }

    fn generate_distribution(&mut self, polygon: &Polygon<f64>) -> Vec<Point<f64>> {
        let mut rng = rand::thread_rng();
        let (min_x, min_y, max_x, max_y) = self.bounds;

        for _ in 0..100 {
            let x = min_x + rng.gen::<f64>() * (max_x - min_x);
            let y = min_y + rng.gen::<f64>() * (max_y - min_y);
            let point = Point::new(x, y);

            if polygon.contains(&point) {
                self.add_point(point);
                break;
            }
        }

        if self.active_indices.is_empty() {
            return Vec::new();
        }

        while !self.active_indices.is_empty() {
            let idx = rng.gen_range(0..self.active_indices.len());
            let active_idx = self.active_indices[idx];
            let active_point = self.points[active_idx];

            let mut found_new_point = false;

            for _ in 0..self.max_attempts {
                let angle = 2.0 * std::f64::consts::PI * rng.gen::<f64>();
                let radius = self.min_distance + self.min_distance * rng.gen::<f64>();

                let new_x = active_point.x() + radius * angle.cos();
                let new_y = active_point.y() + radius * angle.sin();

                if new_x < min_x || new_x >= max_x || new_y < min_y || new_y >= max_y {
                    continue;
                }

                let new_point = Point::new(new_x, new_y);

                if polygon.contains(&new_point) && self.is_point_valid(&new_point) {
                    self.add_point(new_point);
                    found_new_point = true;
                    break;
                }
            }

            if !found_new_point {
                self.active_indices.swap_remove(idx);
            }
        }

        self.points.clone()
    }

    fn add_point(&mut self, point: Point<f64>) {
        let idx = self.points.len();
        self.points.push(point);

        self.active_indices.push(idx);

        let (min_x, min_y, _, _) = self.bounds;
        let grid_x = ((point.x() - min_x) / self.cell_size) as usize;
        let grid_y = ((point.y() - min_y) / self.cell_size) as usize;

        if grid_x < self.grid_width && grid_y < self.grid_height {
            let grid_idx = grid_y * self.grid_width + grid_x;
            if grid_idx < self.grid.len() {
                self.grid[grid_idx] = Some(idx);
            }
        }
    }

    fn is_point_valid(&self, point: &Point<f64>) -> bool {
        let (min_x, min_y, _, _) = self.bounds;
        let grid_x = ((point.x() - min_x) / self.cell_size) as usize;
        let grid_y = ((point.y() - min_y) / self.cell_size) as usize;

        let start_x = if grid_x > 1 { grid_x - 1 } else { 0 };
        let start_y = if grid_y > 1 { grid_y - 1 } else { 0 };
        let end_x = (grid_x + 1).min(self.grid_width - 1);
        let end_y = (grid_y + 1).min(self.grid_height - 1);

        for y in start_y..=end_y {
            for x in start_x..=end_x {
                let idx = y * self.grid_width + x;
                if idx < self.grid.len() {
                    if let Some(point_idx) = self.grid[idx] {
                        let other = &self.points[point_idx];
                        let dx = point.x() - other.x();
                        let dy = point.y() - other.y();
                        let dist_sq = dx * dx + dy * dy;

                        if dist_sq < self.min_distance * self.min_distance {
                            return false;
                        }
                    }
                }
            }
        }

        true
    }
}

#[tauri::command]
async fn generate_vegetation_from_csv(
    csv_path: String,
    params: VegetationParams,
    state: State<'_, VegetationProcessingState>,
) -> Result<String, String> {
    *state.processed_rows.lock().unwrap() = 0;
    *state.created_items.lock().unwrap() = 0;
    state.errors.lock().unwrap().clear();

    let total_rows = match count_file_rows(&csv_path) {
        Ok(count) => count,
        Err(e) => return Err(format!("Error counting rows: {}", e)),
    };
    *state.total_rows.lock().unwrap() = total_rows;

    let now = Local::now();
    let output_filename = format!("Export {}.txt", now.format("%d-%m-%Y %Hh%M-%S"));

    match process_vegetation_data(&csv_path, &output_filename, params, state) {
        Ok(_) => Ok(output_filename),
        Err(e) => Err(format!("Error processing file: {}", e)),
    }
}

#[tauri::command]
fn get_vegetation_progress(state: State<'_, VegetationProcessingState>) -> VegetationProgressInfo {
    VegetationProgressInfo {
        current_row: *state.processed_rows.lock().unwrap(),
        total_rows: *state.total_rows.lock().unwrap(),
        created_items: *state.created_items.lock().unwrap(),
        errors: state.errors.lock().unwrap().clone(),
    }
}

fn count_file_rows(file_path: &str) -> Result<usize, Box<dyn Error>> {
    let file = File::open(file_path)?;
    let mut content = Vec::new();
    let mut reader = BufReader::new(file);
    std::io::Read::read_to_end(&mut reader, &mut content)?;
    let content_str = String::from_utf8_lossy(&content).into_owned();
    let lines: Vec<&str> = content_str.split('\n').collect();
    let count = if lines.len() > 1 { lines.len() - 1 } else { 0 };
    Ok(count)
}

fn process_vegetation_data(
    input_path: &str,
    output_path: &str,
    params: VegetationParams,
    state: State<'_, VegetationProcessingState>,
) -> Result<(), Box<dyn Error>> {
    let file = File::open(input_path)?;
    let mut content = Vec::new();
    let mut reader = BufReader::new(file);
    std::io::Read::read_to_end(&mut reader, &mut content)?;
    let cleaned_content = String::from_utf8_lossy(&content).into_owned();

    let output_file = File::create(output_path)?;
    let mut writer = BufWriter::new(output_file);
    write_header(&mut writer)?;

    let lines: Vec<&str> = cleaned_content.split('\n').collect();
    let mut row_index = 0;

    for (line_idx, line) in lines.iter().enumerate().skip(1) {
        if line.trim().is_empty() {
            continue;
        }

        if line.contains("POLYGON") || line.contains("MULTIPOLYGON") {
            match distribute_points_in_polygon(line, row_index, &params, &state) {
                Ok(points) => {
                    for point in points.clone() {
                        writer.write_all(point.as_bytes())?;
                    }
                    writer.flush()?;

                    let mut created_items = state.created_items.lock().unwrap();
                    *created_items += points.len();

                    let vegetation_type_name = match params.vegetation_type {
                        1 => "Trees",
                        2 => "Surfaces",
                        3 => "Roccailles",
                        _ => "Items",
                    };

                    println!(
                        "Row [{}/{}] {} points of {} generated using spatial distribution algorithm",
                        row_index + 1,
                        *state.total_rows.lock().unwrap(),
                        points.len(),
                        vegetation_type_name
                    );
                }
                Err(e) => {
                    state
                        .errors
                        .lock()
                        .unwrap()
                        .push(format!("Error at row {}: {}", row_index, e));
                }
            }
        } else {
            state
                .errors
                .lock()
                .unwrap()
                .push(format!("No polygon data in line {}", line_idx));
        }

        row_index += 1;
        *state.processed_rows.lock().unwrap() = row_index;
    }

    Ok(())
}

fn write_header(writer: &mut BufWriter<File>) -> Result<(), Box<dyn Error>> {
    writer.write_all(b"X\tY\tNom\tNUMERO_DEPARTEMENT\tCODE_BASS\tCODE_INSEE\tIDIndexDATA\tCLEGCES\tNOM_PLAN_DEPLOIEMENT\tCODE_REGION\tCODE_INSEE_SGA\tchamp_graphe\tlongueur_specifique\tvitesse_specifique\tNUMERO_INSEE\tGROUPEMENT\tNOM_ZONE_OP\tSECTEUR_SINISTRE\tOBSERVATIONS\tDFCI_ID_MOT\tAUTRE_APPELATION\tAUTRE_APPELATION_1\tAUTRE_APPELATION_2\tAUTRE_APPELATION_3\tTYPE_AUTRE_APPELATION\tTYPE_AUTRE_APPELATION_1\tTYPE_AUTRE_APPELATION_2\tTYPE_AUTRE_APPELATION_3\tADRESSE\tLongueur specifique\tVitesse specifique\tIdZoneGeo\tz\ttype\tID\n")?;
    Ok(())
}

fn distribute_points_in_polygon(
    polygon_str: &str,
    row_index: usize,
    params: &VegetationParams,
    _state: &State<'_, VegetationProcessingState>,
) -> Result<Vec<String>, Box<dyn Error>> {
    let mut points = Vec::new();
    let mut rng = rand::thread_rng();

    if !polygon_str.contains("POLYGON((") && !polygon_str.contains("MULTIPOLYGON((") {
        return Err(format!("Impossible : Problème(3) Ligne : {}", row_index).into());
    }
    if polygon_str.contains("MULTIPOLYGON") {
        return Err(format!("Impossible : MULTIPOLYGON Ligne : {}", row_index).into());
    }

    let modified_str = transform_polygon_string(polygon_str);
    let maybe_polygon = extract_polygon_from_string(&modified_str);
    let polygon = match maybe_polygon {
        Some(p) => p,
        None => parse_polygon_wkt(polygon_str)?,
    };

    let bounds = calculate_polygon_bounds(&polygon);

    let mut sampler = SpatialDistributionSampler::new(params.density, bounds);
    let sampled_points = sampler.generate_distribution(&polygon);

    println!(
        "Generated {} points using spatial distribution algorithm",
        sampled_points.len()
    );

    for point in sampled_points {
        let (x_variation, y_variation) = if params.variation > 0.0 {
            let angle = rng.gen::<f64>() * 2.0 * std::f64::consts::PI;
            let distance = rng.gen::<f64>() * params.variation;
            (distance * angle.cos(), distance * angle.sin())
        } else {
            (0.0, 0.0)
        };

        let x_final = point.x() + x_variation;
        let y_final = point.y() + y_variation;

        let type_code = params.type_value;

        let end_row = format!("									20				20096																		0	{}	", type_code);
        let point_str = format!("       {}\t       {}{}\n", x_final, y_final, end_row);
        points.push(point_str);
    }

    Ok(points)
}

fn transform_polygon_string(polygon_str: &str) -> String {
    let mut result = polygon_str.to_string();
    if result.contains("POLYGON((") {
        result = result.replace("POLYGON((", "Polygon([(");
    }
    if result.contains("MULTIPOLYGON((") {
        result = result.replace("MULTIPOLYGON((", "Polygon([(");
    }
    result = result.replace("))", ")])");
    result = result.replace("))", ")])");
    result = result.replace(",", "),(");
    result = result.replace(" ", ",");
    if let Some(idx) = result.find(")])") {
        if let Some(rest) = result[idx + 3..].find(")])") {
            result = result[0..idx + 3 + rest + 3].to_string();
        }
    }
    result
}

fn extract_polygon_from_string(str: &str) -> Option<Polygon<f64>> {
    if !str.contains("Polygon([(") {
        return None;
    }
    let start_idx = str.find("Polygon([(").unwrap_or(0) + "Polygon([(".len();
    let end_idx = str.rfind(")])").unwrap_or(str.len());
    if start_idx >= end_idx {
        return None;
    }
    let inner = &str[start_idx..end_idx];
    let coord_pairs: Vec<&str> = inner.split("),(").collect();
    let mut coords = Vec::new();
    for pair in coord_pairs {
        let parts: Vec<&str> = pair.split(',').collect();
        if parts.len() == 2 {
            match (
                parts[0].trim().parse::<f64>(),
                parts[1].trim().parse::<f64>(),
            ) {
                (Ok(x), Ok(y)) => coords.push(Coord { x, y }),
                _ => return None,
            }
        } else {
            return None;
        }
    }
    if coords.is_empty() {
        return None;
    }
    if coords.len() > 1 && coords[0] != *coords.last().unwrap() {
        coords.push(coords[0]);
    }
    Some(Polygon::new(coords.into(), vec![]))
}

fn parse_polygon_wkt(polygon_str: &str) -> Result<Polygon<f64>, Box<dyn Error>> {
    let mut cleaned = polygon_str.to_string();
    if !cleaned.contains("POLYGON((") && !cleaned.contains("MULTIPOLYGON((") {
        return Err("Invalid format".into());
    }
    if cleaned.contains("POLYGON((") {
        cleaned = cleaned.replace("POLYGON((", "");
    } else if cleaned.contains("MULTIPOLYGON((") {
        cleaned = cleaned.replace("MULTIPOLYGON((", "");
    }
    cleaned = cleaned.replace("))", "");
    let coords_str: Vec<&str> = cleaned.split(',').collect();
    let mut coords: Vec<Coord<f64>> = Vec::new();
    for coord_pair in coords_str {
        let parts: Vec<&str> = coord_pair.split_whitespace().collect();
        if parts.len() == 2 {
            match (parts[0].parse::<f64>(), parts[1].parse::<f64>()) {
                (Ok(x), Ok(y)) => coords.push(Coord { x, y }),
                _ => println!("Warning: Could not parse coordinates from: {}", coord_pair),
            }
        } else {
            println!("Warning: Invalid coordinate pair format: {}", coord_pair);
        }
    }
    if coords.is_empty() {
        return Err("Empty polygon".into());
    }
    if coords.len() > 1 && coords[0] != *coords.last().unwrap() {
        coords.push(coords[0]);
    }
    Ok(Polygon::new(coords.into(), vec![]))
}

fn calculate_polygon_bounds(polygon: &Polygon<f64>) -> (f64, f64, f64, f64) {
    let exterior = polygon.exterior();
    let coords = exterior.coords();
    let mut min_x = f64::MAX;
    let mut min_y = f64::MAX;
    let mut max_x = f64::MIN;
    let mut max_y = f64::MIN;
    for coord in coords {
        min_x = min_x.min(coord.x);
        min_y = min_y.min(coord.y);
        max_x = max_x.max(coord.x);
        max_y = max_y.max(coord.y);
    }
    (min_x, min_y, max_x, max_y)
}

#[tauri::command]
fn get_default_vegetation_params(vegetation_type: u8) -> VegetationParams {
    match vegetation_type {
        1 => VegetationParams {
            vegetation_type: 1,
            density: 7.0,
            variation: 1.0,
            type_value: 10,
        },
        2 => VegetationParams {
            vegetation_type: 2,
            density: 5.0,
            variation: 0.5,
            type_value: 20,
        },
        3 => VegetationParams {
            vegetation_type: 3,
            density: 3.0,
            variation: 0.3,
            type_value: 30,
        },
        _ => VegetationParams {
            vegetation_type: 1,
            density: 7.0,
            variation: 1.0,
            type_value: 10,
        },
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let vegetation_state = VegetationProcessingState {
        processed_rows: Mutex::new(0),
        total_rows: Mutex::new(0),
        created_items: Mutex::new(0),
        errors: Mutex::new(Vec::new()),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(vegetation_state)
        .invoke_handler(tauri::generate_handler![
            generate_vegetation_from_csv,
            get_vegetation_progress,
            get_default_vegetation_params
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
