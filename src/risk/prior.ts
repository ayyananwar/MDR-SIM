/**
 * Prior Probability and Odds Utilities for Bayesian Exposure Modeling (Phase 4).
 *
 * Implements:
 * O(E) = P(E) / (1 - P(E))
 *
 * With strict probability bounds validation and parameter provenance tracking.
 */

import type { PriorConfig, RiskParameterMetadata } from './riskTypes.js';

export const DEFAULT_PRIOR_CONFIG: PriorConfig = {
  baselineExposureProbability: 0.1,
  priorMode: 'empirical',
  metadata: {
    value: 0.1,
    source: 'simulation',
    rationale: 'Baseline digital exposure event rate in reference hospital scenario',
    datasetVersion: '2.0',
  },
};

/**
 * Validate that a probability value is strictly within (0, 1) for valid prior odds calculation.
 */
export function validateProbability(p: number, paramName = 'probability'): void {
  if (isNaN(p) || !isFinite(p)) {
    throw new Error(`Invalid ${paramName}: must be a finite number, received ${p}`);
  }
  if (p <= 0 || p >= 1) {
    throw new Error(
      `Invalid ${paramName}: must be strictly between 0 and 1 for odds formulation, received ${p}`
    );
  }
}

/**
 * Calculate prior odds from prior probability:
 * O(E) = P(E) / (1 - P(E))
 */
export function computePriorOdds(probability: number): number {
  validateProbability(probability, 'priorProbability');
  return probability / (1 - probability);
}

/**
 * Calculate prior log-odds from prior probability:
 * ln O(E) = ln(P(E)) - ln(1 - P(E))
 */
export function computePriorLogOdds(probability: number): number {
  validateProbability(probability, 'priorProbability');
  return Math.log(probability) - Math.log(1 - probability);
}

/**
 * Convert odds back to probability:
 * P(E) = O(E) / (1 + O(E))
 */
export function computeProbabilityFromOdds(odds: number): number {
  if (isNaN(odds) || !isFinite(odds)) {
    throw new Error(`Invalid odds: must be a finite number, received ${odds}`);
  }
  if (odds < 0) {
    throw new Error(`Invalid odds: cannot be negative, received ${odds}`);
  }
  return odds / (1 + odds);
}

/**
 * Create formal parameter metadata for the configured prior.
 */
export function createPriorMetadata(config: PriorConfig): RiskParameterMetadata {
  return (
    config.metadata ?? {
      value: config.baselineExposureProbability,
      source: 'simulation',
      rationale: `Baseline prior exposure probability under mode '${config.priorMode}'`,
      datasetVersion: '2.0',
    }
  );
}
