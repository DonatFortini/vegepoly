pub mod models;
pub mod processing;
pub mod sampling;
pub mod utils;

pub use models::{
    PolygonData, Settings, VegetationParams, VegetationProcessingState, VegetationProgressInfo,
};
pub use processing::{extract_polygon_data, generate_vegetation_from_csv, get_vegetation_progress};
pub use utils::get_default_vegetation_params;
use utils::{get_user_vegetation_params, set_user_vegetation_params};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _settings = models::Settings::global();
    let vegetation_state = models::VegetationProcessingState::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(vegetation_state)
        .invoke_handler(tauri::generate_handler![
            generate_vegetation_from_csv,
            get_vegetation_progress,
            get_default_vegetation_params,
            extract_polygon_data,
            get_user_vegetation_params,
            set_user_vegetation_params,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
