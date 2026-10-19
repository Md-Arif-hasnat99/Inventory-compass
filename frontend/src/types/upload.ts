// Types for the seller dataset upload and validation workflow

export type UploadStatus = 'pending' | 'valid' | 'invalid';

export interface DateRange {
  min: string;
  max: string;
  unique_dates: number;
}

/** Shape returned by POST /api/upload and POST /api/upload/{id}/validate */
export interface UploadSession {
  upload_id: string;
  status: UploadStatus;
  display_filename: string;
  file_size_bytes: number;
  row_count: number;
  detected_columns: string[];
  /** Maps canonical name (e.g. "date") to the seller's header (e.g. "transaction_date") */
  canonical_mapping: Record<string, string>;
  unmapped_columns: string[];
  date_range: DateRange | null;
  preview_rows: Record<string, unknown>[];
  validation_errors: string[];
  validation_warnings: string[];
}

/** Body sent to POST /api/upload/{id}/validate when the seller overrides column mappings */
export interface ColumnMappingOverride {
  mapping: Record<string, string>;
}

/** Shape returned by GET /api/upload/schema */
export interface UploadSchema {
  required_canonical_columns: string[];
  optional_canonical_columns: string[];
  accepted_aliases: Record<string, string[]>;
}

/** Upload state used by the UploadPage component */
export type UploadPageStep =
  | 'idle'         // No file chosen yet
  | 'uploading'    // File is being sent to backend
  | 'mapping'      // Seller is reviewing/adjusting column mapping
  | 'validating'   // Backend is re-validating with new mapping
  | 'done'         // Validation complete (valid or invalid)
  | 'error';       // Network or server error

// Seller forecast response types
export interface SellerForecastPrediction {
  date: string;
  store_id: string | null;
  product_id: string | null;
  predicted_demand: number;
  is_baseline: boolean;
}

export interface SellerForecastMetrics {
  mae?: number;
  rmse?: number;
  wape?: number;
  r2?: number;
  test_samples?: number;
}

export interface SellerForecastResponse {
  upload_id: string;
  status: 'success' | 'insufficient_data' | 'error';
  model_type: string;
  model_source: 'seller_trained' | 'pretrained_compatible' | 'baseline_heuristic' | 'none';
  horizon_days: number;
  forecast_dates: string[];
  series_count: number;
  total_predictions: number;
  metrics: SellerForecastMetrics | null;
  warnings: string[];
  predictions: SellerForecastPrediction[];
  errors?: string[];
}

// Seller replenishment response types
export interface SellerReplenishmentItem {
  store_id: string | null;
  product_id: string | null;
  daily_demand: number;
  current_inventory: number;
  units_on_order: number;
  net_inventory: number;
  lead_time_days: number;
  safety_stock_days: number;
  expected_lead_demand: number;
  safety_stock: number;
  reorder_point: number;
  stockout_risk: 'HIGH' | 'MEDIUM' | 'LOW';
  reorder_needed: boolean;
  recommended_reorder_qty: number;
  days_of_supply: number | null;
}

export interface SellerReplenishmentSummary {
  total_skus: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  total_reorder_units: number;
}

export interface SellerReplenishmentResponse {
  upload_id: string;
  status: 'success' | 'warning' | 'error';
  lead_time_days: number;
  safety_stock_days: number;
  horizon_days: number;
  recommendations: SellerReplenishmentItem[];
  summary: SellerReplenishmentSummary;
  warnings: string[];
  message?: string;
}
