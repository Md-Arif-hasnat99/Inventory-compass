export interface ModelBenchmark {
  modelName: string;
  mae: number;
  rmse: number;
  wape: number;
  split: 'Val' | 'Test';
  trainTimeSec: number;
  isChampion?: boolean;
}

export interface ModelMetadata {
  modelType: string;
  targetVariable: string;
  forecastHorizon: string;
  featureNames: string[];
  nFeatures: number;
  trainingCutoffDate: string;
  valCutoffDate: string;
  trainRows: number;
  valRows: number;
  testRows: number;
  valMae: number;
  valRmse: number;
  valWape: number;
  testMae: number;
  testRmse: number;
  testWape: number;
  dataset: string;
  datasetNote: string;
  trainedAt: string;
  excludedFeatures?: string[];
}

export interface F1CurvePoint {
  threshold: number;
  f1: number;
  precision: number;
  recall: number;
}

export interface F1ModelComparison {
  Model: string;
  F1: number;
  Precision: number;
  Recall: number;
}

export interface F1Metrics {
  best_f1: number;
  best_threshold: number;
  best_precision: number;
  best_recall: number;
  model_comparison: F1ModelComparison[];
  curve: F1CurvePoint[];
  confusion_matrix: {
    tn: number;
    fp: number;
    fn: number;
    tp: number;
  };
}
