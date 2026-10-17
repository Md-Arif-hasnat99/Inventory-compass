/**
 * Deterministic Demo Dataset for Inventory Compass
 *
 * NOTE: These sample records are explicitly labeled DEMO DATA for frontend development
 * and demonstration purposes until live FastAPI integration is completed.
 *
 * Model benchmark numbers and metadata below represent the actual results obtained
 * from training on backend/data/raw/retail_store_inventory.csv.
 */

import {
  DashboardKPIs,
  ForecastPoint,
  ForecastSummary,
  InventoryItem,
  InventoryRiskDistribution,
  ModelBenchmark,
  ModelMetadata,
  ReplenishmentRecommendation,
  SalesDemandTrendPoint,
  TopProductRow,
} from '../types';

export const STORES = [
  { id: 'ALL', name: 'All Stores' },
  { id: 'S001', name: 'Store 1 (Downtown Urban)' },
  { id: 'S002', name: 'Store 2 (Suburban Metro)' },
  { id: 'S003', name: 'Store 3 (North Mall)' },
  { id: 'S004', name: 'Store 4 (East Gateway)' },
  { id: 'S005', name: 'Store 5 (Harbor Center)' },
];

export const CATEGORIES = [
  'All Categories',
  'Clothing',
  'Electronics',
  'Groceries',
  'Home Goods',
  'Sports',
];

export const DEMO_INVENTORY_ITEMS: InventoryItem[] = [
  {
    productId: 'P001',
    productName: 'Organic Cotton Crew Tee',
    storeId: 'S001',
    category: 'Clothing',
    region: 'North',
    currentStock: 48,
    avgDailyDemand: 22,
    forecastDemand: 26,
    supplierLeadTimeDays: 4,
    safetyStock: 30,
    reorderPoint: 134, // (26 * 4) + 30 = 134
    status: 'CRITICAL',
    price: 24.50,
    daysOfStockRemaining: 1.8,
  },
  {
    productId: 'P002',
    productName: 'Wireless ANC Headphones',
    storeId: 'S001',
    category: 'Electronics',
    region: 'North',
    currentStock: 35,
    avgDailyDemand: 8,
    forecastDemand: 10,
    supplierLeadTimeDays: 7,
    safetyStock: 16,
    reorderPoint: 86, // (10 * 7) + 16 = 86
    status: 'CRITICAL',
    price: 129.99,
    daysOfStockRemaining: 3.5,
  },
  {
    productId: 'P003',
    productName: 'Artisan Whole Bean Coffee (1kg)',
    storeId: 'S002',
    category: 'Groceries',
    region: 'East',
    currentStock: 95,
    avgDailyDemand: 18,
    forecastDemand: 20,
    supplierLeadTimeDays: 5,
    safetyStock: 25,
    reorderPoint: 125, // (20 * 5) + 25 = 125
    status: 'LOW',
    price: 18.00,
    daysOfStockRemaining: 4.75,
  },
  {
    productId: 'P004',
    productName: 'Ergonomic Mesh Task Chair',
    storeId: 'S003',
    category: 'Home Goods',
    region: 'West',
    currentStock: 42,
    avgDailyDemand: 5,
    forecastDemand: 6,
    supplierLeadTimeDays: 8,
    safetyStock: 10,
    reorderPoint: 58, // (6 * 8) + 10 = 58
    status: 'LOW',
    price: 189.00,
    daysOfStockRemaining: 7.0,
  },
  {
    productId: 'P005',
    productName: 'Stainless Steel Insulated Bottle',
    storeId: 'S002',
    category: 'Sports',
    region: 'East',
    currentStock: 210,
    avgDailyDemand: 15,
    forecastDemand: 16,
    supplierLeadTimeDays: 6,
    safetyStock: 25,
    reorderPoint: 121,
    status: 'HEALTHY',
    price: 28.00,
    daysOfStockRemaining: 13.1,
  },
  {
    productId: 'P006',
    productName: 'USB-C Fast Charging Hub (6-in-1)',
    storeId: 'S004',
    category: 'Electronics',
    region: 'South',
    currentStock: 180,
    avgDailyDemand: 12,
    forecastDemand: 14,
    supplierLeadTimeDays: 5,
    safetyStock: 20,
    reorderPoint: 90,
    status: 'HEALTHY',
    price: 49.50,
    daysOfStockRemaining: 12.8,
  },
  {
    productId: 'P007',
    productName: 'Linen Casual Oxford Shirt',
    storeId: 'S001',
    category: 'Clothing',
    region: 'North',
    currentStock: 240,
    avgDailyDemand: 14,
    forecastDemand: 15,
    supplierLeadTimeDays: 7,
    safetyStock: 25,
    reorderPoint: 130,
    status: 'HEALTHY',
    price: 54.00,
    daysOfStockRemaining: 16.0,
  },
  {
    productId: 'P008',
    productName: 'Ceramic Pour-Over Dripper Set',
    storeId: 'S005',
    category: 'Home Goods',
    region: 'Central',
    currentStock: 520,
    avgDailyDemand: 6,
    forecastDemand: 7,
    supplierLeadTimeDays: 6,
    safetyStock: 15,
    reorderPoint: 57,
    status: 'EXCESS',
    price: 36.00,
    daysOfStockRemaining: 74.2,
  },
  {
    productId: 'P009',
    productName: 'Extra Virgin Greek Olive Oil 750ml',
    storeId: 'S003',
    category: 'Groceries',
    region: 'West',
    currentStock: 480,
    avgDailyDemand: 8,
    forecastDemand: 9,
    supplierLeadTimeDays: 4,
    safetyStock: 18,
    reorderPoint: 54,
    status: 'EXCESS',
    price: 16.50,
    daysOfStockRemaining: 53.3,
  },
  {
    productId: 'P010',
    productName: 'Yoga Mat High-Density Foam',
    storeId: 'S004',
    category: 'Sports',
    region: 'South',
    currentStock: 22,
    avgDailyDemand: 9,
    forecastDemand: 11,
    supplierLeadTimeDays: 5,
    safetyStock: 18,
    reorderPoint: 73,
    status: 'CRITICAL',
    price: 32.00,
    daysOfStockRemaining: 2.0,
  },
];

