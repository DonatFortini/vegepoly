import { invoke } from "@tauri-apps/api/core";
import { VegetationParams } from "../types";

export async function saveVegetationParams(
  vegetationType: number,
  params: VegetationParams
): Promise<boolean> {
  try {
    await invoke("set_user_vegetation_params", {
      vegetationType,
      params,
    });
    return true;
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des paramètres:", error);
    return false;
  }
}

export async function getUserVegetationParams(
  vegetationType: number
): Promise<VegetationParams | null> {
  try {
    const params = await invoke<VegetationParams | null>(
      "get_user_vegetation_params",
      {
        vegetationType,
      }
    );
    return params;
  } catch (error) {
    console.error(
      "Erreur lors du chargement des paramètres utilisateur:",
      error
    );
    return null;
  }
}

export function paramsAreEqual(
  params1: VegetationParams,
  params2: VegetationParams
): boolean {
  return (
    params1.density === params2.density &&
    params1.type_value === params2.type_value
  );
}
