import { generateProductForecast } from '../mocks/demo-data';
import { ForecastPoint, ForecastSummary, SellerForecastResponse } from '../types';
import { API_BASE_URL, ApiResponse } from './api-client';

export const forecastService = {
  async getProductForecast(
    productId: string,
    horizonDays: 7 | 14 | 30 = 14
  ): Promise<ApiResponse<{ points: ForecastPoint[]; summary: ForecastSummary }>> {
    await new Promise((r) => setTimeout(r, 70));
    const result = generateProductForecast(productId, horizonDays);
    return {
      data: result,
      isDemo: true,
      status: 'success',
    };
  },

  /**
   * Request multi-step recursive demand forecast for an uploaded dataset.
   * Directly calls FastAPI POST /api/forecast/{upload_id}.
   */
  async getSellerForecast(
    uploadId: string,
    horizonDays: 7 | 14 | 30 = 7,
    modelPreference: string = 'auto',
    storeId?: string,
    productId?: string
  ): Promise<SellerForecastResponse> {
    const res = await fetch(`${API_BASE_URL}/api/forecast/${uploadId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        horizon_days: horizonDays,
        model_preference: modelPreference,
        store_id: storeId || undefined,
        product_id: productId || undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Forecast request failed (${res.status})`);
    }

    return res.json();
  },
};