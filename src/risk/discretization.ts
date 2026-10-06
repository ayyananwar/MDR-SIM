/**
 * Feature Discretization for Categorical Likelihood Estimation (Phase 4).
 *
 * Converts continuous session-level exposure features into explicit discrete bins.
 * Bin boundaries are treated as configurable experimental parameters rather than hard-coded magic numbers.
 */

import type {
  ContinuousFeatureBin,
  DiscretizationConfig,
  ExposureFeatures,
} from './riskTypes.js';

/**
 * Default discretization boundaries with explicit research provenance.
 * - Duration: short (< 60s), medium (60s - 300s), long (> 300s)
 * - Proximity: weak (< 0.33), moderate (0.33 - 0.66), strong (>= 0.66)
 * - Encounter count: single (1), few (2-3), frequent (>= 4)
 * - Cumulative duration: brief (< 120s), moderate (120s - 600s), extended (>= 600s)
 */
export const DEFAULT_DISCRETIZATION_CONFIG: DiscretizationConfig = {
  durationBins: [
    { label: 'short', min: 0, max: 60 },
    { label: 'medium', min: 60, max: 300 },
    { label: 'long', min: 300, max: Infinity },
  ],
  proximityBins: [
    { label: 'weak', min: 0, max: 0.33 },
    { label: 'moderate', min: 0.33, max: 0.66 },
    { label: 'strong', min: 0.66, max: Infinity },
  ],
  encounterBins: [
    { label: 'single', min: 1, max: 2 },
    { label: 'few', min: 2, max: 4 },
    { label: 'frequent', min: 4, max: Infinity },
  ],
  cumulativeDurationBins: [
    { label: 'brief', min: 0, max: 120 },
    { label: 'moderate', min: 120, max: 600 },
    { label: 'extended', min: 600, max: Infinity },
  ],
  sourceStatusValues: ['non-source', 'suspected', 'confirmed', 'unknown'],
};

/**
 * Map a continuous value into a discrete bin label.
 * Interval rule: min <= value < max, with the last bin being closed [min, max].
 */
export function discretizeContinuousValue(
  value: number,
  bins: ContinuousFeatureBin[],
  fallbackLabel = 'unknown'
): string {
  if (isNaN(value) || !isFinite(value)) {
    return fallbackLabel;
  }

  for (let i = 0; i < bins.length; i++) {
    const bin = bins[i];
    const isLast = i === bins.length - 1;
    if (value >= bin.min && (isLast ? value <= bin.max : value < bin.max)) {
      return bin.label;
    }
  }

  // If value is below first bin minimum, clamp to first bin
  if (bins.length > 0 && value < bins[0].min) {
    return bins[0].label;
  }
  // If value is above last bin maximum, clamp to last bin
  if (bins.length > 0 && value > bins[bins.length - 1].max) {
    return bins[bins.length - 1].label;
  }

  return fallbackLabel;
}

/**
 * Discretize an entire ExposureFeatures vector into discrete string bins.
 */
export function discretizeFeatures(
  features: ExposureFeatures,
  config: DiscretizationConfig = DEFAULT_DISCRETIZATION_CONFIG
): Record<string, string> {
  return {
    duration: discretizeContinuousValue(features.durationSeconds, config.durationBins),
    proximity: discretizeContinuousValue(features.proximityEvidence, config.proximityBins),
    encounterCount: discretizeContinuousValue(features.encounterCount, config.encounterBins),
    cumulativeDuration: discretizeContinuousValue(
      features.cumulativeDurationSeconds,
      config.cumulativeDurationBins
    ),
    sourceStatus: config.sourceStatusValues.includes(features.sourceStatus)
      ? features.sourceStatus
      : 'unknown',
  };
}
