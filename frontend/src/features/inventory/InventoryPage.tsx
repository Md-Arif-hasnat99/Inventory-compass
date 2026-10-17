import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  RotateCcw,
  X,
  Package,
  Calendar,
  Truck,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

import { PageContainer } from '../../components/layout/PageContainer';
import { Badge } from '../../components/ui/Badge';
import { inventoryService } from '../../services/inventory.service';
import { CATEGORIES, STORES } from '../../mocks/demo-data';
import { InventoryItem, StockStatus } from '../../types';

interface InventoryPageProps {
  selectedStore: string;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({ selectedStore }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<'currentStock' | 'forecastDemand' | 'daysOfStockRemaining'>('daysOfStockRemaining');
  const [sortAsc, setSortAsc] = useState(true);
  const [activeItem, setActiveItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    async function fetchInventory() {
      setLoading(true);
      try {
        const res = await inventoryService.getInventory({
          storeId: selectedStore,
          category,
          status: statusFilter,
          search,
        });
        setItems(res.data);
      } finally {
        setLoading(false);
      }
    }
    fetchInventory();
  }, [selectedStore, category, statusFilter, search]);

  const handleSort = (field: 'currentStock' | 'forecastDemand' | 'daysOfStockRemaining') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    return sortAsc ? valA - valB : valB - valA;
  });

  return (
    <PageContainer
      title="Inventory Health & Stock Monitoring"
      description="Real-time multi-location stock buffers, lead-time coverage ratios, and threshold monitoring."
      actions={
        <button
          onClick={() => navigate('/inventory/replenishment')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md shadow-xs transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Replenishment Actions</span>
        </button>
      }
    >
      {/* Search & Filter Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-72">
          {/* Search bar */}
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search product ID or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Category filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="LOW">Low Buffer Only</option>
            <option value="HEALTHY">Healthy Target</option>
            <option value="EXCESS">Excess Surplus</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-900">{sortedItems.length}</span> items
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-3 py-3 font-semibold">Store</th>
                <th
                  onClick={() => handleSort('currentStock')}
                  className="px-3 py-3 font-semibold text-right cursor-pointer hover:bg-slate-100"
                >
                  <span className="inline-flex items-center gap-1">
                    Current Stock <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('forecastDemand')}
                  className="px-3 py-3 font-semibold text-right cursor-pointer hover:bg-slate-100"
                >
                  <span className="inline-flex items-center gap-1">
                    Daily Demand <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="px-3 py-3 font-semibold text-right">Lead Time</th>
                <th className="px-3 py-3 font-semibold text-right">Reorder Point</th>
                <th
                  onClick={() => handleSort('daysOfStockRemaining')}
                  className="px-3 py-3 font-semibold text-right cursor-pointer hover:bg-slate-100"
                >
                  <span className="inline-flex items-center gap-1">
                    Coverage <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedItems.map((item) => (
                <tr
                  key={item.productId}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  onClick={() => setActiveItem(item)}
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{item.productName}</div>
                    <div className="text-[11px] text-slate-400">{item.productId} • {item.category}</div>
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-600">{item.storeId}</td>
                  <td className="px-3 py-3 text-right font-bold text-slate-900 tabular-nums">
                    {item.currentStock}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-600 tabular-nums">
                    {item.forecastDemand}/day
                  </td>
                  <td className="px-3 py-3 text-right text-slate-500 tabular-nums">
                    {item.supplierLeadTimeDays}d
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-slate-700 tabular-nums">
                    {item.reorderPoint}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <span
                      className={`font-bold ${
                        item.daysOfStockRemaining < 4
                          ? 'text-red-600'
                          : item.daysOfStockRemaining < 8
                          ? 'text-amber-600'
                          : 'text-slate-700'
                      }`}
                    >
                      {item.daysOfStockRemaining} days
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <Badge status={item.status} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveItem(item);
                      }}
                      className="text-slate-600 hover:text-emerald-700 font-medium text-[11px] underline underline-offset-2"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Detail Drawer / Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {activeItem.productId}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{activeItem.productName}</h3>
              </div>
              <button
                onClick={() => setActiveItem(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Category & Region</span>
                  <span className="font-semibold text-slate-800">{activeItem.category} • {activeItem.region}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Unit Selling Price</span>
                  <span className="font-semibold text-slate-800">${activeItem.price.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Current Available Stock</span>
                  <span className="font-bold text-slate-900 text-sm">{activeItem.currentStock} units</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Days Coverage</span>
                  <span className="font-bold text-red-600 text-sm">{activeItem.daysOfStockRemaining} days</span>
                </div>
              </div>

              {/* Replenishment Math Breakdown */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-2">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>Reorder Point Policy Breakdown</span>
                  <Badge status={activeItem.status} size="sm" />
                </div>
                <div className="text-[11px] text-slate-600 space-y-1">
                  <p>• Expected Daily Demand: <strong>{activeItem.forecastDemand} units/day</strong></p>
                  <p>• Supplier Lead Time: <strong>{activeItem.supplierLeadTimeDays} days</strong></p>
                  <p>• Lead-Time Consumption: <strong>{activeItem.forecastDemand * activeItem.supplierLeadTimeDays} units</strong></p>
                  <p>• Safety Stock Buffer: <strong>{activeItem.safetyStock} units</strong></p>
                  <p className="pt-1 font-semibold text-slate-800">
                    Reorder Point = ({activeItem.forecastDemand} × {activeItem.supplierLeadTimeDays}) + {activeItem.safetyStock} = {activeItem.reorderPoint} units.
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Recommended Order Quantity:</span>
                  <span className="text-base font-bold text-emerald-700">
                    {Math.max(0, activeItem.reorderPoint - activeItem.currentStock)} units
                  </span>
                </div>
              </div>

              {/* Actions in Modal */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => navigate(`/forecast?product=${activeItem.productId}`)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  View Forecast Curve
                </button>
                <button
                  onClick={() => {
                    setActiveItem(null);
                    navigate('/inventory/replenishment');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors"
                >
                  Go to Replenishment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
