/**
 * Contact Detection Metrics Calculation (Phase 5).
 *
 * Evaluates:
 * - True Positives (TP), False Positives (FP), False Negatives (FN)
 * - Precision, Recall, F1 Score
 * - Duration Error (MAE, RMSE, Median, P95)
 * - Start/End Time Errors
 * - Session Fragmentation and Session Merging
 */

import type { ContactSession } from '../edge/edgeTypes.js';
import type { GroundTruthContact } from '../simulation/groundTruth.js';
import type { Person } from '../simulation/scenarioTypes.js';
import type { ContactMetrics, MatchingConfig } from './evaluationTypes.js';
import { matchContactSessions, type MatchingResult } from './matching.js';

/**
 * Calculate percentiles from a sorted numeric array.
 */
function calculatePercentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

/**
 * Compute comprehensive contact detection metrics from a matching result.
 */
export function computeContactMetricsFromMatching(
  matchingResult: MatchingResult,
  totalGroundTruthContacts: number,
  totalDetectedSessions: number
): ContactMetrics {
  const tp = matchingResult.matchedPairs.length;
  const fp = matchingResult.unmatchedDetected.length;
  const fn = matchingResult.unmatchedGroundTruth.length;

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // Duration error analysis
  const durationErrors = matchingResult.matchedPairs.map((p) => p.durationErrorSeconds);
  const absDurationErrors = matchingResult.matchedPairs.map((p) => p.absoluteDurationErrorSeconds);
  absDurationErrors.sort((a, b) => a - b);

  let meanDurationError: number | undefined = undefined;
  let maeDuration: number | undefined = undefined;
  let rmseDuration: number | undefined = undefined;
  let medianDurationError: number | undefined = undefined;
  let p95DurationError: number | undefined = undefined;

  if (absDurationErrors.length > 0) {
    const sumError = durationErrors.reduce((acc, v) => acc + v, 0);
    const sumAbsError = absDurationErrors.reduce((acc, v) => acc + v, 0);
    const sumSquaredError = durationErrors.reduce((acc, v) => acc + v * v, 0);

    meanDurationError = sumError / durationErrors.length;
    maeDuration = sumAbsError / absDurationErrors.length;
    rmseDuration = Math.sqrt(sumSquaredError / durationErrors.length);
    medianDurationError = calculatePercentile(absDurationErrors, 50);
    p95DurationError = calculatePercentile(absDurationErrors, 95);
  }

  // Temporal alignment analysis (start and end times)
  const startErrors = matchingResult.matchedPairs.map((p) => p.startTimeErrorSeconds);
  const endErrors = matchingResult.matchedPairs.map((p) => p.endTimeErrorSeconds);

  let startTimeMeanError: number | undefined = undefined;
  let startTimeMae: number | undefined = undefined;
  let endTimeMeanError: number | undefined = undefined;
  let endTimeMae: number | undefined = undefined;

  if (startErrors.length > 0) {
    startTimeMeanError = startErrors.reduce((acc, v) => acc + v, 0) / startErrors.length;
    startTimeMae = startErrors.reduce((acc, v) => acc + Math.abs(v), 0) / startErrors.length;
    endTimeMeanError = endErrors.reduce((acc, v) => acc + v, 0) / endErrors.length;
    endTimeMae = endErrors.reduce((acc, v) => acc + Math.abs(v), 0) / endErrors.length;
  }

  // Fragmentation analysis
  let fragmentedCount = 0;
  let totalDetectedForTrue = 0;
  for (const count of matchingResult.fragmentationCounts.values()) {
    if (count > 1) fragmentedCount++;
    totalDetectedForTrue += count;
  }
  const avgDetectedPerTrue =
    totalGroundTruthContacts > 0 ? totalDetectedForTrue / totalGroundTruthContacts : 0;
  const fragmentationRate =
    totalGroundTruthContacts > 0 ? fragmentedCount / totalGroundTruthContacts : 0;

  // Merging analysis
  let mergedCount = 0;
  for (const count of matchingResult.mergeCounts.values()) {
    if (count > 1) mergedCount++;
  }
  const mergeRate = totalDetectedSessions > 0 ? mergedCount / totalDetectedSessions : 0;

  return {
    totalGroundTruthContacts,
    totalDetectedSessions,
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
    precision,
    recall,
    f1Score,
    durationError: {
      meanErrorSeconds: meanDurationError,
      maeSeconds: maeDuration,
      rmseSeconds: rmseDuration,
      medianAbsoluteErrorSeconds: medianDurationError,
      p95AbsoluteErrorSeconds: p95DurationError,
    },
    temporalError: {
      startTimeMeanErrorSeconds: startTimeMeanError,
      startTimeMaeSeconds: startTimeMae,
      endTimeMeanErrorSeconds: endTimeMeanError,
      endTimeMaeSeconds: endTimeMae,
    },
    fragmentation: {
      averageDetectedPerTrueSession: avgDetectedPerTrue,
      fragmentedTrueSessionCount: fragmentedCount,
      fragmentationRate,
    },
    merging: {
      mergedDetectedSessionCount: mergedCount,
      mergeRate,
    },
  };
}

/**
 * End-to-end contact detection evaluation from datasets.
 */
export function evaluateContactDetection(
  groundTruthContacts: GroundTruthContact[],
  detectedSessions: ContactSession[],
  people: Person[],
  config?: MatchingConfig
): ContactMetrics {
  const matchingResult = matchContactSessions(groundTruthContacts, detectedSessions, people, config);
  return computeContactMetricsFromMatching(
    matchingResult,
    groundTruthContacts.length,
    detectedSessions.length
  );
}