export const DEMO_REPLENISHMENT_RECOMMENDATIONS: ReplenishmentRecommendation[] = DEMO_INVENTORY_ITEMS
  .filter((i) => i.status === 'CRITICAL' || i.status === 'LOW')
  .map((item) => {
    const suggested = Math.max(0, Math.ceil(item.reorderPoint - item.currentStock));
    const isCritical = item.status === 'CRITICAL';
    return {
      productId: item.productId,
      productName: item.productName,
      storeId: item.storeId,
      category: item.category,
      currentStock: item.currentStock,
      forecastDemand: item.forecastDemand,
      leadTimeDays: item.supplierLeadTimeDays,
      safetyStock: item.safetyStock,
      reorderPoint: item.reorderPoint,
      suggestedQuantity: suggested,
      stockoutRisk: isCritical ? 'HIGH' : 'MEDIUM',
      reason: isCritical
        ? `Stock (${item.currentStock} units) falls short of expected demand during lead time (${item.forecastDemand * item.supplierLeadTimeDays} units). Stockout imminent without expedited order.`
        : `Inventory level is within reorder threshold buffer. Order now to arrive before safety stock buffer is eroded.`,
      calculationBreakdown: `Reorder Point = (${item.forecastDemand} daily demand × ${item.supplierLeadTimeDays}d lead time) + ${item.safetyStock} safety buffer = ${item.reorderPoint} units. Suggested = ${item.reorderPoint} - ${item.currentStock} = ${suggested} units.`,
    };
  });

