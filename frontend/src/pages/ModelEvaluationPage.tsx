import React, { useEffect, useState } from 'react';
import { useUploadContext } from '../context/UploadContext';
import { PageHeader, SectionHeader, Surface, DataTable, EmptyState, LoadingState, ErrorState } from '../components/ui';
import { Badge } from '../components/ui/Badge';

export const ModelEvaluationPage: React.FC = () => {
  const { isRealData, activeSession } = useUploadContext();
  const [metrics, setMetrics] = useState<any>(null);
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/model/f1-metrics`),
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/model/benchmarks`),
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/model/metadata`),
    ])
      .then(async ([f1Res, benchRes, metaRes]) => {
        if (cancelled) return;
        const [f1, bench, meta] = await Promise.all([
          f1Res.ok ? f1Res.json() : null,
          benchRes.ok ? benchRes.json() : null,
          metaRes.ok ? metaRes.json() : null,
        ]);
        setMetrics(f1);
        setBenchmarks(bench ?? []);
        setMetadata(meta);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load evaluation data');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LoadingState message="Loading evaluation metrics…" />;
  if (error) return <ErrorState title="Evaluation unavailable" message={error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Model evaluation"
        subtitle="Forecasting quality metrics — MAE, RMSE, WAPE, and R² — evaluated on chronological holdout data"
      />

      {/* Data source note */}
      <Surface compact>
        <div className="flex items-start gap-3 p-3 rounded-md border text-xs">
          <span className="flex-shrink-0 text-[#68716b]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          <div>
            <p className="font-medium text-[#202522]">Benchmark data</p>
            <p className="text-[#68716b]">
              These metrics reflect the champion production model. They are not computed from your uploaded data.
            </p>
          </div>
        </div>
      </Surface>

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="surface compact">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-2">Best F1 score</p>
          <p className="text-2xl font-bold text-[#202522] tabular-nums">
            {metrics?.best_f1 ? (metrics.best_f1 * 100).toFixed(1) : '—'}%
          </p>
          <p className="text-xs text-[#68716b] mt-2">
            At {metrics?.best_threshold ?? '—'} units cutoff
          </p>
        </div>
        <div className="surface compact">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-2">Precision</p>
          <p className="text-2xl font-bold text-[#202522] tabular-nums">
            {metrics?.best_precision ? (metrics.best_precision * 100).toFixed(1) : '—'}%
          </p>
          <p className="text-xs text-[#68716b] mt-2">True positive rate</p>
        </div>
        <div className="surface compact">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-2">Recall</p>
          <p className="text-2xl font-bold text-[#202522] tabular-nums">
            {metrics?.best_recall ? (metrics.best_recall * 100).toFixed(1) : '—'}%
          </p>
          <p className="text-xs text-[#68716b] mt-2">Stockout catch rate</p>
        </div>
        <div className="surface compact">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#68716b] mb-2">Champion model</p>
          <p className="text-xl font-bold text-[#202522]">
            {metadata?.modelType ?? '—'}
          </p>
          <p className="text-xs text-[#68716b] mt-2">Linear regression pipeline</p>
        </div>
      </div>

      {/* Model comparison table */}
      <SectionHeader title="Model comparison" subtitle="Candidate architectures evaluated on holdout validation" />
      <DataTable
        columns={[
          { key: 'model', label: 'Model architecture' },
          { key: 'mae', label: 'MAE (units)', numeric: true },
          { key: 'rmse', label: 'RMSE (units)', numeric: true },
          { key: 'wape', label: 'WAPE (%)', numeric: true },
          { key: 'trainTime', label: 'Train time (s)', numeric: true },
          { key: 'status', label: 'Status' },
        ]}
        data={benchmarks.map((b: any) => ({
          ...b,
          status: b.isChampion ? 'Champion' : 'Evaluated',
        })) as any}
        rowKey={(i: any) => i.model}
        emptyMessage="No benchmark data available."
      />

      {/* Metadata */}
      {metadata && (
        <>
          <SectionHeader title="Champion model metadata" subtitle="Serialization and training details" />
          <Surface compact>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-[#68716b] uppercase tracking-wider">Model type</p>
              <p className="text-sm text-[#202522]">{metadata.modelType}</p>
            </div>
            <div>
              <p className="text-xs text-[#68716b] uppercase tracking-wider">Target variable</p>
              <p className="text-sm text-[#202522]">{metadata.targetVariable}</p>
            </div>
            <div>
              <p className="text-xs text-[#68716b] uppercase tracking-wider">Training cutoff</p>
              <p className="text-sm text-[#202522]">{metadata.trainingCutoffDate}</p>
            </div>
            <div>
              <p className="text-xs text-[#68716b] uppercase tracking-wider">Features</p>
              <p className="text-sm text-[#202522]">{metadata.nFeatures} columns</p>
            </div>
            <div>
              <p className="text-xs text-[#68716b] uppercase tracking-wider">Train rows</p>
              <p className="text-sm text-[#202522] tabular-nums">
                {metadata.trainRows?.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#68716b] uppercase tracking-wider">Val rows</p>
              <p className="text-sm text-[#202522] tabular-nums">
                {metadata.valRows?.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#68716b] uppercase tracking-wider">Test rows</p>
              <p className="text-sm text-[#202522] tabular-nums">
                {metadata.testRows?.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#68716b] uppercase tracking-wider">Trained at</p>
              <p className="text-sm text-[#202522]">{metadata.trainedAt}</p>
            </div>
          </div>
        </Surface>
        </>
      )}
    </div>
  );
};