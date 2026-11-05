import React from 'react';
import { useLocation } from 'react-router-dom';

interface TopbarProps {
  onOpenMobileSidebar: () => void;
  title: string;
  actions?: React.ReactNode;
  selectedDataset?: {
    id: string;
    name: string;
    status: 'valid' | 'invalid' | 'pending';
  };
  onClearDataset?: () => void;
}

const PAGE_LABELS: Record<string, string> = {
  '/workspace':              'Overview',
  '/workspace/overview':     'Overview',
  '/workspace/upload':       'Data upload',
  '/workspace/forecasts':    'Demand forecast',
  '/workspace/inventory':    'Inventory',
  '/workspace/replenishment':'Replenishment',
  '/workspace/products':     'Products',
  '/workspace/guide':        'Terms & Guide',
  '/workspace/settings':     'Settings',
};

function getPageTitle(pathname: string): string {
  return PAGE_LABELS[pathname] ?? 'Workspace';
}

const STATUS_STYLES = {
  valid:   { dot: 'bg-[#287a50]', text: 'text-[#287a50]' },
  invalid: { dot: 'bg-[#b54747]', text: 'text-[#b54747]' },
  pending: { dot: 'bg-[#a86b16]', text: 'text-[#a86b16]' },
};

export const Topbar: React.FC<TopbarProps> = ({
  onOpenMobileSidebar,
  title,
  actions,
  selectedDataset,
  onClearDataset,
}) => {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);
  const isDemo = !selectedDataset || selectedDataset.status !== 'valid';

  return (
    <header className="sticky top-0 z-30 h-13 bg-white border-b border-[#e1e6e1] px-4 sm:px-6 flex items-center justify-between gap-4" style={{ height: '52px' }}>
      {/* Left: mobile trigger + page title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-1.5 rounded-md text-[#68716b] hover:text-[#202522] hover:bg-[#f1f3f0] transition-colors"
          aria-label="Open navigation"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <line x1="4" y1="8"  x2="20" y2="8"  />
            <line x1="4" y1="16" x2="20" y2="16" />
          </svg>
        </button>

        <div className="min-w-0">
          <span className="block text-sm font-semibold text-[#202522] truncate">{pageTitle}</span>
        </div>
      </div>

      {/* Right: data source status + optional actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Dataset pill — always visible, toggles between demo and real */}
        {selectedDataset ? (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs ${
            STATUS_STYLES[selectedDataset.status].text
          } border-current/20 bg-current/5`}
            style={{ borderColor: 'currentColor', backgroundColor: 'transparent' }}
          >
            {/* inner bg via inline because Tailwind doesn't do dynamic opacity on CSS vars easily */}
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLES[selectedDataset.status].dot} shrink-0`}/>
            <span className="font-medium max-w-[160px] truncate hidden sm:block">{selectedDataset.name}</span>
            <span className="font-medium sm:hidden">Dataset</span>
            <button
              onClick={onClearDataset}
              className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
              title="Clear dataset"
              aria-label="Clear dataset"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        ) : (
          /* Demo mode pill */
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#e1e6e1] bg-[#f7f8f6] text-[11px] font-medium text-[#68716b]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2f6b4f] shrink-0"/>
            Demo data
          </span>
        )}

        {actions}
      </div>
    </header>
  );
};

export default Topbar;
