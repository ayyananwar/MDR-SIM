import { ContactSession, SessionizationConfig, ProximityEvidence } from './edgeTypes.js';
import { groupEvidenceByPair } from './temporalEvidence.js';

interface ActiveCluster {
  wearableA: string;
  wearableB: string;
  startTimeMs: number;
  lastTimeMs: number;
  evidenceCount: number;
  gateways: Set<string>;
  rssiListA: number[];
  rssiListB: number[];
  obsIds: Set<string>;
}

function computeMean(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

function computeMedian(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const med =
    sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(med * 100) / 100;
}

/**
 * Reconstructs discrete contact sessions from proximity evidence streams.
 *
 * Implements:
 * 1. Packet drop gap tolerance (maxGapSeconds)
 * 2. Minimum observation count qualification
 * 3. Minimum duration qualification
 * 4. Multi-gateway evidence fusion
 * 5. Deterministic session IDs
 */
export function reconstructContactSessions(
  evidenceList: readonly ProximityEvidence[],
  config: SessionizationConfig
): ContactSession[] {
  const pairMap = groupEvidenceByPair(evidenceList);
  const completedSessions: ContactSession[] = [];
  const maxGapMs = config.maxGapSeconds * 1000;

  for (const [, pairEvidences] of pairMap) {
    if (pairEvidences.length === 0) continue;

    let cluster: ActiveCluster | null = null;

    for (const ev of pairEvidences) {
      if (!cluster) {
        cluster = {
          wearableA: ev.wearableA,
          wearableB: ev.wearableB,
          startTimeMs: ev.timestamp,
          lastTimeMs: ev.timestamp,
          evidenceCount: 1,
          gateways: new Set([ev.gatewayId]),
          rssiListA: [ev.rssiA],
          rssiListB: [ev.rssiB],
          obsIds: new Set(ev.sourceObservationIds || []),
        };
        continue;
      }

      const gap = ev.timestamp - cluster.lastTimeMs;

      if (gap <= maxGapMs) {
        // Extend active session
        cluster.lastTimeMs = Math.max(cluster.lastTimeMs, ev.timestamp);
        cluster.evidenceCount++;
        cluster.gateways.add(ev.gatewayId);
        cluster.rssiListA.push(ev.rssiA);
        cluster.rssiListB.push(ev.rssiB);
        if (ev.sourceObservationIds) {
          for (const id of ev.sourceObservationIds) {
            cluster.obsIds.add(id);
          }
        }
      } else {
        // Gap exceeded: close current cluster and evaluate qualification
        evaluateAndCommitSession(cluster, config, completedSessions);

        // Start new cluster
        cluster = {
          wearableA: ev.wearableA,
          wearableB: ev.wearableB,
          startTimeMs: ev.timestamp,
          lastTimeMs: ev.timestamp,
          evidenceCount: 1,
          gateways: new Set([ev.gatewayId]),
          rssiListA: [ev.rssiA],
          rssiListB: [ev.rssiB],
          obsIds: new Set(ev.sourceObservationIds || []),
        };
      }
    }

    if (cluster) {
      evaluateAndCommitSession(cluster, config, completedSessions);
    }
  }

  // Sort sessions deterministically
  completedSessions.sort((a, b) => {
    if (a.startTime !== b.startTime) return a.startTime - b.startTime;
    if (a.wearableA !== b.wearableA) return a.wearableA.localeCompare(b.wearableA);
    if (a.wearableB !== b.wearableB) return a.wearableB.localeCompare(b.wearableB);
    return a.sessionId.localeCompare(b.sessionId);
  });

  return completedSessions;
}

function evaluateAndCommitSession(
  cluster: ActiveCluster,
  config: SessionizationConfig,
  outList: ContactSession[]
): void {
  const durationSeconds = Math.round((cluster.lastTimeMs - cluster.startTimeMs) / 1000);

  if (
    durationSeconds >= config.minimumDurationSeconds &&
    cluster.evidenceCount >= config.minimumObservationCount
  ) {
    const startTimeSec = Math.round(cluster.startTimeMs / 1000);
    const endTimeSec = Math.round(cluster.lastTimeMs / 1000);

    const sessionId = `SESS-${cluster.wearableA}-${cluster.wearableB}-${startTimeSec}`;

    outList.push({
      sessionId,
      wearableA: cluster.wearableA,
      wearableB: cluster.wearableB,
      startTime: startTimeSec,
      endTime: endTimeSec,
      durationSeconds,
      observationCount: cluster.evidenceCount,
      meanRssiA: computeMean(cluster.rssiListA),
      meanRssiB: computeMean(cluster.rssiListB),
      medianRssiA: computeMedian(cluster.rssiListA),
      medianRssiB: computeMedian(cluster.rssiListB),
      supportingGatewayIds: Array.from(cluster.gateways).sort(),
      confidence: 1.0,
      supportingObservationIds: Array.from(cluster.obsIds).sort(),
    });
  }
}
