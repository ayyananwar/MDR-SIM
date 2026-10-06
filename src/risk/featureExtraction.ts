/**
 * Session-Level Feature Extraction for Exposure Modeling (Phase 4).
 *
 * CRITICAL SCIENTIFIC INTEGRITY CONSTRAINT:
 * Operates strictly on Phase 3 ContactSession outputs and authorized source-status metadata.
 * Does NOT consume raw BLE packets, hidden physical coordinates, or ground-truth contacts.
 */

import type { ContactSession } from '../edge/edgeTypes.js';
import type { SourceStatus } from '../simulation/scenarioTypes.js';
import type { ExposureFeatures, ExposureRecord } from './riskTypes.js';

export interface FeatureExtractionOptions {
  /**
   * Optional authorized registry of source statuses keyed by wearable ID.
   * If omitted or wearable is unlisted, the documented missing-evidence policy applies ('non-source').
   */
  sourceStatusRegistry?: Record<string, SourceStatus> | Map<string, SourceStatus>;
  /**
   * Whether to evaluate directed exposure for both participants (target=A, source=B) and (target=B, source=A).
   * Default: true.
   */
  directed?: boolean;
}

/**
 * Get source status from registry using documented missing-evidence policy.
 */
function getSourceStatus(
  wearableId: string | undefined,
  registry?: Record<string, SourceStatus> | Map<string, SourceStatus>
): SourceStatus {
  if (!wearableId || !registry) {
    return 'non-source';
  }
  if (registry instanceof Map) {
    return registry.get(wearableId) ?? 'non-source';
  }
  return registry[wearableId] ?? 'non-source';
}

/**
 * Extract structured ExposureRecord instances from Phase 3 ContactSession array.
 * Tracks temporal recurrence (session count and cumulative duration) deterministically.
 */
export function extractExposureRecords(
  sessions: ContactSession[],
  options: FeatureExtractionOptions = {}
): ExposureRecord[] {
  const { sourceStatusRegistry, directed = true } = options;

  // Stable chronological sort to ensure causal sequential accumulation
  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.startTime !== b.startTime) return a.startTime - b.startTime;
    if (a.endTime !== b.endTime) return a.endTime - b.endTime;
    return a.sessionId.localeCompare(b.sessionId);
  });

  // Track history per directed pair key: `${target}->${source}`
  const pairHistory = new Map<
    string,
    {
      sessionCount: number;
      cumulativeDuration: number;
      lastSessionEndTime: number;
    }
  >();

  const records: ExposureRecord[] = [];

  for (const session of sortedSessions) {
    const proximityScore =
      session.proximityEvidenceSummary ??
      (session.confidence !== undefined ? session.confidence : 0.5);

    const gatewayCount = session.supportingGatewayIds ? session.supportingGatewayIds.length : 1;

    // Directed pairs to evaluate
    const pairs: Array<{ target: string; source: string; meanRssi?: number; medianRssi?: number }> = [
      {
        target: session.wearableA,
        source: session.wearableB,
        meanRssi: session.meanRssiA,
        medianRssi: session.medianRssiA,
      },
    ];

    if (directed) {
      pairs.push({
        target: session.wearableB,
        source: session.wearableA,
        meanRssi: session.meanRssiB,
        medianRssi: session.medianRssiB,
      });
    }

    for (const pair of pairs) {
      const historyKey = `${pair.target}->${pair.source}`;
      const history = pairHistory.get(historyKey) ?? {
        sessionCount: 0,
        cumulativeDuration: 0,
        lastSessionEndTime: -1,
      };

      const recencySeconds =
        history.lastSessionEndTime >= 0
          ? Math.max(0, session.startTime - history.lastSessionEndTime)
          : undefined;

      const sourceStatus = getSourceStatus(pair.source, sourceStatusRegistry);

      records.push({
        targetWearableId: pair.target,
        sourceWearableId: pair.source,
        sessionId: session.sessionId,
        sessionStartTime: session.startTime,
        sessionEndTime: session.endTime,
        durationSeconds: session.durationSeconds,
        observationCount: session.observationCount,
        supportingGatewayCount: gatewayCount,
        proximityEvidence: proximityScore,
        meanRssi: pair.meanRssi,
        medianRssi: pair.medianRssi,
        sourceStatus,
        previousSessionCount: history.sessionCount,
        cumulativePriorDurationSeconds: history.cumulativeDuration,
        recencySeconds,
      });

      // Update history
      pairHistory.set(historyKey, {
        sessionCount: history.sessionCount + 1,
        cumulativeDuration: history.cumulativeDuration + session.durationSeconds,
        lastSessionEndTime: session.endTime,
      });
    }
  }

  return records;
}

/**
 * Extract standard ExposureFeatures from an ExposureRecord.
 */
export function extractFeatures(record: ExposureRecord): ExposureFeatures {
  return {
    durationSeconds: record.durationSeconds,
    proximityEvidence: record.proximityEvidence ?? 0.5,
    observationCount: record.observationCount,
    supportingGatewayCount: record.supportingGatewayCount,
    encounterCount: record.previousSessionCount + 1,
    cumulativeDurationSeconds:
      record.cumulativePriorDurationSeconds + record.durationSeconds,
    recencySeconds: record.recencySeconds,
    sourceStatus: record.sourceStatus ?? 'non-source',
  };
}
