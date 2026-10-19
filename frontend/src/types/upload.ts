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
