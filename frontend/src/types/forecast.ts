export interface ForecastPoint {
  date: string;
  predictedDemand: number;
  actualDemand?: number;
  lowerBound?: number;
  upperBound?: number;
}

export interface ForecastSummary {
  expectedTotalDemand: number;
  avgDailyDemand: number;
  highestDay: { date: string; demand: number };
  lowestDay: { date: string; demand: number };
  horizonDays: number;
  modelUsed: string;
}

export interface ForecastFilter {
  productId: string;
  storeId: string;
  horizonDays: 7 | 14 | 30;
  startDate?: string;
}
