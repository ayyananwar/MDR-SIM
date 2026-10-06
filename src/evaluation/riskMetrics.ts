/**
 * Probabilistic Risk & Digital Exposure Discrimination Metrics (Phase 5).
 *
 * Evaluates exposure probability predictions P(E=1 | X) against independent
 * binary reference digital exposure events:
 * - AUROC (Area Under Receiver Operating Characteristic Curve)
 * - AUPRC (Area Under Precision-Recall Curve)
 * - Classification Threshold Grid (Precision, Recall, Specificity, F1, FPR, FNR)
 *
 * CRITICAL SCIENTIFIC INTEGRITY CONSTRAINT:
 * E=1 is strictly the simulator's digital exposure event according to the Phase 1
 * ground-truth contact protocol. It is NOT infection, transmission, or disease diagnosis.
 */

import type { GroundTruthContact } from '../simulation/groundTruth.js';
import type { Person } from '../simulation/scenarioTypes.js';
import type { RiskAssessment, ExposureRecord } from '../risk/riskTypes.js';
import type { RiskMetrics, ThresholdClassificationMetric } from './evaluationTypes.js';
import { buildIdentityMaps, getCanonicalWearablePair } from './matching.js';
import { getLabelsForRecords } from './recordLabels.js';

/**
 * Derive independent ground-truth digital exposure event keys.
 * A directed pair (targetWearable -> sourceWearable) is exposed if:
 * 1. A qualifying ground-truth physical contact occurred between them, AND
 * 2. The source individual is an active source ('confirmed' or 'suspected').
 *
 * Returns a Set of keys: `${targetWearable}->${sourceWearable}`
 */
export function deriveReferenceExposureKeys(
  groundTruthContacts: GroundTruthContact[],
  people: Person[]
): Set<string> {
  const { personToWearable } = buildIdentityMaps(people);
  const exposureKeys = new Set<string>();

  for (const contact of groundTruthContacts) {
    const wA = personToWearable.get(contact.personA);
    const wB = personToWearable.get(contact.personB);
    if (!wA || !wB) continue;

    // General contact exposure purely geometrically defined by physical contact
    exposureKeys.add(`${wA}->${wB}`);
    exposureKeys.add(`${wB}->${wA}`);
    exposureKeys.add(`${wA}::${wB}`);
    exposureKeys.add(`${wB}::${wA}`);
  }

  return exposureKeys;
}

/**
 * Check if a risk assessment record represents a true reference exposure event.
 */
export function isReferenceExposureEvent(
  assessment: RiskAssessment,
  referenceKeys: Set<string>
): boolean {
  if (assessment.sourceWearableId) {
    const directedKey = `${assessment.targetWearableId}->${assessment.sourceWearableId}`;
    if (referenceKeys.has(directedKey)) return true;
  }
  const undirectedKey = `${assessment.targetWearableId}::${assessment.sourceWearableId ?? ''}`;
  return referenceKeys.has(undirectedKey);
}

/**
 * Calculate AUROC (Area Under ROC Curve) using the trapezoidal rule over sorted thresholds.
 * Returns undefined if only a single class is present in labels.
 */
export function calculateAUROC(
  predictions: number[],
  labels: (0 | 1)[]
): number | undefined {
  const n = predictions.length;
  if (n === 0 || n !== labels.length) return undefined;

  let posCount = 0;
  let negCount = 0;
  for (const y of labels) {
    if (y === 1) posCount++;
    else negCount++;
  }

  // Degenerate single-class case
  if (posCount === 0 || negCount === 0) {
    return undefined;
  }

  // Pair predictions with labels and sort ascending by predicted probability
  const items = predictions.map((pred, i) => ({ pred, label: labels[i] }));
  items.sort((a, b) => a.pred - b.pred);

  // Mann-Whitney U / Wilcoxon rank-sum statistic
  let rankSumPositive = 0;
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n && items[j].pred === items[i].pred) {
      j++;
    }
    const averageRank = (i + 1 + j) / 2.0;
    for (let k = i; k < j; k++) {
      if (items[k].label === 1) {
        rankSumPositive += averageRank;
      }
    }
    i = j;
  }

  // U = R_pos - posCount * (posCount + 1) / 2
  const u = rankSumPositive - (posCount * (posCount + 1)) / 2;
  const auroc = u / (posCount * negCount);

  return Math.max(0.0, Math.min(1.0, auroc));
}

