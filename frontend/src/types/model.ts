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
