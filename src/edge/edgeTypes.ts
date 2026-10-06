/**
 * Canonical Edge Processing Domain Types (Phase 3).
 *
 * CRITICAL SCIENTIFIC INTEGRITY CONSTRAINT:
 * Edge processing consumes exclusively observable data (`BLEObservation[]`)
 * and operational configuration. It has ZERO access to hidden physical
 * simulation truth (coordinates, true distances, person identities, or ground-truth sessions).
 */

export interface ValidationConfig {
  /** Minimum physically plausible RSSI in dBm (default: -110 dBm) */
  minRssiDbm?: number;
  /** Maximum physically plausible RSSI in dBm (default: 0 dBm) */
  maxRssiDbm?: number;
  /** Maximum permissible timestamp skew in milliseconds (optional) */
  maxTimestampSkewMs?: number;
}

export interface DeduplicationConfig {
  /** Whether duplicate packet filtering is enabled */
  enabled: boolean;
  /** Temporal deduplication window in milliseconds */
  timeWindowMs: number;
}

export type RSSIFilterMethod = 'none' | 'moving-average' | 'median' | 'ema';

export interface RSSIFilterConfig {
  /** Causal filter method */
  method: RSSIFilterMethod;
  /** Sliding window size in observation count (e.g. 5) */
  windowSize: number;
  /** Smoothing factor for exponential moving average (0 < alpha <= 1) */
  alpha?: number;
}

export type ProximityModelType = 'log-distance' | 'threshold' | 'rssi-only';

export interface ProximityConfig {
  /** Proximity estimation algorithm */
  model: ProximityModelType;
  /** Proximity threshold distance in meters for candidate qualification (e.g. 2.0 m) */
  thresholdDistanceMeters: number;
  /** Calibration reference RSSI at 1 meter in dBm (default: -50 dBm) */
  referenceRSSIDbm?: number;
  /** Path loss exponent n (default: 2.5) */
  pathLossExponent?: number;
  /** Reference distance d0 in meters (default: 1.0 m) */
  referenceDistanceMeters?: number;
}

export interface CandidateGenerationConfig {
  /** Maximum temporal coincidence window in milliseconds between wearable observations at a gateway */
  temporalWindowMs: number;
  /** Whether multi-gateway corroboration is enabled */
  gatewayFusionEnabled?: boolean;
}

export interface SessionizationConfig {
  /** Minimum qualifying evidence samples required to establish a contact session */
  minimumObservationCount: number;
  /** Minimum elapsed duration in seconds for a contact session to qualify */
  minimumDurationSeconds: number;
  /** Maximum tolerable observation gap in seconds before session closes */
  maxGapSeconds: number;
}

export interface EdgeProcessingConfig {
  validation: ValidationConfig;
  deduplication: DeduplicationConfig;
  rssiFilter: RSSIFilterConfig;
  proximity: ProximityConfig;
  candidateGeneration: CandidateGenerationConfig;
  sessionization: SessionizationConfig;
}

/**
 * Normalized and filtered edge observation.
 * Contains only observable signal features and derived operational metrics.
 */
export interface EdgeObservation {
  /** Emitting wearable beacon identifier */
  wearableId: string;
  /** Receiving gateway identifier */
  gatewayId: string;
  /** Simulation timestamp in milliseconds */
  timestamp: number;
  /** Monotonic advertising event index */
  eventIndex: number;
  /** Raw received RSSI in dBm */
  rawRssiDbm: number;
  /** Causally smoothed/filtered RSSI in dBm */
  filteredRssiDbm: number;
  /** Estimated wearable-to-gateway distance in meters (derived from filtered RSSI) */
  estimatedDistanceMeters?: number;
  /** Provenance link to raw source observation */
  sourceObservationId: string;
}

export interface CandidatePair {
  /** Canonical first wearable identifier (wearableA < wearableB) */
  wearableA: string;
  /** Canonical second wearable identifier */
  wearableB: string;
  firstObservationTime: number;
  lastObservationTime: number;
  supportingObservations: number;
}

export interface ProximityEvidence {
  /** Canonical first wearable identifier (wearableA < wearableB) */
  wearableA: string;
  /** Canonical second wearable identifier */
  wearableB: string;
  /** Simulation timestamp in milliseconds */
  timestamp: number;
  /** Observing gateway identifier */
  gatewayId: string;
  /** Normalized evidence strength score in [0, 1] */
  evidenceStrength: number;
  /** Filtered RSSI of wearable A */
  rssiA: number;
  /** Filtered RSSI of wearable B */
  rssiB: number;
  /** Source observation IDs contributing to this evidence */
  sourceObservationIds?: string[];
}

/**
 * Reconstructed Contact Session inferred from BLE observations.
 *
 * CRITICAL SCIENTIFIC INTEGRITY:
 * Strictly omits ground-truth evaluation labels (e.g. isTruePositive, isFalsePositive,
 * trueDistance, groundTruthSessionId) and hidden person identities.
 */
export interface ContactSession {
  /** Deterministic session identifier derived from wearable IDs and start time */
  sessionId: string;
  /** Canonical first wearable identifier (wearableA < wearableB) */
  wearableA: string;
  /** Canonical second wearable identifier */
  wearableB: string;
  /** Simulation start time in integer seconds */
  startTime: number;
  /** Simulation end time in integer seconds */
  endTime: number;
  /** Reconstructed contact duration in seconds (endTime - startTime) */
  durationSeconds: number;
  /** Total supporting observation count */
  observationCount: number;
  /** Mean filtered RSSI for wearable A during session */
  meanRssiA?: number;
  /** Mean filtered RSSI for wearable B during session */
  meanRssiB?: number;
  /** Median filtered RSSI for wearable A */
  medianRssiA?: number;
  /** Median filtered RSSI for wearable B */
  medianRssiB?: number;
  /** List of distinct gateways that contributed corroborating evidence */
  supportingGatewayIds: string[];
  /** Summary proximity evidence score */
  proximityEvidenceSummary?: number;
  /** Normalized evidence confidence score */
  confidence?: number;
  /** Provenance IDs of supporting edge observations */
  supportingObservationIds?: string[];
}

export interface EdgeTelemetry {
  receivedObservations: number;
  validObservations: number;
  invalidObservations: number;
  duplicatesRemoved: number;
  filteredObservations: number;
  processedObservations: number;
  candidatePairs: number;
  contactSessions: number;
  processingStartTime?: number;
  processingEndTime?: number;
  processingDurationMs?: number;
}

export interface EdgeProcessingResult {
  inputObservationCount: number;
  validObservationCount: number;
  invalidObservationCount: number;
  duplicateObservationCount: number;
  filteredObservationCount: number;
  processedObservationCount: number;
  candidatePairCount: number;
  detectedSessionCount: number;
  observations: EdgeObservation[];
  sessions: ContactSession[];
  telemetry: EdgeTelemetry;
}
