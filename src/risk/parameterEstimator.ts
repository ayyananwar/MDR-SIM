/**
 * Offline Parameter Estimator with Bayesian Smoothing (Phase 4).
 *
 * Estimates prior probabilities and conditional likelihood distributions P(X | E)
 * from labeled reference training datasets.
 *
 * Implements Dirichlet / Laplace smoothing to prevent zero-frequency collapse:
 * P(X = x | E = e) = (count(x, e) + alpha) / (total(e) + K * alpha)
 *
 * CRITICAL BOUNDARY:
 * This module is strictly offline and separated from runtime prediction.
 */

import { DEFAULT_DISCRETIZATION_CONFIG, discretizeFeatures } from './discretization.js';
import { createPriorMetadata } from './prior.js';
import type {
  DiscretizationConfig,
  FittedRiskModel,
  LikelihoodEntry,
  LikelihoodTable,
  RiskModelConfig,
  RiskTrainingExample,
  SmoothingConfig,
} from './riskTypes.js';

export const DEFAULT_SMOOTHING_CONFIG: SmoothingConfig = {
  alpha: 1.0,
  beta: 1.0,
};

/**
 * Fit a complete Bayesian Risk Model from labeled training examples.
 */
export function fitRiskModel(
  trainingData: RiskTrainingExample[],
  config: RiskModelConfig,
  options?: {
    trainingDatasetVersion?: string;
    discretization?: DiscretizationConfig;
  }
): FittedRiskModel {
  const discretization = options?.discretization ?? {
    ...DEFAULT_DISCRETIZATION_CONFIG,
    ...config.discretization,
  };

  const smoothing = config.smoothing ?? DEFAULT_SMOOTHING_CONFIG;
  const alpha = smoothing.alpha > 0 ? smoothing.alpha : 1.0;
  const beta = smoothing.beta > 0 ? smoothing.beta : 1.0;

  // 1. Calculate prior probability
  let priorProb = config.prior.baselineExposureProbability;
  if (config.prior.priorMode === 'empirical' && trainingData.length > 0) {
    const positiveCount = trainingData.filter((ex) => ex.referenceLabel === 1).length;
    // Smoothed empirical prior
    priorProb = (positiveCount + alpha) / (trainingData.length + alpha + beta);
  }

  // Ensure prior is strictly in (0, 1)
  priorProb = Math.max(1e-6, Math.min(1 - 1e-6, priorProb));

  const priorMetadata = createPriorMetadata({
    ...config.prior,
    baselineExposureProbability: priorProb,
  });

  // 2. Select active features
  const selectedFeatures: string[] = [];
  if (config.features.duration) selectedFeatures.push('duration');
  if (config.features.proximity) selectedFeatures.push('proximity');
  if (config.features.recurrence) {
    selectedFeatures.push('encounterCount');
    selectedFeatures.push('cumulativeDuration');
  }
  if (config.features.sourceStatus) selectedFeatures.push('sourceStatus');

  // 3. Estimate likelihoods per feature
  const likelihoods: Record<string, LikelihoodTable> = {};

  // Discretize all training examples once
  const discretizedExamples = trainingData.map((ex) => ({
    bins: discretizeFeatures(ex.features, discretization),
    label: ex.referenceLabel,
  }));

  const positiveExamples = discretizedExamples.filter((ex) => ex.label === 1);
  const negativeExamples = discretizedExamples.filter((ex) => ex.label === 0);

  const nPositive = positiveExamples.length;
  const nNegative = negativeExamples.length;

  for (const feature of selectedFeatures) {
    // Collect all unique bin labels for this feature from discretization config
    let allBins: string[] = [];
    if (feature === 'duration') {
      allBins = discretization.durationBins.map((b) => b.label);
    } else if (feature === 'proximity') {
      allBins = discretization.proximityBins.map((b) => b.label);
    } else if (feature === 'encounterCount') {
      allBins = discretization.encounterBins.map((b) => b.label);
    } else if (feature === 'cumulativeDuration') {
      allBins = discretization.cumulativeDurationBins.map((b) => b.label);
    } else if (feature === 'sourceStatus') {
      allBins = [...discretization.sourceStatusValues];
    }

    const table: LikelihoodTable = {};
    const K = allBins.length;

    // Count occurrences
    const countsPositive: Record<string, number> = {};
    const countsNegative: Record<string, number> = {};
    for (const bin of allBins) {
      countsPositive[bin] = 0;
      countsNegative[bin] = 0;
    }

    for (const ex of positiveExamples) {
      const b = ex.bins[feature];
      if (b && countsPositive[b] !== undefined) {
        countsPositive[b]++;
      }
    }

    for (const ex of negativeExamples) {
      const b = ex.bins[feature];
      if (b && countsNegative[b] !== undefined) {
        countsNegative[b]++;
      }
    }

    // Compute Dirichlet-smoothed probabilities
    for (const bin of allBins) {
      const cPos = countsPositive[bin] ?? 0;
      const cNeg = countsNegative[bin] ?? 0;

      const pGivenExposure = (cPos + alpha) / (nPositive + K * alpha);
      const pGivenNonExposure = (cNeg + beta) / (nNegative + K * beta);

      const likelihoodRatio = pGivenExposure / pGivenNonExposure;
      const logLikelihoodRatio = Math.log(likelihoodRatio);

      const entry: LikelihoodEntry = {
        pGivenExposure,
        pGivenNonExposure,
        likelihoodRatio,
        logLikelihoodRatio,
        countExposure: cPos,
        countNonExposure: cNeg,
      };

      table[bin] = entry;
    }

    likelihoods[feature] = table;
  }

  return {
    modelVersion: config.modelVersion,
    targetDefinition:
      config.targetDefinition ??
      'Reference digital exposure event satisfied according to ground-truth protocol',
    prior: priorMetadata,
    likelihoods,
    discretization,
    smoothing,
    calibration: config.calibration,
    selectedFeatures,
    trainingDatasetVersion: options?.trainingDatasetVersion ?? 'v2.0-training',
    metadata: {
      trainingExampleCount: trainingData.length,
      positiveExampleCount: nPositive,
      negativeExampleCount: nNegative,
      fittedAt: new Date().toISOString(),
    },
  };
}
