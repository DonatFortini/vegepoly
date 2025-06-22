use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, OnceLock, RwLock};
use thiserror::Error;

#[cfg(unix)]
use xdg_user::UserDirs as XdgUserDirs;

#[cfg(windows)]
use directories::UserDirs;

use crate::models::vegetations::VegetationParams;

#[derive(Error, Debug)]
pub enum SettingsError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Configuration directory not found")]
    ConfigDirNotFound,
    #[error("Invalid vegetation type: {0}")]
    InvalidVegetationType(i8),
    #[error("Invalid path: {0}")]
    InvalidPath(String),
}

type Result<T> = std::result::Result<T, SettingsError>;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Settings {
    pub default_vegetation_params: HashMap<i8, VegetationParams>,
    pub user_vegetation_params: HashMap<i8, VegetationParams>,
    pub export_path: PathBuf,

    #[serde(skip)]
    config_file_path: String,
}

static SETTINGS_INSTANCE: OnceLock<Arc<RwLock<Settings>>> = OnceLock::new();

impl Default for Settings {
    fn default() -> Self {
        let export_path = Self::get_default_export_path();

        Settings {
            default_vegetation_params: Self::create_default_vegetation_params(),
            user_vegetation_params: HashMap::new(),
            export_path,
            config_file_path: "settings.json".to_string(),
        }
    }
}

impl Settings {
    pub fn init() -> Result<()> {
        let settings = Self::load_or_create_default()?;
        SETTINGS_INSTANCE
            .set(Arc::new(RwLock::new(settings)))
            .map_err(|_| {
                SettingsError::Io(std::io::Error::new(
                    std::io::ErrorKind::AlreadyExists,
                    "Settings already initialized",
                ))
            })?;
        Ok(())
    }

    pub fn with_read<F, R>(f: F) -> R
    where
        F: FnOnce(&Settings) -> R,
    {
        let instance = SETTINGS_INSTANCE
            .get()
            .expect("Settings not initialized. Call Settings::init() first.");
        let settings = instance.read().unwrap();
        f(&settings)
    }

    pub fn with_write<F, R>(f: F) -> Result<R>
    where
        F: FnOnce(&mut Settings) -> Result<R>,
    {
        let instance = SETTINGS_INSTANCE
            .get()
            .expect("Settings not initialized. Call Settings::init() first.");
        let mut settings = instance.write().unwrap();
        let result = f(&mut settings)?;
        settings.save()?;
        Ok(result)
    }

    fn load_or_create_default() -> Result<Self> {
        let config_path = Self::get_config_file_path();

        if std::path::Path::new(&config_path).exists() {
            Self::load_from_file(&PathBuf::from(&config_path))
        } else {
            let settings = Settings {
                config_file_path: config_path.clone(),
                ..Self::default()
            };
            settings.save()?;
            Ok(settings)
        }
    }

    fn load_from_file(path: &PathBuf) -> Result<Self> {
        let contents = fs::read_to_string(path)?;
        let mut settings: Settings = serde_json::from_str(&contents)?;
        settings.config_file_path = path.to_string_lossy().to_string();
        Ok(settings)
    }

    fn save(&self) -> Result<()> {
        let config_path = PathBuf::from(&self.config_file_path);

        let json = serde_json::to_string_pretty(self)?;
        fs::write(config_path, json)?;
        Ok(())
    }

    fn get_config_file_path() -> String {
        "settings.json".to_string()
    }

    fn get_default_export_path() -> PathBuf {
        #[cfg(windows)]
        {
            let user_dirs = UserDirs::new().unwrap();
            user_dirs.download_dir().unwrap().to_path_buf()
        }

        #[cfg(not(windows))]
        {
            let user_dirs = XdgUserDirs::new().unwrap();
            user_dirs.downloads().unwrap().to_path_buf()
        }
    }

    fn create_default_vegetation_params() -> HashMap<i8, VegetationParams> {
        HashMap::from([
            (
                1,
                VegetationParams {
                    vegetation_type: 1,
                    density: 28.0,
                    type_value: 10,
                },
            ),
            (
                2,
                VegetationParams {
                    vegetation_type: 2,
                    density: 5.0,
                    type_value: 20,
                },
            ),
            (
                3,
                VegetationParams {
                    vegetation_type: 3,
                    density: 3.0,
                    type_value: 30,
                },
            ),
        ])
    }

    pub fn get_export_path(&self) -> &PathBuf {
        &self.export_path
    }

    pub fn set_export_path(&mut self, path: PathBuf) -> Result<()> {
        if !path.exists() {
            return Err(SettingsError::InvalidPath(format!(
                "Path does not exist: {}",
                path.display()
            )));
        }
        if !path.is_dir() {
            return Err(SettingsError::InvalidPath(format!(
                "Path is not a directory: {}",
                path.display()
            )));
        }
        self.export_path = path;
        Ok(())
    }

    pub fn get_vegetation_params(&self, vegetation_type: i8) -> Option<VegetationParams> {
        self.user_vegetation_params
            .get(&vegetation_type)
            .or_else(|| self.default_vegetation_params.get(&vegetation_type))
            .cloned()
    }

    pub fn get_default_vegetation_params(&self, vegetation_type: i8) -> Option<VegetationParams> {
        self.default_vegetation_params
            .get(&vegetation_type)
            .cloned()
    }

    pub fn get_user_vegetation_params(&self, vegetation_type: i8) -> Option<VegetationParams> {
        self.user_vegetation_params.get(&vegetation_type).cloned()
    }

    pub fn set_user_vegetation_params(
        &mut self,
        vegetation_type: i8,
        params: VegetationParams,
    ) -> Result<()> {
        if vegetation_type < 1 {
            return Err(SettingsError::InvalidVegetationType(vegetation_type));
        }

        if params.density < 0.0 {
            return Err(SettingsError::InvalidPath(
                "Density cannot be negative".to_string(),
            ));
        }

        self.user_vegetation_params.insert(vegetation_type, params);
        Ok(())
    }

    pub fn remove_user_vegetation_params(
        &mut self,
        vegetation_type: i8,
    ) -> Option<VegetationParams> {
        self.user_vegetation_params.remove(&vegetation_type)
    }

    pub fn reset_user_vegetation_params(&mut self) {
        self.user_vegetation_params.clear();
    }

    pub fn get_available_vegetation_types(&self) -> Vec<i8> {
        let mut types: Vec<i8> = self
            .default_vegetation_params
            .keys()
            .chain(self.user_vegetation_params.keys())
            .copied()
            .collect();
        types.sort();
        types.dedup();
        types
    }

    pub fn has_user_params(&self, vegetation_type: i8) -> bool {
        self.user_vegetation_params.contains_key(&vegetation_type)
    }
}

#[tauri::command]
pub fn get_export_path() -> String {
    Settings::with_read(|s| s.get_export_path().to_string_lossy().to_string())
}
