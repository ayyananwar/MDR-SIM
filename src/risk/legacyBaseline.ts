/**
 * Legacy Heuristic Risk Model (Baseline Preservation).
 *
 * Preserves the pre-existing weighted additive scoring heuristic as a baseline model.
 * NOTE: This is an empirical weighted heuristic, NOT a Bayesian likelihood model.
 * It is preserved specifically for comparative evaluation benchmarks against the
 * Bayesian likelihood model in future research phases.
 */

import type { ExposureFeatures, RiskAssessment } from './riskTypes.js';

export interface LegacyHeuristicResult {
  riskScore: number;
  durationFactor: number;
  rssiFactor: number;
  repeatFactor: number;
  sourceBoost: number;
}

/**
 * Legacy Heuristic Risk Model implementation.
 * Formula:
 * durationFactor = min(durationMinutes / 30, 1) * 0.35
 * proximityFactor = proximityEvidence * 0.35
 * repeatFactor = min(encounterCount / 5, 1) * 0.15
 * sourceBoost = (sourceStatus === 'confirmed') ? 0.15 : 0.0
 * score = durationFactor + proximityFactor + repeatFactor + sourceBoost
 */
export class LegacyHeuristicRiskModel {
  public readonly modelVersion = 'legacy-heuristic-1.0.0';

  /**
   * Evaluate the legacy weighted heuristic on ExposureFeatures.
   */
  public evaluate(features: ExposureFeatures): LegacyHeuristicResult {
    const durationMinutes = features.durationSeconds / 60;
    const durationFactor = Math.min(durationMinutes / 30, 1.0) * 0.35;

    // Proximity factor: normalized proximity evidence [0, 1] scaled by 0.35
    const rssiFactor = Math.max(0, Math.min(1, features.proximityEvidence)) * 0.35;

    // Repeat encounters factor
    const repeatFactor = Math.min(features.encounterCount / 5, 1.0) * 0.15;

    // Source status boost
    const sourceBoost =
      features.sourceStatus === 'confirmed'
        ? 0.15
        : features.sourceStatus === 'suspected'
        ? 0.05
        : 0.0;

    let score = durationFactor + rssiFactor + repeatFactor + sourceBoost;
    score = Math.max(0.01, Math.min(0.99, score));

    return {
      riskScore: score,
      durationFactor,
      rssiFactor,
      repeatFactor,
      sourceBoost,
    };
  }

  /**
   * Predict exposure score using legacy heuristic format conforming to RiskAssessment.
   */
  public predict(
    features: ExposureFeatures,
    context?: { targetWearableId: string; sourceWearableId?: string; sessionId: string; timestamp?: number }
  ): RiskAssessment {
    const result = this.evaluate(features);

    return {
      targetWearableId: context?.targetWearableId ?? 'target-unknown',
      sourceWearableId: context?.sourceWearableId,
      sessionId: context?.sessionId ?? 'session-unknown',
      modelVersion: this.modelVersion,
      exposureProbability: result.riskScore,
      priorProbability: 0.1,
      evidence: features,
      inferenceTimestamp: context?.timestamp ?? Date.now(),
    };
  }
}
