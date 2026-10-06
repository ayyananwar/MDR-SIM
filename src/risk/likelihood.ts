/**
 * Likelihood Model and Evidence Evaluation for Bayesian Exposure Modeling (Phase 4).
 *
 * Implements:
 * LR_i = P(X_i = x | E = 1) / P(X_i = x | E = 0)
 * ln(LR_i) = ln(P(X_i = x | E = 1)) - ln(P(X_i = x | E = 0))
 *
 * Missing evidence policy:
 * Unseen categories or missing features default to neutral evidence:
 * LR = 1.0, ln(LR) = 0.0.
 */

import type {
  EvidenceContribution,
  LikelihoodEntry,
  LikelihoodTable,
} from './riskTypes.js';

/**
 * Neutral evidence entry for unseen or missing categories.
 */
export const NEUTRAL_LIKELIHOOD_ENTRY: LikelihoodEntry = {
  pGivenExposure: 1.0,
  pGivenNonExposure: 1.0,
  likelihoodRatio: 1.0,
  logLikelihoodRatio: 0.0,
};

/**
 * Evaluate likelihood ratio for a feature given its discretized bin.
 * Safe against missing/unseen values: returns neutral LR = 1.0.
 */
export function evaluateFeatureLikelihood(
  feature: string,
  observedValue: string | number,
  binLabel: string,
  table?: LikelihoodTable
): EvidenceContribution {
  if (!table || !table[binLabel]) {
    return {
      feature,
      observedValue,
      binLabel,
      likelihoodRatio: 1.0,
      logLikelihoodRatio: 0.0,
    };
  }

  const entry = table[binLabel];
  return {
    feature,
    observedValue,
    binLabel,
    likelihoodRatio: entry.likelihoodRatio,
    logLikelihoodRatio: entry.logLikelihoodRatio,
  };
}

/**
 * Default reference likelihood tables with documented research provenance.
 * Used when offline training data is not explicitly provided.
 */
export const DEFAULT_REFERENCE_LIKELIHOODS: Record<string, LikelihoodTable> = {
  duration: {
    short: {
      pGivenExposure: 0.15,
      pGivenNonExposure: 0.7,
      likelihoodRatio: 0.15 / 0.7,
      logLikelihoodRatio: Math.log(0.15 / 0.7),
    },
    medium: {
      pGivenExposure: 0.35,
      pGivenNonExposure: 0.22,
      likelihoodRatio: 0.35 / 0.22,
      logLikelihoodRatio: Math.log(0.35 / 0.22),
    },
    long: {
      pGivenExposure: 0.5,
      pGivenNonExposure: 0.08,
      likelihoodRatio: 0.5 / 0.08,
      logLikelihoodRatio: Math.log(0.5 / 0.08),
    },
  },
  proximity: {
    weak: {
      pGivenExposure: 0.1,
      pGivenNonExposure: 0.65,
      likelihoodRatio: 0.1 / 0.65,
      logLikelihoodRatio: Math.log(0.1 / 0.65),
    },
    moderate: {
      pGivenExposure: 0.35,
      pGivenNonExposure: 0.25,
      likelihoodRatio: 0.35 / 0.25,
      logLikelihoodRatio: Math.log(0.35 / 0.25),
    },
    strong: {
      pGivenExposure: 0.55,
      pGivenNonExposure: 0.1,
      likelihoodRatio: 0.55 / 0.1,
      logLikelihoodRatio: Math.log(0.55 / 0.1),
    },
  },
  encounterCount: {
    single: {
      pGivenExposure: 0.3,
      pGivenNonExposure: 0.75,
      likelihoodRatio: 0.3 / 0.75,
      logLikelihoodRatio: Math.log(0.3 / 0.75),
    },
    few: {
      pGivenExposure: 0.45,
      pGivenNonExposure: 0.2,
      likelihoodRatio: 0.45 / 0.2,
      logLikelihoodRatio: Math.log(0.45 / 0.2),
    },
    frequent: {
      pGivenExposure: 0.25,
      pGivenNonExposure: 0.05,
      likelihoodRatio: 0.25 / 0.05,
      logLikelihoodRatio: Math.log(0.25 / 0.05),
    },
  },
  cumulativeDuration: {
    brief: {
      pGivenExposure: 0.15,
      pGivenNonExposure: 0.7,
      likelihoodRatio: 0.15 / 0.7,
      logLikelihoodRatio: Math.log(0.15 / 0.7),
    },
    moderate: {
      pGivenExposure: 0.35,
      pGivenNonExposure: 0.22,
      likelihoodRatio: 0.35 / 0.22,
      logLikelihoodRatio: Math.log(0.35 / 0.22),
    },
    extended: {
      pGivenExposure: 0.5,
      pGivenNonExposure: 0.08,
      likelihoodRatio: 0.5 / 0.08,
      logLikelihoodRatio: Math.log(0.5 / 0.08),
    },
  },
  sourceStatus: {
    'non-source': {
      pGivenExposure: 0.1,
      pGivenNonExposure: 0.85,
      likelihoodRatio: 0.1 / 0.85,
      logLikelihoodRatio: Math.log(0.1 / 0.85),
    },
    suspected: {
      pGivenExposure: 0.3,
      pGivenNonExposure: 0.12,
      likelihoodRatio: 0.3 / 0.12,
      logLikelihoodRatio: Math.log(0.3 / 0.12),
    },
    confirmed: {
      pGivenExposure: 0.6,
      pGivenNonExposure: 0.03,
      likelihoodRatio: 0.6 / 0.03,
      logLikelihoodRatio: Math.log(0.6 / 0.03),
    },
    unknown: {
      pGivenExposure: 0.2,
      pGivenNonExposure: 0.2,
      likelihoodRatio: 1.0,
      logLikelihoodRatio: 0.0,
    },
  },
};