export const DEMO_DASHBOARD_KPIS: DashboardKPIs = {
  totalUnitsSold: 73840,
  totalRevenue: 3412500,
  forecastedDemand: 14250,
  forecastHorizonDays: 14,
  productsAtRisk: DEMO_INVENTORY_ITEMS.filter((i) => i.status === 'CRITICAL' || i.status === 'LOW').length,
  reorderRecommendationsCount: DEMO_REPLENISHMENT_RECOMMENDATIONS.length,
  criticalStockCount: DEMO_INVENTORY_ITEMS.filter((i) => i.status === 'CRITICAL').length,
  lowStockCount: DEMO_INVENTORY_ITEMS.filter((i) => i.status === 'LOW').length,
};

export const DEMO_RISK_DISTRIBUTION: InventoryRiskDistribution[] = [
  { status: 'CRITICAL', label: 'Critical Risk', count: 3, percentage: 30, color: '#ef4444' },
  { status: 'LOW', label: 'Low Buffer', count: 2, percentage: 20, color: '#f59e0b' },
  { status: 'HEALTHY', label: 'Healthy Target', count: 3, percentage: 30, color: '#10b981' },
  { status: 'EXCESS', label: 'Excess Surplus', count: 2, percentage: 20, color: '#6366f1' },
];

export const DEMO_TOP_PRODUCTS: TopProductRow[] = [
  { productId: 'P001', productName: 'Organic Cotton Crew Tee', category: 'Clothing', unitsSold: 4210, revenue: 103145, currentStock: 48, status: 'CRITICAL' },
  { productId: 'P003', productName: 'Artisan Whole Bean Coffee', category: 'Groceries', unitsSold: 3890, revenue: 70020, currentStock: 95, status: 'LOW' },
  { productId: 'P005', productName: 'Stainless Steel Insulated Bottle', category: 'Sports', unitsSold: 3120, revenue: 87360, currentStock: 210, status: 'HEALTHY' },
  { productId: 'P002', productName: 'Wireless ANC Headphones', category: 'Electronics', unitsSold: 2840, revenue: 369171, currentStock: 35, status: 'CRITICAL' },
  { productId: 'P007', productName: 'Linen Casual Oxford Shirt', category: 'Clothing', unitsSold: 2450, revenue: 132300, currentStock: 240, status: 'HEALTHY' },
];

/**
 * Historical 30-day actual sales + 14-day forecasted sales trend
 */
export function generateDemoTrendData(): SalesDemandTrendPoint[] {
  const points: SalesDemandTrendPoint[] = [];
  const baseDate = new Date('2023-09-01');

  // 30 days of historical sales
  for (let i = 0; i < 30; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    // Weekly cyclic pattern + random variation
    const dayOfWeek = d.getDay();
    const weekendBoost = (dayOfWeek === 0 || dayOfWeek === 6) ? 35 : 0;
    const actual = Math.round(110 + weekendBoost + Math.sin(i / 2) * 15 + ((i * 7) % 19));

    points.push({
      date: dateStr,
      actualSales: actual,
      forecastDemand: null,
      isForecast: false,
    });
  }

  // Last historical day connects to first forecast day
  const lastActual = points[points.length - 1].actualSales;
  const lastDate = new Date(points[points.length - 1].date);

  // 14 days of forward forecast
  for (let j = 1; j <= 14; j++) {
    const d = new Date(lastDate);
    d.setDate(lastDate.getDate() + j);
    const dateStr = d.toISOString().slice(0, 10);
    const dayOfWeek = d.getDay();
    const weekendBoost = (dayOfWeek === 0 || dayOfWeek === 6) ? 30 : 0;
    const predicted = Math.round(112 + weekendBoost + Math.sin((30 + j) / 2) * 12);

    points.push({
      date: dateStr,
      actualSales: j === 1 ? lastActual : null,
      forecastDemand: predicted,
      lowerBound: Math.max(0, predicted - 18),
      upperBound: predicted + 18,
      isForecast: true,
    });
  }

  return points;
}

/**
 * Product-specific forecast generator supporting 7, 14, 30 days
 */
