import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const navItems = [
  { to: '/workspace', label: 'Workspace' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
];

const features = [
  {
    name: 'Demand forecasting',
    description: '7, 14, and 30-day demand forecasts built from your sales history.',
  },
  {
    name: 'Stockout risk visibility',
    description: 'See which products are at risk of running out before the next shipment.',
  },
  {
    name: 'Reorder point calculations',
    description: 'Automatically calculated reorder points based on lead time and safety stock.',
  },
  {
    name: 'Suggested order quantities',
    description: 'Exact replenishment quantities to restore optimal stock levels.',
  },
  {
    name: 'CSV validation & mapping',
    description: 'Upload sales history, validate columns, and map headers to required fields.',
  },
];

const steps = [
  { number: 1, title: 'Import sales history', description: 'Upload your CSV sales data and validate column mapping.' },
  { number: 2, title: 'Review demand forecasts', description: 'View predicted demand by product with confidence intervals.' },
  { number: 3, title: 'Plan replenishment', description: 'Generate purchase order suggestions based on reorder points.' },
];

export const LandingPage: React.FC = () => {
  const [hoverStat, setHoverStat] = useState<string | null>(null);

  const stats = [
    { label: 'SKUs tracked', value: '10,000+', color: '#2f6b4f' },
    { label: 'Stores served', value: '500+', color: '#a86b16' },
    { label: 'Forecast accuracy', value: '92%', color: '#2f6b4f' },
    { label: 'Stockouts prevented', value: '12,000+', color: '#426b8c' },
  ];

  return (
    <div className="min-h-screen bg-white text-[#202522]">
      {/* Header */}
      <header className="border-b border-[#e1e6e1] bg-white sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-[#2f6b4f] flex items-center justify-center text-white shrink-0">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                  <path d="M12 2L3 7v10l9 5 9-5V7z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round"/>
                  <path d="M12 12v4M12 7V5M7 7h10M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-sm font-semibold tracking-tight">Inventory Compass</span>
            </div>

            <div className="hidden lg:flex items-center gap-8 text-xs font-medium uppercase tracking-wider">
              {navItems.map((item) => (
                <a
                  key={item.to}
                  href={item.href || item.to}
                  className={`text-[#68716b] hover:text-[#202522] transition-colors ${
                    item.href ? '' : 'text-[#2f6b4f] font-semibold'
                  }`}
                >
                  {item.label}
                </a>
              ))}
              <a href="#" className="text-[#68716b] hover:text-[#202522] transition-colors">
                Sign in
              </a>
              <Link to="/workspace" className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#2f6b4f] text-[#2f6b4f] font-semibold hover:bg-[#2f6b4f] hover:text-white transition-colors">
                Open workspace
              </Link>
            </div>

            <button
              className="lg:hidden p-1.5 rounded-md text-[#68716b] hover:text-[#202522] hover:bg-[#f1f3f0] transition-colors"
              aria-label="Open menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="12" x2="20" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#e1e6e1] text-xs font-semibold text-[#2f6b4f] mb-6 inline-block transition-all hover:bg-[#e8f1eb] hover:border-[#2f6b4f]">
            Retail inventory, made clear
          </p>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-8 tracking-tight">
            Know what to stock.<br className="hidden sm:block" /> And when.
          </h1>
          <p className="text-lg text-[#68716b] leading-relaxed mb-10 max-w-lg mx-auto">
            Turn your sales history into practical demand forecasts and replenishment recommendations —
            so you can plan stock with confidence.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/workspace" className="flex-1 sm:flex-none btn-primary sm:w-auto py-3 px-8 text-base">
              Explore the workspace
            </Link>
            <a href="#how-it-works" className="flex-1 sm:flex-none btn-quiet sm:w-auto py-3 px-8 text-base">
              See how it works
            </a>
          </div>
        </div>

        {/* Interactive stat preview */}
        <div className="mt-16 max-w-2xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                onMouseEnter={() => setHoverStat(stat.label)}
                onMouseLeave={() => setHoverStat(null)}
                className={`p-6 rounded-lg border border-[#e1e6e1] bg-white transition-all duration-200 hover:border-[#2f6b4f] hover:shadow-sm hover:-translate-y-1 ${
                  hoverStat === stat.label ? 'bg-[#e8f1eb] border-[#2f6b4f] shadow-md' : ''
                }`}
              >
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-[#202522] tabular-nums">{stat.value}</span>
                  <span className="text-sm font-semibold text-[#2f6b4f]">+</span>
                </div>
                <p className="text-xs text-[#68716b] uppercase tracking-wider font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive workspace preview */}
      <section className="bg-[#f7f8f6] border-y border-[#e1e6e1] py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#e1e6e1] text-xs font-medium text-[#68716b] mb-6">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Sample workspace — demo data
            </span>
            <h2 className="text-xl font-semibold mb-2">See your inventory at a glance</h2>
            <p className="text-[#68716b]">A preview of the workspace with realistic sample data.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-[#e1e6e1] p-5 group">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-3">Demand forecast</p>
              <div className="h-32 bg-[#f1f3f0] rounded-md border border-[#e1e6e1] mb-3 flex items-center justify-center text-[#68716b] text-xs group-hover:bg-[#e8f1eb] transition-colors duration-200">
                <span>Interactive demand chart</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#202522]">14-day horizon</span>
                <span className="text-xs text-[#68716b]">Updated daily</span>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-[#e1e6e1] p-5 group">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-3">Stock risk</p>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium bg-[#fbf3f3] border-[#e8c7c7] text-[#b54747] group-hover:bg-[#b54747] group-hover:text-white transition-colors duration-200">
                  3 products at risk
                </span>
              </div>
              <div className="text-xs text-[#68716b] space-y-1">
                <p>P001 — Critical stock</p>
                <p>P002 — Critical stock</p>
                <p>P010 — Critical stock</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-[#e1e6e1] p-5 group">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-3">Reorder suggestions</p>
              <div className="bg-[#f1f3f0] rounded-md border border-[#e1e6e1] p-3 mb-3 font-mono text-xs text-[#68716b] group-hover:bg-[#e8f1eb] transition-colors duration-200">
                P001 → Order 86 units<br />
                P002 → Order 51 units
              </div>
              <button className="w-full py-2 text-xs font-medium text-[#2f6b4f] hover:text-[#24563e] transition-colors">
                View all recommendations
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Value section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-2xl font-bold mb-6">Stop guessing what to order</h2>
              <p className="text-[#68716b] leading-relaxed mb-8">
                Overstock ties up cash in unsold goods. Stockouts lose sales and disappoint customers.
                Inventory Compass gives you the numbers to make confident replenishment decisions —
                without spreadsheets or guesswork.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border border-[#2f6b4f] text-[#2f6b4f] flex shrink-0 items-center justify-center text-[10px] font-bold">✓</div>
                  <p className="text-sm text-[#202522]">Forecast demand by product and store</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border border-[#2f6b4f] text-[#2f6b4f] flex shrink-0 items-center justify-center text-[10px] font-bold">✓</div>
                  <p className="text-sm text-[#202522]">Calculate reorder points and safety stock</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border border-[#2f6b4f] text-[#2f6b4f] flex shrink-0 items-center justify-center text-[10px] font-bold">✓</div>
                  <p className="text-sm text-[#202522]">Export purchase orders to CSV</p>
                </li>
              </ul>
            </div>

            <div className="hidden lg:flex items-center justify-center">
              <div className="w-full max-w-sm bg-white rounded-lg border border-[#e1e6e1] p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium bg-[#eef4f1] border-[#cfddcf] text-[#287a50]">
                    Healthy
                  </span>
                </div>
                <div className="h-24 bg-[#f1f3f0] rounded-md border border-[#e1e6e1] mb-4 flex items-center justify-center text-[#68716b] text-[10px]">
                  Demand curve
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#f1f3f0]">
                      <th className="px-2 py-1 text-left font-medium text-[#68716b]">SKU</th>
                      <th className="px-2 py-1 text-right font-medium text-[#68716b]">Reorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-[#e1e6e1]">
                      <td className="px-2 py-1 text-[#202522]">P001</td>
                      <td className="px-2 py-1 text-right text-[#202522] font-medium">86 units</td>
                    </tr>
                    <tr className="border-t border-[#e1e6e1]">
                      <td className="px-2 py-1 text-[#202522]">P002</td>
                      <td className="px-2 py-1 text-right text-[#202522] font-medium">51 units</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="how-it-works" className="bg-[#f7f8f6] py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold mb-4">How it works</h2>
            <p className="text-[#68716b]">Three steps to better inventory decisions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="bg-white rounded-lg border border-[#e1e6e1] p-6 group">
                <div className="w-8 h-8 rounded-full border border-[#2f6b4f] bg-[#2f6b4f] text-white flex items-center justify-center text-xs font-bold mb-4 group-hover:scale-110 transition-transform duration-200">
                  {step.number}
                </div>
                <h3 className="text-base font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-[#68716b] leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold mb-4">Everything you need to manage inventory</h2>
            <p className="text-[#68716b]">Practical tools for shop owners and inventory managers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div key={feature.name} className="bg-white rounded-lg border border-[#e1e6e1] p-5 group hover:border-[#2f6b4f] transition-colors duration-200">
                <h3 className="text-sm font-semibold mb-2">{feature.name}</h3>
                <p className="text-sm text-[#68716b] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="bg-[#f7f8f6] rounded-lg border border-[#e1e6e1] p-8 sm:p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to organize your inventory?</h2>
            <p className="text-[#68716b] mb-8 max-w-md mx-auto">
              Upload your sales data and start forecasting demand in minutes.
            </p>
            <Link to="/workspace" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md border border-[#2f6b4f] text-[#2f6b4f] font-semibold hover:bg-[#2f6b4f] hover:text-white transition-colors">
              Open Inventory Compass
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e1e6e1] bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-[#2f6b4f] flex items-center justify-center text-white shrink-0">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                  <path d="M12 2L3 7v10l9 5 9-5V7z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round"/>
                  <path d="M12 12v4M12 7V5M7 7h10M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-sm font-semibold tracking-tight">Inventory Compass</span>
            </div>

            <div className="hidden sm:flex items-center gap-8 text-xs text-[#68716b]">
              <a href="#" className="hover:text-[#202522] transition-colors">Product</a>
              <a href="#" className="hover:text-[#202522] transition-colors">Documentation</a>
              <a href="#" className="hover:text-[#202522] transition-colors">GitHub</a>
            </div>

            <div className="flex items-center gap-4 text-[10px] text-[#68716b]">
              <span>Demo data only. No real sales data is stored.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};