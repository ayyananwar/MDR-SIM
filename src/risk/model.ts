/**
 * Risk Model Management and Serialization (Phase 4).
 *
 * Provides factory functions for default reference models, model validation,
 * JSON serialization/deserialization, and batch assessment over exposure records.
 */

import { DEFAULT_DISCRETIZATION_CONFIG } from './discretization.js';
import { extractFeatures } from './featureExtraction.js';
import { predictExposure } from './inference.js';
import { DEFAULT_REFERENCE_LIKELIHOODS } from './likelihood.js';
import { DEFAULT_SMOOTHING_CONFIG } from './parameterEstimator.js';
import { createPriorMetadata, DEFAULT_PRIOR_CONFIG } from './prior.js';
import type {
  ExposureRecord,
  FittedRiskModel,
  RiskAssessment,
  RiskModelConfig,
} from './riskTypes.js';

/**
 * Create a default reference fitted risk model with documented research provenance.
 */
export function createDefaultRiskModel(
  config?: Partial<RiskModelConfig>
): FittedRiskModel {
  const modelVersion = config?.modelVersion ?? 'risk-model-1.0.0';
  const targetDefinition =
    config?.targetDefinition ??
    'Reference digital exposure event satisfied according to ground-truth protocol';

  const priorConfig = config?.prior ?? DEFAULT_PRIOR_CONFIG;
  const priorMetadata = createPriorMetadata(priorConfig);

  const selectedFeatures: string[] = [];
  const featureFlags = config?.features ?? {
    duration: true,
    proximity: true,
    recurrence: true,
    sourceStatus: true,
  };

  if (featureFlags.duration) selectedFeatures.push('duration');
  if (featureFlags.proximity) selectedFeatures.push('proximity');
  if (featureFlags.recurrence) {
    selectedFeatures.push('encounterCount');
    selectedFeatures.push('cumulativeDuration');
  }
  if (featureFlags.sourceStatus) selectedFeatures.push('sourceStatus');

  const discretization = {
    ...DEFAULT_DISCRETIZATION_CONFIG,
    ...config?.discretization,
  };

  const smoothing = config?.smoothing ?? DEFAULT_SMOOTHING_CONFIG;

  return {
    modelVersion,
    targetDefinition,
    prior: priorMetadata,
    likelihoods: DEFAULT_REFERENCE_LIKELIHOODS,
    discretization,
    smoothing,
    calibration: config?.calibration,
    selectedFeatures,
    trainingDatasetVersion: 'v2.0-reference',
    metadata: {
      source: 'research-reference',
      description: 'Fixed reference likelihood tables; not fitted on LOSO training folds. Smoothing configuration is inactive until fitRiskModel is called.',
      created: '2026-01-01T00:00:00.000Z',
    },
  };
}

/**
 * Validate that a fitted risk model contains well-formed parameters.
 */
export function validateRiskModel(model: FittedRiskModel): void {
  if (!model.modelVersion || typeof model.modelVersion !== 'string') {
    throw new Error('FittedRiskModel must have a valid modelVersion string');
  }
  if (!model.prior || typeof model.prior.value !== 'number') {
    throw new Error('FittedRiskModel must have a numeric prior value');
  }
  if (model.prior.value <= 0 || model.prior.value >= 1) {
    throw new Error('FittedRiskModel prior probability must be strictly between 0 and 1');
  }
  if (!model.likelihoods || typeof model.likelihoods !== 'object') {
    throw new Error('FittedRiskModel must contain a likelihoods dictionary');
  }
  for (const feature of model.selectedFeatures) {
    if (!model.likelihoods[feature]) {
      throw new Error(`FittedRiskModel missing likelihood table for active feature '${feature}'`);
    }
  }
}

/**
 * Serialize a FittedRiskModel to a formatted JSON string.
 */
export function serializeRiskModel(model: FittedRiskModel): string {
  validateRiskModel(model);
  return JSON.stringify(model, null, 2);
}

/**
 * Deserialize and validate a FittedRiskModel from a JSON string.
 */
export function deserializeRiskModel(json: string): FittedRiskModel {
  const parsed = JSON.parse(json) as FittedRiskModel;
  validateRiskModel(parsed);
  return parsed;
}

/**
 * Execute batch risk assessment over an array of ExposureRecord instances.
 */
export function assessExposureRecords(
  records: ExposureRecord[],
  model: FittedRiskModel
): RiskAssessment[] {
  validateRiskModel(model);

  return records.map((record) => {
    const features = extractFeatures(record);
    return predictExposure(model, features, {
      targetWearableId: record.targetWearableId,
      sourceWearableId: record.sourceWearableId,
      sessionId: record.sessionId,
      timestamp: record.sessionEndTime,
    });
  });
}
