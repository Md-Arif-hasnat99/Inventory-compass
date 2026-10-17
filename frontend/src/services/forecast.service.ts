import { generateProductForecast } from '../mocks/demo-data';
import { ForecastPoint, ForecastSummary } from '../types';
import { ApiResponse } from './api-client';

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
};
