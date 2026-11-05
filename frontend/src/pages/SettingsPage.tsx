import React, { useState } from 'react';
import { Button } from '../components/ui';

function PageHeader(props: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
      <div>
        <h2 className="text-lg font-semibold text-[#202522]">{props.title}</h2>
        {props.subtitle && <p className="text-xs text-[#68716b] mt-0.5">{props.subtitle}</p>}
      </div>
    </div>
  );
}

function SectionHeader(props: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-sm font-semibold text-[#202522]">{props.title}</h3>
        {props.subtitle && <p className="text-xs text-[#68716b] mt-0.5">{props.subtitle}</p>}
      </div>
    </div>
  );
}

function Surface({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div className={`border border-[#e1e6e1] rounded-lg bg-white p-4 ${compact ? 'p-3' : ''}`}>
      {children}
    </div>
  );
}

const SettingsPage: React.FC = () => {
  const [defaultHorizon, setDefaultHorizon] = useState('14');
  const [theme, setTheme] = useState<'light' | 'system'>('light');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Configure forecasting parameters, display preferences, and data source"
      />

      {/* Forecasting defaults */}
      <SectionHeader title="Forecasting parameters" />
      <Surface compact>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-1">
              Default forecast horizon
            </label>
            <select
              value={defaultHorizon}
              onChange={(e) => setDefaultHorizon(e.target.value)}
              className="w-full h-10 rounded-md border border-[#e1e6e1] bg-white px-3 text-[#202522] focus:border-[#2f6b4f] focus:ring-1 focus:ring-[#e8f1eb]"
            >
              <option value="7">7 days ahead (weekly cycle)</option>
              <option value="14">14 days ahead (standard MRP buffer)</option>
              <option value="30">30 days ahead (monthly S&OP)</option>
            </select>
            <p className="mt-1 text-[11px] text-[#68716b]">
              Applied as the default window across forecasting graphs and replenishment calculations.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-1">
              Target service level (safety stock Z-score)
            </label>
            <div className="text-[#202522] font-mono bg-[#f1f3f0] px-3 py-1.5 rounded-md inline-block border border-[#e1e6e1]">
              95% service level (Z = 1.65)
            </div>
            <p className="mt-1 text-[11px] text-[#68716b]">
              Determines safety stock buffer size in reorder point recommendations.
            </p>
          </div>
        </div>
      </Surface>

      {/* Data source */}
      <SectionHeader title="Data source" />
      <Surface compact>
        <div className="flex items-start gap-3 p-3 rounded-md border text-xs">
          <span className="flex-shrink-0 text-[#287a50]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            </svg>
          </span>
          <div>
            <p className="font-medium text-[#202522]">Demo data</p>
            <p className="text-[10px] text-[#a86b16] font-medium">Synthetic data for demonstration</p>
          </div>
          <div className="ml-auto">
            <Button variant="danger" size="sm">
              Reset dataset
            </Button>
          </div>
        </div>
      </Surface>

      {/* Display preferences */}
      <SectionHeader title="Display preferences" />
      <Surface compact>
        <div className="flex items-center gap-4">
          <Button variant="quiet" onClick={() => setTheme('light')} className={theme === 'light' ? 'bg-[#e8f1eb] text-[#2f6b4f] border-[#d9eadc]' : ''}>
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              Light mode
            </span>
          </Button>
          <Button variant="quiet" onClick={() => setTheme('system')} className={theme === 'system' ? 'bg-[#e8f1eb] text-[#2f6b4f] border-[#d9eadc]' : ''}>
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              System preference
            </span>
          </Button>
        </div>
      </Surface>

      {/* Save */}
      <div className="flex items-end">
        {saved && (
          <span className="mr-3 text-xs font-medium text-[#287a50]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Preferences saved
          </span>
        )}
        <Button onClick={handleSave}>
          Save configuration
        </Button>
      </div>
    </div>
  );
};

function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full border border-[#e8c7c7] bg-[#fbf3f3] flex items-center justify-center mb-6 text-[#b54747]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-[#202522] mb-2">Page not found</h2>
      <p className="text-[#68716b] mb-8">The page you’re looking for doesn’t exist.</p>
      <a href="/workspace" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#2f6b4f] text-[#2f6b4f] font-medium hover:bg-[#2f6b4f] hover:text-white transition-colors">
        Return to workspace
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </a>
    </div>
  );
}

export { SettingsPage, NotFoundPage };