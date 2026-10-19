import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Database,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

import { PageContainer } from '../../components/layout/PageContainer';
import { Badge } from '../../components/ui/Badge';
import { inventoryService } from '../../services/inventory.service';
import { ReplenishmentRecommendation } from '../../types';
import { useUploadContext } from '../../context/UploadContext';

interface ReplenishmentPageProps {
  selectedStore: string;
}

export const ReplenishmentPage: React.FC<ReplenishmentPageProps> = ({ selectedStore }) => {
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

  // Demo fallback state
  const [demoRecs, setDemoRecs] = useState<ReplenishmentRecommendation[]>([]);
  const [demoLoading, setDemoLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // When real data is active, load live replenishment recommendations
  useEffect(() => {
    if (isRealData) {
      loadReplenishment(leadTimeDays, safetyStockDays, 7);
    }
  }, [isRealData, leadTimeDays, safetyStockDays, loadReplenishment]);

  // Load demo data if no real upload is active
  useEffect(() => {
    if (!isRealData) {
      setDemoLoading(true);
      inventoryService
        .getReplenishmentRecommendations(selectedStore)
        .then((res) => setDemoRecs(res.data))
        .finally(() => setDemoLoading(false));
    }
  }, [isRealData, selectedStore]);

  // Filter recommendations by selectedStore if not ALL
  const displayRealItems = useMemo(() => {
    if (!activeReplenishment?.recommendations) return [];
    if (selectedStore === 'ALL') return activeReplenishment.recommendations;
    return activeReplenishment.recommendations.filter(
      (r) => String(r.store_id) === String(selectedStore)
    );
  }, [activeReplenishment, selectedStore]);

  const totalUnitsToOrder = isRealData
    ? displayRealItems.reduce((acc, r) => acc + r.recommended_reorder_qty, 0)
    : demoRecs.reduce((acc, r) => acc + r.suggestedQuantity, 0);

  const highRiskCount = isRealData
    ? displayRealItems.filter((r) => r.stockout_risk === 'HIGH').length
    : demoRecs.filter((r) => r.stockoutRisk === 'HIGH').length;

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

    const rows = isRealData
      ? displayRealItems.map((r) => [
          r.product_id || 'Unknown',
          r.store_id || 'All',
          r.current_inventory,
          r.daily_demand,
          r.lead_time_days,
          r.safety_stock,
          r.reorder_point,
          r.recommended_reorder_qty,
          r.stockout_risk,
        ])
      : demoRecs.map((r) => [
          r.productId,
          r.storeId,
          r.currentStock,
          r.forecastDemand,
          r.leadTimeDays,
          r.safetyStock,
          r.reorderPoint,
          r.suggestedQuantity,
          r.stockoutRisk,
        ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `replenishment_orders_${selectedStore}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loading = isRealData ? replenishmentLoading : demoLoading;

  return (
    <PageContainer
      title="Purchase Replenishment Recommendations"
      description="Systematic purchase order suggestions generated from expected lead-time demand, forecast velocity, and safety stock buffers."
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md shadow-xs transition-colors cursor-pointer"
          >
            {copied ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            )}
            <span>{copied ? 'Exported CSV!' : 'Export PO Draft (CSV)'}</span>
          </button>
        </div>
      }
    >
      {/* Mode Status Banner */}
      {isRealData && activeSession ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-emerald-700 shrink-0" />
            <div>
              <span className="font-bold text-emerald-900">Real Replenishment Active:</span>{' '}
              <span className="text-emerald-800 font-medium">{activeSession.display_filename}</span>
              <span className="text-emerald-700/80 ml-1.5">
                ({displayRealItems.length} SKUs evaluated)
              </span>
            </div>
          </div>
          <Link
            to="/upload"
            className="text-emerald-700 hover:text-emerald-900 font-semibold underline text-xs"
          >
            Manage Upload
          </Link>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
            <div className="text-amber-900">
              <span className="font-bold">Demo Mode Active:</span> Showing synthetic inventory
              replenishment recommendations.
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
      {activeReplenishment?.warnings && activeReplenishment.warnings.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Notice: </span>
            {activeReplenishment.warnings.join(' · ')}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {replenishmentError && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Replenishment Engine Error</p>
            <p className="mt-0.5">{replenishmentError}</p>
          </div>
        </div>
      )}

      {/* Interactive Policy Controls */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Supplier Lead Time (Days)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(Math.max(1, Number(e.target.value)))}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md text-slate-800 w-24 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Safety Stock Buffer (Days)
            </label>
            <input
              type="number"
              min="0"
              max="30"
              value={safetyStockDays}
              onChange={(e) => setSafetyStockDays(Math.max(0, Number(e.target.value)))}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md text-slate-800 w-24 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500 max-w-sm">
          <p className="font-semibold text-slate-700">Formula Breakdown:</p>
          <code className="text-[11px] bg-slate-50 px-1 py-0.5 rounded text-emerald-800 font-mono">
            ROP = (Daily Forecast × {leadTimeDays}d) + (Daily Forecast × {safetyStockDays}d)
          </code>
        </div>
      </div>

      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Items Evaluated</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {isRealData ? displayRealItems.length : demoRecs.length} SKUs
          </div>
          <span className="text-xs text-red-600 font-medium mt-1 block">
            {highRiskCount} High Stockout Risk
          </span>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Total Recommended Order Volume
          </span>
          <div className="text-2xl font-bold text-emerald-700 mt-2">
            {totalUnitsToOrder.toLocaleString()} Units
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Total replenishment units calculated across items
          </span>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Configured Lead Time</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">{leadTimeDays} Days</div>
          <span className="text-xs text-slate-500 mt-1 block">
            Buffer: +{safetyStockDays} days safety stock
          </span>
        </div>
      </div>

      {/* Replenishment Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recommended Purchase Orders</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and authorize purchase replenishment orders before stock is exhausted.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
              Calculating replenishment recommendations...
            </div>
          ) : isRealData && displayRealItems.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-slate-400" />
              <p className="font-semibold text-slate-700">No Replenishment Recommendations Available</p>
              <p className="text-slate-400 mt-1 max-w-md mx-auto">
                {replenishmentError
                  ? 'A calculation error occurred while generating recommendations.'
                  : 'No items met the criteria for replenishment or data is still loading.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">SKU / Product</th>
                  <th className="px-3 py-3 font-semibold">Store</th>
                  <th className="px-3 py-3 font-semibold text-right">Current Stock</th>
                  <th className="px-3 py-3 font-semibold text-right">Daily Demand</th>
                  <th className="px-3 py-3 font-semibold text-right">Lead Time</th>
                  <th className="px-3 py-3 font-semibold text-right">Reorder Point</th>
                  <th className="px-3 py-3 font-semibold text-right">Suggested Qty</th>
                  <th className="px-3 py-3 font-semibold">Stockout Risk</th>
                  <th className="px-4 py-3 font-semibold">Calculation Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isRealData
                  ? displayRealItems.map((r, idx) => (
                      <tr
                        key={`${r.store_id}-${r.product_id}-${idx}`}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <div className="font-semibold text-slate-900">
                            {r.product_id || 'Global Series'}
                          </div>
                          {r.days_of_supply != null && (
                            <div className="text-[11px] text-slate-400">
                              ~{r.days_of_supply} days supply remaining
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-600 font-medium">
                          {r.store_id || 'All'}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-slate-900 tabular-nums">
                          {r.current_inventory}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-600 tabular-nums">
                          {r.daily_demand}/day
                        </td>
                        <td className="px-3 py-3 text-right text-slate-500 tabular-nums">
                          {r.lead_time_days}d
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-slate-700 tabular-nums">
                          {r.reorder_point}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-emerald-700 tabular-nums text-sm">
                          {r.recommended_reorder_qty}
                        </td>
                        <td className="px-3 py-3">
                          <Badge status={r.stockout_risk} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-600 max-w-xs">
                          <div className="font-mono text-[10px] text-slate-500">
                            LTD({r.expected_lead_demand}) + SS({r.safety_stock}) = ROP({r.reorder_point})
                          </div>
                        </td>
                      </tr>
                    ))
                  : demoRecs.map((r) => (
                      <tr key={r.productId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <div className="font-semibold text-slate-900">{r.productName}</div>
                          <div className="text-[11px] text-slate-400">
                            {r.productId} • {r.category}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-600 font-medium">{r.storeId}</td>
                        <td className="px-3 py-3 text-right font-bold text-slate-900 tabular-nums">
                          {r.currentStock}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-600 tabular-nums">
                          {r.forecastDemand}/day
                        </td>
                        <td className="px-3 py-3 text-right text-slate-500 tabular-nums">
                          {r.leadTimeDays}d
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-slate-700 tabular-nums">
                          {r.reorderPoint}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-emerald-700 tabular-nums text-sm">
                          {r.suggestedQuantity}
                        </td>
                        <td className="px-3 py-3">
                          <Badge status={r.stockoutRisk} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-600 max-w-xs">
                          <div className="font-medium text-slate-800">{r.reason}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {r.calculationBreakdown}
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageContainer>
  );
};
