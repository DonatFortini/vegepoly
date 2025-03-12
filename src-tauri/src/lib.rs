/// Module principal qui expose les fonctionnalités de l'application de génération de végétation.
/// Ce fichier sert de point d'entrée pour la bibliothèque et coordonne les différents composants.
// Déclaration des modules qui composent l'application
pub mod models;
pub mod processing;
pub mod sampling;
pub mod utils;

// Ré-export des éléments essentiels pour faciliter leur accès depuis l'extérieur
pub use models::{
    PolygonData, VegetationParams, VegetationProcessingState, VegetationProgressInfo,
};
pub use processing::{extract_polygon_data, generate_vegetation_from_csv, get_vegetation_progress};
pub use utils::get_default_vegetation_params;

/// Initialise et démarre l'application Tauri avec les gestionnaires d'appels appropriés.
/// Cette fonction est le point d'entrée principal lorsque l'application est lancée.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let vegetation_state = models::VegetationProcessingState::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(vegetation_state)
        .invoke_handler(tauri::generate_handler![
            generate_vegetation_from_csv,
            get_vegetation_progress,
            get_default_vegetation_params,
            extract_polygon_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
