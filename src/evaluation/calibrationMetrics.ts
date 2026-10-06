/**
 * Probability Calibration Metrics & Reliability Analysis (Phase 5).
 *
 * Implements:
 * - Brier Score: (1 / N) * Σ (p_i - y_i)^2
 * - Reliability Diagram Calibration Bins
 * - Expected Calibration Error (ECE): Σ (n_b / N) * |observed_b - mean_pred_b|
 */

import type { CalibrationBin, CalibrationMetrics } from './evaluationTypes.js';

/**
 * Calculate Brier Score between predicted probabilities and binary reference labels.
 */
export function calculateBrierScore(
  predictions: number[],
  labels: (0 | 1)[]
): number {
  const n = predictions.length;
  if (n === 0 || n !== labels.length) return 0;

  let sumSquaredDiff = 0;
  for (let i = 0; i < n; i++) {
    const diff = predictions[i] - labels[i];
    sumSquaredDiff += diff * diff;
  }

  return sumSquaredDiff / n;
}

/**
 * Calculate reliability calibration bins and Expected Calibration Error (ECE).
 */
export function calculateCalibrationBins(
  predictions: number[],
  labels: (0 | 1)[],
  numBins = 10
): {
  bins: CalibrationBin[];
  ece: number;
} {
  const n = predictions.length;
  if (n === 0 || n !== labels.length) {
    return { bins: [], ece: 0 };
  }

  const binStep = 1.0 / numBins;
  const bins: CalibrationBin[] = [];
  let weightedAbsoluteErrorSum = 0;

  for (let b = 0; b < numBins; b++) {
    const binLower = b * binStep;
    const binUpper = (b + 1) * binStep;
    const isLastBin = b === numBins - 1;

    let binSampleCount = 0;
    let sumPred = 0;
    let sumLabel = 0;

    for (let i = 0; i < n; i++) {
      const p = predictions[i];
      const inBin = isLastBin
        ? p >= binLower && p <= binUpper
        : p >= binLower && p < binUpper;

      if (inBin) {
        binSampleCount++;
        sumPred += p;
        sumLabel += labels[i];
      }
    }

    const meanPred = binSampleCount > 0 ? sumPred / binSampleCount : (binLower + binUpper) / 2;
    const observedFreq = binSampleCount > 0 ? sumLabel / binSampleCount : 0;

    if (binSampleCount > 0) {
      const absDiff = Math.abs(observedFreq - meanPred);
      weightedAbsoluteErrorSum += (binSampleCount / n) * absDiff;
    }

    bins.push({
      binIndex: b,
      binLower,
      binUpper,
      sampleCount: binSampleCount,
      meanPredictedProbability: meanPred,
      observedEventFrequency: observedFreq,
    });
  }

  return {
    bins,
    ece: weightedAbsoluteErrorSum,
  };
}

/**
 * Compute full calibration metrics for exposure probability predictions.
 */
export function evaluateCalibration(
  predictions: number[],
  labels: (0 | 1)[],
  numBins = 10
): CalibrationMetrics {
  const brierScore = calculateBrierScore(predictions, labels);
  const { bins, ece } = calculateCalibrationBins(predictions, labels, numBins);

  return {
    brierScore,
    expectedCalibrationError: ece,
    binCount: numBins,
    bins,
  };
}
