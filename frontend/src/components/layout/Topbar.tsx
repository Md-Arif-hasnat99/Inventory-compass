import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, RefreshCw, Database, Sparkles, Building2, XCircle } from 'lucide-react';
import { STORES } from '../../mocks/demo-data';
import { useUploadContext } from '../../context/UploadContext';

interface TopbarProps {
  onOpenMobileSidebar: () => void;
  selectedStore: string;
  onSelectStore: (storeId: string) => void;
  onRefresh?: () => void;
  title?: string;
  isDemoMode?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenMobileSidebar,
  selectedStore,
  onSelectStore,
  onRefresh,
  title,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isRealData, activeSession, clearActiveUpload } = useUploadContext();

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left side: Mobile hamburger & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 -ml-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {title && (
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
            {title}
          </h1>
        )}
      </div>

      {/* Right side: Store selector, Demo tag, Refresh */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Store selector dropdown */}
        <div className="relative flex items-center">
          <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          <select
            value={selectedStore}
            onChange={(e) => onSelectStore(e.target.value)}
            className="pl-8 pr-7 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer transition-colors"
          >
            {STORES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dataset Mode Badge */}
        {isRealData && activeSession ? (
          <div className="flex items-center gap-1.5">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium"
              title={`Active Seller Dataset: ${activeSession.display_filename} (${activeSession.row_count} rows)`}
            >
              <Database className="w-3 h-3 text-emerald-600" />
              <span className="max-w-44 truncate">
                Real: {activeSession.display_filename}
              </span>
            </div>
            <button
              onClick={clearActiveUpload}
              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100"
              title="Clear active upload and return to demo mode"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Link
            to="/upload"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-[11px] font-medium transition-colors"
            title="Currently in Demo Mode. Click to upload your store dataset."
          >
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Demo Mode</span>
          </Link>
        )}

        {/* Refresh button */}
        <button
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors"
          title="Refresh forecast and metrics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>
    </header>
  );
};
