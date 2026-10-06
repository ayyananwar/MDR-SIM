/**
 * Multi-Observation Linkage Attack Engine (Phase 6).
 *
 * Implements Attacker B from docs/PRIVACY_THREAT_MODEL.md:
 * Analyzes observable BLE traffic across rotation boundaries to infer
 * whether two distinct pseudonyms belong to the same physical wearable.
 *
 * CRITICAL SCIENTIFIC & PRIVACY CONSTRAINTS:
 * 1. The attack engine consumes ONLY observable public BLE observations and
 *    declared gateway locations.
 * 2. It has ZERO access to the IdentityRegistry, secret keys, or Phase 1 ground truth.
 * 3. Ground-truth evaluation occurs strictly post-inference.
 */

import type { BLEObservation } from '../ble/bleTypes.js';
import type { Gateway } from '../simulation/scenarioTypes.js';
import type {
  LinkageCandidate,
  LinkageMetrics,
  PseudonymEpoch,
} from './privacyTypes.js';

export interface LinkageAttackConfig {
  /** Maximum temporal gap in seconds between pseudonyms to evaluate as linkage candidates */
  maxTemporalGapSeconds?: number;
  /** Maximum feasible human walking speed in m/s (default: 3.0 m/s) */
  maxFeasibleVelocityMps?: number;
  /** Decision threshold for binary linkage prediction (0.0 to 1.0, default 0.50) */
  linkageThreshold?: number;
}

interface PseudonymTrajectoryProfile {
  pseudonym: string;
  firstTimestampMs: number;
  lastTimestampMs: number;
  firstGatewayId: string;
  lastGatewayId: string;
  meanRssi: number;
  observationCount: number;
}

/**
 * Execute multi-observation trajectory linkage attack on observable BLE traffic.
 */
export function executeLinkageAttack(
  observations: readonly BLEObservation[],
  gateways: readonly Gateway[],
  config: LinkageAttackConfig = {}
): LinkageCandidate[] {
  const maxGapMs = (config.maxTemporalGapSeconds ?? 180) * 1000;
  const maxVelocity = config.maxFeasibleVelocityMps ?? 3.0;
  const threshold = config.linkageThreshold ?? 0.50;

  // Build gateway coordinate map
  const gatewayCoords = new Map<string, { x: number; y: number }>();
  for (const gw of gateways) {
    gatewayCoords.set(gw.gatewayId, { x: gw.x, y: gw.y });
  }

  // 1. Group observations by pseudonym and extract trajectory summaries
  const obsByPseudonym = new Map<string, BLEObservation[]>();
  for (const obs of observations) {
    const list = obsByPseudonym.get(obs.wearableId) ?? [];
    list.push(obs);
    obsByPseudonym.set(obs.wearableId, list);
  }

  const profiles: PseudonymTrajectoryProfile[] = [];

  for (const [pseudonym, list] of obsByPseudonym.entries()) {
    if (list.length === 0) continue;

    // Sort chronologically
    list.sort((a, b) => a.timestamp - b.timestamp);

    const first = list[0];
    const last = list[list.length - 1];
    const sumRssi = list.reduce((acc, o) => acc + o.rssiDbm, 0);

    profiles.push({
      pseudonym,
      firstTimestampMs: first.timestamp,
      lastTimestampMs: last.timestamp,
      firstGatewayId: first.gatewayId,
      lastGatewayId: last.gatewayId,
      meanRssi: sumRssi / list.length,
      observationCount: list.length,
    });
  }

  // 2. Evaluate candidate pairs across pseudonym rotation boundaries
  // Sort profiles by last observation timestamp
  profiles.sort((a, b) => a.lastTimestampMs - b.lastTimestampMs);

  const candidates: LinkageCandidate[] = [];

  for (let i = 0; i < profiles.length; i++) {
    const pA = profiles[i];

    for (let j = i + 1; j < profiles.length; j++) {
      const pB = profiles[j];

      // pB must start after or near pA's end
      const timeGapMs = pB.firstTimestampMs - pA.lastTimestampMs;
      if (timeGapMs < -5000) {
        continue; // Heavy overlap in time suggests two concurrent distinct devices
      }
      if (timeGapMs > maxGapMs) {
        break; // Gap too large
      }

      const effectiveGapMs = Math.max(100, Math.abs(timeGapMs));
      const effectiveGapSec = effectiveGapMs / 1000.0;

      // Gateway distance calculation
      const gA = gatewayCoords.get(pA.lastGatewayId) ?? { x: 0, y: 0 };
      const gB = gatewayCoords.get(pB.firstGatewayId) ?? { x: 0, y: 0 };
      const distMeters = Math.hypot(gA.x - gB.x, gA.y - gB.y);

      // Trajectory velocity feasibility
      const requiredVelocity = distMeters / effectiveGapSec;
      let velocityPenalty = 1.0;
      if (requiredVelocity > maxVelocity) {
        velocityPenalty = Math.max(0.01, maxVelocity / requiredVelocity);
      }

      // Temporal proximity score: e^(-gap / tau)
      const temporalScore = Math.exp(-effectiveGapSec / 60.0);

      // Spatial co-location score: gateways close together yield higher score
      const spatialScore = Math.exp(-distMeters / 15.0) * velocityPenalty;

      // RSSI similarity score
      const rssiDiff = Math.abs(pA.meanRssi - pB.meanRssi);
      const rssiScore = Math.exp(-rssiDiff / 10.0);

      // Multi-feature similarity fusion
      const similarityScore = 0.40 * temporalScore + 0.35 * spatialScore + 0.25 * rssiScore;
      const predictedSameDevice = similarityScore >= threshold;

      candidates.push({
        pseudonymA: pA.pseudonym,
        pseudonymB: pB.pseudonym,
        timeGapSeconds: effectiveGapSec,
        gatewayA: pA.lastGatewayId,
        gatewayB: pB.firstGatewayId,
        gatewayDistanceMeters: distMeters,
        meanRssiA: pA.meanRssi,
        meanRssiB: pB.meanRssi,
        similarityScore,
        predictedSameDevice,
      });
    }
  }

  return candidates;
}

