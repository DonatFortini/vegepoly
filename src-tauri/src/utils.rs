use csv::ReaderBuilder;
use geo::Geometry;
use geo::Polygon;
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::fs::File;
use std::io::BufWriter;
use std::io::Write;
use tauri::Emitter;

use tauri::{AppHandle, State};
use wkt::Wkt;

use crate::models::processing::VegetationProcessingState;
use crate::models::settings::Settings;
use crate::models::vegetations::VegetationParams;
use crate::sampling::fill_polygon;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SimplePoint {
    pub x: f64,
    pub y: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SimplePolygon {
    pub exterior: Vec<SimplePoint>,
    pub interiors: Vec<Vec<SimplePoint>>,
}

#[tauri::command]
pub fn parse_csv_file(file_path: &str) -> Result<Vec<Polygon<f64>>, String> {
    let mut reader = ReaderBuilder::new()
        .delimiter(b'\t')
        .has_headers(true)
        .from_path(file_path)
        .map_err(|e| format!("Failed to open file: {}", e))?;
    let mut polygons = Vec::new();

    for result in reader.records() {
        let record = result.map_err(|e| format!("CSV read error: {}", e))?;
        if let Some(geometry_field) = record.get(0) {
            let wkt: Wkt<f64> = geometry_field
                .parse()
                .map_err(|_| format!("Invalid WKT format: {}", geometry_field))?;
            let geometry: Geometry<f64> = wkt
                .try_into()
                .map_err(|_| format!("Cannot convert WKT to geo geometry: {}", geometry_field))?;
            if let Geometry::Polygon(polygon) = geometry {
                polygons.push(polygon);
            } else {
                return Err(format!("WKT is not a Polygon: {}", geometry_field));
            }
        } else {
            return Err("Missing geometry field in record".to_string());
        }
    }
    Ok(polygons)
}

#[tauri::command]
pub fn get_preview_data(
    file_path: &str,
    param: VegetationParams,
) -> Result<(SimplePolygon, Vec<SimplePoint>), String> {
    let polygons = parse_csv_file(file_path)?;

    if polygons.is_empty() {
        return Err("No polygons found in file".to_string());
    }

    let first_polygon = &polygons[0];

    let exterior: Vec<SimplePoint> = first_polygon
        .exterior()
        .coords()
        .map(|coord| SimplePoint {
            x: coord.x,
            y: coord.y,
        })
        .collect();

    let interiors: Vec<Vec<SimplePoint>> = first_polygon
        .interiors()
        .iter()
        .map(|interior| {
            interior
                .coords()
                .map(|coord| SimplePoint {
                    x: coord.x,
                    y: coord.y,
                })
                .collect()
        })
        .collect();

    let simple_polygon = SimplePolygon {
        exterior,
        interiors,
    };

    let point_strings = fill_polygon(first_polygon.clone(), param)?;
    let preview_points: Vec<SimplePoint> = point_strings
        .iter()
        .filter_map(|point_str| {
            let parts: Vec<&str> = point_str.trim().split('\t').collect();
            if parts.len() >= 2 {
                if let (Ok(x), Ok(y)) = (
                    parts[0].trim().parse::<f64>(),
                    parts[1].trim().parse::<f64>(),
                ) {
                    return Some(SimplePoint { x, y });
                }
            }
            None
        })
        .collect();

    Ok((simple_polygon, preview_points))
}

/// Écrit l'en-tête dans le fichier de sortie.
///
/// # Arguments
/// * `writer` - Writer pour écrire dans le fichier
///
/// # Retours
/// Ok(()) en cas de succès ou une erreur
pub fn write_header(writer: &mut BufWriter<File>) -> Result<(), Box<dyn Error>> {
    writer.write_all(b"X\tY\tNom\tNUMERO_DEPARTEMENT\tCODE_BASS\tCODE_INSEE\tIDIndexDATA\tCLEGCES\tNOM_PLAN_DEPLOIEMENT\tCODE_REGION\tCODE_INSEE_SGA\tchamp_graphe\tlongueur_specifique\tvitesse_specifique\tNUMERO_INSEE\tGROUPEMENT\tNOM_ZONE_OP\tSECTEUR_SINISTRE\tOBSERVATIONS\tDFCI_ID_MOT\tAUTRE_APPELATION\tAUTRE_APPELATION_1\tAUTRE_APPELATION_2\tAUTRE_APPELATION_3\tTYPE_AUTRE_APPELATION\tTYPE_AUTRE_APPELATION_1\tTYPE_AUTRE_APPELATION_2\tTYPE_AUTRE_APPELATION_3\tADRESSE\tLongueur specifique\tVitesse specifique\tIdZoneGeo\tz\ttype\tID\n")?;
    Ok(())
}

#[tauri::command]
pub fn export_results(
    data: Vec<Polygon<f64>>,
    param: VegetationParams,
    state: State<'_, VegetationProcessingState>,
    app_handle: AppHandle,
) {
    let state_arc = std::sync::Arc::new((*state.inner()).clone());
    let param = param.clone();
    let handle = app_handle.clone();

    std::thread::spawn(
        move || match run_export(data, param, state_arc, handle.clone()) {
            Ok(filename) => {
                let _ = handle.emit("vegetation-export-finished", &filename);
            }
            Err(err_msg) => {
                eprintln!("Export failed: {}", err_msg);
                let _ = handle.emit("vegetation-export-error", &err_msg);
            }
        },
    );
}

fn run_export(
    data: Vec<Polygon<f64>>,
    param: VegetationParams,
    state: std::sync::Arc<VegetationProcessingState>,
    app_handle: AppHandle,
) -> Result<String, String> {
    state.initialize(data.len(), &app_handle);

    let now = chrono::Local::now();
    let output_filename = format!("Export {}.txt", now.format("%d-%m-%Y %Hh%M-%S"));
    let export_path = Settings::with_read(|s| s.export_path.clone());

    let mut writer = std::io::BufWriter::new(
        std::fs::File::create(export_path.join(&output_filename))
            .map_err(|e| format!("Failed to create file: {}", e))?,
    );

    write_header(&mut writer).map_err(|e| format!("Failed to write header: {}", e))?;
    let cloned_param = param.clone();

    let mut total_created_items = 0;

    for (index, polygon) in data.iter().enumerate() {
        let polygon_points = fill_polygon(polygon.clone(), cloned_param.clone());
        match polygon_points {
            Ok(points) => {
                let points_len = points.len();
                for point in points {
                    writer
                        .write_all(point.as_bytes())
                        .map_err(|e| format!("Failed to write to file: {}", e))?;
                }
                total_created_items += points_len;
                state.update_created_items(total_created_items, &app_handle);
            }
            Err(e) => {
                let error_msg = format!("Error filling polygon {}: {}", index + 1, e);
                state.add_error(error_msg, &app_handle);
            }
        }

        state.update_processed_rows(index + 1, &app_handle);
    }

    state.set_finished(&app_handle);

    writer
        .flush()
        .map_err(|e| format!("Failed to flush writer: {}", e))?;

    Ok(output_filename)
}