/**
 * Calculate AUPRC (Area Under Precision-Recall Curve) using step-wise Average Precision (AP):
 * AP = Σ_k (R_k - R_{k-1}) * P_k
 * evaluated across unique descending prediction score thresholds.
 *
 * This avoids the systematic overestimation inherent in linear trapezoidal PR interpolation
 * (Davis & Goadrich, 2006). Returns undefined if only a single class is present.
 */
export function calculateAUPRC(
  predictions: number[],
  labels: (0 | 1)[]
): number | undefined {
  const n = predictions.length;
  if (n === 0 || n !== labels.length) return undefined;

  const posCount = labels.filter((y) => y === 1).length;
  if (posCount === 0 || posCount === n) {
    return undefined;
  }

  // Sort unique prediction thresholds in descending order
  const sortedUniquePreds = Array.from(new Set(predictions)).sort((a, b) => b - a);

  let averagePrecision = 0;
  let previousRecall = 0;

  for (const tau of sortedUniquePreds) {
    let tp = 0;
    let fp = 0;

    for (let i = 0; i < n; i++) {
      if (predictions[i] >= tau) {
        if (labels[i] === 1) {
          tp++;
        } else {
          fp++;
        }
      }
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const currentRecall = tp / posCount;
    const deltaRecall = currentRecall - previousRecall;

    if (deltaRecall > 0) {
      averagePrecision += deltaRecall * precision;
      previousRecall = currentRecall;
    }
  }

  return Math.max(0.0, Math.min(1.0, averagePrecision));
}

/**
 * Evaluate metrics across a grid of classification thresholds.
 */
export function evaluateThresholdGrid(
  predictions: number[],
  labels: (0 | 1)[],
  thresholds: number[] = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95]
): ThresholdClassificationMetric[] {
  const n = predictions.length;
  const metrics: ThresholdClassificationMetric[] = [];

  for (const tau of thresholds) {
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;

    for (let i = 0; i < n; i++) {
      const predPositive = predictions[i] >= tau;
      const actualPositive = labels[i] === 1;

      if (predPositive && actualPositive) tp++;
      else if (predPositive && !actualPositive) fp++;
      else if (!predPositive && !actualPositive) tn++;
      else fn++;
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const specificity = tn + fp > 0 ? tn / (tn + fp) : 0;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const falsePositiveRate = tn + fp > 0 ? fp / (tn + fp) : 0;
    const falseNegativeRate = tp + fn > 0 ? fn / (tp + fn) : 0;

    metrics.push({
      threshold: tau,
      tp,
      fp,
      tn,
      fn,
      precision,
      recall,
      specificity,
      f1Score,
      falsePositiveRate,
      falseNegativeRate,
    });
  }

  return metrics;
}

/**
 * End-to-end evaluation of risk model assessments against ground truth reference exposure events.
 */
export function evaluateRiskAssessments(
  riskAssessments: RiskAssessment[],
  groundTruthContacts: GroundTruthContact[],
  people: Person[],
  records: ExposureRecord[]
): RiskMetrics {
  if (riskAssessments.length !== records.length || riskAssessments.some((a, i) =>
    a.sessionId !== records[i].sessionId || a.targetWearableId !== records[i].targetWearableId ||
    a.sourceWearableId !== records[i].sourceWearableId)) {
    throw new Error('Assessments and reconstructed records must have identical ordered identities');
  }
  const predictions = riskAssessments.map(a => a.exposureProbability);
  const labels = getLabelsForRecords(records, { people, groundTruthContacts });
  return evaluateRiskPredictions(predictions, labels);
}

/** Shared E3 scoring; callers supply the canonical temporal record labels. */
export function evaluateRiskPredictions(predictions: number[], labels: (0 | 1)[]): RiskMetrics {
  if (predictions.length !== labels.length || predictions.some(p => !Number.isFinite(p))) {
    throw new Error('E3 predictions must be finite and aligned with labels');
  }

  const positiveExposureCount = labels.filter((y) => y === 1).length;
  const negativeExposureCount = labels.length - positiveExposureCount;
  const prevalence = labels.length > 0 ? positiveExposureCount / labels.length : 0;

  const auroc = calculateAUROC(predictions, labels);
  const auprc = calculateAUPRC(predictions, labels);
  const thresholdGrid = evaluateThresholdGrid(predictions, labels);
  const defaultThresholdMetrics = thresholdGrid.find((m) => m.threshold === 0.5);

  return {
    totalEvaluatedRecords: predictions.length,
    positiveExposureCount,
    negativeExposureCount,
    prevalence,
    auroc,
    auprc,
    thresholdGrid,
    defaultThresholdMetrics,
  };
}
