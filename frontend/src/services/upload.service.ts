/**
 * Upload service — communicates with the FastAPI upload endpoints.
 * Every method returns real API data; there is no demo fallback for uploads.
 * Network errors are propagated to the caller for explicit error handling.
 */

import { API_BASE_URL } from './api-client';
import type { ColumnMappingOverride, UploadSchema, UploadSession } from '../types/upload';

export const uploadService = {
  /**
   * POST /api/upload
   * Upload a CSV file. Returns the session with initial validation results.
   */
  async uploadFile(file: File): Promise<UploadSession> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(body.detail ?? `Upload failed (HTTP ${res.status})`);
    }

    return res.json() as Promise<UploadSession>;
  },

  /**
   * GET /api/upload/{uploadId}
   * Fetch the current state of an upload session.
   */
  async getSession(uploadId: string): Promise<UploadSession> {
    const res = await fetch(`${API_BASE_URL}/api/upload/${uploadId}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(body.detail ?? `Session not found (HTTP ${res.status})`);
    }
    return res.json() as Promise<UploadSession>;
  },

  /**
   * POST /api/upload/{uploadId}/validate
   * Re-run validation with an optional explicit column mapping override.
   */
  async validateSession(
    uploadId: string,
    mappingOverride?: ColumnMappingOverride,
  ): Promise<UploadSession> {
    const res = await fetch(`${API_BASE_URL}/api/upload/${uploadId}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: mappingOverride ? JSON.stringify(mappingOverride) : JSON.stringify({}),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(body.detail ?? `Validation failed (HTTP ${res.status})`);
    }

    return res.json() as Promise<UploadSession>;
  },

  /**
   * GET /api/upload/{uploadId}/preview
   * Fetch 5-row preview and column info for a session.
   */
  async getPreview(uploadId: string): Promise<UploadSession> {
    const res = await fetch(`${API_BASE_URL}/api/upload/${uploadId}/preview`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(body.detail ?? `Preview failed (HTTP ${res.status})`);
    }
    return res.json() as Promise<UploadSession>;
  },

  /**
   * DELETE /api/upload/{uploadId}
   * Remove an upload session and its temp file.
   */
  async deleteSession(uploadId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/upload/${uploadId}`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 204) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(body.detail ?? `Delete failed (HTTP ${res.status})`);
    }
  },

  /**
   * GET /api/upload/schema
   * Fetch the canonical column alias schema for building the mapping UI.
   */
  async getSchema(): Promise<UploadSchema> {
    const res = await fetch(`${API_BASE_URL}/api/upload/schema`);
    if (!res.ok) {
      throw new Error(`Could not fetch column schema (HTTP ${res.status})`);
    }
    return res.json() as Promise<UploadSchema>;
  },
};
