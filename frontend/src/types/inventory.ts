export type StockStatus = 'CRITICAL' | 'LOW' | 'HEALTHY' | 'EXCESS';

export interface InventoryItem {
  productId: string;
  productName: string;
  storeId: string;
  category: string;
  region: string;
  currentStock: number;
  avgDailyDemand: number;
  forecastDemand: number;
  supplierLeadTimeDays: number;
  safetyStock: number;
  reorderPoint: number;
  status: StockStatus;
  price: number;
  daysOfStockRemaining: number;
}

export interface ReplenishmentRecommendation {
  productId: string;
  productName: string;
  storeId: string;
  category: string;
  currentStock: number;
  forecastDemand: number;
  leadTimeDays: number;
  safetyStock: number;
  reorderPoint: number;
  suggestedQuantity: number;
  stockoutRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  calculationBreakdown: string;
}
