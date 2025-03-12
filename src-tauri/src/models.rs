/// Module contenant les structures de données utilisées dans l'application.
/// Définit les types de données pour la génération et le traitement de la végétation.
use geo::Point;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

/// Structure qui maintient l'état du traitement des données de végétation.
/// Utilisée pour suivre la progression et collecter les erreurs pendant le traitement.
pub struct VegetationProcessingState {
    /// Nombre de lignes traitées dans le fichier CSV
    pub processed_rows: Mutex<usize>,
    /// Nombre total de lignes dans le fichier CSV
    pub total_rows: Mutex<usize>,
    /// Collection des erreurs rencontrées pendant le traitement
    pub errors: Mutex<Vec<String>>,
    /// Nombre d'éléments de végétation créés
    pub created_items: Mutex<usize>,
}

impl Default for VegetationProcessingState {
    fn default() -> Self {
        Self::new()
    }
}

impl VegetationProcessingState {
    /// Crée une nouvelle instance de l'état de traitement avec des valeurs par défaut.
    pub fn new() -> Self {
        VegetationProcessingState {
            processed_rows: Mutex::new(0),
            total_rows: Mutex::new(0),
            created_items: Mutex::new(0),
            errors: Mutex::new(Vec::new()),
        }
    }
}

/// Paramètres pour la génération de végétation.
/// Cette structure contient les paramètres configurables pour la génération de végétation.
#[derive(Serialize, Deserialize, Clone)]
pub struct VegetationParams {
    /// Type de végétation (1: Arbres, 2: Surfaces, 3: Roccailles)
    pub vegetation_type: u8,
    /// Densité de la végétation (contrôle la distance minimale entre les points)
    pub density: f64,
    /// Variation de position (variation aléatoire ajoutée à chaque point)
    pub variation: f64,
    /// Valeur de type utilisée dans la sortie des données
    pub type_value: u8,
}

/// Structure pour représenter les données de polygone et les points générés.
/// Utilisée pour transférer les données entre le backend et l'interface utilisateur.
#[derive(Serialize)]
pub struct PolygonData {
    /// Points définissant le contour du polygone
    pub polygon: Vec<Point>,
    /// Points générés à l'intérieur du polygone
    pub points: Vec<Point>,
}

/// Structure pour représenter l'information de progression du traitement.
/// Utilisée pour informer l'interface utilisateur de l'état du traitement.
#[derive(Serialize, Clone)]
pub struct VegetationProgressInfo {
    /// Ligne actuellement en cours de traitement
    pub current_row: usize,
    /// Nombre total de lignes à traiter
    pub total_rows: usize,
    /// Nombre d'éléments de végétation créés jusqu'à présent
    pub created_items: usize,
    /// Liste des erreurs rencontrées pendant le traitement
    pub errors: Vec<String>,
}
