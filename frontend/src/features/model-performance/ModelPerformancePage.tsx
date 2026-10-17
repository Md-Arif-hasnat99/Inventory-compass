import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Trophy,
  CheckCircle,
  Clock,
  Database,
  BarChart3,
  HelpCircle,
  FileCheck2,
  Calendar,
  Layers,
} from 'lucide-react';

import { PageContainer } from '../../components/layout/PageContainer';
import { Badge } from '../../components/ui/Badge';
import { modelService } from '../../services/model.service';
import { ModelBenchmark, ModelMetadata } from '../../types';

export const ModelPerformancePage: React.FC = () => {
  const [benchmarks, setBenchmarks] = useState<ModelBenchmark[]>([]);
  const [metadata, setMetadata] = useState<ModelMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadModelData() {
      setLoading(true);
      try {
        const [benchRes, metaRes] = await Promise.all([
          modelService.getBenchmarks(),
          modelService.getMetadata(),
        ]);
        setBenchmarks(benchRes.data);
        setMetadata(metaRes.data);
      } finally {
        setLoading(false);
      }
    }
    loadModelData();
  }, []);

  return (
    <PageContainer
      title="Machine Learning Model Evaluation & Benchmarks"
      description="Rigorous chronological holdout validation across candidate architectures (Naive Baselines, OLS, Random Forest, HistGBT, XGBoost)."
    >
      {/* Portfolio Highlight Card */}
      <div className="bg-emerald-900 text-white rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-800 text-emerald-200 text-xs font-semibold mb-3">
            <Trophy className="w-3.5 h-3.5 text-amber-300" />
            <span>Selected Production Champion: Linear Regression</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            Validation MAE: 68.75 Units | 43.5% Error Reduction Over Baseline
          </h2>
          <p className="mt-1 text-xs text-emerald-200 max-w-2xl leading-relaxed">
            Strict chronological out-of-time validation (70% train / 15% validation / 15% test).
            Beats the naive baseline (121.77 MAE) with 0.04s training velocity and minimal artifact footprint.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-emerald-800/80 p-4 rounded-lg border border-emerald-700/50 shrink-0 text-xs">
          <div>
            <span className="block text-emerald-300 text-[11px]">Training Set</span>
            <span className="text-sm font-bold">{metadata?.trainRows.toLocaleString()} rows</span>
          </div>
          <div className="h-8 w-px bg-emerald-700" />
          <div>
            <span className="block text-emerald-300 text-[11px]">Features</span>
            <span className="text-sm font-bold">{metadata?.nFeatures} engineered</span>
          </div>
          <div className="h-8 w-px bg-emerald-700" />
          <div>
            <span className="block text-emerald-300 text-[11px]">WAPE</span>
            <span className="text-sm font-bold">{metadata?.valWape}%</span>
          </div>
        </div>
      </div>

      {/* Model Comparison Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Empirical Model Comparison Matrix</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluated on chronological holdout validation set (11,000 observations).
            </p>
          </div>
          <Badge status="REAL" size="sm">
            Verified Run: backend/reports/model_comparison.csv
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Model Architecture</th>
                <th className="px-3 py-3 font-semibold text-right">MAE (Units)</th>
                <th className="px-3 py-3 font-semibold text-right">RMSE (Units)</th>
                <th className="px-3 py-3 font-semibold text-right">WAPE (%)</th>
                <th className="px-3 py-3 font-semibold text-right">Train Time</th>
                <th className="px-3 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold">Evaluation Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {benchmarks.map((m) => (
                <tr
                  key={m.modelName}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    m.isChampion ? 'bg-emerald-50/40 font-semibold' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900 font-bold">{m.modelName}</span>
                      {m.isChampion && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded font-bold">
                          CHAMPION
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-900 font-bold">
                    {m.mae.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-700">
                    {m.rmse.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-700">
                    {m.wape.toFixed(2)}%
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-500">
                    {m.trainTimeSec}s
                  </td>
                  <td className="px-3 py-3 text-center">
                    {m.isChampion ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" /> Deployed
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">Evaluated</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">
                    {m.modelName.includes('Naive')
                      ? 'Heuristic benchmark. Any deployable ML model must outperform this.'
                      : m.isChampion
                      ? 'Lowest MAE, sub-second training, optimal for production inference.'
                      : 'Comparable accuracy, but heavier computational overhead.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column Layout: Explainability & Pipeline Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Metric Interpretability Guide */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <HelpCircle className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-900">Supply Chain Metric Explainability</h3>
          </div>

          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="font-bold text-slate-800 block">MAE (Mean Absolute Error)</span>
              <p className="mt-0.5">
                Measures average prediction error in raw units sold. In our pipeline, an MAE of 68.75 means predictions deviate by ~69 units on average from daily consumer demand.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="font-bold text-slate-800 block">WAPE (Weighted Absolute Percentage Error)</span>
              <p className="mt-0.5">
                The standard supply chain metric <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[10px]">WAPE = (Σ|y - ŷ| / Σy) × 100</code>. Unlike MAPE, WAPE does not divide by zero on zero-sales days and reflects aggregate inventory exposure.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="font-bold text-slate-800 block">No-Leakage Temporal Validation</span>
              <p className="mt-0.5">
                No random K-Fold splits. Models are trained strictly on data prior to 2023-05-27 and validated on subsequent holdout dates. All lag and rolling statistics use <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[10px]">shift(1)</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Model Pipeline Metadata */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Database className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-900">Champion Model Serialization Metadata</h3>
          </div>

          {metadata ? (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Model Artifact</span>
                <span className="font-bold text-slate-800">{metadata.modelType}</span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Target Variable</span>
                <span className="font-bold text-slate-800">{metadata.targetVariable}</span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Training Cutoff Date</span>
                <span className="font-bold text-slate-800">{metadata.trainingCutoffDate}</span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Holdout Validation Cutoff</span>
                <span className="font-bold text-slate-800">{metadata.valCutoffDate}</span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Train / Val / Test Rows</span>
                <span className="font-bold text-slate-800">
                  {metadata.trainRows.toLocaleString()} / {metadata.valRows.toLocaleString()} / {metadata.testRows.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Features Engineered</span>
                <span className="font-bold text-slate-800">{metadata.nFeatures} columns</span>
              </div>
              <div className="col-span-2 p-2.5 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Feature Vector</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {metadata.featureNames.map((fn) => (
                    <span key={fn} className="px-1.5 py-0.5 rounded bg-slate-200/80 text-[10px] font-mono text-slate-700">
                      {fn}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">Loading model metadata...</div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};
