import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';

/* ─── types ─── */
interface WorkflowStep {
  num: number;
  label: string;
  sub: string;
  preview: React.ReactNode;
}

/* ─── inline data previews ─── */
const UploadPreview = () => (
  <div className="font-mono text-[11px] leading-relaxed space-y-0.5">
    <div className="text-[#68716b] mb-1 text-[10px] uppercase tracking-wider">sales_oct.csv</div>
    <div className="flex gap-3 text-[#2f6b4f] font-semibold border-b border-[#e1e6e1] pb-1 mb-1">
      <span className="w-10">date</span><span className="w-14">product</span><span className="w-12 text-right">qty</span><span className="w-14 text-right">store</span>
    </div>
    {[
      ['10-01','P001','22','S001'],
      ['10-01','P002','8', 'S001'],
      ['10-02','P001','19','S001'],
    ].map(([d,p,q,s], i) => (
      <div key={i} className={`flex gap-3 text-[#202522] animate-row-${i+1}`}>
        <span className="w-10 text-[#68716b]">{d}</span>
        <span className="w-14">{p}</span>
        <span className="w-12 text-right tabular-nums">{q}</span>
        <span className="w-14 text-right text-[#68716b]">{s}</span>
      </div>
    ))}
    <div className="mt-2 text-[10px] text-[#2f6b4f] font-medium">✓ 4 columns detected · 2,340 rows</div>
  </div>
);

