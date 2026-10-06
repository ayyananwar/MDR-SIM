/**
 * Feature Ablation Study Framework (Phase 5).
 *
 * Systematically removes individual evidence dimensions from the Bayesian model:
 * 1. Full Model
 * 2. Full Model - Duration
 * 3. Full Model - Proximity
 * 4. Full Model - Recurrence (encounterCount + cumulativeDuration)
 * 5. Full Model - Source Status
 *
 * CRITICAL FAIRNESS CONSTRAINT:
 * All ablated variants are evaluated on identical test datasets, random seeds,
 * and reference labels.
 */

import { assessExposureRecords, createDefaultRiskModel } from '../risk/model.js';
import type { ExposureRecord, FittedRiskModel, RiskAssessment } from '../risk/riskTypes.js';
import type { SimulationConfig } from '../simulation/scenarioTypes.js';
import { generateCanonicalDataset } from '../datasets/generator.js';
import { extractExposureRecords } from '../risk/featureExtraction.js';
import { evaluateRiskAssessments } from './riskMetrics.js';
import { evaluateCalibration } from './calibrationMetrics.js';
import { getLabelsForRecords } from './recordLabels.js';

export type AblationTarget = 'duration' | 'proximity' | 'recurrence' | 'sourceStatus';

/**
 * Construct an ablated version of a fitted risk model by excluding specific features.
 */
export function createAblatedModel(
  baseModel: FittedRiskModel,
  ablateTarget: AblationTarget
): FittedRiskModel {
  let filteredFeatures = [...baseModel.selectedFeatures];

  if (ablateTarget === 'duration') {
    filteredFeatures = filteredFeatures.filter((f) => f !== 'duration');
  } else if (ablateTarget === 'proximity') {
    filteredFeatures = filteredFeatures.filter((f) => f !== 'proximity');
  } else if (ablateTarget === 'recurrence') {
    filteredFeatures = filteredFeatures.filter(
      (f) => f !== 'encounterCount' && f !== 'cumulativeDuration'
    );
  } else if (ablateTarget === 'sourceStatus') {
    filteredFeatures = filteredFeatures.filter((f) => f !== 'sourceStatus');
  }

  return {
    ...baseModel,
    modelVersion: `${baseModel.modelVersion}-ablate-${ablateTarget}`,
    selectedFeatures: filteredFeatures,
    metadata: {
      ...baseModel.metadata,
      ablatedFeature: ablateTarget,
    },
  };
}

export interface AblationStudyResult {
  fullModelAssessments: RiskAssessment[];
  noDurationAssessments: RiskAssessment[];
  noProximityAssessments: RiskAssessment[];
  noRecurrenceAssessments: RiskAssessment[];
  noSourceStatusAssessments: RiskAssessment[];
}

/**
 * Execute systematic feature ablation across an array of ExposureRecord instances.
 */
export function runAblationStudy(
  records: ExposureRecord[],
  baseModel: FittedRiskModel
): AblationStudyResult {
  const modelNoDuration = createAblatedModel(baseModel, 'duration');
  const modelNoProximity = createAblatedModel(baseModel, 'proximity');
  const modelNoRecurrence = createAblatedModel(baseModel, 'recurrence');
  const modelNoSourceStatus = createAblatedModel(baseModel, 'sourceStatus');

  return {
    fullModelAssessments: assessExposureRecords(records, baseModel),
    noDurationAssessments: assessExposureRecords(records, modelNoDuration),
    noProximityAssessments: assessExposureRecords(records, modelNoProximity),
    noRecurrenceAssessments: assessExposureRecords(records, modelNoRecurrence),
    noSourceStatusAssessments: assessExposureRecords(records, modelNoSourceStatus),
  };
}

export interface SingleSeedAblationVariantMetric {
  variant: 'Full Model' | 'No Duration' | 'No Proximity' | 'No Recurrence' | 'No Source Status';
  totalRecords: number;
  auroc?: number;
  auprc?: number;
  brierScore: number;
  ece: number;
  f1AtDefault: number;
}

/**
 * Execute systematic feature ablation on a single seed configuration and evaluate
 * all variants against ground truth inside the evaluation subsystem.
 */
export function evaluateAblationSingleSeed(
  config: SimulationConfig
): SingleSeedAblationVariantMetric[] {
  const dataset = generateCanonicalDataset(config, { silent: true });
  const detectedSessions = dataset.detectedContactSessions ?? [];
  const sourceStatusRegistry: Record<string, import('../simulation/scenarioTypes.js').SourceStatus> = {};
  for (const p of dataset.people) {
    sourceStatusRegistry[p.wearableId] = p.sourceStatus;
  }

  const exposureRecords = extractExposureRecords(detectedSessions, {
    sourceStatusRegistry,
    directed: true,
  });
  const baseModel: FittedRiskModel =
    dataset.fittedRiskModel ?? createDefaultRiskModel(config.risk);
  const ablation = runAblationStudy(exposureRecords, baseModel);

  const variants = [
    { name: 'Full Model' as const, assessments: ablation.fullModelAssessments },
    { name: 'No Duration' as const, assessments: ablation.noDurationAssessments },
    { name: 'No Proximity' as const, assessments: ablation.noProximityAssessments },
    { name: 'No Recurrence' as const, assessments: ablation.noRecurrenceAssessments },
    { name: 'No Source Status' as const, assessments: ablation.noSourceStatusAssessments },
  ];

  const labels = getLabelsForRecords(exposureRecords, dataset);

  return variants.map(({ name, assessments }) => {
    const predictions = assessments.map((a) => a.exposureProbability);
    const rm = evaluateRiskAssessments(assessments, dataset.groundTruthContacts, dataset.people, exposureRecords);
    const cal = evaluateCalibration(predictions, labels);
    return {
      variant: name,
      totalRecords: exposureRecords.length,
      auroc: rm.auroc,
      auprc: rm.auprc,
      brierScore: cal.brierScore,
      ece: cal.expectedCalibrationError,
      f1AtDefault: rm.defaultThresholdMetrics?.f1Score ?? 0,
    };
  });
}
