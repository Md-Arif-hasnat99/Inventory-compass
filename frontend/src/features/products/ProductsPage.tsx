import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, TrendingUp, Package, Tag } from 'lucide-react';

import { PageContainer } from '../../components/layout/PageContainer';
import { Badge } from '../../components/ui/Badge';
import { DEMO_INVENTORY_ITEMS, CATEGORIES } from '../../mocks/demo-data';

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  const filtered = DEMO_INVENTORY_ITEMS.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(search.toLowerCase()) ||
      item.productId.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All Categories' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <PageContainer
      title="Product Catalog & Portfolio Intelligence"
      description="Active SKU registry with price elasticity indicators, demand velocities, and stock status."
    >
      {/* Search & Filter Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-72">
          <div className="relative flex-1 min-w-56 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by SKU ID or product title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-900">{filtered.length}</span> catalog items
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div
            key={item.productId}
            className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                  {item.productId}
                </span>
                <Badge status={item.status} size="sm" />
              </div>

              <h3 className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">
                {item.productName}
              </h3>

              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <Tag className="w-3 h-3 text-slate-400" />
                <span>{item.category}</span>
                <span>•</span>
                <span>Store: {item.storeId}</span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Unit Price</span>
                  <span className="font-semibold text-slate-800 tabular-nums">
                    ${item.price.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Daily Velocity</span>
                  <span className="font-semibold text-slate-800 tabular-nums">
                    ~{item.forecastDemand} units/d
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">On-Hand Stock</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {item.currentStock} units
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Reorder Point</span>
                  <span className="font-semibold text-slate-800 tabular-nums">
                    {item.reorderPoint} units
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Lead Time: {item.supplierLeadTimeDays}d
              </span>
              <button
                onClick={() => navigate(`/forecast?product=${item.productId}`)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
              >
                <span>View Forecast</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
};
