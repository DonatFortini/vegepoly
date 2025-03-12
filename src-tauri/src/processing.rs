/// Module de traitement des données de végétation.
/// Contient les fonctions pour traiter les fichiers CSV et générer la végétation.
use chrono::Local;
use geo::Point;
use rand::Rng;
use std::error::Error;
use std::fs::File;
use std::io::{BufReader, BufWriter, Write};
use tauri::State;

use crate::models::{
    PolygonData, VegetationParams, VegetationProcessingState, VegetationProgressInfo,
};
use crate::sampling::SpatialDistributionSampler;
use crate::utils::{
    calculate_polygon_bounds, count_file_rows, extract_polygon_from_string, parse_polygon_wkt,
    transform_polygon_string, write_header,
};

/// Commande Tauri pour générer de la végétation à partir d'un fichier CSV.
/// Traite un fichier CSV contenant des polygones et génère des points de végétation.
///
/// # Arguments
/// * `csv_path` - Chemin du fichier CSV contenant les polygones
/// * `params` - Paramètres de génération de végétation
/// * `state` - État partagé pour suivre la progression
///
/// # Retours
/// Le nom du fichier de sortie ou une erreur
#[tauri::command]
pub async fn generate_vegetation_from_csv(
    csv_path: String,
    params: VegetationParams,
    state: State<'_, VegetationProcessingState>,
) -> Result<String, String> {
    // Réinitialise l'état du traitement
    *state.processed_rows.lock().unwrap() = 0;
    *state.created_items.lock().unwrap() = 0;
    state.errors.lock().unwrap().clear();

    // Compte le nombre total de lignes dans le fichier
    let total_rows = match count_file_rows(&csv_path) {
        Ok(count) => count,
        Err(e) => return Err(format!("Error counting rows: {}", e)),
    };
    *state.total_rows.lock().unwrap() = total_rows;

    // Génère un nom de fichier avec horodatage
    let now = Local::now();
    let output_filename = format!("Export {}.txt", now.format("%d-%m-%Y %Hh%M-%S"));

    // Traite les données et génère la végétation
    match process_vegetation_data(&csv_path, &output_filename, params, state) {
        Ok(_) => Ok(output_filename),
        Err(e) => Err(format!("Error processing file: {}", e)),
    }
}

/// Commande Tauri pour obtenir l'état de progression du traitement.
///
/// # Arguments
/// * `state` - État partagé contenant les informations de progression
///
/// # Retours
/// Informations sur la progression du traitement
#[tauri::command]
pub fn get_vegetation_progress(
    state: State<'_, VegetationProcessingState>,
) -> VegetationProgressInfo {
    VegetationProgressInfo {
        current_row: *state.processed_rows.lock().unwrap(),
        total_rows: *state.total_rows.lock().unwrap(),
        created_items: *state.created_items.lock().unwrap(),
        errors: state.errors.lock().unwrap().clone(),
    }
}