/**
 * Evaluate linkage predictions against ground truth pseudonym epochs.
 * Strictly evaluation-only (consumes true mapping post-inference).
 */
export function evaluateLinkagePredictions(
  candidates: readonly LinkageCandidate[],
  allEpochs: readonly PseudonymEpoch[]
): LinkageMetrics {
  // Map pseudonym to true wearableId
  const trueWearableByPseudonym = new Map<string, string>();
  for (const ep of allEpochs) {
    trueWearableByPseudonym.set(ep.pseudonym, ep.wearableId);
  }

  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  let trueSameDeviceCount = 0;
  let trueDifferentDeviceCount = 0;

  for (const cand of candidates) {
    const trueWearableA = trueWearableByPseudonym.get(cand.pseudonymA);
    const trueWearableB = trueWearableByPseudonym.get(cand.pseudonymB);

    if (!trueWearableA || !trueWearableB) continue;

    const actualSameDevice = trueWearableA === trueWearableB;

    if (actualSameDevice) {
      trueSameDeviceCount++;
      if (cand.predictedSameDevice) {
        tp++;
      } else {
        fn++;
      }
    } else {
      trueDifferentDeviceCount++;
      if (cand.predictedSameDevice) {
        fp++;
      } else {
        tn++;
      }
    }
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const linkageSuccessRate = trueSameDeviceCount > 0 ? tp / trueSameDeviceCount : undefined;
  const unlinkabilityProxy = linkageSuccessRate !== undefined ? Math.max(0, 1.0 - linkageSuccessRate) : undefined;

  return {
    totalCandidateTransitions: candidates.length,
    totalTransitions: trueSameDeviceCount,
    trueSameDeviceCount,
    trueDifferentDeviceCount,
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
    trueNegatives: tn,
    precision,
    recall,
    f1Score,
    linkageSuccessRate,
    unlinkabilityProxy,
  };
}
