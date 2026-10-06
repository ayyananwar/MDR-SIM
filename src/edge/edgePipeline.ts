import { BLEObservation } from '../ble/bleTypes.js';
import {
  EdgeProcessingConfig,
  EdgeProcessingResult,
  EdgeObservation,
  EdgeTelemetry,
} from './edgeTypes.js';
import { validateObservation } from './validation.js';
import { normalizeObservations } from './normalization.js';
import { deduplicateObservations } from './deduplication.js';
import { CausalRSSIFilter } from './rssiFilter.js';
import { estimateWearableToGatewayDistance } from './proximityEstimator.js';
import { generateCandidatePairs } from './candidatePairs.js';
import { reconstructContactSessions } from './sessionizer.js';

/**
 * Executes the complete online, causal Edge Processing Pipeline.
 *
 * CRITICAL SCIENTIFIC PROPERTY:
 * Operates purely on observable signal data (BLEObservation[]) and edge configuration.
 * It has ZERO dependency on hidden physical simulation truth (positions, true distance, ground truth).
 */
export function processBLEObservations(
  observations: readonly BLEObservation[],
  config: EdgeProcessingConfig
): EdgeProcessingResult {
  const startTime = Date.now();

  // 1. Validation
  const validObservations: BLEObservation[] = [];
  let invalidCount = 0;

  for (const obs of observations) {
    const vResult = validateObservation(obs, config.validation);
    if (vResult.valid) {
      validObservations.push(obs);
    } else {
      invalidCount++;
    }
  }

  // 2. Normalization (deterministic chronological ordering)
  const normalizedObservations = normalizeObservations(validObservations);

  // 3. Deduplication (filters identical retransmissions arriving within time window)
  const { deduplicated, duplicatesRemoved } = deduplicateObservations(
    normalizedObservations,
    config.deduplication
  );

  // 4. Causal RSSI Filtering & Distance Estimation
  const filter = new CausalRSSIFilter(config.rssiFilter);
  const edgeObservations: EdgeObservation[] = [];

  for (const obs of deduplicated) {
    const filteredRssi = filter.filter(obs.wearableId, obs.gatewayId, obs.rssiDbm);
    const estimatedDistance = estimateWearableToGatewayDistance(
      filteredRssi,
      config.proximity
    );

    const sourceId = `OBS-${obs.wearableId}-${obs.gatewayId}-${obs.eventIndex}-${obs.timestamp}`;

    edgeObservations.push({
      wearableId: obs.wearableId,
      gatewayId: obs.gatewayId,
      timestamp: obs.timestamp,
      eventIndex: obs.eventIndex,
      rawRssiDbm: obs.rssiDbm,
      filteredRssiDbm: filteredRssi,
      estimatedDistanceMeters: estimatedDistance,
      sourceObservationId: sourceId,
    });
  }

  // 5. Candidate Pair Generation (spatial co-location & temporal coincidence)
  const { evidenceList, candidatePairs } = generateCandidatePairs(
    edgeObservations,
    config.candidateGeneration,
    config.proximity
  );

  // 6. Sessionization (gap tolerance, minimum count, and duration thresholding)
  const detectedSessions = reconstructContactSessions(
    evidenceList,
    config.sessionization
  );

  const endTime = Date.now();

  const telemetry: EdgeTelemetry = {
    receivedObservations: observations.length,
    validObservations: validObservations.length,
    invalidObservations: invalidCount,
    duplicatesRemoved,
    filteredObservations: edgeObservations.length,
    processedObservations: edgeObservations.length,
    candidatePairs: candidatePairs.length,
    contactSessions: detectedSessions.length,
    processingStartTime: startTime,
    processingEndTime: endTime,
    processingDurationMs: endTime - startTime,
  };

  return {
    inputObservationCount: observations.length,
    validObservationCount: validObservations.length,
    invalidObservationCount: invalidCount,
    duplicateObservationCount: duplicatesRemoved,
    filteredObservationCount: edgeObservations.length,
    processedObservationCount: edgeObservations.length,
    candidatePairCount: candidatePairs.length,
    detectedSessionCount: detectedSessions.length,
    observations: edgeObservations,
    sessions: detectedSessions,
    telemetry,
  };
}
