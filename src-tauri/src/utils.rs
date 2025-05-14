use geo::{Coord, Polygon};
use std::error::Error;
use std::fs::File;
use std::io::{BufReader, BufWriter, Write};

use crate::Settings;
use crate::models::VegetationParams;

/// Compte le nombre de lignes dans un fichier.
///
/// # Arguments
/// * `file_path` - Chemin du fichier à compter
///
/// # Retours
/// Le nombre de lignes non vides dans le fichier ou une erreur
pub fn count_file_rows(file_path: &str) -> Result<usize, Box<dyn Error>> {
    let file = File::open(file_path)?;
    let mut content = Vec::new();
    let mut reader = BufReader::new(file);
    std::io::Read::read_to_end(&mut reader, &mut content)?;
    let content_str = String::from_utf8_lossy(&content).into_owned();
    let lines: Vec<&str> = content_str.split('\n').collect();

    // Soustrait 1 pour l'en-tête si le fichier n'est pas vide
    let count = if lines.len() > 1 { lines.len() - 1 } else { 0 };
    Ok(count)
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

/// Transforme une chaîne représentant un polygone dans un format adapté à l'analyse.
///
/// # Arguments
/// * `polygon_str` - Chaîne représentant un polygone au format WKT
///
/// # Retours
/// Une chaîne transformée adaptée pour l'analyse ultérieure
pub fn transform_polygon_string(polygon_str: &str) -> String {
    let mut result = polygon_str.to_string();

    // Transforme les formats POLYGON et MULTIPOLYGON en format Polygon
    if result.contains("POLYGON((") {
        result = result.replace("POLYGON((", "Polygon([(");
    }
    if result.contains("MULTIPOLYGON((") {
        result = result.replace("MULTIPOLYGON((", "Polygon([(");
    }

    // Ajuste la syntaxe
    result = result.replace("))", ")])");
    result = result.replace("))", ")])");
    result = result.replace(",", "),(");
    result = result.replace(" ", ",");

    // Tronque si nécessaire
    if let Some(idx) = result.find(")])") {
        if let Some(rest) = result[idx + 3..].find(")])") {
            result = result[0..idx + 3 + rest + 3].to_string();
        }
    }

    result
}

/// Extrait un polygone à partir d'une chaîne transformée.
///
/// # Arguments
/// * `str` - Chaîne transformée représentant un polygone
///
/// # Retours
/// Une option contenant le polygone extrait ou None si l'extraction échoue
pub fn extract_polygon_from_string(str: &str) -> Option<Polygon<f64>> {
    // Vérifie si la chaîne contient un format de polygone valide
    if !str.contains("Polygon([(") {
        return None;
    }

    // Extrait la partie interne du polygone
    let start_idx = str.find("Polygon([(").unwrap_or(0) + "Polygon([(".len();
    let end_idx = str.rfind(")])").unwrap_or(str.len());
    if start_idx >= end_idx {
        return None;
    }

    let inner = &str[start_idx..end_idx];
    let coord_pairs: Vec<&str> = inner.split("),(").collect();

    // Analyse les paires de coordonnées
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

    // Vérifie si des coordonnées ont été extraites
    if coords.is_empty() {
        return None;
    }

    // Ferme le polygone si nécessaire
    if coords.len() > 1 && coords[0] != *coords.last().unwrap() {
        coords.push(coords[0]);
    }

    Some(Polygon::new(coords.into(), vec![]))
}

/// Analyse une chaîne WKT (Well-Known Text) en un polygone.
///
/// # Arguments
/// * `polygon_str` - Chaîne WKT représentant un polygone
///
/// # Retours
/// Le polygone analysé ou une erreur
pub fn parse_polygon_wkt(polygon_str: &str) -> Result<Polygon<f64>, Box<dyn Error>> {
    let mut cleaned = polygon_str.to_string();

    // Vérifie le format
    if !cleaned.contains("POLYGON((") && !cleaned.contains("MULTIPOLYGON((") {
        return Err("Invalid format".into());
    }

    // Nettoie la chaîne
    if cleaned.contains("POLYGON((") {
        cleaned = cleaned.replace("POLYGON((", "");
    } else if cleaned.contains("MULTIPOLYGON((") {
        cleaned = cleaned.replace("MULTIPOLYGON((", "");
    }
    cleaned = cleaned.replace("))", "");

    // Analyse les coordonnées
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

    // Vérifie si des coordonnées ont été extraites
    if coords.is_empty() {
        return Err("Empty polygon".into());
    }

    // Ferme le polygone si nécessaire
    if coords.len() > 1 && coords[0] != *coords.last().unwrap() {
        coords.push(coords[0]);
    }

    Ok(Polygon::new(coords.into(), vec![]))
}

/// Calcule les limites d'un polygone.
///
/// # Arguments
/// * `polygon` - Le polygone dont on veut calculer les limites
///
/// # Retours
/// Un tuple (min_x, min_y, max_x, max_y) représentant les limites du polygone
pub fn calculate_polygon_bounds(polygon: &Polygon<f64>) -> (f64, f64, f64, f64) {
    let exterior = polygon.exterior();
    let coords = exterior.coords();

    // Initialise les valeurs min/max
    let mut min_x = f64::MAX;
    let mut min_y = f64::MAX;
    let mut max_x = f64::MIN;
    let mut max_y = f64::MIN;

    // Met à jour les min/max pour chaque coordonnée
    for coord in coords {
        min_x = min_x.min(coord.x);
        min_y = min_y.min(coord.y);
        max_x = max_x.max(coord.x);
        max_y = max_y.max(coord.y);
    }

    (min_x, min_y, max_x, max_y)
}

/// Commande Tauri pour obtenir les paramètres par défaut pour un type de végétation.
///
/// # Arguments
/// * `vegetation_type` - Type de végétation (1: Arbres, 2: Surfaces, 3: Roccailles)
///
/// # Retours
/// Les paramètres par défaut pour le type de végétation spécifié
#[tauri::command]
pub fn get_default_vegetation_params(vegetation_type: u8) -> VegetationParams {
    let settings = Settings::global();
    let settings_guard = settings.lock().unwrap();
    match settings_guard.get_default_vegetation_params(vegetation_type as i8) {
        Some(params) => params,
        None => VegetationParams {
            vegetation_type,
            density: 5.0,
            variation: 0.5,
            type_value: 10,
        },
    }
}

#[tauri::command]
/// Commande Tauri pour définir les paramètres de végétation de l'utilisateur.
///
/// # Arguments
/// * `vegetation_type` - Type de végétation (1: Arbres, 2: Surfaces, 3: Roccailles)
/// * `params` - Paramètres de végétation à définir
///
/// # Retours
/// Ok(()) en cas de succès ou une erreur
pub fn set_user_vegetation_params(
    vegetation_type: i8,
    params: VegetationParams,
) -> Result<(), String> {
    let settings = Settings::global();
    let mut settings_guard = settings.lock().unwrap();
    settings_guard.set_user_vegetation_params(vegetation_type, params);
    Ok(())
}

#[tauri::command]
/// Commande Tauri pour obtenir les paramètres de végétation de l'utilisateur.
///
/// # Arguments
/// * `vegetation_type` - Type de végétation (1: Arbres, 2: Surfaces, 3: Roccailles)
///
/// # Retours
/// Option<VegetationParams> contenant les paramètres de végétation de l'utilisateur ou None si non définis
pub fn get_user_vegetation_params(vegetation_type: i8) -> Option<VegetationParams> {
    let settings = Settings::global();
    let settings_guard = settings.lock().unwrap();
    settings_guard.get_user_vegetation_params(vegetation_type)
}
