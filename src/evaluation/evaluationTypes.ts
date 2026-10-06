/**
 * Canonical Domain Types for Quantitative Evaluation & Validation (Phase 5).
 *
 * CRITICAL SCIENTIFIC INTEGRITY CONSTRAINTS:
 * 1. Ground truth and person-to-wearable identity mappings are strictly isolated
 *    within src/evaluation/ and must NEVER be imported by src/ble/, src/edge/, or src/risk/.
 * 2. Reference exposure label E=1 represents a digital exposure event according to the
 *    simulation ground-truth contact protocol. It is NOT infection, transmission, or diagnosis.
 * 3. Distance evaluation evaluates wearable-to-gateway path loss inversion, NOT person-to-person ranging.
 * 4. Baselines consume exclusively observable ContactSession[] evidence without ground-truth access.
 */

import type { GroundTruthContact } from '../simulation/groundTruth.js';
import type { MovementState } from '../simulation/movementModel.js';
import type { Person, Gateway, Room } from '../simulation/scenarioTypes.js';
import type { BLEObservation } from '../ble/bleTypes.js';
import type { ContactSession, EdgeObservation } from '../edge/edgeTypes.js';
import type { RiskAssessment } from '../risk/riskTypes.js';
import type { ExperimentManifest } from '../datasets/manifest.js';

/**
 * Complete evaluation dataset bundle consisting of simulator outputs and ground truth.
 */
export interface EvaluationDataset {
  groundTruthContacts: GroundTruthContact[];
  bleObservations: BLEObservation[];
  edgeObservations: EdgeObservation[];
  detectedSessions: ContactSession[];
  riskAssessments: RiskAssessment[];
  movementStates?: MovementState[];
  people: Person[];
  gateways: Gateway[];
  rooms: Room[];
  manifest: ExperimentManifest;
}

/**
 * Configuration for matching detected contact sessions to ground-truth contacts.
 */
export interface MatchingConfig {
  /** Minimum temporal Intersection-over-Union threshold: Duration(intersection) / Duration(union) */
  minOverlapIoU: number;
  /** Minimum overlap in seconds required for matching (e.g. 5 seconds) */
  minOverlapSeconds?: number;
  /** Maximum allowable start/end timestamp discrepancy in seconds */
  maxTemporalDiscrepancySeconds?: number;
}

/**
 * Pairwise matched session link between ground truth and edge reconstruction.
 */
export interface MatchedSessionPair {
  groundTruthContact: GroundTruthContact;
  detectedSession: ContactSession;
  personA: string;
  personB: string;
  wearableA: string;
  wearableB: string;
  overlapIoU: number;
  overlapSeconds: number;
  startTimeErrorSeconds: number; // detected - groundTruth
  endTimeErrorSeconds: number;   // detected - groundTruth
  durationErrorSeconds: number;  // detected - groundTruth
  absoluteDurationErrorSeconds: number;
}

/**
 * Comprehensive contact detection evaluation metrics.
 */
export interface ContactMetrics {
  totalGroundTruthContacts: number;
  totalDetectedSessions: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  durationError: {
    meanErrorSeconds?: number;
    maeSeconds?: number;
    rmseSeconds?: number;
    medianAbsoluteErrorSeconds?: number;
    p95AbsoluteErrorSeconds?: number;
  };
  temporalError: {
    startTimeMeanErrorSeconds?: number;
    startTimeMaeSeconds?: number;
    endTimeMeanErrorSeconds?: number;
    endTimeMaeSeconds?: number;
  };
  fragmentation: {
    averageDetectedPerTrueSession: number;
    fragmentedTrueSessionCount: number;
    fragmentationRate: number;
  };
  merging: {
    mergedDetectedSessionCount: number;
    mergeRate: number;
  };
}

/**
 * Wearable-to-gateway distance estimation metrics.
 * Compares inverted RSSI distance estimates against true Euclidean coordinates.
 */
export interface DistanceMetrics {
  totalEvaluatedSamples: number;
  maeMeters: number;
  rmseMeters: number;
  medianAbsoluteErrorMeters: number;
  p95AbsoluteErrorMeters: number;
  meanErrorMeters: number;
}

/**
 * Threshold-specific classification metrics.
 */
export interface ThresholdClassificationMetric {
  threshold: number;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  precision: number;
  recall: number;
  specificity: number;
  f1Score: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
}

/**
 * Risk discrimination and ranking metrics.
 */
export interface RiskMetrics {
  totalEvaluatedRecords: number;
  positiveExposureCount: number;
  negativeExposureCount: number;
  prevalence: number;
  /** Area under ROC curve (undefined if only single class present) */
  auroc?: number;
  /** Area under Precision-Recall curve (undefined if only single class present) */
  auprc?: number;
  /** Evaluation grid across classification thresholds */
  thresholdGrid: ThresholdClassificationMetric[];
  /** Metrics at default reference threshold (e.g. tau = 0.5) */
  defaultThresholdMetrics?: ThresholdClassificationMetric;
}

/**
 * Reliability diagram calibration bin.
 */
export interface CalibrationBin {
  binIndex: number;
  binLower: number;
  binUpper: number;
  sampleCount: number;
  meanPredictedProbability: number;
  observedEventFrequency: number;
}

/**
 * Probability calibration metrics.
 */
export interface CalibrationMetrics {
  brierScore: number;
  expectedCalibrationError: number;
  binCount: number;
  bins: CalibrationBin[];
}

/**
 * Edge observation reduction and processing resource telemetry.
 */
export interface EdgeMetrics {
  rawObservationCount: number;
  validObservationCount: number;
  invalidObservationCount: number;
  duplicatesRemovedCount: number;
  filteredObservationCount: number;
  processedObservationCount: number;
  detectedSessionCount: number;
  observationReductionRatio: number;
  processingDurationMs?: number;
  throughputObservationsPerSec?: number;
}

/**
 * Privacy evaluation metrics (Phase 5 scaffold).
 */
export interface PrivacyMetricsScaffold {
  rotationImplemented: boolean;
  phase: 'phase5-scaffold' | 'phase6-production';
  notes: string;
}

/**
 * Statistical summary across independent random seed replicates.
 */
export interface MetricSummary {
  metric: string;
  n: number;
  mean: number;
  median: number;
  standardDeviation: number;
  min: number;
  max: number;
  confidenceInterval95?: {
    lower: number;
    upper: number;
    marginOfError: number;
  };
  rawValues?: number[];
}

/**
 * Complete per-seed experiment result record.
 */
export interface ExperimentSeedResult {
  seed: number;
  contactMetrics: ContactMetrics;
  distanceMetrics?: DistanceMetrics;
  riskMetrics: RiskMetrics;
  calibrationMetrics: CalibrationMetrics;
  edgeMetrics: EdgeMetrics;
  deterministicSignature: string;
}

/**
 * Consolidated aggregate experimental result.
 */
export interface ConsolidatedExperimentResult {
  experimentId: string;
  experimentName: string;
  conditionDescription: string;
  conditionParameters: Record<string, unknown>;
  resolvedConfig: Record<string, unknown>;
  seedList: number[];
  replicateCount: number;
  contactSummary: Record<string, MetricSummary>;
  riskSummary: Record<string, MetricSummary>;
  calibrationSummary: Record<string, MetricSummary>;
  edgeSummary: Record<string, MetricSummary>;
  perSeedResults: ExperimentSeedResult[];
  hostEnvironment?: {
    platform: string;
    nodeVersion: string;
    cpuModel?: string;
  };
  generatedAt: string;
}