export function generateProductForecast(
  productId: string,
  horizonDays: 7 | 14 | 30 = 14
): { points: ForecastPoint[]; summary: ForecastSummary } {
  const item = DEMO_INVENTORY_ITEMS.find((i) => i.productId === productId) || DEMO_INVENTORY_ITEMS[0];
  const baseDaily = item.forecastDemand;
  const points: ForecastPoint[] = [];

  let total = 0;
  let highest = { date: '', demand: -1 };
  let lowest = { date: '', demand: 999999 };

  const today = new Date('2023-10-01');

  for (let i = 1; i <= horizonDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayOfWeek = d.getDay();
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.25 : 0.95;
    const noise = ((i * 13) % 7) - 3;
    const predicted = Math.max(1, Math.round(baseDaily * weekendFactor + noise));

    total += predicted;
    if (predicted > highest.demand) highest = { date: dateStr, demand: predicted };
    if (predicted < lowest.demand) lowest = { date: dateStr, demand: predicted };

    points.push({
      date: dateStr,
      predictedDemand: predicted,
      lowerBound: Math.max(0, Math.round(predicted * 0.85)),
      upperBound: Math.round(predicted * 1.15),
    });
  }

  return {
    points,
    summary: {
      expectedTotalDemand: total,
      avgDailyDemand: Math.round((total / horizonDays) * 10) / 10,
      highestDay: highest,
      lowestDay: lowest,
      horizonDays,
      modelUsed: 'Linear Regression (Best Champion Pipeline)',
    },
  };
}

/**
 * Real Model Benchmarks and Metadata from our ML execution
 */
export const REAL_MODEL_BENCHMARKS: ModelBenchmark[] = [
  { modelName: 'Naive Baseline (lag-1)', mae: 121.77, rmse: 156.14, wape: 89.07, split: 'Val', trainTimeSec: 0.0, isChampion: false },
  { modelName: 'Seasonal Naive (lag-7)', mae: 120.44, rmse: 154.91, wape: 88.10, split: 'Val', trainTimeSec: 0.0, isChampion: false },
  { modelName: 'Linear Regression', mae: 68.75, rmse: 88.02, wape: 50.29, split: 'Val', trainTimeSec: 0.04, isChampion: true },
  { modelName: 'Random Forest', mae: 68.84, rmse: 88.30, wape: 50.36, split: 'Val', trainTimeSec: 12.87, isChampion: false },
  { modelName: 'HistGradientBoosting', mae: 68.91, rmse: 88.31, wape: 50.41, split: 'Val', trainTimeSec: 0.44, isChampion: false },
  { modelName: 'XGBoost', mae: 69.31, rmse: 89.17, wape: 50.70, split: 'Val', trainTimeSec: 1.89, isChampion: false },
];

export const REAL_MODEL_METADATA: ModelMetadata = {
  modelType: 'Linear Regression',
  targetVariable: 'Units Sold',
  forecastHorizon: '1 day ahead (t+1 recursive multi-step)',
  featureNames: [
    'day_of_week', 'day_of_month', 'month', 'week_of_year', 'is_weekend', 'quarter',
    'lag_1', 'lag_7', 'lag_14', 'roll_mean_7', 'roll_mean_14', 'roll_mean_30', 'roll_std_7',
    'store_enc', 'product_enc', 'category_enc', 'region_enc', 'weather_enc', 'season_enc',
    'Price', 'Discount', 'Inventory Level', 'Holiday/Promotion', 'Competitor Pricing'
  ],
  nFeatures: 24,
  trainingCutoffDate: '2023-05-27',
  valCutoffDate: '2023-09-14',
  trainRows: 50400,
  valRows: 11000,
  testRows: 11000,
  valMae: 68.745,
  valRmse: 88.016,
  valWape: 50.286,
  testMae: 68.777,
  testRmse: 87.801,
  testWape: 50.410,
  dataset: 'retail_store_inventory.csv (73,000 rows across 5 stores & 20 products)',
  datasetNote: 'Real benchmark computed via strict chronological split (70% train / 15% val / 15% test). Zero future data leakage.',
  trainedAt: '2026-10-17T22:55:21',
  excludedFeatures: ['Demand Forecast (unverified provenance & negative anomalies in raw data)'],
};
