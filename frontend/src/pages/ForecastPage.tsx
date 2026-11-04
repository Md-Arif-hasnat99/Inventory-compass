import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUploadContext } from '../context/UploadContext';
import {
  forecastService,
  inventoryService,
} from '../services';
import {
  DEMO_INVENTORY_ITEMS,
  STORES,
} from '../mocks/demo-data';
import {
  ForecastPoint,
  ForecastSummary,
  SellerForecastPrediction,
  SellerForecastResponse,
} from '../types';
import { PageHeader, SectionHeader, Surface, DataTable, EmptyState, LoadingState, ErrorState } from '../components/ui';
import { Badge } from '../components/ui/Badge';
import { ForecastChart } from '../components/charts/ForecastChart';

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

  const [demoLoading, setDemoLoading] = useState(false);
  const [demoForecastPoints, setDemoForecastPoints] = useState<ForecastPoint[]>([]);
  const [demoSummary, setDemoSummary] = useState<ForecastSummary | null>(null);

  useEffect(() => {
    if (isRealData) {
      loadForecast(horizon);
    }
  }, [isRealData, horizon, loadForecast]);

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

  const realProducts = useMemo(() => {
    if (!activeForecast?.predictions) return [];
    const set = new Set<string>();
    activeForecast.predictions.forEach((p) => {
      if (p.product_id) set.add(p.product_id);
    });
    return Array.from(set);
  }, [activeForecast]);

  const realStores = useMemo(() => {
    if (!activeForecast?.predictions) return [];
    const set = new Set<string>();
    activeForecast.predictions.forEach((p) => {
      if (p.store_id) set.add(p.store_id);
    });
    return Array.from(set);
  }, [activeForecast]);

  useEffect(() => {
    if (isRealData && realProducts.length > 0 && !realProducts.includes(selectedProduct)) {
      setSelectedProduct(realProducts[0]);
    }
  }, [isRealData, realProducts, selectedProduct]);

  const {
    displayPoints,
    displaySummary,
    modelName,
    modelSource,
  } = useMemo(() => {
    if (isRealData) {
      if (activeForecast && activeForecast.predictions && activeForecast.predictions.length > 0) {
        let filtered = activeForecast.predictions;
        if (realProducts.length > 0 && selectedProduct) {
          filtered = filtered.filter((p) => p.product_id === selectedProduct);
        }
        if (selectedStore !== 'ALL') {
          filtered = filtered.filter((p) => p.store_id === selectedStore);
        }

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
        };
      }

      return {
        displayPoints: [] as ForecastPoint[],
        displaySummary: null,
        modelName: activeSession ? 'Pending calculation' : 'None',
        modelSource: 'none',
      };
    }

    return {
      displayPoints: demoForecastPoints,
      displaySummary: demoSummary,
      modelName: demoSummary?.modelUsed ?? 'Linear regression',
      modelSource: 'demo',
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
    DEMO_INVENTORY_ITEMS.find((i) => i.productId === selectedProduct) ?? DEMO_INVENTORY_ITEMS[0];

  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId);
    setSearchParams({ product: productId });
  };

  const loading = isRealData ? forecastLoading : demoLoading;

  if (loading) return <LoadingState message="Generating forecast…" />;
  if (forecastError)
    return (
      <ErrorState
        title="Forecast unavailable"
        message={forecastError}
        onRetry={() => loadForecast(horizon)}
      />
    );

  const displayName = isRealData ? selectedProduct : activeDemoItem.productName;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demand forecast"
        subtitle={
          isRealData && activeSession
            ? `Live data: ${activeSession.display_filename}`
            : 'Demo data — upload your sales data for live forecasts'
        }
        actions={
          isRealData && activeSession ? (
            <button
              onClick={() => loadForecast(horizon)}
              disabled={forecastLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#202522] border border-[#e1e6e1] rounded-md hover:bg-[#f1f3f0] transition-colors disabled:opacity-50"
            >
              Refresh forecast
            </button>
          ) : (
            <a
              href="/workspace/upload"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#2f6b4f] border border-[#2f6b4f] bg-[#e8f1eb] rounded-md hover:bg-[#d9eadc] transition-colors"
            >
              Upload sales data
            </a>
          )
        }
      />

      {/* Mode banner */}
      <Surface>
        <div className="flex items-start gap-3 p-3 rounded-md border text-xs">
          {isRealData && activeSession ? (
            <>
              <span className="flex-shrink-0 text-[#287a50]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-[#202522]">Live seller data</p>
                <p className="text-[#68716b]">{activeSession.display_filename}</p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[#2f6b4f] border-[#e8f1eb] bg-[#e8f1eb] font-medium">
                {modelSource === 'seller_trained' ? 'Store-trained model' : 'Standard engine'}
              </span>
            </>
          ) : (
            <>
              <span className="flex-shrink-0 text-[#a86b16]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-[#202522]">Demo data</p>
                <p className="text-[#68716b]">Synthetic data for demonstration</p>
              </div>
              <a
                href="/workspace/upload"
                className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#2f6b4f] text-[#2f6b4f] text-xs font-semibold hover:bg-[#2f6b4f] hover:text-white transition-colors"
              >
                Upload real data
              </a>
            </>
          )}
        </div>
      </Surface>

      {/* Controls */}
      <Surface compact>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-2">
              Product / SKU
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full h-10 rounded-md border border-[#e1e6e1] bg-white px-3 text-[#202522] focus:border-[#2f6b4f] focus:ring-1 focus:ring-[#e8f1eb]"
            >
              {isRealData && realProducts.length > 0
                ? realProducts.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))
                : DEMO_INVENTORY_ITEMS.map((item) => (
                    <option key={item.productId} value={item.productId}>
                      {item.productId} — {item.productName}
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-2">
              Store location
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full h-10 rounded-md border border-[#e1e6e1] bg-white px-3 text-[#202522] focus:border-[#2f6b4f] focus:ring-1 focus:ring-[#e8f1eb]"
            >
              <option value="ALL">All stores / aggregate</option>
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

          <div className="flex items-end">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-2">
              Forecast horizon
            </label>
            <div className="inline-flex rounded-md border border-[#e1e6e1] bg-white">
              {([7, 14, 30] as const).map((h) => (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    horizon === h
                      ? 'bg-[#2f6b4f] text-white shadow-sm'
                      : 'text-[#68716b] hover:text-[#202522] hover:bg-[#f1f3f0]'
                  }`}
                >
                  {h} days
                </button>
              ))}
            </div>
          </div>
        </div>
      </Surface>

      {/* Metrics */}
      {displaySummary && (
        <Surface compact>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 border-t border-[#e1e6e1] pt-4">
            <div>
              <p className="text-xs text-[#68716b] uppercase tracking-wider">Total forecast</p>
              <p className="text-xl font-bold text-[#202522] tabular-nums">
                {displaySummary.expectedTotalDemand} units
              </p>
            </div>
            <div>
              <p className="text-xs text-[#68716b] uppercase tracking-wider">Daily average</p>
              <p className="text-xl font-bold text-[#202522] tabular-nums">
                {displaySummary.avgDailyDemand} / day
              </p>
            </div>
            <div>
              <p className="text-xs text-[#68716b] uppercase tracking-wider">Peak day</p>
              <p className="text-xl font-bold text-[#202522] tabular-nums">
                {displaySummary.highestDay.demand} units
              </p>
              <p className="text-[10px] text-[#68716b]">
                {displaySummary.highestDay.date.slice(5)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#68716b] uppercase tracking-wider">Trough day</p>
              <p className="text-xl font-bold text-[#202522] tabular-nums">
                {displaySummary.lowestDay.demand} units
              </p>
              <p className="text-[10px] text-[#68716b]">
                {displaySummary.lowestDay.date.slice(5)}
              </p>
            </div>
          </div>
        </Surface>
      )}

      {/* Chart */}
      <Surface>
        <SectionHeader
          title={`Projected demand — ${displayName}`}
          subtitle={`Next ${horizon} days with confidence intervals`}
        />
        <div className="h-64 w-full">
          {displayPoints.length === 0 ? (
            <EmptyState
              title="No forecast available"
              description={
                isRealData
                  ? 'No forecast has been generated for this product yet. Upload sales data or select another product.'
                  : 'Select a product to view its demand forecast.'
              }
            />
          ) : (
            <ForecastChart points={displayPoints} />
          )}
        </div>
      </Surface>

      {/* Table */}
      <SectionHeader title="Forecast schedule" subtitle="Tabular point predictions" />
      <DataTable
        columns={[
          { key: 'date', label: 'Forecast date' },
          { key: 'predictedDemand', label: 'Predicted demand (units)', numeric: true },
          { key: 'lowerBound', label: 'Lower bound (85%)', numeric: true },
          { key: 'upperBound', label: 'Upper bound (85%)', numeric: true },
          { key: 'spread', label: 'Confidence spread', numeric: true },
        ]}
        data={displayPoints.map((pt, i) => ({
          ...pt,
          spread: Math.round(((pt.upperBound ?? 0) - (pt.lowerBound ?? 0)) / 2),
          key: i,
        })) as any}
        rowKey={(i: any) => i.date}
        emptyMessage="No forecast records to display."
      />

      <p className="text-xs text-[#68716b]">
        Model: <span className="font-medium text-[#202522]">{modelName}</span> (
        {modelSource === 'seller_trained' ? 'store-trained' : modelSource === 'demo' ? 'demo' : 'standard'})
      </p>
    </div>
  );
};

export type { ForecastPoint, ForecastSummary, SellerForecastPrediction, SellerForecastResponse };