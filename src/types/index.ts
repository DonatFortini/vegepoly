// Types partagés pour l'application
export interface VegetationParams {
  vegetation_type: number;
  density: number;
  variation: number;
  type_value: number;
}

export interface ProgressInfo {
  current_row: number;
  total_rows: number;
  created_items: number;
  errors: string[];
}
