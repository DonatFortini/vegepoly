use directories::UserDirs;
use rusqlite::{Connection, Result as SqliteResult, params};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, OnceLock, RwLock};
use tauri::{AppHandle, Manager};
use thiserror::Error;

use crate::models::vegetations::VegetationParams;

#[derive(Error, Debug)]
pub enum SettingsError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Configuration directory not found")]
    ConfigDirNotFound,
    #[error("Invalid vegetation type: {0}")]
    InvalidVegetationType(i8),
    #[error("Invalid path: {0}")]
    InvalidPath(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

type Result<T> = std::result::Result<T, SettingsError>;

#[derive(Clone, Debug)]
pub struct Settings {
    db_path: PathBuf,
}

static SETTINGS_INSTANCE: OnceLock<Arc<RwLock<Settings>>> = OnceLock::new();

impl Settings {
    pub fn init(app_handle: AppHandle) -> Result<()> {
        let settings = Self::new(app_handle)?;
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

    fn new(app_handle: AppHandle) -> Result<Self> {
        let db_path = Self::get_database_path(&app_handle)?;

        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let settings = Settings { db_path };
        settings.initialize_database()?;
        Ok(settings)
    }

    fn get_database_path(app_handle: &AppHandle) -> Result<PathBuf> {
        Ok(app_handle
            .path()
            .app_data_dir()
            .map_err(|_| SettingsError::ConfigDirNotFound)?
            .join("settings.db"))
    }

    fn get_connection(&self) -> SqliteResult<Connection> {
        Connection::open(&self.db_path)
    }

    fn initialize_database(&self) -> Result<()> {
        let conn = self.get_connection()?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS default_vegetation_params (
                vegetation_type INTEGER PRIMARY KEY,
                density REAL NOT NULL,
                type_value INTEGER NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS user_vegetation_params (
                vegetation_type INTEGER PRIMARY KEY,
                density REAL NOT NULL,
                type_value INTEGER NOT NULL
            )",
            [],
        )?;
        self.initialize_default_values(&conn)?;

        Ok(())
    }

    fn initialize_default_values(&self, conn: &Connection) -> Result<()> {
        let export_path_exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM settings WHERE key = 'export_path')",
            [],
            |row| row.get(0),
        )?;

        if !export_path_exists {
            let default_path = Self::get_default_export_path();
            conn.execute(
                "INSERT INTO settings (key, value) VALUES ('export_path', ?1)",
                params![default_path.to_string_lossy().to_string()],
            )?;
        }
        let default_params_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM default_vegetation_params",
            [],
            |row| row.get(0),
        )?;

        if default_params_count == 0 {
            let default_params = Self::create_default_vegetation_params();
            for (vegetation_type, params) in default_params {
                conn.execute(
                    "INSERT INTO default_vegetation_params (vegetation_type, density, type_value) 
                     VALUES (?1, ?2, ?3)",
                    params![vegetation_type, params.density, params.type_value],
                )?;
            }
        }

        Ok(())
    }

    fn get_default_export_path() -> PathBuf {
        UserDirs::new()
            .and_then(|dirs| dirs.download_dir().map(|p| p.to_path_buf()))
            .unwrap_or_else(|| PathBuf::from("Downloads"))
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
        F: FnOnce(&Settings) -> Result<R>,
    {
        let instance = SETTINGS_INSTANCE
            .get()
            .expect("Settings not initialized. Call Settings::init() first.");
        let settings = instance.read().unwrap();
        f(&settings)
    }

    pub fn get_export_path(&self) -> Result<PathBuf> {
        let conn = self.get_connection()?;
        let path_str: String = conn.query_row(
            "SELECT value FROM settings WHERE key = 'export_path'",
            [],
            |row| row.get(0),
        )?;
        Ok(PathBuf::from(path_str))
    }

    pub fn set_export_path(&self, path: PathBuf) -> Result<()> {
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

        let conn = self.get_connection()?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('export_path', ?1)",
            params![path.to_string_lossy().to_string()],
        )?;

        Ok(())
    }

    pub fn get_vegetation_params(&self, vegetation_type: i8) -> Result<Option<VegetationParams>> {
        let conn = self.get_connection()?;
        let user_result = conn.query_row(
            "SELECT vegetation_type, density, type_value FROM user_vegetation_params WHERE vegetation_type = ?1",
            params![vegetation_type],
            |row| Ok(VegetationParams {
                vegetation_type: row.get::<_, u8>(0)?,
                density: row.get(1)?,
                type_value: row.get::<_, u8>(2)?,
            })
        );

        if let Ok(params) = user_result {
            return Ok(Some(params));
        }

        let default_result = conn.query_row(
            "SELECT vegetation_type, density, type_value FROM default_vegetation_params WHERE vegetation_type = ?1",
            params![vegetation_type],
            |row| Ok(VegetationParams {
                vegetation_type: row.get::<_, u8>(0)?,
                density: row.get(1)?,
                type_value: row.get::<_, u8>(2)?,
            })
        );

        match default_result {
            Ok(params) => Ok(Some(params)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(SettingsError::Database(e)),
        }
    }

    pub fn get_default_vegetation_params(
        &self,
        vegetation_type: i8,
    ) -> Result<Option<VegetationParams>> {
        let conn = self.get_connection()?;

        let result = conn.query_row(
            "SELECT vegetation_type, density, type_value FROM default_vegetation_params WHERE vegetation_type = ?1",
            params![vegetation_type],
            |row| Ok(VegetationParams {
                vegetation_type: row.get::<_, u8>(0)?,
                density: row.get(1)?,
                type_value: row.get::<_, u8>(2)?,
            })
        );

        match result {
            Ok(params) => Ok(Some(params)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(SettingsError::Database(e)),
        }
    }

    pub fn get_user_vegetation_params(
        &self,
        vegetation_type: i8,
    ) -> Result<Option<VegetationParams>> {
        let conn = self.get_connection()?;

        let result = conn.query_row(
            "SELECT vegetation_type, density, type_value FROM user_vegetation_params WHERE vegetation_type = ?1",
            params![vegetation_type],
            |row| Ok(VegetationParams {
                vegetation_type: row.get::<_, u8>(0)?,
                density: row.get(1)?,
                type_value: row.get::<_, u8>(2)?,
            })
        );

        match result {
            Ok(params) => Ok(Some(params)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(SettingsError::Database(e)),
        }
    }

    pub fn set_user_vegetation_params(
        &self,
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

        let conn = self.get_connection()?;
        conn.execute(
            "INSERT OR REPLACE INTO user_vegetation_params (vegetation_type, density, type_value) 
             VALUES (?1, ?2, ?3)",
            params![vegetation_type, params.density, params.type_value],
        )?;

        Ok(())
    }

    pub fn remove_user_vegetation_params(
        &self,
        vegetation_type: i8,
    ) -> Result<Option<VegetationParams>> {
        let conn = self.get_connection()?;
        let existing = self.get_user_vegetation_params(vegetation_type)?;
        conn.execute(
            "DELETE FROM user_vegetation_params WHERE vegetation_type = ?1",
            params![vegetation_type],
        )?;

        Ok(existing)
    }

    pub fn reset_user_vegetation_params(&self) -> Result<()> {
        let conn = self.get_connection()?;
        conn.execute("DELETE FROM user_vegetation_params", [])?;
        Ok(())
    }

    pub fn get_available_vegetation_types(&self) -> Result<Vec<i8>> {
        let conn = self.get_connection()?;

        let mut stmt = conn.prepare(
            "SELECT DISTINCT vegetation_type FROM default_vegetation_params 
             UNION 
             SELECT DISTINCT vegetation_type FROM user_vegetation_params 
             ORDER BY vegetation_type",
        )?;

        let rows = stmt.query_map([], |row| row.get::<_, i8>(0))?;

        let mut types = Vec::new();
        for row in rows {
            types.push(row?);
        }

        Ok(types)
    }

    pub fn has_user_params(&self, vegetation_type: i8) -> Result<bool> {
        let conn = self.get_connection()?;
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM user_vegetation_params WHERE vegetation_type = ?1",
            params![vegetation_type],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }
}

#[tauri::command]
pub fn get_export_path() -> String {
    Settings::with_read(|s| {
        s.get_export_path()
            .unwrap_or_else(|_| PathBuf::from("Downloads"))
            .to_string_lossy()
            .to_string()
    })
}
