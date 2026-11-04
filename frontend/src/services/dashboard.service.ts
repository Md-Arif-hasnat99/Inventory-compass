/**
 * Dashboard service — backed by deterministic demo data.
 * All methods return structured demo responses; none call a backend endpoint.
 */

import {
  DEMO_DASHBOARD_KPIS,
  DEMO_RISK_DISTRIBUTION,
  generateDemoTrendData,
} from '../mocks/demo-data';
import {
  DashboardKPIs,
  InventoryRiskDistribution,
  SalesDemandTrendPoint,
} from '../types';
import { API_BASE_URL, ApiResponse } from './api-client';

export const dashboardService = {
  async getKPIs(): Promise<ApiResponse<DashboardKPIs>> {
    await new Promise((r) => setTimeout(r, 60));
    return { data: DEMO_DASHBOARD_KPIS, isDemo: true, status: 'success' };
  },

  async getSalesTrend(): Promise<ApiResponse<SalesDemandTrendPoint[]>> {
    await new Promise((r) => setTimeout(r, 60));
    return { data: generateDemoTrendData(), isDemo: true, status: 'success' };
  },

  async getRiskDistribution(): Promise<ApiResponse<InventoryRiskDistribution[]>> {
    await new Promise((r) => setTimeout(r, 60));
    return { data: DEMO_RISK_DISTRIBUTION, isDemo: true, status: 'success' };
  },

  async getTopProducts(): Promise<ApiResponse<any[]>> {
    await new Promise((r) => setTimeout(r, 60));
    return { data: [], isDemo: true, status: 'success' };
  },
};

export const API_BASE_URL_DASHBOARD = API_BASE_URL;