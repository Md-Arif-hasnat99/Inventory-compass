import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUploadContext } from '../context/UploadContext';
import { inventoryService } from '../services';
import { STORES } from '../mocks/demo-data';
import { ReplenishmentRecommendation } from '../types';
import {
  PageHeader,
  SectionHeader,
  Surface,
  DataTable,
  EmptyState,
  LoadingState,
  ErrorState,
} from '../components/ui';
import { RiskBadge } from '../components/ui/Badge';

export const ReplenishmentPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    isRealData,
    activeSession,
    activeReplenishment,
    replenishmentLoading,
    replenishmentError,
    loadReplenishment,
  } = useUploadContext();

  const [leadTimeDays, setLeadTimeDays] = useState<number>(3);
  const [safetyStockDays, setSafetyStockDays] = useState<number>(2);
  const [copied, setCopied] = useState(false);

  const [demoRecs, setDemoRecs] = useState<ReplenishmentRecommendation[]>([]);
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    if (isRealData) {
      loadReplenishment(leadTimeDays, safetyStockDays, 7);
    }
  }, [isRealData, leadTimeDays, safetyStockDays, loadReplenishment]);

  useEffect(() => {
    if (!isRealData) {
      setDemoLoading(true);
      inventoryService
        .getReplenishmentRecommendations('ALL')
        .then((res) => setDemoRecs(res.data))
        .finally(() => setDemoLoading(false));
    }
  }, [isRealData]);

  const items = (isRealData
    ? activeReplenishment?.recommendations ?? []
    : demoRecs) as any[];

  const highRiskCount = items.filter((r) => r.stockout_risk === 'HIGH').length;
  const totalUnits = items.reduce((acc, r) => acc + (isRealData ? r.recommended_reorder_qty : r.suggestedQuantity), 0);

  const loading = isRealData ? replenishmentLoading : demoLoading;

  const handleExportCSV = () => {
    const headers = [
      'Product ID',
      'Store',
      'Current Stock',
      'Daily Demand',
      'Lead Time (Days)',
      'Safety Stock',
      'Reorder Point',
      'Suggested Qty',
      'Risk',
    ];

    const rows = items.map((r) => [
      isRealData ? (r.product_id || 'Unknown') : r.productId,
      isRealData ? (r.store_id || 'All') : r.storeId,
      isRealData ? r.current_inventory : r.currentStock,
      isRealData ? r.daily_demand : r.forecastDemand,
      isRealData ? r.lead_time_days : r.leadTimeDays,
      isRealData ? r.safety_stock : r.safetyStock,
      isRealData ? r.reorder_point : r.reorderPoint,
      isRealData ? r.recommended_reorder_qty : r.suggestedQuantity,
      isRealData ? r.stockout_risk : r.stockoutRisk,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'replenishment_orders.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <LoadingState message="Calculating replenishment…" />;
  if (replenishmentError)
    return <ErrorState title="Replenishment unavailable" message={replenishmentError} />;

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Replenishment"
          subtitle="Purchase order recommendations based on lead-time demand and safety stock"
        />
        <EmptyState
          title="No replenishment recommendations"
          description={
            isRealData
              ? 'No items require replenishment at the current settings. Adjust lead time or safety stock and refresh.'
              : 'Upload your sales data to see replenishment recommendations.'
          }
          action={
            <button
              onClick={() => loadReplenishment(leadTimeDays, safetyStockDays, 7)}
              disabled={!isRealData}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#2f6b4f] text-[#2f6b4f] font-medium hover:bg-[#2f6b4f] hover:text-white transition-colors disabled:opacity-50"
            >
              {isRealData ? 'Refresh' : 'Upload data'}
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Replenishment"
        subtitle="Purchase order recommendations based on lead-time demand and safety stock"
        actions={
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#e1e6e1] text-sm font-medium text-[#202522] hover:bg-[#f1f3f0] transition-colors"
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            )}
            <span>{copied ? 'Exported CSV' : 'Export PO draft (CSV)'}</span>
          </button>
        }
      />

      {/* Mode banner */}
      <Surface>
        <div className="flex items-start gap-3 p-3 rounded-md border text-xs">
          {isRealData && activeSession ? (
            <>
              <span className="flex-shrink-0 text-[#287a50]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-[#202522]">Live seller data</p>
                <p className="text-[#68716b]">{activeSession.display_filename}</p>
              </div>
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

      {/* Policy controls */}
      <Surface compact>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-2">
              Supplier lead time (days)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(Math.max(1, Number(e.target.value)))}
              className="w-full h-10 rounded-md border border-[#e1e6e1] bg-white px-3 text-[#202522] focus:border-[#2f6b4f] focus:ring-1 focus:ring-[#e8f1eb]"
              disabled={!isRealData}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-2">
              Safety stock buffer (days)
            </label>
            <input
              type="number"
              min="0"
              max="30"
              value={safetyStockDays}
              onChange={(e) => setSafetyStockDays(Math.max(0, Number(e.target.value)))}
              className="w-full h-10 rounded-md border border-[#e1e6e1] bg-white px-3 text-[#202522] focus:border-[#2f6b4f] focus:ring-1 focus:ring-[#e8f1eb]"
              disabled={!isRealData}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => loadReplenishment(leadTimeDays, safetyStockDays, 7)}
              disabled={!isRealData || replenishmentLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#2f6b4f] text-[#2f6b4f] font-medium hover:bg-[#2f6b4f] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Refresh calculations
            </button>
          </div>
        </div>
        <div className="mt-3 text-xs text-[#68716b]">
          Reorder point formula: (daily demand × lead time) + safety stock
        </div>
      </Surface>

      {/* KPI summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="surface compact">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-2">Items evaluated</p>
          <p className="text-2xl font-bold text-[#202522] tabular-nums">
            {items.length} SKUs
          </p>
          <p className="text-xs text-[#b54747] mt-1 font-medium">
            {highRiskCount} high stockout risk
          </p>
        </div>
        <div className="surface compact">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-2">Total order volume</p>
          <p className="text-2xl font-bold text-[#202522] tabular-nums">
            {totalUnits} units
          </p>
          <p className="text-xs text-[#68716b] mt-1">Recommended purchase quantity</p>
        </div>
        <div className="surface compact">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-2">Configured lead time</p>
          <p className="text-2xl font-bold text-[#202522] tabular-nums">
            {leadTimeDays} days
          </p>
          <p className="text-xs text-[#68716b] mt-1">
            Buffer: +{safetyStockDays} days safety stock
          </p>
        </div>
      </div>

      {/* Table */}
      <SectionHeader title="Recommended purchase orders" subtitle="Review and authorize before stock runs out" />
      <DataTable
        columns={[
          { key: 'product', label: 'SKU / Product' },
          { key: 'store', label: 'Store' },
          { key: 'currentStock', label: 'Current stock', numeric: true },
          { key: 'dailyDemand', label: 'Daily demand', numeric: true },
          { key: 'leadTime', label: 'Lead time (days)', numeric: true },
          { key: 'reorderPoint', label: 'Reorder point', numeric: true },
          { key: 'suggestedQty', label: 'Suggested qty', numeric: true },
          { key: 'risk', label: 'Stockout risk' },
          { key: 'breakdown', label: 'Calculation' },
        ]}
        data={items.map((r, i) => ({
          key: i,
          product: isRealData ? (r.product_id || 'Global series') : r.productName,
          store: isRealData ? (r.store_id || 'All') : r.storeId,
          currentStock: isRealData ? r.current_inventory : r.currentStock,
          dailyDemand: isRealData ? r.daily_demand : r.forecastDemand,
          leadTime: isRealData ? r.lead_time_days : r.leadTimeDays,
          reorderPoint: isRealData ? r.reorder_point : r.reorderPoint,
          suggestedQty: isRealData ? r.recommended_reorder_qty : r.suggestedQuantity,
          risk: isRealData ? r.stockout_risk : r.stockoutRisk,
          breakdown: isRealData
            ? `LTD(${r.expected_lead_demand}) + SS(${r.safety_stock}) = ROP(${r.reorder_point})`
            : r.calculationBreakdown,
        })) as any}
        rowKey={(i: any) => i.key}
        emptyMessage="No replenishment items to display."
      />
    </div>
  );
};