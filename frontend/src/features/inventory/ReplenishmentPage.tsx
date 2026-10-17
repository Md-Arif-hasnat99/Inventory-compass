import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RotateCcw,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Info,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

import { PageContainer } from '../../components/layout/PageContainer';
import { Badge } from '../../components/ui/Badge';
import { inventoryService } from '../../services/inventory.service';
import { ReplenishmentRecommendation } from '../../types';

interface ReplenishmentPageProps {
  selectedStore: string;
}

export const ReplenishmentPage: React.FC<ReplenishmentPageProps> = ({ selectedStore }) => {
  const navigate = useNavigate();
  const [recs, setRecs] = useState<ReplenishmentRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchRecs() {
      setLoading(true);
      try {
        const res = await inventoryService.getReplenishmentRecommendations(selectedStore);
        setRecs(res.data);
      } finally {
        setLoading(false);
      }
    }
    fetchRecs();
  }, [selectedStore]);

  const totalUnitsToOrder = recs.reduce((acc, r) => acc + r.suggestedQuantity, 0);

  const handleExportCSV = () => {
    const headers = ['Product ID', 'Product Name', 'Store', 'Current Stock', 'Forecast Demand', 'Lead Time (Days)', 'Safety Stock', 'Reorder Point', 'Suggested Qty', 'Risk'];
    const rows = recs.map((r) => [
      r.productId,
      `"${r.productName}"`,
      r.storeId,
      r.currentStock,
      r.forecastDemand,
      r.leadTimeDays,
      r.safetyStock,
      r.reorderPoint,
      r.suggestedQuantity,
      r.stockoutRisk,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
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

  return (
    <PageContainer
      title="Purchase Replenishment Recommendations"
      description="Systematic purchase order suggestions generated from expected lead-time demand, forecast velocity, and safety stock buffers."
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md shadow-xs transition-colors"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            <span>{copied ? 'Exported CSV!' : 'Export PO Draft (CSV)'}</span>
          </button>
        </div>
      }
    >
      {/* Policy Explanation Banner */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex items-start gap-3">
        <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-900">
            Reorder Policy Formula: <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">Reorder Point = (Lead Time × Daily Forecast) + Safety Stock Buffer</code>
          </p>
          <p>
            * Note on Purchase Execution: Suggested quantities represent mathematical replenishment to target buffers. Operations teams should adjust for minimum order quantities (MOQ), supplier pack sizes, and warehouse capacity.
          </p>
        </div>
      </div>

      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Items Pending Reorder</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">{recs.length} SKUs</div>
          <span className="text-xs text-red-600 font-medium mt-1 block">
            {recs.filter((r) => r.stockoutRisk === 'HIGH').length} High Stockout Risk
          </span>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Recommended Order Volume</span>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{totalUnitsToOrder.toLocaleString()} Units</div>
          <span className="text-xs text-slate-500 mt-1 block">Calculated across selected store filters</span>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Average Supplier Lead Time</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">5.4 Days</div>
          <span className="text-xs text-slate-500 mt-1 block">Order lead-time window</span>
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
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-3 py-3 font-semibold">Store</th>
                <th className="px-3 py-3 font-semibold text-right">Current Stock</th>
                <th className="px-3 py-3 font-semibold text-right">Daily Demand</th>
                <th className="px-3 py-3 font-semibold text-right">Lead Time</th>
                <th className="px-3 py-3 font-semibold text-right">Reorder Point</th>
                <th className="px-3 py-3 font-semibold text-right">Suggested Qty</th>
                <th className="px-3 py-3 font-semibold">Stockout Risk</th>
                <th className="px-4 py-3 font-semibold">Calculation Breakdown & Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recs.map((r) => (
                <tr key={r.productId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div className="font-semibold text-slate-900">{r.productName}</div>
                    <div className="text-[11px] text-slate-400">{r.productId} • {r.category}</div>
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
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{r.calculationBreakdown}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
};
