/**
 * Edge Processing Telemetry & Resource Reduction Metrics (Phase 5).
 *
 * Measures:
 * - Frame / Observation reduction ratios: 1 - (processedObservations / rawObservations)
 * - Wall-clock execution runtime
 * - Throughput (observations / second)
 *
 * CRITICAL SCIENTIFIC INTEGRITY CONSTRAINT:
 * Wall-clock measurements reflect host machine performance and are tracked
 * separately from deterministic count-based metrics.
 */

import type { EdgeTelemetry } from '../edge/edgeTypes.js';
import type { EdgeMetrics } from './evaluationTypes.js';

/**
 * Evaluate edge processing efficiency and reduction metrics from edge telemetry.
 */
export function evaluateEdgeProcessing(
  telemetry: Partial<EdgeTelemetry> & {
    rawCount?: number;
    processedCount?: number;
    sessionCount?: number;
    durationMs?: number;
  }
): EdgeMetrics {
  const raw = telemetry.receivedObservations ?? telemetry.rawCount ?? 0;
  const valid = telemetry.validObservations ?? raw;
  const invalid = telemetry.invalidObservations ?? 0;
  const duplicates = telemetry.duplicatesRemoved ?? 0;
  const filtered = telemetry.filteredObservations ?? valid;
  const processed = telemetry.processedObservations ?? telemetry.processedCount ?? 0;
  const sessions = telemetry.contactSessions ?? telemetry.sessionCount ?? 0;

  const reduction = raw > 0 ? 1.0 - processed / raw : 0.0;

  const durationMs = telemetry.processingDurationMs ?? telemetry.durationMs;
  let throughput: number | undefined;

  if (durationMs !== undefined && durationMs > 0) {
    throughput = processed / (durationMs / 1000);
  }

  return {
    rawObservationCount: raw,
    validObservationCount: valid,
    invalidObservationCount: invalid,
    duplicatesRemovedCount: duplicates,
    filteredObservationCount: filtered,
    processedObservationCount: processed,
    detectedSessionCount: sessions,
    observationReductionRatio: Math.max(0.0, Math.min(1.0, reduction)),
    processingDurationMs: durationMs,
    throughputObservationsPerSec: throughput,
  };
}
