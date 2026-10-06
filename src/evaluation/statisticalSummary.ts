/**
 * Statistical Aggregation Across Experimental Replicates (Phase 5).
 *
 * Implements:
 * - Sample mean, median, sample standard deviation (Bessel's correction)
 * - Minimum, Maximum
 * - 95% Confidence Intervals using Student's t-distribution:
 *   mean ± t_(0.975, n-1) * (s / sqrt(n))
 *
 * CRITICAL SCIENTIFIC INTEGRITY CONSTRAINT:
 * Only independent random seeds are treated as experimental replicates.
 * For n < 2, confidence intervals are strictly reported as undefined.
 */

import type { MetricSummary } from './evaluationTypes.js';

/**
 * Two-tailed critical values t_(0.975, df) for alpha = 0.05.
 * Keyed by degrees of freedom df = n - 1.
 */
const T_STUDENT_95_CRITICAL: Record<number, number> = {
  1: 12.706,
  2: 4.303,
  3: 3.182,
  4: 2.776,
  5: 2.571,
  6: 2.447,
  7: 2.365,
  8: 2.306,
  9: 2.262,
  10: 2.228,
  11: 2.201,
  12: 2.179,
  13: 2.16,
  14: 2.145,
  15: 2.131,
  16: 2.12,
  17: 2.11,
  18: 2.101,
  19: 2.093,
  20: 2.086,
  25: 2.06,
  30: 2.042,
  40: 2.021,
  60: 2.0,
  120: 1.98,
};

/**
 * Get critical t value for 95% confidence interval.
 */
export function getStudentTCriticalValue(df: number): number {
  if (df <= 0) return 0;
  if (T_STUDENT_95_CRITICAL[df] !== undefined) {
    return T_STUDENT_95_CRITICAL[df];
  }
  // Find closest or use normal approximation z=1.96 for df > 120
  if (df > 120) return 1.96;
  const keys = Object.keys(T_STUDENT_95_CRITICAL)
    .map(Number)
    .sort((a, b) => a - b);
  for (let i = 0; i < keys.length - 1; i++) {
    if (df >= keys[i] && df <= keys[i + 1]) {
      // Linear interpolation between brackets
      const k1 = keys[i];
      const k2 = keys[i + 1];
      const v1 = T_STUDENT_95_CRITICAL[k1];
      const v2 = T_STUDENT_95_CRITICAL[k2];
      const ratio = (df - k1) / (k2 - k1);
      return v1 + ratio * (v2 - v1);
    }
  }
  return 1.96;
}

/**
 * Summarize a collection of replicate measurements for a metric.
 */
export function summarizeReplicateMetric(
  metricName: string,
  values: number[]
): MetricSummary {
  const n = values.length;
  if (n === 0) {
    return {
      metric: metricName,
      n: 0,
      mean: 0,
      median: 0,
      standardDeviation: 0,
      min: 0,
      max: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  let median: number;
  if (n % 2 === 1) {
    median = sorted[Math.floor(n / 2)];
  } else {
    median = (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  }

  // Sample standard deviation (Bessel's correction: N - 1)
  let standardDeviation = 0;
  if (n > 1) {
    const sumSquaredDiff = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
    standardDeviation = Math.sqrt(sumSquaredDiff / (n - 1));
  }

  // 95% Confidence interval calculation
  let confidenceInterval95:
    | {
        lower: number;
        upper: number;
        marginOfError: number;
      }
    | undefined;

  if (n >= 2 && standardDeviation > 0) {
    const df = n - 1;
    const tCrit = getStudentTCriticalValue(df);
    const standardError = standardDeviation / Math.sqrt(n);
    const marginOfError = tCrit * standardError;

    confidenceInterval95 = {
      lower: Math.max(0, mean - marginOfError),
      upper: mean + marginOfError,
      marginOfError,
    };
  }

  return {
    metric: metricName,
    n,
    mean,
    median,
    standardDeviation,
    min,
    max,
    confidenceInterval95,
    rawValues: values,
  };
}
