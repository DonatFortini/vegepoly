use geo::Point;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};

#[cfg(unix)]
use xdg_user::UserDirs as XdgUserDirs;

#[cfg(windows)]
use directories::UserDirs;

pub struct VegetationProcessingState {
    pub processed_rows: Mutex<usize>,
    pub total_rows: Mutex<usize>,
    pub errors: Mutex<Vec<String>>,
    pub created_items: Mutex<usize>,
}

impl Default for VegetationProcessingState {
    fn default() -> Self {
        Self::new()
    }
}

impl VegetationProcessingState {
    pub fn new() -> Self {
        VegetationProcessingState {
            processed_rows: Mutex::new(0),
            total_rows: Mutex::new(0),
            created_items: Mutex::new(0),
            errors: Mutex::new(Vec::new()),
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct VegetationParams {
    pub vegetation_type: u8,
    pub density: f64,
    pub variation: f64,
    pub type_value: u8,
}

#[derive(Serialize)]
pub struct PolygonData {
    pub polygon: Vec<Point>,
    pub points: Vec<Point>,
}

#[derive(Serialize, Clone)]
pub struct VegetationProgressInfo {
    pub current_row: usize,
    pub total_rows: usize,
    pub created_items: usize,
    pub errors: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Settings {
    pub default_vegetation_params: HashMap<i8, VegetationParams>,
    pub user_vegetation_params: HashMap<i8, VegetationParams>,
    pub export_path: String,
    #[serde(skip)]
    config_path: String,
}

static SETTINGS: OnceLock<Arc<Mutex<Settings>>> = OnceLock::new();
static INITIALIZED: AtomicBool = AtomicBool::new(false);

impl Default for Settings {
    fn default() -> Self {
        let export_path = {
            #[cfg(target_os = "windows")]
            {
                let user_dirs = UserDirs::new().unwrap();
                user_dirs
                    .download_dir()
                    .unwrap()
                    .to_path_buf()
                    .to_string_lossy()
                    .to_string()
            }
            #[cfg(not(target_os = "windows"))]
            {
                let user_dirs = XdgUserDirs::new().unwrap();
                user_dirs
                    .downloads()
                    .unwrap()
                    .to_path_buf()
                    .to_string_lossy()
                    .to_string()
            }
        };

        let config_path = "settings.json".to_string();

        Settings {
            default_vegetation_params: HashMap::from([
                (
                    1,
                    VegetationParams {
                        vegetation_type: 1,
                        density: 28.0,
                        variation: 1.0,
                        type_value: 10,
                    },
                ),
                (
                    2,
                    VegetationParams {
                        vegetation_type: 2,
                        density: 5.0,
                        variation: 0.5,
                        type_value: 20,
                    },
                ),
                (
                    3,
                    VegetationParams {
                        vegetation_type: 3,
                        density: 3.0,
                        variation: 0.3,
                        type_value: 30,
                    },
                ),
            ]),
            user_vegetation_params: HashMap::new(),
            export_path,
            config_path,
        }
    }
}

impl Settings {
    pub fn new() -> Self {
        Settings::default()
    }

    pub fn global() -> Arc<Mutex<Settings>> {
        SETTINGS
            .get_or_init(|| {
                let settings = if !INITIALIZED.load(Ordering::SeqCst) {
                    let settings = Settings::load();
                    INITIALIZED.store(true, Ordering::SeqCst);
                    settings
                } else {
                    Settings::default()
                };

                Arc::new(Mutex::new(settings))
            })
            .clone()
    }

    pub fn load() -> Self {
        let default_settings = Settings::default();
        let config_path = Path::new(&default_settings.config_path);

        if !config_path.exists() {
            let settings = Settings::default();
            settings.save().unwrap_or_else(|e| {
                eprintln!(
                    "Erreur lors de la sauvegarde des paramètres par défaut: {}",
                    e
                );
            });
            return settings;
        }

        match File::open(config_path) {
            Ok(mut file) => {
                let mut contents = String::new();
                match file.read_to_string(&mut contents) {
                    Ok(_) => match serde_json::from_str::<Settings>(&contents) {
                        Ok(mut settings) => {
                            settings.config_path = default_settings.config_path;
                            settings
                        }
                        Err(e) => {
                            eprintln!("Erreur lors de la désérialisation des paramètres: {}", e);
                            default_settings
                        }
                    },
                    Err(e) => {
                        eprintln!(
                            "Erreur lors de la lecture du fichier de configuration: {}",
                            e
                        );
                        default_settings
                    }
                }
            }
            Err(e) => {
                eprintln!(
                    "Erreur lors de l'ouverture du fichier de configuration: {}",
                    e
                );
                default_settings
            }
        }
    }

    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let json = serde_json::to_string_pretty(self)?;
        let mut file = File::create(&self.config_path)?;
        file.write_all(json.as_bytes())?;

        Ok(())
    }

    pub fn get_export_path(&self) -> PathBuf {
        PathBuf::from(&self.export_path)
    }

    pub fn set_export_path(&mut self, path: PathBuf) {
        self.export_path = path.to_string_lossy().to_string();
        self.save().unwrap_or_else(|e| {
            eprintln!(
                "Erreur lors de la sauvegarde après modification du chemin d'exportation: {}",
                e
            );
        });
    }

    pub fn get_default_vegetation_params(&self, vegetation_type: i8) -> Option<VegetationParams> {
        self.default_vegetation_params
            .get(&vegetation_type)
            .cloned()
    }

    pub fn get_user_vegetation_params(&self, vegetation_type: i8) -> Option<VegetationParams> {
        self.user_vegetation_params.get(&vegetation_type).cloned()
    }

    pub fn set_user_vegetation_params(&mut self, vegetation_type: i8, params: VegetationParams) {
        self.user_vegetation_params.insert(vegetation_type, params);
        self.save().unwrap_or_else(|e| {
            eprintln!(
                "Erreur lors de la sauvegarde après modification des paramètres utilisateur: {}",
                e
            );
        });
    }
}
