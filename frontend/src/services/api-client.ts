/**
 * API client configuration and environment bridge.
 * When VITE_API_BASE_URL is not provided or live backend is unreachable,
 * requests gracefully use the structured demo data layer with clear UI labeling.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const IS_DEMO_MODE_DEFAULT = true;

export interface ApiResponse<T> {
  data: T;
  isDemo: boolean;
  status: 'success' | 'fallback' | 'error';
  message?: string;
}

export class ApiError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}
