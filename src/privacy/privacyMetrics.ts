/**
 * Quantitative Privacy & Attack Metrics (Phase 6).
 *
 * Implements mathematically explicit privacy metrics:
 * 1. Empirical Linkability: Precision, Recall, F1, Linkage Success Rate
 * 2. Empirical Unlinkability Proxy: 1 - LinkageSuccessRate
 * 3. Identity Inference Accuracy: Top-1 and Top-k
 * 4. Collision Metrics & Theoretical Birthday Bound
 * 5. Mean Exposure Duration per Pseudonym
 * 6. Privacy–Utility Trade-Off: Session Fragmentation & Duration Attenuation
 */

import type { ContactSession } from '../edge/edgeTypes.js';
import type {
  CollisionMetrics,
  IdentityInferenceMetrics,
  LinkageMetrics,
  PrivacyTradeoffMetrics,
  PseudonymEpoch,
} from './privacyTypes.js';

export {
  evaluateLinkagePredictions,
} from './linkageAttack.js';

export {
  evaluateIdentityInference,
} from './identityInference.js';

/**
 * Calculate the average continuous exposure duration (in seconds) under a single pseudonym.
 */
export function calculateMeanExposureDurationSeconds(epochs: readonly PseudonymEpoch[]): number {
  if (epochs.length === 0) return 0;
  const totalDurationMs = epochs.reduce((acc, ep) => acc + (ep.validToMs - ep.validFromMs), 0);
  return Math.round((totalDurationMs / epochs.length / 1000.0) * 100) / 100;
}

/**
 * Calculate privacy–utility trade-off metrics by comparing authorized vs unprivileged edge reconstruction.
 */
export function calculatePrivacyTradeoff(
  authorizedSessions: readonly ContactSession[],
  unprivilegedSessions: readonly ContactSession[],
  rotationIntervalSeconds: number
): PrivacyTradeoffMetrics {
  const authCount = authorizedSessions.length;
  const unprivCount = unprivilegedSessions.length;

  const sessionFragmentationRatio = authCount > 0 ? unprivCount / authCount : 1.0;

  const authTotalDur = authorizedSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const unprivTotalDur = unprivilegedSessions.reduce((acc, s) => acc + s.durationSeconds, 0);

  const authMeanDur = authCount > 0 ? authTotalDur / authCount : 0;
  const unprivMeanDur = unprivCount > 0 ? unprivTotalDur / unprivCount : 0;

  const durationAttenuationRatio = authMeanDur > 0 ? unprivMeanDur / authMeanDur : 1.0;

  return {
    rotationIntervalSeconds,
    authorizedSessionCount: authCount,
    unprivilegedSessionCount: unprivCount,
    sessionFragmentationRatio: Math.round(sessionFragmentationRatio * 1000) / 1000,
    authorizedMeanDurationSeconds: Math.round(authMeanDur * 10) / 10,
    unprivilegedMeanDurationSeconds: Math.round(unprivMeanDur * 10) / 10,
    durationAttenuationRatio: Math.round(durationAttenuationRatio * 1000) / 1000,
  };
}
