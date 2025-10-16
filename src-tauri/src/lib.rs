pub mod models;
pub mod sampling;
pub mod utils;

pub use models::vegetations::{
    get_default_vegetation_params, get_user_vegetation_params, set_user_vegetation_params,
};

pub use models::settings::get_export_path;

use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;
pub use utils::{export_results, get_preview_data, parse_csv_file};

pub use sampling::fill_polygon;

use crate::models::processing::{VegetationProcessingState, get_vegetation_progress};

async fn check_for_updates(app: AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let updater = app.updater_builder().build()?;
    let timeout_duration = std::time::Duration::from_secs(15);

    match tokio::time::timeout(timeout_duration, updater.check()).await {
        Ok(Ok(Some(update))) => {
            println!(
                "Update available: {} -> {}",
                update.current_version, update.version
            );
            println!("Downloading update...");

            let download_timeout = std::time::Duration::from_secs(300);

            match tokio::time::timeout(
                download_timeout,
                update.download_and_install(
                    |chunk_length, content_length| {
                        if let Some(total) = content_length {
                            let progress = (chunk_length as f64 / total as f64) * 100.0;
                            println!("Download progress: {:.1}%", progress);
                        } else {
                            println!("Downloaded: {} bytes", chunk_length);
                        }
                    },
                    || println!("Download finished"),
                ),
            )
            .await
            {
                Ok(Ok(_)) => {
                    println!("Update installed successfully\nRestarting application...");
                    app.restart();
                }
                Ok(Err(e)) => eprintln!("Failed to download/install update: {}", e),
                Err(_) => eprintln!("Update download timed out after 5 minutes"),
            }
        }
        Ok(Ok(None)) => println!("No updates available - you're on the latest version"),
        Ok(Err(e)) => eprintln!("Update check failed: {}", e),
        Err(_) => eprintln!("Update check timed out after 15 seconds - continuing startup"),
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
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
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = check_for_updates(app_handle).await {
                    eprintln!("Error during update check: {}", e);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
