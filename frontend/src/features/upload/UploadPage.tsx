import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Table2,
  ArrowRight,
  Info,
} from 'lucide-react';

import { PageContainer } from '../../components/layout/PageContainer';
import { uploadService } from '../../services/upload.service';
import { useUploadContext } from '../../context/UploadContext';
import type { UploadPageStep, UploadSession } from '../../types/upload';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const CANONICAL_LABELS: Record<string, string> = {
  date: 'Date',
  units_sold: 'Units Sold',
  store_id: 'Store ID',
  product_id: 'Product ID',
  inventory_level: 'Inventory Level',
  price: 'Price',
  discount: 'Discount',
  promotion: 'Holiday / Promotion',
  category: 'Category',
  region: 'Region',
  weather: 'Weather Condition',
  seasonality: 'Seasonality',
  competitor_pricing: 'Competitor Pricing',
};

const REQUIRED_CANONICAL = new Set(['date', 'units_sold']);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StepBadgeProps {
  number: number;
  label: string;
  active: boolean;
  done: boolean;
}

const StepBadge: React.FC<StepBadgeProps> = ({ number, label, active, done }) => (
  <div className="flex items-center gap-2">
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
        done
          ? 'bg-emerald-600 text-white'
          : active
            ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-500'
            : 'bg-slate-100 text-slate-400 border border-slate-200'
      }`}
    >
      {done ? <CheckCircle2 className="w-4 h-4" /> : number}
    </div>
    <span
      className={`text-xs font-medium ${
        active ? 'text-slate-900' : done ? 'text-emerald-700' : 'text-slate-400'
      }`}
    >
      {label}
    </span>
  </div>
);

interface ValidationBannerProps {
  errors: string[];
  warnings: string[];
}

const ValidationBanner: React.FC<ValidationBannerProps> = ({ errors, warnings }) => (
  <div className="space-y-3">
    {errors.length > 0 && (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <XCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="text-sm font-semibold text-red-800">
            {errors.length} blocking error{errors.length > 1 ? 's' : ''} — upload cannot proceed
          </span>
        </div>
        <ul className="space-y-1">
          {errors.map((e, i) => (
            <li key={i} className="text-xs text-red-700 flex gap-2">
              <span className="shrink-0">•</span>
              <span>{e}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
    {warnings.length > 0 && (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-sm font-semibold text-amber-800">
            {warnings.length} warning{warnings.length > 1 ? 's' : ''} — review before continuing
          </span>
        </div>
        <ul className="space-y-1">
          {warnings.map((w, i) => (
            <li key={i} className="text-xs text-amber-700 flex gap-2">
              <span className="shrink-0">•</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveUploadId, loadForecast } = useUploadContext();
  const [step, setStep] = useState<UploadPageStep>('idle');
  const [session, setSession] = useState<UploadSession | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // Mutable mapping: canonical -> seller header (editable by user)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --------------- Upload logic ---------------

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrorMessage('Only CSV files (.csv) are accepted.');
      setStep('error');
      return;
    }
    if (file.size === 0) {
      setErrorMessage('The selected file is empty.');
      setStep('error');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('File exceeds the 50 MB upload limit.');
      setStep('error');
      return;
    }

    setStep('uploading');
    setErrorMessage(null);
    setSession(null);

    try {
      const result = await uploadService.uploadFile(file);
      setSession(result);
      setColumnMapping(result.canonical_mapping);
      setStep('mapping');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed. Is the backend running?');
      setStep('error');
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // --------------- Validation ---------------

  const handleValidate = async () => {
    if (!session) return;
    setStep('validating');
    try {
      const result = await uploadService.validateSession(session.upload_id, {
        mapping: columnMapping,
      });
      setSession(result);
      setColumnMapping(result.canonical_mapping);
      setStep('done');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Validation request failed.');
      setStep('error');
    }
  };

  // --------------- Reset ---------------

  const handleReset = () => {
    if (session) {
      uploadService.deleteSession(session.upload_id).catch(() => {});
    }
    setSession(null);
    setStep('idle');
    setErrorMessage(null);
    setColumnMapping({});
  };

  // --------------- Derived state ---------------

  const stepIndex = { idle: 0, uploading: 1, mapping: 2, validating: 2, done: 3, error: 0 }[step] ?? 0;

  return (
    <PageContainer
      title="Upload Your Shop Data"
      description="Upload a CSV file with your historical sales or inventory records. Inventory Compass will validate the data, map your columns, and prepare it for demand forecasting."
    >
      {/* Step progress */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <StepBadge number={1} label="Select File" active={stepIndex === 0} done={stepIndex > 0} />
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <StepBadge number={2} label="Map Columns" active={stepIndex === 2} done={stepIndex > 2} />
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <StepBadge number={3} label="Validate & Confirm" active={stepIndex === 3} done={false} />
        </div>
      </div>

      {/* ── Step 1: Drop zone ── */}
      {(step === 'idle' || step === 'error') && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-16 cursor-pointer transition-all group ${
              dragOver
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/40'
            }`}
          >
            <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition-colors">
              <Upload className="w-7 h-7 text-emerald-700" />
            </div>
            <p className="text-sm font-semibold text-slate-800 mb-1">
              Drop your CSV file here, or click to browse
            </p>
            <p className="text-xs text-slate-500">Accepts .csv files up to 50 MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>

          {step === 'error' && errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Upload Error</p>
                <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Example CSV schema */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-800">Expected CSV Format</span>
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    {['Date', 'Units Sold', 'Store ID*', 'Product ID*', 'Price*', 'Inventory Level*'].map((h) => (
                      <th key={h} className="px-3 py-2 border border-slate-200 text-left font-semibold text-slate-600">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {['2024-01-15', '42', 'S001', 'P001', '19.99', '150'].map((v, i) => (
                      <td key={i} className="px-3 py-2 border border-slate-200 text-slate-700 font-mono">
                        {v}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-slate-50/50">
                    {['2024-01-16', '37', 'S001', 'P001', '19.99', '108'].map((v, i) => (
                      <td key={i} className="px-3 py-2 border border-slate-200 text-slate-700 font-mono">
                        {v}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              * Optional columns. Only <strong>Date</strong> and <strong>Units Sold</strong> are required.
              Alternative column names like <code>date</code>, <code>sales</code>, <code>transaction_date</code> are accepted.
            </p>
          </div>
        </div>
      )}

      {/* ── Uploading spinner ── */}
      {step === 'uploading' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-12 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
          <p className="text-sm font-medium text-slate-700">Uploading and analysing your file…</p>
        </div>
      )}

      {/* ── Step 2: Column mapping ── */}
      {(step === 'mapping' || step === 'validating') && session && (
        <div className="space-y-4">
          {/* File summary */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{session.display_filename}</p>
              <p className="text-xs text-slate-500">
                {session.row_count.toLocaleString()} rows ·{' '}
                {formatBytes(session.file_size_bytes)} ·{' '}
                {session.detected_columns.length} columns detected
                {session.date_range && (
                  <> · {session.date_range.min} → {session.date_range.max}</>
                )}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 shrink-0"
            >
              Change file
            </button>
          </div>

          {/* Column mapping table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Table2 className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-800">Column Mapping</span>
              <span className="ml-auto text-[11px] text-slate-500">
                Map your CSV headers to Inventory Compass fields
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {Object.entries(CANONICAL_LABELS).map(([canonical, label]) => {
                const isRequired = REQUIRED_CANONICAL.has(canonical);
                const currentHeader = columnMapping[canonical] ?? '';
                const isAutoDetected = Boolean(session.canonical_mapping[canonical]);
                return (
                  <div key={canonical} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/50">
                    <div className="w-44 shrink-0">
                      <span className="text-xs font-semibold text-slate-700">{label}</span>
                      {isRequired && (
                        <span className="ml-1.5 text-[10px] text-red-600 font-semibold uppercase tracking-wider">
                          required
                        </span>
                      )}
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    <select
                      value={currentHeader}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({
                          ...prev,
                          [canonical]: e.target.value,
                        }))
                      }
                      className={`flex-1 text-xs px-2.5 py-1.5 rounded-md border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                        currentHeader
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}
                    >
                      <option value="">— not mapped —</option>
                      {session.detected_columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                    {isAutoDetected && currentHeader && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold shrink-0">
                        auto
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data preview table */}
          {session.preview_rows.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-800">
                  Data Preview <span className="text-slate-400 font-normal">(first 5 rows)</span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      {session.detected_columns.map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 border-b border-slate-200 text-left font-semibold text-slate-600 whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {session.preview_rows.map((row, i) => (
                      <tr key={i} className={i % 2 === 1 ? 'bg-slate-50/50' : ''}>
                        {session.detected_columns.map((col) => (
                          <td
                            key={col}
                            className="px-3 py-2 border-b border-slate-100 text-slate-700 font-mono whitespace-nowrap"
                          >
                            {row[col] == null ? (
                              <span className="text-slate-300 italic">null</span>
                            ) : (
                              String(row[col])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Unmapped columns notice */}
          {session.unmapped_columns.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-600">
                <span className="font-semibold">Unmapped columns</span> (will be ignored during forecasting):{' '}
                {session.unmapped_columns.join(', ')}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-slate-800 px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              Start Over
            </button>
            <button
              onClick={handleValidate}
              disabled={step === 'validating'}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {step === 'validating' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Validating…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Validate Dataset
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Validation results ── */}
      {step === 'done' && session && (
        <div className="space-y-4">
          {/* Result header */}
          <div
            className={`rounded-xl p-5 flex items-start gap-4 ${
              session.status === 'valid'
                ? 'bg-emerald-900 text-white'
                : 'bg-red-900 text-white'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              {session.status === 'valid' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-300" />
              ) : (
                <XCircle className="w-6 h-6 text-red-300" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">
                {session.status === 'valid'
                  ? 'Dataset validated successfully'
                  : 'Dataset has blocking errors'}
              </p>
              <p className="text-xs opacity-80 mt-1">
                {session.display_filename} · {session.row_count.toLocaleString()} rows
                {session.date_range && (
                  <> · {session.date_range.min} → {session.date_range.max} ({session.date_range.unique_dates} unique dates)</>
                )}
              </p>
            </div>
          </div>

          {/* Errors and warnings */}
          <ValidationBanner
            errors={session.validation_errors}
            warnings={session.validation_warnings}
          />

          {/* Column mapping summary */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4">
            <p className="text-xs font-semibold text-slate-800 mb-3">Confirmed Column Mapping</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(session.canonical_mapping).map(([canonical, original]) => (
                <div key={canonical} className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    {CANONICAL_LABELS[canonical] ?? canonical}
                  </p>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{original}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Data preview */}
          {session.preview_rows.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-800">
                  Data Preview <span className="text-slate-400 font-normal">(first 5 rows)</span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      {session.detected_columns.map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 border-b border-slate-200 text-left font-semibold text-slate-600 whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {session.preview_rows.map((row, i) => (
                      <tr key={i} className={i % 2 === 1 ? 'bg-slate-50/50' : ''}>
                        {session.detected_columns.map((col) => (
                          <td
                            key={col}
                            className="px-3 py-2 border-b border-slate-100 text-slate-700 font-mono whitespace-nowrap"
                          >
                            {row[col] == null ? (
                              <span className="text-slate-300 italic">null</span>
                            ) : (
                              String(row[col])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Next step or retry */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setStep('mapping')}
              className="text-xs text-slate-500 hover:text-slate-800 px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              ← Adjust Column Mapping
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-slate-800 px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
              >
                Upload New File
              </button>
              {session.status === 'valid' && (
                <button
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                  onClick={async () => {
                    setActiveUploadId(session.upload_id);
                    await loadForecast(7);
                    navigate('/forecast');
                  }}
                >
                  Apply & Run Demand Forecast
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
