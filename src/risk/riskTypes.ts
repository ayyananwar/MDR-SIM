/**
 * Canonical Risk and Probabilistic Exposure Modeling Domain Types (Phase 4).
 *
 * CRITICAL SCIENTIFIC INTEGRITY:
 * - Target variable E in {0, 1} represents a reference digital exposure event.
 * - This model estimates P(E=1 | X), where X is observed contact-session evidence.
 * - It does NOT estimate P(MDR-TB infection), biological transmission, or infectious dose.
 * - The runtime inference model consumes Phase 3 ContactSession evidence and authorized
 *   source status metadata. It has ZERO access to ground truth physical coordinates,
 *   movement states, true distances, or ground-truth evaluation labels.
 */

import type { SourceStatus } from '../simulation/scenarioTypes.js';

/**
 * Reference digital exposure event indicator:
 * 1 = reference exposure condition satisfied for the target/session
 * 0 = reference exposure condition not satisfied
 */
export type ExposureEventLabel = 0 | 1;

/**
 * Structured exposure record derived from Phase 3 ContactSession.
 * Only contains fields observable or derived from the edge pipeline.
 */
export interface ExposureRecord {
  /** Target individual wearable identifier being assessed for exposure */
  targetWearableId: string;
  /** Potential source wearable identifier */
  sourceWearableId?: string;
  /** Phase 3 reconstructed contact session ID */
  sessionId: string;
  /** Session start time in simulation seconds */
  sessionStartTime: number;
  /** Session end time in simulation seconds */
  sessionEndTime: number;
  /** Reconstructed contact duration in seconds */
  durationSeconds: number;
  /** Total supporting observation count across edge gateways */
  observationCount: number;
  /** Number of distinct gateways that corroborated the session */
  supportingGatewayCount: number;
  /** Proximity evidence score in [0, 1] */
  proximityEvidence?: number;
  /** Mean filtered RSSI in dBm */
  meanRssi?: number;
  /** Median filtered RSSI in dBm */
  medianRssi?: number;
  /** Authorized source status of the potential source wearable */
  sourceStatus?: SourceStatus;
  /** Number of prior contact sessions observed between this target and source */
  previousSessionCount: number;
  /** Cumulative duration of prior contact sessions in seconds */
  cumulativePriorDurationSeconds: number;
  /** Time elapsed in seconds since the previous session with this source (if any) */
  recencySeconds?: number;
}

/**
 * Compact, scientifically selected feature vector for Bayesian exposure modeling.
 */
export interface ExposureFeatures {
  /** Contact duration in seconds */
  durationSeconds: number;
  /** Normalized proximity evidence in [0, 1] */
  proximityEvidence: number;
  /** Total supporting observation count */
  observationCount: number;
  /** Distinct corroborating gateway count */
  supportingGatewayCount: number;
  /** Total contact session encounters between target and source */
  encounterCount: number;
  /** Cumulative exposure duration including this session */
  cumulativeDurationSeconds: number;
  /** Elapsed time since last encounter in seconds */
  recencySeconds?: number;
  /** Categorical source status */
  sourceStatus: SourceStatus;
}

/**
 * Continuous feature bin definition.
 */
export interface ContinuousFeatureBin {
  label: string;
  min: number;
  max: number;
}

/**
 * Discretization configuration mapping continuous features to explicit bins.
 */
export interface DiscretizationConfig {
  durationBins: ContinuousFeatureBin[];
  proximityBins: ContinuousFeatureBin[];
  encounterBins: ContinuousFeatureBin[];
  cumulativeDurationBins: ContinuousFeatureBin[];
  sourceStatusValues: string[];
}

/**
 * Parameter provenance metadata.
 */
export interface RiskParameterMetadata {
  value: number | number[] | Record<string, unknown>;
  source: 'measured' | 'literature' | 'estimated' | 'calibrated' | 'simulation' | 'derived';
  rationale: string;
  datasetVersion?: string;
  citation?: string;
}

/**
 * Prior configuration.
 */
export interface PriorConfig {
  /** Baseline exposure event probability P(E=1) */
  baselineExposureProbability: number;
  /** Prior estimation mode */
  priorMode: 'global' | 'empirical' | 'hierarchical';
  /** Provenance metadata */
  metadata?: RiskParameterMetadata;
}

/**
 * Conditional likelihood entry for a discrete feature value.
 */
