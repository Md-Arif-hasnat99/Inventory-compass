import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Calculator,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { INVENTORY_GLOSSARY, TermDefinition } from '../../components/ui/TermTooltip';

interface GlossaryEntry extends TermDefinition {
  key: string;
  inDepth: string[];
  bestPractice: string;
}

const EXTENDED_GLOSSARY: Record<string, GlossaryEntry> = {
  rop: {
    ...INVENTORY_GLOSSARY.rop,
    key: 'rop',
    inDepth: [
      'The Reorder Point acts as an automated tripwire for procurement.',
      'When your inventory on hand plus incoming shipments falls at or below this number, a new purchase order must be issued immediately.',
      'It accounts for both the time it takes for your supplier to manufacture and ship the items (Lead Time Demand) plus an extra cushion for uncertainty (Safety Stock).',
    ],
    bestPractice: 'Review ROP monthly for seasonal items or whenever supplier delivery speeds change.',
  },
  safetyStock: {
    ...INVENTORY_GLOSSARY.safetyStock,
    key: 'safetyStock',
    inDepth: [
      'Think of safety stock as an insurance policy against unpredictability.',
      'Without safety stock, any minor supplier delay or unexpected sales surge would cause empty shelves and lost revenue.',
      'The higher your desired customer satisfaction (Service Level), the higher the safety stock buffer needed.',
    ],
    bestPractice: 'Fast-moving, high-margin products should carry a larger safety buffer than slow-moving or low-margin items.',
  },
  leadTime: {
    ...INVENTORY_GLOSSARY.leadTime,
    key: 'leadTime',
    inDepth: [
      'Lead time begins the second you place a purchase order and ends when goods are checked in, tagged, and ready to sell.',
      'Supply chain delays (customs, freight bottlenecks, manufacturing backlogs) extend lead times and increase your required reorder points.',
    ],
    bestPractice: 'Always measure real delivered lead times rather than theoretical supplier quote dates.',
  },
  suggestedOrder: {
    ...INVENTORY_GLOSSARY.suggestedOrder,
    key: 'suggestedOrder',
    inDepth: [
      'Our replenishment engine calculates the exact number of units to order right now.',
      'It looks at your current shelf stock, subtracts expected sales during supplier transit, and tops your stock up to your target maximum cycle level.',
      'This eliminates guesswork and prevents cash from being trapped in overstocked goods.',
    ],
    bestPractice: 'Export the purchase order draft to CSV to share directly with your suppliers or import into your ERP.',
  },
  eoq: {
    ...INVENTORY_GLOSSARY.eoq,
    key: 'eoq',
    inDepth: [
      'The Economic Order Quantity finds the financial "sweet spot".',
      'Ordering small batches frequently causes high shipping and invoice administration fees.',
      'Ordering massive batches ties up capital and racks up warehouse storage and insurance fees. EOQ balances both curves perfectly.',
    ],
    bestPractice: 'Use EOQ when ordering products with stable demand and fixed vendor freight costs.',
  },
  daysOfStock: {
    ...INVENTORY_GLOSSARY.daysOfStock,
    key: 'daysOfStock',
    inDepth: [
      'Also known as "Days of Inventory" or "Coverage".',
      'It answers the simple question: "If I receive no new shipments, how many days until our shelves are completely empty?"',
      'Calculated dynamically by dividing current on-hand units by our forward-looking daily sales forecast.',
    ],
    bestPractice: 'Items with fewer days of stock remaining than your supplier lead time should be flagged as Critical Stockout alerts.',
  },
  stockoutRisk: {
    ...INVENTORY_GLOSSARY.stockoutRisk,
    key: 'stockoutRisk',
    inDepth: [
      'Stockout Risk is evaluated in three clear tiers:',
      '• HIGH: Current stock will deplete before the next shipment could possibly arrive.',
      '• MEDIUM: Stock is near the reorder point; order soon to stay safe.',
      '• LOW: Healthy inventory buffer with plenty of runway.',
    ],
    bestPractice: 'Filter your replenishment view by "HIGH" risk to prioritize purchase orders with the greatest revenue impact.',
  },
  dailyDemand: {
    ...INVENTORY_GLOSSARY.dailyDemand,
    key: 'dailyDemand',
    inDepth: [
      'Rather than relying on a naive simple average from past months, our demand intelligence incorporates weekly shopping cycles (e.g. weekend surges), day-of-week trends, and recent sales velocity.',
      'This gives an accurate picture of what shoppers will actually buy over the coming days.',
    ],
    bestPractice: 'Look for weekly seasonality spikes (e.g., Friday–Sunday peaks) when planning store staff and shelf restocking.',
  },
  forecastHorizon: {
    ...INVENTORY_GLOSSARY.forecastHorizon,
    key: 'forecastHorizon',
    inDepth: [
      'The Forecast Horizon is the forward projection window: 7 days, 14 days, or 30 days.',
      'Shorter horizons (7 days) offer pinpoint operational precision for rapid-turnover items.',
      'Longer horizons (30 days) provide strategic visibility for long-lead-time overseas suppliers and monthly budgeting.',
    ],
    bestPractice: 'Match your forecast horizon to your supplier order cycle.',
  },
  confidenceBounds: {
    ...INVENTORY_GLOSSARY.confidenceBounds,
    key: 'confidenceBounds',
    inDepth: [
      'No single forecast number is 100% deterministic because the future has natural variability.',
      'The shaded band on the demand chart shows the upper and lower expected limits (90% prediction interval).',
      'Upper Bound shows peak realistic demand (great for planning safety stock), while Lower Bound shows conservative sales (great for avoiding over-purchasing).',
    ],
    bestPractice: 'Use the upper bound to ensure you have enough buffer during promotional events.',
  },
  holdingCost: {
    ...INVENTORY_GLOSSARY.holdingCost,
    key: 'holdingCost',
    inDepth: [
      'Holding cost represents every hidden dollar spent keeping inventory in stock.',
      'Components include: warehouse lease per square foot, insurance, shrinkage/theft, damage, expiration, and opportunity cost of locked capital.',
    ],
    bestPractice: 'Reducing excess inventory frees up cash flow that can be invested into high-velocity products.',
  },
  serviceLevel: {
    ...INVENTORY_GLOSSARY.serviceLevel,
    key: 'serviceLevel',
    inDepth: [
      'Target Service Level is the percentage of customer demand met without backorders or "out of stock" signs.',
      'Most retail standards aim for 95% to 98% for core catalog items.',
      'Going from 95% to 99% service level requires significantly higher safety stock, so choose target levels based on product importance.',
    ],
    bestPractice: 'Tier service levels: give 98% service level to high-margin bestsellers, and 90% to slow-moving long-tail products.',
  },
};

