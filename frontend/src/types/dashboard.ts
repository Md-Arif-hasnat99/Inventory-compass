import { StockStatus } from './inventory';

export interface DashboardKPIs {
  totalUnitsSold: number;
  totalRevenue: number;
  forecastedDemand: number;
  forecastHorizonDays: number;
  productsAtRisk: number;
  reorderRecommendationsCount: number;
  criticalStockCount: number;
  lowStockCount: number;
}

export interface SalesDemandTrendPoint {
  date: string;
  actualSales: number | null;
  forecastDemand: number | null;
  lowerBound?: number | null;
  upperBound?: number | null;
  isForecast: boolean;
}

export interface InventoryRiskDistribution {
  status: StockStatus;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface TopProductRow {
  productId: string;
  productName: string;
  category: string;
  unitsSold: number;
  revenue: number;
  currentStock: number;
  status: StockStatus;
}
