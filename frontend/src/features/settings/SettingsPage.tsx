import React, { useState } from 'react';
import { Settings as SettingsIcon, Database, Moon, Sun, Monitor, CheckCircle, ShieldAlert } from 'lucide-react';

import { PageContainer } from '../../components/layout/PageContainer';
import { API_BASE_URL } from '../../services/api-client';

export const SettingsPage: React.FC = () => {
  const [defaultHorizon, setDefaultHorizon] = useState('14');
  const [demoMode, setDemoMode] = useState(true);
  const [theme, setTheme] = useState<'light' | 'system'>('light');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <PageContainer
      title="Application & System Settings"
      description="Configure analytical parameters, display preferences, and machine learning runtime bridge."
    >
      <div className="max-w-3xl space-y-6">
        {/* Forecasting Defaults */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
            Forecasting & Replenishment Parameters
          </h3>

          <div className="mt-4 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Default Forecast Horizon
              </label>
              <select
                value={defaultHorizon}
                onChange={(e) => setDefaultHorizon(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-w-48"
              >
                <option value="7">7 Days Ahead (Weekly Cycle)</option>
                <option value="14">14 Days Ahead (Standard MRP Buffer)</option>
                <option value="30">30 Days Ahead (Monthly S&OP)</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                Applied as the default window across forecasting graphs and replenishment calculations.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Service Level (Safety Stock Z-Score)
              </label>
              <div className="text-slate-800 font-mono bg-slate-100 px-3 py-1.5 rounded-md inline-block">
                95% Service Level (Z = 1.65)
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Determines safety stock buffer size in reorder point recommendations.
              </p>
            </div>
          </div>
        </div>

        {/* Backend & Environment Status */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center justify-between">
            <span>Machine Learning Backend Connection</span>
            <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Contract Ready
            </span>
          </h3>

          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Configured API Base URL</span>
              <span className="font-mono text-slate-800 font-semibold">{API_BASE_URL}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Demo Data Provider Status</span>
              <span className="font-semibold text-amber-700">Active (Deterministic Fixtures)</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Trained Artifact Directory</span>
              <span className="font-mono text-slate-800">backend/models/best_model_linear_regression.joblib</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">FastAPI Microservice Bridge</span>
              <span className="text-slate-500">FastAPI service will bind to :8000 when started</span>
            </div>
          </div>
        </div>

        {/* Display Preferences */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
            Appearance & Visual Theme
          </h3>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                theme === 'light'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Light Mode (Default)</span>
            </button>

            <button
              onClick={() => setTheme('system')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                theme === 'system'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Monitor className="w-4 h-4 text-slate-400" />
              <span>System Preference</span>
            </button>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Preferences saved!
            </span>
          )}
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md shadow-xs transition-colors"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </PageContainer>
  );
};
