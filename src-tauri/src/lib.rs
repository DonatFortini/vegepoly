pub mod models;
pub mod sampling;
pub mod utils;

pub use models::vegetations::{
    get_default_vegetation_params, get_user_vegetation_params, set_user_vegetation_params,
};

pub use models::settings::get_export_path;

pub use utils::{export_results, get_preview_data, parse_csv_file};

pub use sampling::fill_polygon;

use crate::models::processing::{VegetationProcessingState, get_vegetation_progress};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(VegetationProcessingState::new())
        .invoke_handler(tauri::generate_handler![
            get_default_vegetation_params,
            get_user_vegetation_params,
            set_user_vegetation_params,
            get_vegetation_progress,
            fill_polygon,
            parse_csv_file,
            get_preview_data,
            export_results,
            get_export_path
        ])
        .setup(|app| {
            if let Err(e) = models::settings::Settings::init(app.handle().clone()) {
                eprintln!("Failed to initialize settings: {}", e);
                std::process::exit(1);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
