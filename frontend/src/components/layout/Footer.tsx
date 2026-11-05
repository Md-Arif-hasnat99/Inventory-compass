import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const [year] = useState(() => new Date().getFullYear());

  const productLinks = [
    { label: 'Overview', to: '/workspace/overview' },
    { label: 'Features', href: '#features' },
    { label: 'How it works', href: '#how-it-works' },
  ];

  const resourceLinks = [
    { label: 'Inventory guide', to: '/workspace/guide' },
    { label: 'GitHub repository', href: 'https://github.com/Md-Arif-hasnat99/Inventory-compass' },
  ];

  return (
    <footer className="border-t border-[#e1e6e1] bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-10">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-[#2f6b4f] flex items-center justify-center text-white shrink-0">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2L3 7v10l9 5 9-5V7z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
                  <path d="M12 12v4M12 7V5M7 7h10M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-sm font-semibold tracking-tight">Inventory Compass</span>
            </div>
            <p className="text-xs text-[#68716b] leading-relaxed max-w-xs">
              Retail demand forecasting and replenishment planning for inventory decisions.
            </p>
          </div>

          <nav aria-label="Product">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#202522] mb-3">Product</h3>
            <ul className="space-y-2">
              {productLinks.map((link) =>
                link.to ? (
                  <li key={link.label}>
                    <Link to={link.to} className="text-xs text-[#68716b] hover:text-[#2f6b4f] transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ) : (
                  <li key={link.label}>
                    <a href={link.href} className="text-xs text-[#68716b] hover:text-[#2f6b4f] transition-colors">
                      {link.label}
                    </a>
                  </li>
                )
              )}
            </ul>
          </nav>

          <nav aria-label="Resources">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#202522] mb-3">Resources</h3>
            <ul className="space-y-2">
              {resourceLinks.map((link) =>
                link.to ? (
                  <li key={link.label}>
                    <Link to={link.to} className="text-xs text-[#68716b] hover:text-[#2f6b4f] transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ) : (
                  <li key={link.label}>
                    <a href={link.href} className="text-xs text-[#68716b] hover:text-[#2f6b4f] transition-colors">
                      {link.label}
                    </a>
                  </li>
                )
              )}
            </ul>
          </nav>

          <nav aria-label="Legal">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#202522] mb-3">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="text-xs text-[#68716b] hover:text-[#2f6b4f] transition-colors">
                  Terms and Conditions
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="pt-8 border-t border-[#e1e6e1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-[#68716b]">
            © {year} Inventory Compass. Forecasts and recommendations are decision-support estimates.
          </p>
          <a
            href="https://github.com/Md-Arif-hasnat99/Inventory-compass"
            className="text-xs text-[#68716b] hover:text-[#2f6b4f] transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
};
