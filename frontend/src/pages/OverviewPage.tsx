import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUploadContext } from '../context/UploadContext';
import {
  dashboardService,
  inventoryService,
} from '../services';
import type {
  DashboardKPIs,
  InventoryRiskDistribution,
  SalesDemandTrendPoint,
} from '../types/dashboard';
import type { InventoryItem } from '../types/inventory';
import { PageHeader, SectionHeader, DataTable, LoadingState, ErrorState } from '../components/ui';
import { Badge, RiskBadge } from '../components/ui/Badge';
import { DemandChart } from '../components/charts/DemandChart';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { isRealData, activeSession } = useUploadContext();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [trendData, setTrendData] = useState<SalesDemandTrendPoint[]>([]);
  const [riskDist, setRiskDist] = useState<InventoryRiskDistribution[]>([]);
  const [criticalItems, setCriticalItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      dashboardService.getKPIs(),
      dashboardService.getSalesTrend(),
      dashboardService.getRiskDistribution(),
      inventoryService.getInventory({ storeId: 'ALL' }),
    ])
      .then(([kpiRes, trendRes, riskRes, invRes]) => {
        if (cancelled) return;
        setKpis(kpiRes.data);
        setTrendData(trendRes.data);
        setRiskDist(riskRes.data);
        setCriticalItems(
          invRes.data.filter((i) => i.status === 'CRITICAL' || i.status === 'LOW').slice(0, 8)
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LoadingState message="Loading dashboard…" />;
  if (error) return <ErrorState title="Unable to load dashboard" message={error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        subtitle={
          isRealData && activeSession
            ? `Live data: ${activeSession.display_filename} (${activeSession.row_count.toLocaleString()} rows)`
            : 'Demo data — upload your sales data for live insights'
        }
        actions={
          <button
            onClick={() => navigate('/workspace/inventory')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#202522] border border-[#e1e6e1] rounded-md hover:bg-[#f1f3f0] transition-colors"
          >
            View all inventory
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="surface">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-2">Items analyzed</p>
          <p className="text-2xl font-bold text-[#202522] tabular-nums">
            {kpis?.totalUnitsSold?.toLocaleString() ?? '—'}
          </p>
          <p className="text-xs text-[#68716b] mt-2">Total units sold</p>
        </div>
        <div className="surface">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-2">Forecast horizon</p>
          <p className="text-2xl font-bold text-[#202522] tabular-nums">
            {kpis?.forecastHorizonDays ?? '—'} days
          </p>
          <p className="text-xs text-[#68716b] mt-2">Forward projection</p>
        </div>
        <div className="surface">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-2">Products at risk</p>
          <p className="text-2xl font-bold text-[#202522] tabular-nums">
            {kpis?.productsAtRisk ?? '—'}
          </p>
          <p className="text-xs text-[#68716b] mt-2">Critical and low stock</p>
        </div>
        <div className="surface">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-2">Reorder actions</p>
          <p className="text-2xl font-bold text-[#202522] tabular-nums">
            {kpis?.reorderRecommendationsCount ?? '—'}
          </p>
          <p className="text-xs text-[#68716b] mt-2">Purchase orders needed</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 surface">
          <SectionHeader title="Demand overview" subtitle="30-day actual sales vs. 14-day forecast" />
          <DemandChart data={trendData} />
        </div>

        <div className="surface">
          <SectionHeader title="Stock risk distribution" subtitle="Portfolio by days of supply" />
          <div className="space-y-3">
            {riskDist.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <span className="text-sm text-[#202522]">{item.label}</span>
                <div className="flex items-center gap-2">
                  <RiskBadge
                    level={
                      item.status === 'CRITICAL' ? 'HIGH' : item.status === 'LOW' ? 'MEDIUM' : 'LOW'
                    }
                  />
                  <span className="text-sm text-[#68716b]">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Priority table */}
      <SectionHeader title="Replenishment priority" subtitle="Items that need your attention" />
      <DataTable
        columns={[
          { key: 'productName', label: 'Product' },
          { key: 'storeId', label: 'Store' },
          { key: 'currentStock', label: 'Current stock', numeric: true },
          { key: 'forecastDemand', label: 'Daily demand', numeric: true },
          { key: 'daysOfStockRemaining', label: 'Days left', numeric: true },
          {
            key: 'status',
            label: 'Risk',
            render: (item) => {
              const v:
                | 'critical'
                | 'low'
                | 'healthy'
                | 'excess'
                | 'neutral' =
                item.status === 'CRITICAL'
                  ? 'critical'
                  : item.status === 'LOW'
                  ? 'low'
                  : item.status === 'HEALTHY'
                  ? 'healthy'
                  : 'excess';
              return <Badge variant={v}>{item.status}</Badge>;
            },
          },
          { key: 'action', label: 'Action', render: () => null },
        ]}
        data={criticalItems}
        rowKey={(i) => i.productId}
        emptyMessage="No items require immediate replenishment."
      />
    </div>
  );
};

export { DashboardKPIs, InventoryItem, InventoryRiskDistribution, SalesDemandTrendPoint };