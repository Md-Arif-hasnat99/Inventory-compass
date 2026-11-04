import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../ui/icons';

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

export const Topbar: React.FC<TopbarProps> = ({
  onOpenMobileSidebar,
  title,
  actions,
  selectedDataset,
  onClearDataset,
}) => {
  const location = useLocation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-[#e1e6e1] px-4 sm:px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-1.5 rounded-md text-[#68716b] hover:text-[#202522] hover:bg-[#f1f3f0] transition-colors"
          aria-label="Open navigation"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="12" x2="20" y2="12" />
          </svg>
        </button>

        <div className="hidden lg:flex flex-col gap-0.5">
          <h1 className="text-sm font-semibold text-[#202522]">{title}</h1>
          {breadcrumbs.length > 0 && (
            <span className="text-[10px] text-[#68716b] uppercase tracking-wider">
              {breadcrumbs.join(' › ')}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {selectedDataset && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#e1e6e1] bg-[#f1f3f0] text-xs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className={`font-medium ${selectedDataset.status === 'valid' ? 'text-[#287a50]' : selectedDataset.status === 'invalid' ? 'text-[#b54747]' : 'text-[#a86b16]'}`}>
              {selectedDataset.name}
            </span>
            <button
              onClick={onClearDataset}
              className="ml-2 p-1 text-[#68716b] hover:text-[#b54747] hover:bg-[#fbf3f3] rounded-sm transition-colors"
              title="Clear dataset"
              aria-label="Clear dataset"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {actions}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#e1e6e1] text-[#68716b] hover:text-[#202522] hover:bg-[#f1f3f0] transition-colors"
            aria-label="User menu"
            aria-expanded={isUserMenuOpen}
          >
            <span className="hidden sm:inline text-xs">Account</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="2" />
              <path d="M7 21a5.79 5.79 0 0 0 4.95 2h5.1a5.79 5.79 0 0 0 4.95-2h0a1 1 0 0 1 0-2h0a5.79 5.79 0 0 0-4.95-2h-5.1a5.79 5.79 0 0 0-4.95 2h0a1 1 0 0 1 0 2z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

function getBreadcrumbs(pathname: string): string[] {
  const labels: Record<string, string> = {
    '/workspace': 'Overview',
    '/workspace/upload': 'Data upload',
    '/workspace/forecasts': 'Forecasts',
    '/workspace/inventory': 'Inventory',
    '/workspace/replenishment': 'Replenishment',
    '/workspace/evaluation': 'Model evaluation',
    '/workspace/settings': 'Settings',
  };

  const parts = pathname.split('/').filter(Boolean);
  const labelsList: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const path = '/' + parts.slice(0, i + 1).join('/');
    if (labels[path]) labelsList.push(labels[path]);
    else if (parts[i]) labelsList.push(parts[i]);
  }

  return labelsList;
}