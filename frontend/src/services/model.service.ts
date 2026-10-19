import { REAL_MODEL_BENCHMARKS, REAL_MODEL_METADATA } from '../mocks/demo-data';
import { F1Metrics, ModelBenchmark, ModelMetadata } from '../types';
import { API_BASE_URL, ApiResponse } from './api-client';

const FALLBACK_F1_METRICS: F1Metrics = {
  best_f1: 0.8938,
  best_threshold: 39.0,
  best_precision: 0.829,
  best_recall: 0.9697,
  model_comparison: [
    { Model: 'Linear Regression (Champion)', F1: 0.7514, Precision: 0.6783, Recall: 0.8421 },
    { Model: 'Random Forest', F1: 0.7478, Precision: 0.6806, Recall: 0.8296 },
    { Model: 'HistGradientBoosting', F1: 0.751, Precision: 0.6796, Recall: 0.8392 },
    { Model: 'XGBoost', F1: 0.7512, Precision: 0.6805, Recall: 0.8381 },
    { Model: 'Seasonal Naive (lag-7)', F1: 0.5033, Precision: 0.5041, Recall: 0.5025 },
    { Model: 'Naive (lag-1)', F1: 0.4947, Precision: 0.4947, Recall: 0.4947 },
  ],
  curve: [
    { threshold: 39, f1: 0.894, precision: 0.829, recall: 0.97 },
    { threshold: 47, f1: 0.875, precision: 0.808, recall: 0.956 },
    { threshold: 56, f1: 0.859, precision: 0.788, recall: 0.944 },
    { threshold: 66, f1: 0.838, precision: 0.764, recall: 0.927 },
    { threshold: 76, f1: 0.816, precision: 0.739, recall: 0.91 },
    { threshold: 87, f1: 0.793, precision: 0.717, recall: 0.887 },
    { threshold: 99, f1: 0.77, precision: 0.696, recall: 0.862 },
    { threshold: 112, f1: 0.745, precision: 0.674, recall: 0.833 },
    { threshold: 126, f1: 0.716, precision: 0.653, recall: 0.792 },
    { threshold: 141, f1: 0.68, precision: 0.626, recall: 0.743 },
    { threshold: 158, f1: 0.638, precision: 0.602, recall: 0.679 },
    { threshold: 176, f1: 0.579, precision: 0.567, recall: 0.591 },
    { threshold: 196, f1: 0.511, precision: 0.544, recall: 0.482 },
    { threshold: 220, f1: 0.376, precision: 0.514, recall: 0.296 },
    { threshold: 247, f1: 0.032, precision: 0.508, recall: 0.016 },
  ],
  confusion_matrix: { tn: 424, fp: 1763, fn: 267, tp: 8546 },
};

export const modelService = {
  async getBenchmarks(): Promise<ApiResponse<ModelBenchmark[]>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/model/benchmarks`);
      if (res.ok) {
        const json = await res.json();
        return {
          data: json,
          isDemo: false,
          status: 'success',
          message: 'Validated using 70/15/15 chronological temporal holdout test.',
        };
      }
    } catch {
      // In offline mode
    }

    return {
      data: REAL_MODEL_BENCHMARKS,
      isDemo: true,
      status: 'fallback',
      message: 'Using offline benchmark records.',
    };
  },

  async getMetadata(): Promise<ApiResponse<ModelMetadata>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/model/metadata`);
      if (res.ok) {
        const json = await res.json();
        const meta: ModelMetadata = {
          ...REAL_MODEL_METADATA,
          modelType: json.model_type || REAL_MODEL_METADATA.modelType,
          featureNames: json.feature_names || REAL_MODEL_METADATA.featureNames,
          nFeatures: json.n_features || REAL_MODEL_METADATA.nFeatures,
          trainRows: json.n_training_samples || REAL_MODEL_METADATA.trainRows,
          valMae: json.metrics?.MAE || REAL_MODEL_METADATA.valMae,
          valWape: json.metrics?.['WAPE(%)'] || REAL_MODEL_METADATA.valWape,
        };
        return {
          data: meta,
          isDemo: false,
          status: 'success',
        };
      }
    } catch {
      // In offline mode
    }

    return {
      data: REAL_MODEL_METADATA,
      isDemo: true,
      status: 'fallback',
    };
  },

  async getF1Metrics(): Promise<ApiResponse<F1Metrics>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/model/f1-metrics`);
      if (res.ok) {
        const json = await res.json();
        return {
          data: json,
          isDemo: false,
          status: 'success',
        };
      }
    } catch {
      // In offline mode
    }

    return {
      data: FALLBACK_F1_METRICS,
      isDemo: true,
      status: 'fallback',
    };
  },
};
