use serde::{Deserialize, Serialize};

use crate::models::settings::Settings;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct VegetationParams {
    pub vegetation_type: u8,
    pub density: f64,
    pub type_value: u8,
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
    Settings::with_read(|s| {
        s.default_vegetation_params
            .get(&(vegetation_type as i8))
            .cloned()
            .unwrap_or(VegetationParams {
                vegetation_type,
                density: 5.0,
                type_value: 10,
            })
    })
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
    let _ = Settings::with_write(|s| {
        Ok(s.set_user_vegetation_params(vegetation_type, params)
            .map_err(|e| e.to_string()))
    });
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
    Settings::with_read(|s| s.user_vegetation_params.get(&vegetation_type).cloned())
}
