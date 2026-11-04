/**
 * API client configuration and environment bridge.
 * When VITE_API_BASE_URL is not provided or live backend is unreachable,
 * requests gracefully use the structured demo data layer with clear UI labeling.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ApiResponse<T> {
  data: T;
  isDemo: boolean;
  status: 'success' | 'fallback' | 'error';
  message?: string;
}