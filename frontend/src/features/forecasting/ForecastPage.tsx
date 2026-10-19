import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Database,
  Sparkles,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import { PageContainer } from '../../components/layout/PageContainer';
import { forecastService } from '../../services/forecast.service';
import { DEMO_INVENTORY_ITEMS, STORES } from '../../mocks/demo-data';
import { ForecastPoint, ForecastSummary } from '../../types';
import { useUploadContext } from '../../context/UploadContext';

export const ForecastPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProduct = searchParams.get('product') || 'P001';

  const {
    isRealData,
    activeSession,
    activeForecast,
    forecastLoading,
    forecastError,
    loadForecast,
  } = useUploadContext();

  const [selectedProduct, setSelectedProduct] = useState(initialProduct);
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [horizon, setHorizon] = useState<7 | 14 | 30>(7);

  // Demo fallback state
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoForecastPoints, setDemoForecastPoints] = useState<ForecastPoint[]>([]);
  const [demoSummary, setDemoSummary] = useState<ForecastSummary | null>(null);

  // Auto-fetch real forecast when real upload is active or horizon changes
  useEffect(() => {
    if (isRealData) {
      loadForecast(horizon);
    }
  }, [isRealData, horizon, loadForecast]);

  // Fetch demo forecast if not using real data
  useEffect(() => {
    if (!isRealData) {
      setDemoLoading(true);
      forecastService
        .getProductForecast(selectedProduct, horizon)
        .then((res) => {
          setDemoForecastPoints(res.data.points);
          setDemoSummary(res.data.summary);
        })
        .finally(() => setDemoLoading(false));
    }
  }, [isRealData, selectedProduct, horizon]);

  // Extract products available in the real dataset if available
  const realProducts = useMemo(() => {
    if (!activeForecast?.predictions) return [];
    const set = new Set<string>();
    activeForecast.predictions.forEach((p) => {
      if (p.product_id) set.add(p.product_id);
    });
    return Array.from(set);
  }, [activeForecast]);

  // Extract stores available in the real dataset if available
  const realStores = useMemo(() => {
    if (!activeForecast?.predictions) return [];
    const set = new Set<string>();
    activeForecast.predictions.forEach((p) => {
      if (p.store_id) set.add(p.store_id);
    });
    return Array.from(set);
  }, [activeForecast]);

  // If realProducts has items and selectedProduct isn't among them, select the first
  useEffect(() => {
    if (isRealData && realProducts.length > 0 && !realProducts.includes(selectedProduct)) {
      setSelectedProduct(realProducts[0]);
    }
  }, [isRealData, realProducts, selectedProduct]);

  // Compute points and summary for display
  const { displayPoints, displaySummary, modelName, modelSource, realMetrics } = useMemo(() => {
    if (isRealData) {
      if (activeForecast && activeForecast.predictions && activeForecast.predictions.length > 0) {
        let filtered = activeForecast.predictions;
        if (realProducts.length > 0 && selectedProduct) {
          filtered = filtered.filter((p) => p.product_id === selectedProduct);
        }
        if (selectedStore !== 'ALL') {
          filtered = filtered.filter((p) => p.store_id === selectedStore);
        }

        // Group by date if multiple entries remain
        const dateMap = new Map<string, number>();
        filtered.forEach((p) => {
          dateMap.set(p.date, (dateMap.get(p.date) || 0) + p.predicted_demand);
        });

        const dates = Array.from(dateMap.keys()).sort();
        const points: ForecastPoint[] = dates.map((d) => {
          const val = Math.round((dateMap.get(d) || 0) * 10) / 10;
          return {
            date: d,
            predictedDemand: val,
            lowerBound: Math.max(0, Math.round(val * 0.85 * 10) / 10),
            upperBound: Math.round(val * 1.15 * 10) / 10,
          };
        });

        const totalDemand = Math.round(points.reduce((acc, p) => acc + p.predictedDemand, 0));
        const avgDemand = points.length ? Math.round(totalDemand / points.length) : 0;
        let highest = { date: dates[0] || '', demand: 0 };
        let lowest = { date: dates[0] || '', demand: Infinity };

        points.forEach((p) => {
          if (p.predictedDemand > highest.demand) highest = { date: p.date, demand: p.predictedDemand };
          if (p.predictedDemand < lowest.demand) lowest = { date: p.date, demand: p.predictedDemand };
        });
        if (lowest.demand === Infinity) lowest = { date: dates[0] || '', demand: 0 };

        const summary: ForecastSummary = {
          expectedTotalDemand: totalDemand,
          avgDailyDemand: avgDemand,
          highestDay: highest,
          lowestDay: lowest,
          horizonDays: horizon,
          modelUsed: activeForecast.model_type,
        };

        return {
          displayPoints: points,
          displaySummary: summary,
          modelName: activeForecast.model_type,
          modelSource: activeForecast.model_source,
          realMetrics: activeForecast.metrics,
        };
      }

      // If real data mode is active but forecast is not loaded or errored, NEVER fallback to synthetic demo data
      return {
        displayPoints: [] as ForecastPoint[],
        displaySummary: null,
        modelName: activeSession ? 'Pending Calculation' : 'None',
        modelSource: 'none',
        realMetrics: null,
      };
    }

    return {
      displayPoints: demoForecastPoints,
      displaySummary: demoSummary,
      modelName: demoSummary?.modelUsed || 'Linear Regression (Best Champion)',
      modelSource: 'demo',
      realMetrics: null,
    };
  }, [
    isRealData,
    activeForecast,
    activeSession,
    realProducts,
    selectedProduct,
    selectedStore,
    demoForecastPoints,
    demoSummary,
    horizon,
  ]);

  const activeDemoItem =
    DEMO_INVENTORY_ITEMS.find((i) => i.productId === selectedProduct) || DEMO_INVENTORY_ITEMS[0];

  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId);
    setSearchParams({ product: productId });
  };

  const loading = isRealData ? forecastLoading : demoLoading;

  return (
    <PageContainer
      title="Demand Forecasting Intelligence"
      description="Multi-horizon predictive sales projections generated by recursive time-series modeling with uncertainty bounds."
    >
      {/* Mode Banner */}
      {isRealData && activeSession ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-emerald-700 shrink-0" />
            <div>
              <span className="font-bold text-emerald-900">Live Seller Data Active:</span>{' '}
              <span className="text-emerald-800 font-medium">{activeSession.display_filename}</span>
              <span className="text-emerald-700/80 ml-1.5">
                ({activeSession.row_count.toLocaleString()} rows · {activeForecast?.series_count || 1} series)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
              {modelSource === 'seller_trained'
                ? 'Seller-Trained Model'
                : modelSource === 'baseline_heuristic'
                ? 'Baseline Moving Average'
                : 'Pretrained ML Pipeline'}
            </span>
            <Link
              to="/upload"
              className="text-emerald-700 hover:text-emerald-900 font-semibold underline"
            >
              Change Dataset
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
            <div className="text-amber-900">
              <span className="font-bold">Demo Mode Active:</span> Showing synthetic store data for
              demonstration.
            </div>
          </div>
          <Link
            to="/upload"
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md transition-colors shadow-xs"
          >
            Upload Real Shop CSV →
          </Link>
        </div>
      )}

      {/* Warnings Banner if any */}
      {activeForecast?.warnings && activeForecast.warnings.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Notice: </span>
            {activeForecast.warnings.join(' · ')}
          </div>
        </div>
      )}

      {/* Error Callout */}
      {forecastError && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start gap-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Forecasting Error</p>
            <p className="mt-0.5">{forecastError}</p>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Product selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Select Product / SKU
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => handleProductChange(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer min-w-56"
            >
              {isRealData && realProducts.length > 0
                ? realProducts.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))
                : DEMO_INVENTORY_ITEMS.map((item) => (
                    <option key={item.productId} value={item.productId}>
                      {item.productId} — {item.productName} ({item.category})
                    </option>
                  ))}
            </select>
          </div>

          {/* Store selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Store Location
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer min-w-44"
            >
              <option value="ALL">All Stores / Aggregate</option>
              {isRealData && realStores.length > 0
                ? realStores.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))
                : STORES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
            </select>
          </div>
        </div>

        {/* Horizon selector buttons */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Forecast Horizon
          </label>
          <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
            {([7, 14, 30] as const).map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                  horizon === h
                    ? 'bg-white text-emerald-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {h} Days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Model Provenance & Metrics Summary Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700">
              {selectedProduct}
            </span>
            <span className="text-xs text-slate-500">
              Model: <span className="font-semibold text-slate-800">{modelName}</span>
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            {isRealData ? `Forecast for ${selectedProduct}` : activeDemoItem.productName}
          </h2>
          {realMetrics ? (
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Test Metrics:</span>
              <span>MAE: <strong className="text-emerald-700">{realMetrics.mae ?? 'N/A'}</strong></span>
              <span>RMSE: <strong className="text-emerald-700">{realMetrics.rmse ?? 'N/A'}</strong></span>
              {realMetrics.wape != null && (
                <span>WAPE: <strong className="text-emerald-700">{realMetrics.wape}%</strong></span>
              )}
              {realMetrics.r2 != null && (
                <span>R²: <strong className="text-emerald-700">{realMetrics.r2}</strong></span>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-step recursive projection for {horizon} days ahead.
            </p>
          )}
        </div>

        {/* Four Key Forecast Summary Stats */}
        {displaySummary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6 shrink-0">
            <div>
              <span className="block text-[11px] text-slate-500 font-medium">Total Forecast</span>
              <span className="text-base font-bold text-slate-900 tabular-nums">
                {displaySummary.expectedTotalDemand} units
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-500 font-medium">Daily Average</span>
              <span className="text-base font-bold text-slate-900 tabular-nums">
                {displaySummary.avgDailyDemand}/day
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-500 font-medium flex items-center gap-1">
                Peak Day <ArrowUpRight className="w-3 h-3 text-emerald-600" />
              </span>
              <span className="text-base font-bold text-emerald-700 tabular-nums">
                {displaySummary.highestDay.demand} units
              </span>
              <span className="text-[10px] text-slate-400 block">
                {displaySummary.highestDay.date.slice(5)}
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-500 font-medium flex items-center gap-1">
                Trough Day <ArrowDownRight className="w-3 h-3 text-slate-400" />
              </span>
              <span className="text-base font-bold text-slate-600 tabular-nums">
                {displaySummary.lowestDay.demand} units
              </span>
              <span className="text-[10px] text-slate-400 block">
                {displaySummary.lowestDay.date.slice(5)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Forecast Chart */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Projected Daily Demand Curve ({horizon}-Day Horizon)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Recursive multi-step forecast rollout with uncertainty bands.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-2 bg-emerald-100 border border-emerald-300 rounded-xs" /> Band (±15%)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-800 font-medium">
              <span className="w-3 h-0.5 bg-emerald-600 rounded" /> Point Estimate
            </span>
          </div>
        </div>

        <div className="h-80 mt-4">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mr-2 text-emerald-600" />
              Generating recursive multi-step demand predictions...
            </div>
          ) : displayPoints.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
              <AlertCircle className="w-6 h-6 text-slate-400" />
              <p className="font-semibold text-slate-700">No Forecast Predictions Available</p>
              <p className="text-slate-400">
                {forecastError
                  ? 'A backend failure occurred while generating forecast predictions.'
                  : isRealData
                  ? 'No forecast points found for the selected product/store combination.'
                  : 'Select an SKU or click to generate predictions.'}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={displayPoints}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickFormatter={(val: string) => val.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const pt = payload[0].payload as ForecastPoint;
                      return (
                        <div className="bg-white border border-slate-200 rounded-md p-3 shadow-md text-xs">
                          <p className="font-semibold text-slate-800">{label}</p>
                          <div className="mt-1 space-y-1">
                            <p className="text-emerald-700 font-bold text-sm">
                              Expected Demand: {pt.predictedDemand} units
                            </p>
                            <p className="text-slate-500 text-[11px]">
                              Lower Bound: {pt.lowerBound} units
                            </p>
                            <p className="text-slate-500 text-[11px]">
                              Upper Bound: {pt.upperBound} units
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stroke="none"
                  fill="#10b981"
                  fillOpacity={0.12}
                />
                <Area
                  type="monotone"
                  dataKey="lowerBound"
                  stroke="none"
                  fill="#ffffff"
                  fillOpacity={1}
                />
                <Line
                  type="monotone"
                  dataKey="predictedDemand"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#059669' }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Forecast Data Ledger Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Forecast Schedule Ledger</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tabular point predictions and prediction confidence intervals.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Model: {modelName}
          </span>
        </div>

        <div className="overflow-x-auto">
          {displayPoints.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No forecast records to display for the current selection.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Forecast Date</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Predicted Demand (Units)</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Lower Bound (85%)</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Upper Bound (85%)</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Confidence Spread</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayPoints.map((pt) => {
                  const spread = (pt.upperBound || 0) - (pt.lowerBound || 0);
                  return (
                    <tr key={pt.date} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{pt.date}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-800 tabular-nums">
                        {pt.predictedDemand}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-600 tabular-nums">
                        {pt.lowerBound}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-600 tabular-nums">
                        {pt.upperBound}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-400 tabular-nums">
                        ±{Math.round(spread / 2)} units
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageContainer>
  );
};