const CATEGORIES = [
  { id: 'all', label: 'All Terms' },
  { id: 'replenishment', label: 'Replenishment & Purchasing' },
  { id: 'forecasting', label: 'Demand Forecasting' },
  { id: 'health', label: 'Inventory Health' },
  { id: 'costs', label: 'Costs & Economics' },
];

export const InventoryGuidePage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Interactive Calculator State
  const [calcDailyDemand, setCalcDailyDemand] = useState<number>(15);
  const [calcLeadTime, setCalcLeadTime] = useState<number>(4);
  const [calcSafetyDays, setCalcSafetyDays] = useState<number>(2);
  const [calcCurrentStock, setCalcCurrentStock] = useState<number>(35);

  // Calculations
  const leadTimeDemand = calcDailyDemand * calcLeadTime;
  const safetyStockUnits = calcDailyDemand * calcSafetyDays;
  const calculatedROP = leadTimeDemand + safetyStockUnits;
  const daysOfStockLeft = calcDailyDemand > 0 ? (calcCurrentStock / calcDailyDemand).toFixed(1) : '0';
  const needsReorder = calcCurrentStock <= calculatedROP;
  const suggestedOrderUnits = needsReorder ? calculatedROP * 1.5 - calcCurrentStock : 0;

  // Filtered glossary entries
  const filteredEntries = useMemo(() => {
    return Object.values(EXTENDED_GLOSSARY).filter((entry) => {
      const matchesCategory =
        selectedCategory === 'all' || entry.category === selectedCategory;
      const matchesSearch =
        entry.title.toLowerCase().includes(search.toLowerCase()) ||
        entry.shortDefinition.toLowerCase().includes(search.toLowerCase()) ||
        (entry.formula && entry.formula.toLowerCase().includes(search.toLowerCase())) ||
        entry.inDepth.some((point) => point.toLowerCase().includes(search.toLowerCase()));
      return matchesCategory && matchesSearch;
    }, [search, selectedCategory]);
  }, [search, selectedCategory]);

  return (
    <PageContainer
      title="Terms & Inventory Guide"
      description="A plain-English knowledge hub for understanding inventory terminology, replenishment calculations, and demand forecasting concepts."
    >
      {/* Overview Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-600 text-blue-100 text-xs font-semibold mb-3">
            <BookOpen className="w-3.5 h-3.5 text-blue-300" />
            <span>Retail Inventory Primer</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Clear Explanations for Every Term & Metric
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-200/90 max-w-2xl leading-relaxed">
            No confusing jargon or opaque equations. Discover how Reorder Points,
            Safety Buffers, and Demand Forecasts combine to protect store revenue and prevent stockouts.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <a
            href="#interactive-calculator"
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Calculator className="w-4 h-4" />
            <span>Try ROP Calculator</span>
          </a>
        </div>
      </div>

      {/* Interactive ROP & Safety Stock Simulator */}
      <div
        id="interactive-calculator"
        className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs scroll-mt-20"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Interactive Reorder Point (ROP) Playground
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Adjust parameters below to see how customer demand and supplier delivery speed dictate your reorder trigger.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 self-start sm:self-auto">
            Live Calculation
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
          {/* Controls Column (3 cols on small) */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Average Daily Demand (Units/Day)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={calcDailyDemand}
                onChange={(e) => setCalcDailyDemand(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Expected consumer sales per day</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supplier Lead Time (Days)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={calcLeadTime}
                onChange={(e) => setCalcLeadTime(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Time from order placement to delivery</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Safety Stock Buffer (Days)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={calcSafetyDays}
                onChange={(e) => setCalcSafetyDays(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Buffer days to protect against supplier delays</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Stock On Hand (Units)
              </label>
              <input
                type="number"
                min="0"
                max="2000"
                value={calcCurrentStock}
                onChange={(e) => setCalcCurrentStock(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Units physically available right now</span>
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-2 bg-slate-50 rounded-xl p-5 border border-slate-200/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Calculated Inventory Metrics
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    needsReorder
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-green-100 text-green-800 border border-green-200'
                  }`}
                >
                  {needsReorder ? '⚠️ Action Required: Reorder Now' : '✓ Stock Healthy'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-medium block">Lead Time Demand</span>
                  <span className="text-base font-bold text-slate-900">{leadTimeDemand} units</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {calcDailyDemand}/day × {calcLeadTime}d
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-medium block">Safety Stock</span>
                  <span className="text-base font-bold text-slate-900">{safetyStockUnits} units</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {calcDailyDemand}/day × {calcSafetyDays}d
                  </span>
                </div>
                <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200 shadow-2xs">
                  <span className="text-[10px] text-blue-800 font-bold block">Reorder Point</span>
                  <span className="text-lg font-black text-blue-900">{calculatedROP} units</span>
                  <span className="text-[9px] text-blue-700 block mt-0.5">
                    Trigger Threshold
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Current Stock Runway:</span>
                  <span className="font-semibold text-slate-900">{daysOfStockLeft} days of supply left</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Reorder Recommendation:</span>
                  <span className="font-semibold text-slate-900">
                    {needsReorder
                      ? `Order ${Math.round(suggestedOrderUnits)} units immediately`
                      : 'No purchase needed yet'}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-200 italic">
              <strong>Rule of thumb:</strong> Whenever Current Stock ({calcCurrentStock}) ≤ Reorder Point ({calculatedROP}),
              place an order before stock drops into the safety buffer.
            </p>
          </div>
        </div>
      </div>

      {/* Glossary Search & Category Filter */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 flex-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-blue-50 text-blue-900 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search terms, formulas, or concepts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Glossary Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.map((item) => (
            <div
              key={item.key}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    {item.title}
                  </h4>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    {item.category}
                  </span>
                </div>

                <p className="text-xs text-slate-700 mt-3 font-medium leading-relaxed">
                  {item.shortDefinition}
                </p>

                {item.formula && (
                  <div className="mt-3 p-2 rounded-md bg-slate-50 border border-slate-200 text-slate-800 font-mono text-[11px] overflow-x-auto">
                    <span className="text-[9px] uppercase font-bold text-blue-800 block mb-0.5">
                      Formula
                    </span>
                    {item.formula}
                  </div>
                )}

                <div className="mt-3 space-y-1.5">
                  {item.inDepth.map((point, idx) => (
                    <p key={idx} className="text-xs text-slate-600 leading-relaxed">
                      {point}
                    </p>
                  ))}
                </div>

                {item.example && (
                  <div className="mt-3 p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 text-xs text-blue-950">
                    <strong className="text-blue-900">Real-World Example: </strong>
                    <span className="text-blue-900/90">{item.example}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-700">Best Practice: </strong>
                  {item.bestPractice}
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredEntries.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
            <HelpCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="font-semibold text-sm text-slate-700">No matching inventory terms found</p>
            <p className="text-xs mt-1">Try adjusting your search query or switching categories.</p>
          </div>
        )}
      </div>

      {/* Plain-English FAQ Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs mt-6">
        <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-slate-400" />
          Frequently Asked Questions
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          Practical answers to common operational questions asked by retail store managers and planners.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5">
            <h4 className="text-xs font-bold text-slate-900">
              Why should Safety Stock never be set to 0?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Real supply chains are unpredictable. Even a one-day delay from a supplier, weather incident, or weekend sales rush would immediately deplete your stock and turn away paying customers without a safety buffer.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5">
            <h4 className="text-xs font-bold text-slate-900">
              How does Demand Forecasting differ from last week's sales?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Looking only at last week's sales ignores weekly cycles, seasonal trends, and growth patterns. Demand forecasting captures these dynamics so you don't over-order on a quiet week or under-order before a busy weekend.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5">
            <h4 className="text-xs font-bold text-slate-900">
              What does "Coverage (Days of Supply)" tell me?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Coverage converts unit numbers into calendar time. For example, knowing you have 100 bottles in stock isn't enough; knowing you sell 20 bottles/day tells you that you have exactly 5 days of inventory left before stockout.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5">
            <h4 className="text-xs font-bold text-slate-900">
              How do I export purchase orders for my suppliers?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Navigate to the Replenishment page and click "Export PO Draft (CSV)". The exported file contains SKU IDs, supplier lead times, suggested order quantities, and risk ratings formatted for spreadsheet or ERP upload.
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
