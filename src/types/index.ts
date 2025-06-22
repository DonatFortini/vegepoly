export interface VegetationParams {
  vegetation_type: number;
  density: number;
  type_value: number;
}

export interface ProgressInfo {
  current_row: number;
  total_rows: number;
  created_items: number;
  errors: string[];
  percentage: number;
  elapsed_seconds?: number;
  estimated_remaining_seconds?: number;
  is_finished: boolean;
}