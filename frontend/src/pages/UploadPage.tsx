import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Table2,
  ArrowRight,
  Info,
  RefreshCw,
} from 'lucide-react';

import { PageHeader, SectionHeader, Surface, Button, Input, Select } from '../components/ui';
import { uploadService } from '../services/upload.service';
import { useUploadContext } from '../context/UploadContext';
import type { UploadPageStep, UploadSession } from '../types/upload';

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
          ? 'bg-[#2f6b4f] text-white'
          : active
            ? 'bg-[#e8f1eb] text-[#2f6b4f] border-2 border-[#2f6b4f]'
            : 'bg-[#f1f3f0] text-[#68716b] border border-[#e1e6e1]'
      }`}
    >
      {done ? <CheckCircle2 className="w-4 h-4" /> : number}
    </div>
    <span
      className={`text-xs font-medium ${
        active ? 'text-[#202522]' : done ? 'text-[#2f6b4f]' : 'text-[#68716b]'
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
      <div className="bg-[#fbf3f3] border border-[#e8c7c7] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <XCircle className="w-4 h-4 text-[#b54747] shrink-0" />
          <span className="text-sm font-semibold text-[#b54747]">
            {errors.length} blocking error{errors.length > 1 ? 's' : ''} — upload cannot proceed
          </span>
        </div>
        <ul className="space-y-1">
          {errors.map((e, i) => (
            <li key={i} className="text-xs text-[#b54747] flex gap-2">
              <span className="shrink-0">•</span>
              <span>{e}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
    {warnings.length > 0 && (
      <div className="bg-[#fbf3e8] border border-[#e8d4b7] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-[#a86b16] shrink-0" />
          <span className="text-sm font-semibold text-[#a86b16]">
            {warnings.length} warning{warnings.length > 1 ? 's' : ''} — review before continuing
          </span>
        </div>
        <ul className="space-y-1">
          {warnings.map((w, i) => (
            <li key={i} className="text-xs text-[#a86b16] flex gap-2">
              <span className="shrink-0">•</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveUploadId, loadForecast } = useUploadContext();
  const [step, setStep] = useState<UploadPageStep>('idle');
  const [session, setSession] = useState<UploadSession | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleReset = () => {
    if (session) {
      uploadService.deleteSession(session.upload_id).catch(() => {});
    }
    setSession(null);
    setStep('idle');
    setErrorMessage(null);
    setColumnMapping({});
  };

  const stepIndex = { idle: 0, uploading: 1, mapping: 2, validating: 2, done: 3, error: 0 }[step] ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload your shop data"
        subtitle="Upload a CSV file with your historical sales or inventory records. We will validate the data, map your columns, and prepare it for demand forecasting."
        actions={
          <Button variant="quiet" onClick={handleReset} disabled={step === 'idle' || step === 'error'}>
            Start over
          </Button>
        }
      />

      {/* Step progress */}
      <Surface compact>
        <div className="flex items-center gap-4 flex-wrap">
          <StepBadge number={1} label="Select file" active={stepIndex === 0} done={stepIndex > 0} />
          <ChevronRight className="w-3.5 h-3.5 text-[#68716b] shrink-0" />
          <StepBadge number={2} label="Map columns" active={stepIndex === 2} done={stepIndex > 2} />
          <ChevronRight className="w-3.5 h-3.5 text-[#68716b] shrink-0" />
          <StepBadge number={3} label="Validate & confirm" active={stepIndex === 3} done={false} />
        </div>
      </Surface>

      {/* Step 1: Drop zone */}
      {(step === 'idle' || step === 'error') && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 cursor-pointer transition-all group ${
              dragOver
                ? 'border-[#2f6b4f] bg-[#e8f1eb]'
                : 'border-[#e1e6e1] bg-[#f7f8f6] hover:border-[#2f6b4f] hover:bg-[#e8f1eb]'
            }`}
          >
            <div className="w-14 h-14 rounded-lg bg-[#e8f1eb] flex items-center justify-center mb-4 group-hover:bg-[#d9eadc] transition-colors">
              <Upload className="w-7 h-7 text-[#2f6b4f]" />
            </div>
            <p className="text-sm font-semibold text-[#202522] mb-1">
              Drop your CSV file here, or click to browse
            </p>
            <p className="text-xs text-[#68716b]">Accepts .csv files up to 50 MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>

          {step === 'error' && errorMessage && (
            <div className="bg-[#fbf3f3] border border-[#e8c7c7] rounded-lg p-4 flex items-start gap-3">
              <XCircle className="w-4 h-4 text-[#b54747] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#b54747]">Upload error</p>
                <p className="text-xs text-[#b54747] mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          <Surface compact>
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-[#68716b]" />
              <span className="text-sm font-semibold text-[#202522]">Expected CSV format</span>
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs w-full border-collapse">
                <thead>
                  <tr className="bg-[#f1f3f0]">
                    {['Date', 'Units Sold', 'Store ID*', 'Product ID*', 'Price*', 'Inventory Level*'].map((h) => (
                      <th key={h} className="px-3 py-2 border border-[#e1e6e1] text-left font-semibold text-[#68716b]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {['2024-01-15', '42', 'S001', 'P001', '19.99', '150'].map((v, i) => (
                      <td key={i} className="px-3 py-2 border border-[#e1e6e1] text-[#202522] font-mono">
                        {v}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-[#f1f3f0]/50">
                    {['2024-01-16', '37', 'S001', 'P001', '19.99', '108'].map((v, i) => (
                      <td key={i} className="px-3 py-2 border border-[#e1e6e1] text-[#202522] font-mono">
                        {v}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-[#68716b] mt-2">
              * Optional columns. Only <strong>Date</strong> and <strong>Units Sold</strong> are required.
              Alternative column names like <code>date</code>, <code>sales</code>, <code>transaction_date</code> are accepted.
            </p>
          </Surface>
        </div>
      )}

      {/* Step 2: Column mapping */}
      {(step === 'mapping' || step === 'validating') && session && (
        <div className="space-y-4">
          <Surface compact>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#e8f1eb] flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#2f6b4f]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#202522] truncate">{session.display_filename}</p>
                <p className="text-xs text-[#68716b]">
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
                className="text-xs text-[#68716b] hover:text-[#202522] underline underline-offset-2 shrink-0"
              >
                Change file
              </button>
            </div>
          </Surface>

          <Surface compact>
            <div className="px-4 py-3 border-b border-[#e1e6e1] flex items-center gap-2">
              <Table2 className="w-4 h-4 text-[#68716b]" />
              <span className="text-sm font-semibold text-[#202522]">Column mapping</span>
              <span className="ml-auto text-[11px] text-[#68716b]">
                Map your CSV headers to required fields
              </span>
            </div>

            <div className="divide-y divide-[#e1e6e1]">
              {Object.entries(CANONICAL_LABELS).map(([canonical, label]) => {
                const isRequired = REQUIRED_CANONICAL.has(canonical);
                const currentHeader = columnMapping[canonical] ?? '';
                const isAutoDetected = Boolean(session.canonical_mapping[canonical]);
                return (
                  <div key={canonical} className="flex items-center gap-4 px-4 py-3 hover:bg-[#f7f8f6]">
                    <div className="w-44 shrink-0">
                      <span className="text-xs font-semibold text-[#202522]">{label}</span>
                      {isRequired && (
                        <span className="ml-1.5 text-[10px] text-[#b54747] font-semibold uppercase tracking-wider">
                          required
                        </span>
                      )}
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#e1e6e1] shrink-0" />
                    <select
                      value={currentHeader}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({
                          ...prev,
                          [canonical]: e.target.value,
                        }))
                      }
                      className={`flex-1 text-xs px-2.5 py-1.5 rounded-md border focus:outline-none focus:ring-1 focus:ring-[#2f6b4f] cursor-pointer ${
                        currentHeader
                          ? 'border-[#2f6b4f] bg-[#e8f1eb] text-[#202522]'
                          : 'border-[#e1e6e1] bg-[#f7f8f6] text-[#68716b]'
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
                      <span className="text-[10px] text-[#2f6b4f] bg-[#e8f1eb] border border-[#2f6b4f] px-2 py-0.5 rounded font-semibold shrink-0">
                        auto
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Surface>

          {session.preview_rows.length > 0 && (
            <Surface compact>
              <div className="px-4 py-3 border-b border-[#e1e6e1]">
                <span className="text-sm font-semibold text-[#202522]">
                  Data preview <span className="text-[#68716b] font-normal">(first 5 rows)</span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="bg-[#f1f3f0]">
                      {session.detected_columns.map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 border-b border-[#e1e6e1] text-left font-semibold text-[#68716b] whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {session.preview_rows.map((row, i) => (
                      <tr key={i} className={i % 2 === 1 ? 'bg-[#f7f8f6]/50' : ''}>
                        {session.detected_columns.map((col) => (
                          <td
                            key={col}
                            className="px-3 py-2 border-b border-[#e1e6e1] text-[#202522] font-mono whitespace-nowrap"
                          >
                            {row[col] == null ? (
                              <span className="text-[#9ca3af] italic">null</span>
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
            </Surface>
          )}

          {session.unmapped_columns.length > 0 && (
            <div className="bg-[#f7f8f6] border border-[#e1e6e1] rounded-lg p-3 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-[#68716b] mt-0.5 shrink-0" />
              <p className="text-xs text-[#68716b]">
                <span className="font-semibold text-[#202522]">Unmapped columns</span> (will be ignored during forecasting):{' '}
                {session.unmapped_columns.join(', ')}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleReset}
              className="text-xs text-[#68716b] hover:text-[#202522] px-4 py-2 rounded-md border border-[#e1e6e1] hover:border-[#202522] transition-colors"
            >
              Start over
            </button>
            <button
              onClick={handleValidate}
              disabled={step === 'validating'}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2f6b4f] hover:bg-[#24563e] disabled:bg-[#d9eadc] text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === 'validating' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Validating…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Validate dataset
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Validation results */}
      {step === 'done' && session && (
        <div className="space-y-4">
          <div
            className={`rounded-lg p-5 flex items-start gap-4 ${
              session.status === 'valid'
                ? 'bg-[#eef4f1] border border-[#cfddcf] text-[#287a50]'
                : 'bg-[#fbf3f3] border border-[#e8c7c7] text-[#b54747]'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              {session.status === 'valid' ? (
                <CheckCircle2 className="w-6 h-6 text-[#287a50]" />
              ) : (
                <XCircle className="w-6 h-6 text-[#b54747]" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#202522]">
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

          <ValidationBanner
            errors={session.validation_errors}
            warnings={session.validation_warnings}
          />

          <Surface compact>
            <p className="text-xs font-semibold text-[#202522] mb-3">Confirmed column mapping</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(session.canonical_mapping).map(([canonical, original]) => (
                <div key={canonical} className="bg-[#f7f8f6] border border-[#e1e6e1] rounded-md px-3 py-2">
                  <p className="text-[10px] text-[#68716b] uppercase tracking-wider font-semibold">
                    {CANONICAL_LABELS[canonical] ?? canonical}
                  </p>
                  <p className="text-xs font-semibold text-[#202522] mt-0.5 truncate">{original}</p>
                </div>
              ))}
            </div>
          </Surface>

          {session.preview_rows.length > 0 && (
            <Surface compact>
              <div className="px-4 py-3 border-b border-[#e1e6e1]">
                <span className="text-sm font-semibold text-[#202522]">
                  Data preview <span className="text-[#68716b] font-normal">(first 5 rows)</span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="bg-[#f1f3f0]">
                      {session.detected_columns.map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 border-b border-[#e1e6e1] text-left font-semibold text-[#68716b] whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {session.preview_rows.map((row, i) => (
                      <tr key={i} className={i % 2 === 1 ? 'bg-[#f7f8f6]/50' : ''}>
                        {session.detected_columns.map((col) => (
                          <td
                            key={col}
                            className="px-3 py-2 border-b border-[#e1e6e1] text-[#202522] font-mono whitespace-nowrap"
                          >
                            {row[col] == null ? (
                              <span className="text-[#9ca3af] italic">null</span>
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
            </Surface>
          )}

          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setStep('mapping')}
              className="text-xs text-[#68716b] hover:text-[#202522] px-4 py-2 rounded-md border border-[#e1e6e1] hover:border-[#202522] transition-colors"
            >
              ← Adjust column mapping
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="text-xs text-[#68716b] hover:text-[#202522] px-4 py-2 rounded-md border border-[#e1e6e1] hover:border-[#202522] transition-colors"
              >
                Upload new file
              </button>
              {session.status === 'valid' && (
                <Button
                  onClick={async () => {
                    setActiveUploadId(session.upload_id);
                    await loadForecast(7);
                    navigate('/workspace/forecasts');
                  }}
                >
                  Apply & run demand forecast
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};