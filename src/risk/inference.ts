/**
 * Causal Bayesian Exposure-Risk Inference Engine (Phase 4).
 *
 * Implements:
 * ln O(E | X) = ln O(E) + Σ ln(LR_i)
 * O(E | X) = exp(ln O(E | X))
 * P(E | X) = O(E | X) / (1 + O(E | X))
 *
 * CRITICAL SCIENTIFIC & ARCHITECTURAL CONSTRAINTS:
 * 1. Consumes only observed session-level features and a fitted risk model.
 * 2. Does NOT accept or access GroundTruthContact, reference labels, or true coordinates.
 * 3. Log-odds calculation guarantees numerical stability (no NaN or Infinity).
 * 4. Strictly bounds output: 0.0 <= exposureProbability <= 1.0.
 * 5. Deterministic: same input + model produces identical output.
 */

import { calibrateProbability } from './calibration.js';
import { discretizeFeatures } from './discretization.js';
import { evaluateFeatureLikelihood } from './likelihood.js';
import { computePriorLogOdds } from './prior.js';
import type {
  EvidenceContribution,
  ExposureFeatures,
  FittedRiskModel,
  RiskAssessment,
} from './riskTypes.js';

export interface InferenceContext {
  targetWearableId: string;
  sourceWearableId?: string;
  sessionId: string;
  timestamp?: number;
}

/**
 * Predict exposure probability for an extracted feature vector.
 */
export function predictExposure(
  model: FittedRiskModel,
  features: ExposureFeatures,
  context?: InferenceContext
): RiskAssessment {
  // 1. Prior log-odds
  const priorProb =
    typeof model.prior.value === 'number' ? model.prior.value : 0.1;
  const priorLogOdds = computePriorLogOdds(priorProb);

  // 2. Discretize observed features
  const discretized = discretizeFeatures(features, model.discretization);

  // 3. Accumulate log likelihood ratios across active features
  let accumulatedLogOdds = priorLogOdds;
  const contributions: EvidenceContribution[] = [];

  for (const feature of model.selectedFeatures) {
    const binLabel = discretized[feature] ?? 'unknown';
    const rawVal = (features as unknown as Record<string, unknown>)[feature];
    const observedValue =
      rawVal !== undefined && (typeof rawVal === 'string' || typeof rawVal === 'number')
        ? rawVal
        : binLabel;

    const table = model.likelihoods[feature];
    const contribution = evaluateFeatureLikelihood(feature, observedValue, binLabel, table);

    contributions.push(contribution);
    accumulatedLogOdds += contribution.logLikelihoodRatio;
  }

  // 4. Convert log-odds back to probability safely
  let uncalibratedProb: number;
  if (accumulatedLogOdds > 700) {
    uncalibratedProb = 1.0;
  } else if (accumulatedLogOdds < -700) {
    uncalibratedProb = 0.0;
  } else {
    const posteriorOdds = Math.exp(accumulatedLogOdds);
    uncalibratedProb = posteriorOdds / (1.0 + posteriorOdds);
  }

  // 5. Apply optional calibration
  const finalProb = calibrateProbability(uncalibratedProb, model.calibration);

  // 6. Guarantee numerical safety
  const safeProb = Math.max(0.0, Math.min(1.0, isNaN(finalProb) ? priorProb : finalProb));

  return {
    targetWearableId: context?.targetWearableId ?? 'target-unknown',
    sourceWearableId: context?.sourceWearableId,
    sessionId: context?.sessionId ?? 'session-unknown',
    modelVersion: model.modelVersion,
    exposureProbability: safeProb,
    priorProbability: priorProb,
    evidence: features,
    contributions,
    inferenceTimestamp: context?.timestamp ?? 0,
  };
}