export interface LikelihoodEntry {
  /** P(X = x | E = 1) */
  pGivenExposure: number;
  /** P(X = x | E = 0) */
  pGivenNonExposure: number;
  /** Likelihood Ratio: P(X=x | E=1) / P(X=x | E=0) */
  likelihoodRatio: number;
  /** Natural log of Likelihood Ratio: ln(LR) */
  logLikelihoodRatio: number;
  /** Training frequency for E=1 */
  countExposure?: number;
  /** Training frequency for E=0 */
  countNonExposure?: number;
}

/**
 * Likelihood table mapping discrete bin labels to likelihood entries.
 */
export type LikelihoodTable = Record<string, LikelihoodEntry>;

/**
 * Bayesian / Dirichlet smoothing hyperparameters.
 */
export interface SmoothingConfig {
  /** Pseudocount parameter for exposure-positive class (Dirichlet / Laplace alpha) */
  alpha: number;
  /** Pseudocount parameter for exposure-negative class (Dirichlet / Laplace beta) */
  beta: number;
}

/**
 * Probability calibration configuration.
 */
export interface CalibrationConfig {
  /** Whether probability calibration transformation is enabled */
  enabled: boolean;
  /** Calibration technique */
  method: 'platt' | 'isotonic';
  /** Platt scaling parameters: sigmoid(a * logit + b) */
  plattParameters?: {
    a: number;
    b: number;
  };
  /** Isotonic regression piecewise step thresholds and values */
  isotonicParameters?: {
    thresholds: number[];
    values: number[];
  };
}

/**
 * Complete fitted risk model representation.
 * JSON serializable, deterministic, and self-contained.
 */
export interface FittedRiskModel {
  /** Semantic model version identifier (e.g. "risk-model-1.0.0") */
  modelVersion: string;
  /** Explicit reference target definition */
  targetDefinition: string;
  /** Prior probability and provenance metadata */
  prior: RiskParameterMetadata;
  /** Likelihood tables keyed by feature name */
  likelihoods: Record<string, LikelihoodTable>;
  /** Feature discretization boundaries */
  discretization: DiscretizationConfig;
  /** Smoothing hyperparameters */
  smoothing: SmoothingConfig;
  /** Optional post-inference probability calibration */
  calibration?: CalibrationConfig;
  /** Active features included in likelihood ratio product */
  selectedFeatures: string[];
  /** Optional training dataset provenance version */
  trainingDatasetVersion?: string;
  /** Additional model metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Individual feature evidence contribution for transparent explainability.
 */
export interface EvidenceContribution {
  /** Feature name (e.g. "duration", "proximity", "sourceStatus") */
  feature: string;
  /** Observed continuous or categorical value */
  observedValue: string | number;
  /** Discretized categorical bin label */
  binLabel: string;
  /** Likelihood ratio LR = P(X|E=1) / P(X|E=0) */
  likelihoodRatio: number;
  /** Natural log of likelihood ratio */
  logLikelihoodRatio: number;
}

/**
 * Deterministic Risk Assessment Result for an exposure record.
 */
export interface RiskAssessment {
  /** Target wearable beacon assessed */
  targetWearableId: string;
  /** Potential source wearable beacon */
  sourceWearableId?: string;
  /** Phase 3 contact session ID */
  sessionId: string;
  /** Semantic version of the model used for inference */
  modelVersion: string;
  /** Posterior digital exposure event probability P(E=1 | X) in [0, 1] */
  exposureProbability: number;
  /** Baseline prior probability P(E=1) */
  priorProbability: number;
  /** Extracted input features */
  evidence: ExposureFeatures;
  /** Explainability contributions per feature */
  contributions?: EvidenceContribution[];
  /** Simulation timestamp or assessment creation timestamp in ms */
  inferenceTimestamp: number;
}

/**
 * Labeled training example for offline parameter estimation.
 */
export interface RiskTrainingExample {
  /** Observable session features */
  features: ExposureFeatures;
  /** Ground truth reference exposure label (0 or 1) */
  referenceLabel: ExposureEventLabel;
}

/**
 * High-level risk model configuration in experiment manifests.
 */
export interface RiskModelConfig {
  modelVersion: string;
  targetDefinition?: string;
  prior: PriorConfig;
  features: {
    duration: boolean;
    proximity: boolean;
    recurrence: boolean;
    sourceStatus: boolean;
  };
  smoothing: SmoothingConfig;
  discretization?: Partial<DiscretizationConfig>;
  calibration?: CalibrationConfig;
}
