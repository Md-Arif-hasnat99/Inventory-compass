import {
  DEMO_DASHBOARD_KPIS,
  DEMO_RISK_DISTRIBUTION,
  DEMO_TOP_PRODUCTS,
  generateDemoTrendData,
} from '../mocks/demo-data';
import {
  DashboardKPIs,
  InventoryRiskDistribution,
  SalesDemandTrendPoint,
  TopProductRow,
} from '../types';
import { ApiResponse } from './api-client';

export const dashboardService = {
  async getKPIs(): Promise<ApiResponse<DashboardKPIs>> {
    // Simulating async network delay for realistic query behavior
    await new Promise((r) => setTimeout(r, 60));
    return {
      data: DEMO_DASHBOARD_KPIS,
      isDemo: true,
      status: 'success',
    };
  },

  async getSalesTrend(): Promise<ApiResponse<SalesDemandTrendPoint[]>> {
    await new Promise((r) => setTimeout(r, 80));
    return {
      data: generateDemoTrendData(),
      isDemo: true,
      status: 'success',
    };
  },

  async getRiskDistribution(): Promise<ApiResponse<InventoryRiskDistribution[]>> {
    await new Promise((r) => setTimeout(r, 50));
    return {
      data: DEMO_RISK_DISTRIBUTION,
      isDemo: true,
      status: 'success',
    };
  },

  async getTopProducts(): Promise<ApiResponse<TopProductRow[]>> {
    await new Promise((r) => setTimeout(r, 50));
    return {
      data: DEMO_TOP_PRODUCTS,
      isDemo: true,
      status: 'success',
    };
  },
};
