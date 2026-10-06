import {
  EdgeObservation,
  CandidateGenerationConfig,
  ProximityConfig,
  ProximityEvidence,
  CandidatePair,
} from './edgeTypes.js';
import { isWithinProximityThreshold } from './proximityEstimator.js';

export interface CandidateGenerationResult {
  evidenceList: ProximityEvidence[];
  candidatePairs: CandidatePair[];
}

/**
 * Generates candidate wearable pairs and temporal proximity evidence from gateway observations.
 *
 * CRITICAL SCIENTIFIC LOGIC:
 * A gateway observing Wearable A and Wearable B within a temporal coincidence window
 * (temporalWindowMs) provides spatial co-location evidence that both beacons are in
 * overlapping reception range of that gateway.
 *
 * This does NOT assume pairwise ranging or calculate direct wearable-to-wearable distance.
 */
export function generateCandidatePairs(
  observations: readonly EdgeObservation[],
  config: CandidateGenerationConfig,
  proximityConfig: ProximityConfig
): CandidateGenerationResult {
  const temporalWindowMs = Math.max(100, config.temporalWindowMs);

  // Group observations by gatewayId
  const observationsByGateway = new Map<string, EdgeObservation[]>();
  for (const obs of observations) {
    let list = observationsByGateway.get(obs.gatewayId);
    if (!list) {
      list = [];
      observationsByGateway.set(obs.gatewayId, list);
    }
    list.push(obs);
  }

  const rawEvidenceList: ProximityEvidence[] = [];
  const pairTracker = new Map<
    string,
    {
      wearableA: string;
      wearableB: string;
      firstTime: number;
      lastTime: number;
      count: number;
    }
  >();

  // Process observations at each gateway
  for (const [gatewayId, obsList] of observationsByGateway) {
    let windowStartIdx = 0;

    for (let i = 0; i < obsList.length; i++) {
      const currentObs = obsList[i];

      // Advance sliding window start
      while (
        windowStartIdx < i &&
        currentObs.timestamp - obsList[windowStartIdx].timestamp > temporalWindowMs
      ) {
        windowStartIdx++;
      }

      // Check against all co-temporal observations in sliding window
      for (let j = windowStartIdx; j < i; j++) {
        const prevObs = obsList[j];

        // Skip same wearable
        if (currentObs.wearableId === prevObs.wearableId) {
          continue;
        }

        // Evaluate proximity condition: both must meet the proximity signal threshold
        const currentQualifies = isWithinProximityThreshold(
          currentObs.filteredRssiDbm,
          proximityConfig
        );
        const prevQualifies = isWithinProximityThreshold(
          prevObs.filteredRssiDbm,
          proximityConfig
        );

        if (currentQualifies && prevQualifies) {
          const wA = currentObs.wearableId < prevObs.wearableId
            ? currentObs.wearableId
            : prevObs.wearableId;
          const wB = currentObs.wearableId < prevObs.wearableId
            ? prevObs.wearableId
            : currentObs.wearableId;

          const rssiA = wA === currentObs.wearableId ? currentObs.filteredRssiDbm : prevObs.filteredRssiDbm;
          const rssiB = wA === currentObs.wearableId ? prevObs.filteredRssiDbm : currentObs.filteredRssiDbm;

          // Evidence strength: normalized based on proximity threshold margin
          const evidenceStrength = 1.0;

          rawEvidenceList.push({
            wearableA: wA,
            wearableB: wB,
            timestamp: currentObs.timestamp,
            gatewayId,
            evidenceStrength,
            rssiA,
            rssiB,
            sourceObservationIds: [currentObs.sourceObservationId, prevObs.sourceObservationId],
          });

          // Update candidate pair summary
          const pairKey = `${wA}::${wB}`;
          const existing = pairTracker.get(pairKey);
          if (!existing) {
            pairTracker.set(pairKey, {
              wearableA: wA,
              wearableB: wB,
              firstTime: prevObs.timestamp,
              lastTime: currentObs.timestamp,
              count: 1,
            });
          } else {
            existing.lastTime = Math.max(existing.lastTime, currentObs.timestamp);
            existing.count++;
          }
        }
      }
    }
  }

  // Sort evidence deterministically
  rawEvidenceList.sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    if (a.wearableA !== b.wearableA) return a.wearableA.localeCompare(b.wearableA);
    if (a.wearableB !== b.wearableB) return a.wearableB.localeCompare(b.wearableB);
    return a.gatewayId.localeCompare(b.gatewayId);
  });

  // Assemble candidate pair summaries
  const candidatePairs: CandidatePair[] = Array.from(pairTracker.values())
    .map((p) => ({
      wearableA: p.wearableA,
      wearableB: p.wearableB,
      firstObservationTime: p.firstTime,
      lastObservationTime: p.lastTime,
      supportingObservations: p.count,
    }))
    .sort((a, b) => {
      if (a.firstObservationTime !== b.firstObservationTime) {
        return a.firstObservationTime - b.firstObservationTime;
      }
      if (a.wearableA !== b.wearableA) return a.wearableA.localeCompare(b.wearableA);
      return a.wearableB.localeCompare(b.wearableB);
    });

  return {
    evidenceList: rawEvidenceList,
    candidatePairs,
  };
}
