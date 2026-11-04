import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Info, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface TermDefinition {
  title: string;
  shortDefinition: string;
  formula?: string;
  example?: string;
  category: 'replenishment' | 'forecasting' | 'health' | 'costs';
}

export const INVENTORY_GLOSSARY: Record<string, TermDefinition> = {
  rop: {
    title: 'Reorder Point (ROP)',
    shortDefinition: 'The minimum stock level that automatically triggers a new replenishment order before inventory runs out.',
    formula: 'ROP = (Average Daily Demand × Lead Time) + Safety Stock',
    example: 'If daily sales are 10 units, supplier takes 5 days, and safety buffer is 15 units: ROP = (10 × 5) + 15 = 65 units.',
    category: 'replenishment',
  },
  safetyStock: {
    title: 'Safety Stock',
    shortDefinition: 'Cushion or buffer inventory held to safeguard against unexpected demand surges or supplier shipping delays.',
    formula: 'Safety Stock = Z × σ_demand × √Lead_Time',
    example: 'Holding 20 extra units ensures that if a supplier is 2 days late, the store does not stock out.',
    category: 'replenishment',
  },
  leadTime: {
    title: 'Supplier Lead Time',
    shortDefinition: 'The total time (in days) between placing a purchase order with a supplier and the stock arriving on the sales shelf.',
    example: 'A 4-day lead time means ordering on Monday delivers stock on Friday morning.',
    category: 'replenishment',
  },
  suggestedOrder: {
    title: 'Suggested Order Quantity',
    shortDefinition: 'The exact quantity recommended to purchase now to restore inventory to optimal target levels without overstocking.',
    formula: 'Suggested Order = (Reorder Point + Target Cycle Stock) - Current Stock - In Transit',
    example: 'If ROP is 100, current stock is 30, and target stock is 120, suggested order is 90 units.',
    category: 'replenishment',
  },
  eoq: {
    title: 'Economic Order Quantity (EOQ)',
    shortDefinition: 'The ideal order size that minimizes the combined costs of ordering inventory and storing it in a warehouse.',
    formula: 'EOQ = √((2 × Annual Demand × Order Cost) / Annual Holding Cost)',
    example: 'Balancing freight order fees with warehouse shelf costs to find the most cost-effective batch size.',
    category: 'costs',
  },
  daysOfStock: {
    title: 'Days of Stock Remaining (Coverage)',
    shortDefinition: 'How many days current on-hand inventory will last based on forecasted daily consumer sales.',
    formula: 'Coverage Days = Current On-Hand Units / Daily Forecasted Demand',
    example: '50 units on hand / 10 units per day = 5 days of stock remaining.',
    category: 'health',
  },
  stockoutRisk: {
    title: 'Stockout Risk Level',
    shortDefinition: 'The assessed risk of selling out before the next shipment arrives. High risk occurs when coverage is less than supplier lead time.',
    example: 'High Risk: 2 days of stock left, but supplier takes 4 days to deliver. Reorder immediately!',
    category: 'health',
  },
  dailyDemand: {
    title: 'Projected Daily Demand',
    shortDefinition: 'Expected unit sales per day projected using historical buying velocity, weekly seasonality, and recent momentum.',
    example: 'A store averaging 14 units on weekdays and 25 units on Saturdays.',
    category: 'forecasting',
  },
  forecastHorizon: {
    title: 'Forecast Horizon',
    shortDefinition: 'The forward-looking projection window (such as 7, 14, or 30 days) used to guide operational inventory purchasing.',
    example: 'A 14-day horizon provides enough foresight to place and receive standard vendor shipments.',
    category: 'forecasting',
  },
  confidenceBounds: {
    title: 'Confidence Prediction Bounds',
    shortDefinition: 'The upper and lower range of expected demand, accounting for real-world market variance and seasonal spikes.',
    example: 'Expected demand is 50 units, with a 90% confidence range between 42 (pessimistic) and 58 (peak).',
    category: 'forecasting',
  },
  holdingCost: {
    title: 'Inventory Holding (Carrying) Cost',
    shortDefinition: 'The percentage or dollar cost of storing unsold goods, including storage space, insurance, obsolescence, and tied-up capital.',
    example: 'Typically 15% to 25% of product value per year in retail environments.',
    category: 'costs',
  },
  serviceLevel: {
    title: 'Target Service Level',
    shortDefinition: 'The percentage of customer orders fulfilled directly from available inventory without running out of stock (commonly 95% to 99%).',
    example: 'A 95% service level means 95 out of 100 customer demands are immediately satisfied off the shelf.',
    category: 'health',
  },
};

interface TermTooltipProps {
  termKey: keyof typeof INVENTORY_GLOSSARY;
  text?: React.ReactNode;
  showIcon?: boolean;
  className?: string;
}

export const TermTooltip: React.FC<TermTooltipProps> = ({
  termKey,
  text,
  showIcon = true,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const info = INVENTORY_GLOSSARY[termKey];
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!info) return <>{text}</>;

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center gap-1 group/term cursor-help ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={(e) => {
        e.stopPropagation();
        setIsOpen((prev) => !prev);
      }}
    >
      {text && <span className="border-b border-dotted border-slate-400 group-hover/term:border-emerald-600 transition-colors">{text}</span>}
      {showIcon && (
        <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover/term:text-emerald-600 transition-colors shrink-0" />
      )}

      {/* Popover */}
      {isOpen && (
        <span
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80 p-3.5 bg-slate-900 text-white text-xs rounded-xl shadow-xl pointer-events-auto border border-slate-700/80 animate-in fade-in zoom-in-95 duration-150 text-left normal-case tracking-normal font-normal cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <span className="flex items-center justify-between pb-1.5 border-b border-slate-700/70 mb-2">
            <span className="font-bold text-emerald-300 text-xs flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-400" />
              {info.title}
            </span>
            <Link
              to="/guide"
              className="text-[10px] text-slate-400 hover:text-emerald-300 flex items-center gap-0.5 underline transition-colors"
            >
              Guide <ExternalLink className="w-2.5 h-2.5" />
            </Link>
          </span>

          {/* Definition */}
          <span className="block text-slate-200 leading-relaxed text-[11px] mb-2">
            {info.shortDefinition}
          </span>

          {/* Formula if present */}
          {info.formula && (
            <span className="block p-1.5 rounded bg-slate-800/90 text-emerald-300 font-mono text-[10px] border border-slate-700 mb-2 overflow-x-auto">
              {info.formula}
            </span>
          )}

          {/* Example */}
          {info.example && (
            <span className="block text-[10px] text-slate-400 leading-normal italic">
              <span className="font-semibold text-slate-300 not-italic">Example: </span>
              {info.example}
            </span>
          )}

          {/* Tooltip triangle tail */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </span>
      )}
    </span>
  );
};