const ForecastPreview = () => {
  const bars = [
    { label: 'Mon', h: 55, forecast: false },
    { label: 'Tue', h: 65, forecast: false },
    { label: 'Wed', h: 48, forecast: false },
    { label: 'Thu', h: 72, forecast: true },
    { label: 'Fri', h: 80, forecast: true },
    { label: 'Sat', h: 90, forecast: true },
  ];
  return (
    <div>
      <div className="flex items-end gap-1.5 h-20 mb-2">
        {bars.map((b, i) => (
          <div key={b.label} className="flex flex-col items-center gap-1 flex-1">
            <div
              className={`w-full rounded-sm animate-bar-${Math.min(i+1,4)} ${b.forecast ? 'bg-[#2f6b4f]/40 border border-[#2f6b4f]/60 border-dashed' : 'bg-[#2f6b4f]'}`}
              style={{ height: `${b.h}%`, transformOrigin: 'bottom' }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        {bars.map(b => (
          <div key={b.label} className="flex-1 text-center text-[9px] text-[#68716b]">{b.label}</div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10px] text-[#68716b]">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 bg-[#2f6b4f] rounded-sm"/> Actual</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 bg-[#2f6b4f]/40 border border-dashed border-[#2f6b4f]/60 rounded-sm"/> Forecast</span>
      </div>
    </div>
  );
};

const RiskPreview = () => (
  <div className="space-y-2">
    {[
      { id: 'P001', name: 'Cotton Crew Tee', stock: 48, days: 1.8, status: 'CRITICAL', badgeCls: 'badge-critical' },
      { id: 'P003', name: 'Whole Bean Coffee', stock: 95, days: 4.8, status: 'LOW', badgeCls: 'badge-low' },
      { id: 'P005', name: 'Insulated Bottle', stock: 210, days: 13.1, status: 'HEALTHY', badgeCls: 'badge-healthy' },
    ].map((r, i) => (
      <div key={r.id} className={`flex items-center justify-between gap-2 animate-row-${i+1}`}>
        <div className="min-w-0">
          <span className="block text-[11px] font-medium text-[#202522] truncate">{r.name}</span>
          <span className="text-[10px] text-[#68716b]">Stock: {r.stock} · {r.days}d left</span>
        </div>
        <span className={`badge ${r.badgeCls} text-[10px] shrink-0`}>{r.status}</span>
      </div>
    ))}
  </div>
);

const OrderPreview = () => (
  <div className="space-y-1.5">
    <div className="text-[10px] uppercase tracking-wider text-[#68716b] mb-2">Purchase suggestions</div>
    {[
      { id: 'P001', qty: 86, reason: 'ROP = 134 · stock 48' },
      { id: 'P002', qty: 51, reason: 'ROP = 86 · stock 35' },
      { id: 'P010', qty: 51, reason: 'ROP = 73 · stock 22' },
    ].map((r, i) => (
      <div key={r.id} className={`bg-[#f7f8f6] border border-[#e1e6e1] rounded px-2.5 py-1.5 animate-row-${i+1}`}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#202522] font-mono">{r.id}</span>
          <span className="text-[11px] font-bold text-[#2f6b4f] tabular-nums">Order {r.qty} units</span>
        </div>
        <div className="text-[10px] text-[#68716b]">{r.reason}</div>
      </div>
    ))}
  </div>
);

/* ─── workflow steps ─── */
const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    num: 1,
    label: 'Import sales CSV',
    sub: 'Upload your historical sales data. We validate columns, detect date formats, and map store/product fields.',
    preview: <UploadPreview />,
  },
  {
    num: 2,
    label: 'Generate demand forecast',
    sub: '7, 14, or 30-day forward projections per product × store, with prediction intervals from your data.',
    preview: <ForecastPreview />,
  },
  {
    num: 3,
    label: 'Monitor stock risk',
    sub: 'Products are classified by days of supply remaining. Critical items surface first — no manual triage.',
    preview: <RiskPreview />,
  },
  {
    num: 4,
    label: 'Generate purchase orders',
    sub: 'Reorder point = lead-time demand + safety stock. Each suggestion shows the exact calculation.',
    preview: <OrderPreview />,
  },
];

/* ─── animated connector line ─── */
const ConnectorLine = () => (
  <div className="hidden md:flex items-center px-2 shrink-0 mt-6">
    <div className="w-8 h-px bg-[#e1e6e1] relative overflow-hidden">
      <div
        className="absolute inset-0 bg-[#2f6b4f]"
        style={{
          animation: 'pipeline-flow 2.4s ease-in-out infinite',
          transformOrigin: 'left',
        }}
      />
    </div>
    <svg width="6" height="8" viewBox="0 0 6 8" className="text-[#e1e6e1] shrink-0">
      <path d="M0 0 L6 4 L0 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  </div>
);

/* ─── main landing ─── */
export const LandingPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActiveStep(s => (s + 1) % WORKFLOW_STEPS.length);
    }, 3200);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#202522]">

      {/* ─── Header ─── */}
      <header className="border-b border-[#e1e6e1] bg-white sticky top-0 z-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-[#2f6b4f] flex items-center justify-center text-white shrink-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="2" x2="12" y2="6"/>
                  <line x1="12" y1="18" x2="12" y2="22"/>
                  <line x1="4.22" y1="4.22" x2="7.05" y2="7.05"/>
                  <line x1="16.95" y1="16.95" x2="19.78" y2="19.78"/>
                  <line x1="2" y1="12" x2="6" y2="12"/>
                  <line x1="18" y1="12" x2="22" y2="12"/>
                </svg>
              </div>
              <span className="text-sm font-semibold tracking-tight">Inventory Compass</span>
            </div>

            <div className="hidden lg:flex items-center gap-6 text-xs">
              <a href="#how-it-works" className="text-[#68716b] hover:text-[#202522] transition-colors font-medium">How it works</a>
              <a href="#features" className="text-[#68716b] hover:text-[#202522] transition-colors font-medium">Features</a>
              <Link
                to="/workspace"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#2f6b4f] text-[#2f6b4f] font-semibold hover:bg-[#2f6b4f] hover:text-white transition-colors text-xs"
              >
                Open workspace
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            </div>

            {/* Mobile burger */}
            <Link to="/workspace" className="lg:hidden text-xs font-semibold text-[#2f6b4f] border border-[#2f6b4f] rounded-md px-3 py-1.5">
              Open
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="pt-20 pb-16 sm:pt-28 sm:pb-20 px-4 sm:px-6 lg:px-8 animate-hero">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-2xl">
            {/* Demo pill */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#e1e6e1] text-[11px] font-medium text-[#68716b] mb-6 animate-pill">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2f6b4f] inline-block"/>
              Demo mode — sample retail data loaded
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold leading-[1.15] mb-5 tracking-tight text-[#202522]">
              Navigate Demand.<br />
              <span className="text-[#2f6b4f]">Optimize Inventory.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#68716b] leading-relaxed mb-8 max-w-lg">
              Upload your sales history. Get demand forecasts, reorder points, and purchase order suggestions —
              calculated from your data, not guesswork.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Link to="/workspace" className="btn-primary px-6 py-2.5 text-sm">
                Explore the workspace
              </Link>
              <a href="#how-it-works" className="btn-quiet px-5 py-2.5 text-sm">
                See how it works
              </a>
            </div>
          </div>

          {/* KPI strip — real numbers from demo data */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
            {[
              { value: '73,840', label: 'Units analyzed', note: 'in demo dataset' },
              { value: '5', label: 'At-risk products', note: 'critical or low buffer' },
              { value: '14 days', label: 'Forecast horizon', note: 'default planning window' },
              { value: '5', label: 'Replenishment orders', note: 'ready to review' },
            ].map(s => (
              <div key={s.label} className="border border-[#e1e6e1] rounded-lg p-4 bg-white hover:border-[#2f6b4f] hover:shadow-sm transition-all duration-200">
                <div className="text-xl font-bold text-[#202522] tabular-nums mb-0.5">{s.value}</div>
                <div className="text-xs font-medium text-[#202522]">{s.label}</div>
                <div className="text-[11px] text-[#68716b] mt-0.5">{s.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Animated workflow pipeline ─── */}
      <section id="how-it-works" className="bg-[#f7f8f6] border-y border-[#e1e6e1] py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-2">How it works</h2>
            <p className="text-[#68716b] text-sm">Four steps from raw sales data to purchase order.</p>
          </div>

          {/* Pipeline row — steps + animated connectors */}
          <div className="hidden md:flex items-start mb-10">
            {WORKFLOW_STEPS.map((step, i) => (
              <React.Fragment key={step.num}>
                <button
                  onClick={() => {
                    setActiveStep(i);
                    if (intervalRef.current) clearInterval(intervalRef.current);
                  }}
                  className={`flex flex-col items-start gap-1 flex-1 text-left rounded-lg px-4 py-3 border transition-all duration-200 ${
                    activeStep === i
                      ? 'border-[#2f6b4f] bg-white shadow-sm'
                      : 'border-transparent hover:border-[#e1e6e1] hover:bg-white/60'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                    activeStep === i ? 'bg-[#2f6b4f] text-white' : 'bg-[#e1e6e1] text-[#68716b]'
                  }`}>
                    {step.num}
                  </span>
                  <span className={`text-sm font-semibold mt-1 ${activeStep === i ? 'text-[#202522]' : 'text-[#68716b]'}`}>
                    {step.label}
                  </span>
                </button>
                {i < WORKFLOW_STEPS.length - 1 && <ConnectorLine />}
              </React.Fragment>
            ))}
          </div>

          {/* Active step detail */}
          <div
            key={activeStep}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start animate-step-1"
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-[#2f6b4f] text-white text-xs font-bold flex items-center justify-center">
                  {WORKFLOW_STEPS[activeStep].num}
                </span>
                <span className="text-sm font-semibold text-[#2f6b4f] uppercase tracking-wider text-[11px]">
                  Step {WORKFLOW_STEPS[activeStep].num} of {WORKFLOW_STEPS.length}
                </span>
              </div>
              <h3 className="text-xl font-bold mb-3">{WORKFLOW_STEPS[activeStep].label}</h3>
              <p className="text-[#68716b] leading-relaxed text-sm">{WORKFLOW_STEPS[activeStep].sub}</p>

              {/* Progress dots */}
              <div className="flex items-center gap-1.5 mt-6">
                {WORKFLOW_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveStep(i); if (intervalRef.current) clearInterval(intervalRef.current); }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === activeStep ? 'w-6 bg-[#2f6b4f]' : 'w-1.5 bg-[#e1e6e1]'}`}
                    aria-label={`Step ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Live data preview */}
            <div className="bg-white border border-[#e1e6e1] rounded-lg p-5 shadow-sm min-h-[140px]">
              <div className="text-[10px] uppercase tracking-wider text-[#68716b] mb-3 font-medium">
                {['CSV preview', 'Demand chart', 'Risk table', 'Order queue'][activeStep]}
              </div>
              {WORKFLOW_STEPS[activeStep].preview}
            </div>
          </div>

          {/* Mobile: stacked cards */}
          <div className="md:hidden mt-10 space-y-4">
            {WORKFLOW_STEPS.map(step => (
              <div key={step.num} className="bg-white border border-[#e1e6e1] rounded-lg p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-7 h-7 rounded-full bg-[#2f6b4f] text-white text-xs font-bold flex items-center justify-center shrink-0">{step.num}</span>
                  <h3 className="text-sm font-semibold">{step.label}</h3>
                </div>
                <p className="text-xs text-[#68716b] mb-4 leading-relaxed">{step.sub}</p>
                {step.preview}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Value section ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <h2 className="text-2xl font-bold mb-5">Stop guessing what to order</h2>
              <p className="text-[#68716b] leading-relaxed mb-6 text-sm">
                Overstock ties up cash in unsold goods. Stockouts lose sales and disappoint customers.
                Inventory Compass gives you the numbers behind replenishment decisions — with every assumption
                shown, not hidden.
              </p>
              <ul className="space-y-3">
                {[
                  ['Reorder points', 'Calculated as: (avg daily demand × lead time) + safety stock'],
                  ['Stock classification', 'Critical / Low / Healthy / Excess — based on days of supply, not gut feel'],
                  ['Forecast horizons', '7, 14, or 30 days per product × store combination'],
                  ['CSV export', 'Download purchase order drafts for review before placing orders'],
                ].map(([title, desc]) => (
                  <li key={title} className="flex items-start gap-3">
                    <div className="w-4 h-4 rounded-full border border-[#2f6b4f] text-[#2f6b4f] flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polyline points="2 6 5 9 10 3"/>
                      </svg>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-[#202522]">{title} — </span>
                      <span className="text-sm text-[#68716b]">{desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Real replenishment card */}
            <div className="border border-[#e1e6e1] rounded-lg bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#68716b]">Replenishment queue</span>
                <span className="badge badge-critical text-[10px]">3 critical</span>
              </div>
              <div className="space-y-3">
                {[
                  { id: 'P001', name: 'Organic Cotton Crew Tee', stock: 48, rop: 134, qty: 86, risk: 'CRITICAL' },
                  { id: 'P002', name: 'Wireless ANC Headphones', stock: 35, rop: 86, qty: 51, risk: 'CRITICAL' },
                  { id: 'P003', name: 'Artisan Whole Bean Coffee', stock: 95, rop: 125, qty: 30, risk: 'LOW' },
                ].map(r => (
                  <div key={r.id} className="border border-[#e1e6e1] rounded-md p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <span className="text-xs font-semibold text-[#202522]">{r.name}</span>
                        <span className="ml-1.5 text-[10px] text-[#68716b] font-mono">{r.id}</span>
                      </div>
                      <span className={`badge ${r.risk === 'CRITICAL' ? 'badge-critical' : 'badge-low'} text-[10px] shrink-0`}>{r.risk}</span>
                    </div>
                    <div className="text-[11px] text-[#68716b]">
                      Stock {r.stock} · ROP {r.rop} · <span className="text-[#2f6b4f] font-semibold">Order {r.qty} units</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-[#e1e6e1] text-[11px] text-[#68716b]">
                ROP = (daily demand × lead time) + safety buffer
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features grid ─── */}
      <section id="features" className="bg-[#f7f8f6] border-t border-[#e1e6e1] py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-2">What's inside</h2>
            <p className="text-[#68716b] text-sm">Built for retail store managers and inventory analysts.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: 'Demand forecasting',
                body: '7, 14, and 30-day projections per product × store. Historical baseline, not invented numbers.',
              },
              {
                title: 'Reorder point calculator',
                body: 'ROP = (avg daily demand × lead time) + safety stock. Every assumption is visible.',
              },
              {
                title: 'Stockout risk table',
                body: 'Products ranked by days of supply remaining. Critical items appear first.',
              },
              {
                title: 'CSV data import',
                body: 'Upload your sales history. Column mapping, validation, and row count reported before processing.',
              },
              {
                title: 'Purchase order export',
                body: 'Download replenishment suggestions as CSV. Review before placing orders with suppliers.',
              },
              {
                title: 'Inventory terms guide',
                body: 'Plain-language definitions of ROP, safety stock, EOQ, WAPE, MAE — no assumed background.',
              },
            ].map(f => (
              <div
                key={f.title}
                className="bg-white border border-[#e1e6e1] rounded-lg p-5 hover:border-[#2f6b4f] transition-colors duration-200 group"
              >
                <h3 className="text-sm font-semibold mb-1.5 group-hover:text-[#2f6b4f] transition-colors">{f.title}</h3>
                <p className="text-xs text-[#68716b] leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="border border-[#e1e6e1] rounded-lg p-10 text-center bg-white">
            <h2 className="text-2xl font-bold mb-3">Ready to see your inventory clearly?</h2>
            <p className="text-[#68716b] text-sm mb-6 max-w-md mx-auto">
              The workspace loads with sample retail data. Upload your own CSV to get real forecasts.
            </p>
            <Link
              to="/workspace"
              className="inline-flex items-center gap-2 btn-primary px-6 py-2.5 text-sm"
            >
              Open workspace
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <Footer />
    </div>
  );
};
