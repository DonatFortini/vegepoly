use serde::Serialize;
use std::sync::Mutex;
use std::time::Instant;
use tauri::{AppHandle, Emitter, State};

#[derive(Serialize, Clone)]
pub struct VegetationProgressInfo {
    pub current_row: usize,
    pub total_rows: usize,
    pub created_items: usize,
    pub errors: Vec<String>,
    pub percentage: f64,
    pub elapsed_seconds: Option<u64>,
    pub estimated_remaining_seconds: Option<u64>,
    pub is_finished: bool,
}

#[derive(Debug)]
pub struct VegetationProcessingState {
    pub processed_rows: Mutex<usize>,
    pub total_rows: Mutex<usize>,
    pub errors: Mutex<Vec<String>>,
    pub created_items: Mutex<usize>,
    pub start_time: Mutex<Option<Instant>>,
    pub end_time: Mutex<Option<Instant>>,
}

impl Clone for VegetationProcessingState {
    fn clone(&self) -> Self {
        VegetationProcessingState {
            processed_rows: Mutex::new(*self.processed_rows.lock().unwrap()),
            total_rows: Mutex::new(*self.total_rows.lock().unwrap()),
            errors: Mutex::new(self.errors.lock().unwrap().clone()),
            created_items: Mutex::new(*self.created_items.lock().unwrap()),
            start_time: Mutex::new(*self.start_time.lock().unwrap()),
            end_time: Mutex::new(*self.end_time.lock().unwrap()),
        }
    }
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
            start_time: Mutex::new(None),
            end_time: Mutex::new(None),
        }
    }

    pub fn emit_progress(&self, app_handle: &AppHandle) {
        let progress_info = self.get_progress_info();
        if let Err(e) = app_handle.emit("vegetation-progress", &progress_info) {
            eprintln!("Failed to emit progress event: {}", e);
        }
    }

    pub fn update_processed_rows(&self, count: usize, app_handle: &AppHandle) {
        *self.processed_rows.lock().unwrap() = count;
        self.emit_progress(app_handle);
    }

    pub fn update_created_items(&self, count: usize, app_handle: &AppHandle) {
        *self.created_items.lock().unwrap() = count;
        self.emit_progress(app_handle);
    }

    pub fn add_error(&self, error: String, app_handle: &AppHandle) {
        self.errors.lock().unwrap().push(error);
        self.emit_progress(app_handle);
    }

    pub fn set_finished(&self, app_handle: &AppHandle) {
        *self.end_time.lock().unwrap() = Some(Instant::now());
        self.emit_progress(app_handle);
    }

    pub fn initialize(&self, total_rows: usize, app_handle: &AppHandle) {
        *self.processed_rows.lock().unwrap() = 0;
        *self.total_rows.lock().unwrap() = total_rows;
        *self.created_items.lock().unwrap() = 0;
        *self.errors.lock().unwrap() = Vec::new();
        *self.start_time.lock().unwrap() = Some(Instant::now());
        *self.end_time.lock().unwrap() = None;
        self.emit_progress(app_handle);
    }

    fn get_progress_info(&self) -> VegetationProgressInfo {
        let current_row = *self.processed_rows.lock().unwrap();
        let total_rows = *self.total_rows.lock().unwrap();
        let created_items = *self.created_items.lock().unwrap();
        let errors = self.errors.lock().unwrap().clone();
        let start_time = *self.start_time.lock().unwrap();
        let end_time = *self.end_time.lock().unwrap();

        let percentage = if total_rows > 0 {
            (current_row as f64 / total_rows as f64) * 100.0
        } else {
            0.0
        };

        let elapsed_seconds = if let Some(start) = start_time {
            let end = end_time.unwrap_or_else(Instant::now);
            Some(end.duration_since(start).as_secs())
        } else {
            None
        };

        let estimated_remaining_seconds = if let Some(start) = start_time {
            if current_row > 0 && total_rows > current_row && end_time.is_none() {
                let elapsed = Instant::now().duration_since(start).as_secs_f64();
                let progress_rate = current_row as f64 / elapsed;
                let remaining_rows = total_rows - current_row;
                let estimated_remaining = remaining_rows as f64 / progress_rate;
                Some(estimated_remaining as u64)
            } else {
                None
            }
        } else {
            None
        };

        let is_finished = end_time.is_some() || (total_rows > 0 && current_row >= total_rows);

        VegetationProgressInfo {
            current_row,
            total_rows,
            created_items,
            errors,
            percentage,
            elapsed_seconds,
            estimated_remaining_seconds,
            is_finished,
        }
    }
}

#[tauri::command]
pub fn get_vegetation_progress(
    state: State<'_, VegetationProcessingState>,
) -> VegetationProgressInfo {
    state.get_progress_info()
}