/// Traite les données de végétation à partir d'un fichier CSV et génère des points.
///
/// # Arguments
/// * `input_path` - Chemin du fichier d'entrée CSV
/// * `output_path` - Chemin du fichier de sortie
/// * `params` - Paramètres de génération
/// * `state` - État du traitement pour suivre la progression
///
/// # Retours
/// Ok(()) en cas de succès ou une erreur
pub fn process_vegetation_data(
    input_path: &str,
    output_path: &str,
    params: VegetationParams,
    state: State<'_, VegetationProcessingState>,
) -> Result<(), Box<dyn Error>> {
    // Ouvre et lit le fichier d'entrée
    let file = File::open(input_path)?;
    let mut content = Vec::new();
    let mut reader = BufReader::new(file);
    std::io::Read::read_to_end(&mut reader, &mut content)?;
    let cleaned_content = String::from_utf8_lossy(&content).into_owned();

    // Prépare le fichier de sortie
    let output_file = File::create(output_path)?;
    let mut writer = BufWriter::new(output_file);
    write_header(&mut writer)?;

    // Traite chaque ligne du fichier
    let lines: Vec<&str> = cleaned_content.split('\n').collect();
    let mut row_index = 0;

    for (line_idx, line) in lines.iter().enumerate().skip(1) {
        if line.trim().is_empty() {
            continue;
        }

        // Vérifie si la ligne contient des données de polygone
        if line.contains("POLYGON") || line.contains("MULTIPOLYGON") {
            match distribute_points_in_polygon(line, row_index, &params, &state) {
                Ok(points) => {
                    // Écrit les points générés dans le fichier de sortie
                    for point in points.clone() {
                        writer.write_all(point.as_bytes())?;
                    }
                    writer.flush()?;

                    // Met à jour le compteur d'éléments créés
                    let mut created_items = state.created_items.lock().unwrap();
                    *created_items += points.len();

                    // Détermine le type de végétation pour les logs
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
                    // Enregistre les erreurs rencontrées
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

        // Met à jour le compteur de lignes traitées
        row_index += 1;
        *state.processed_rows.lock().unwrap() = row_index;
    }

    Ok(())
}

/// Distribue des points à l'intérieur d'un polygone en utilisant l'algorithme de distribution spatiale.
///
/// # Arguments
/// * `polygon_str` - Chaîne de caractères représentant le polygone au format WKT
/// * `row_index` - Index de la ligne traitée (pour les messages d'erreur)
/// * `params` - Paramètres de génération de végétation
/// * `_state` - État du traitement (non utilisé directement ici)
///
/// # Retours
/// Un vecteur de chaînes représentant les points générés ou une erreur
pub fn distribute_points_in_polygon(
    polygon_str: &str,
    row_index: usize,
    params: &VegetationParams,
    _state: &State<'_, VegetationProcessingState>,
) -> Result<Vec<String>, Box<dyn Error>> {
    let mut points = Vec::new();
    let mut rng = rand::rng();

    // Vérifie le format du polygone
    if !polygon_str.contains("POLYGON((") && !polygon_str.contains("MULTIPOLYGON((") {
        return Err(format!("Impossible : Problème(3) Ligne : {}", row_index).into());
    }
    if polygon_str.contains("MULTIPOLYGON") {
        return Err(format!("Impossible : MULTIPOLYGON Ligne : {}", row_index).into());
    }

    // Transforme et analyse la chaîne de polygone
    let modified_str = transform_polygon_string(polygon_str);
    let maybe_polygon = extract_polygon_from_string(&modified_str);
    let polygon = match maybe_polygon {
        Some(p) => p,
        None => parse_polygon_wkt(polygon_str)?,
    };

    // Calcule les limites du polygone
    let bounds = calculate_polygon_bounds(&polygon);

    // Crée un échantillonneur de distribution spatiale et génère des points
    let mut sampler = SpatialDistributionSampler::new(params.density, bounds);
    let sampled_points = sampler.generate_distribution(&polygon);

    println!(
        "Generated {} points using spatial distribution algorithm",
        sampled_points.len()
    );

    // Applique la variation aux points et crée les chaînes de sortie
    for point in sampled_points {
        // Ajoute une variation aléatoire aux coordonnées si configurée
        let (x_variation, y_variation) = if params.variation > 0.0 {
            let angle = rng.random::<f64>() * 2.0 * std::f64::consts::PI;
            let distance = rng.random::<f64>() * params.variation;
            (distance * angle.cos(), distance * angle.sin())
        } else {
            (0.0, 0.0)
        };

        let x_final = point.x() + x_variation;
        let y_final = point.y() + y_variation;

        let type_code = params.type_value;

        // Formate la chaîne de sortie pour le point
        let end_row = format!("									20				20096																		0	{}	", type_code);
        let point_str = format!("       {}\t       {}{}\n", x_final, y_final, end_row);
        points.push(point_str);
    }

    Ok(points)
}

/// Commande Tauri pour extraire des données de polygone d'un fichier CSV.
/// Utilisée pour la visualisation dans l'interface utilisateur.
///
/// # Arguments
/// * `csv_path` - Chemin du fichier CSV
/// * `params` - Paramètres pour la génération de points
///
/// # Retours
/// Données du polygone et des points générés ou une erreur
#[tauri::command]
pub async fn extract_polygon_data(
    csv_path: String,
    params: VegetationParams,
) -> Result<PolygonData, String> {
    let file = match File::open(&csv_path) {
        Ok(f) => f,
        Err(e) => return Err(format!("Erreur lors de l'ouverture du fichier: {}", e)),
    };

    // Lit le contenu du fichier
    let mut content = Vec::new();
    let mut reader = BufReader::new(file);
    if let Err(e) = std::io::Read::read_to_end(&mut reader, &mut content) {
        return Err(format!("Erreur lors de la lecture du fichier: {}", e));
    }

    let cleaned_content = String::from_utf8_lossy(&content).into_owned();
    let lines: Vec<&str> = cleaned_content.split('\n').collect();

    // Cherche la première ligne contenant un polygone
    let mut polygon_line = "";
    for line in lines.iter().skip(1) {
        if line.contains("POLYGON") || line.contains("MULTIPOLYGON") {
            polygon_line = line;
            break;
        }
    }

    if polygon_line.is_empty() {
        return Err("Aucun polygone trouvé dans le fichier CSV".into());
    }

    // Analyse le polygone
    let modified_str = transform_polygon_string(polygon_line);
    let maybe_polygon = extract_polygon_from_string(&modified_str);
    let polygon = match maybe_polygon {
        Some(p) => p,
        None => match parse_polygon_wkt(polygon_line) {
            Ok(p) => p,
            Err(e) => return Err(format!("Erreur lors de l'analyse du polygone: {}", e)),
        },
    };

    // Extrait les points du polygone pour la visualisation
    let polygon_points: Vec<Point> = polygon
        .exterior()
        .coords()
        .map(|coord| (coord.x, coord.y).into())
        .collect();

    // Calcule les limites du polygone
    let bounds = calculate_polygon_bounds(&polygon);

    // Génère des points dans le polygone
    let mut sampler = SpatialDistributionSampler::new(params.density, bounds);
    let sampled_points = sampler.generate_distribution(&polygon);

    let mut generated_points: Vec<Point> = Vec::new();
    let mut rng = rand::rng();

    // Applique la variation aux points générés
    for point in sampled_points {
        let (x_variation, y_variation) = if params.variation > 0.0 {
            let angle = rng.random::<f64>() * 2.0 * std::f64::consts::PI;
            let distance = rng.random::<f64>() * params.variation;
            (distance * angle.cos(), distance * angle.sin())
        } else {
            (0.0, 0.0)
        };

        let x_final = point.x() + x_variation;
        let y_final = point.y() + y_variation;

        generated_points.push((x_final, y_final).into());
    }

    // Renvoie les données du polygone et les points générés
    Ok(PolygonData {
        polygon: polygon_points,
        points: generated_points,
    })
}
