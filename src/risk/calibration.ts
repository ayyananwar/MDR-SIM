/**
 * Probability Calibration Utilities (Phase 4).
 *
 * Implements post-inference probability calibration transformations:
 * - Platt scaling (logistic calibration on logit)
 * - Isotonic regression (piecewise monotonic step calibration)
 *
 * CRITICAL SCIENTIFIC CONSTRAINT:
 * Calibration must be fitted on held-out reference datasets and strictly
 * separated from evaluation/test datasets.
 */

import type { CalibrationConfig } from './riskTypes.js';

/**
 * Standard logistic sigmoid function: 1 / (1 + exp(-x))
 */
function sigmoid(x: number): number {
  if (x > 35) return 1.0;
  if (x < -35) return 0.0;
  return 1.0 / (1.0 + Math.exp(-x));
}

/**
 * Logit function: ln(p / (1 - p))
 */
function logit(p: number): number {
  const safeP = Math.max(1e-12, Math.min(1 - 1e-12, p));
  return Math.log(safeP / (1 - safeP));
}

/**
 * Apply calibration to an uncalibrated posterior probability.
 * Guaranteed to return a finite number in [0, 1].
 */
export function calibrateProbability(p: number, config?: CalibrationConfig): number {
  if (!config || !config.enabled) {
    return Math.max(0, Math.min(1, p));
  }

  if (config.method === 'platt' && config.plattParameters) {
    const { a, b } = config.plattParameters;
    const z = logit(p);
    const calibrated = sigmoid(a * z + b);
    return Math.max(0, Math.min(1, calibrated));
  }

  if (config.method === 'isotonic' && config.isotonicParameters) {
    const { thresholds, values } = config.isotonicParameters;
    if (thresholds.length === 0 || values.length === 0) {
      return Math.max(0, Math.min(1, p));
    }
    // Find matching step
    for (let i = 0; i < thresholds.length; i++) {
      if (p <= thresholds[i]) {
        return Math.max(0, Math.min(1, values[i]));
      }
    }
    return Math.max(0, Math.min(1, values[values.length - 1]));
  }

  return Math.max(0, Math.min(1, p));
}

/**
 * Fit Platt scaling parameters (a, b) using Newton-Raphson or gradient descent on log-loss.
 */
export function fitPlattParameters(
  uncalibratedProbabilities: number[],
  referenceLabels: (0 | 1)[]
): { a: number; b: number } {
  const n = uncalibratedProbabilities.length;
  if (n === 0 || n !== referenceLabels.length) {
    return { a: 1.0, b: 0.0 };
  }

  const logits = uncalibratedProbabilities.map((p) => logit(p));

  // Initialize a=1, b=0
  let a = 1.0;
  let b = 0.0;
  const learningRate = 0.05;
  const iterations = 50;

  for (let iter = 0; iter < iterations; iter++) {
    let gradA = 0;
    let gradB = 0;

    for (let i = 0; i < n; i++) {
      const pred = sigmoid(a * logits[i] + b);
      const error = pred - referenceLabels[i];
      gradA += error * logits[i];
      gradB += error;
    }

    gradA /= n;
    gradB /= n;

    a -= learningRate * gradA;
    b -= learningRate * gradB;
  }

  return { a, b };
}
