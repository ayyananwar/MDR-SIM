/**
 * Phase 7 Final Campaign Types.
 *
 * Defines the data structures for:
 * - Campaign-level experiment results
 * - Table rows for paper-ready output
 * - Figure data series for SVG generation
 * - Manifest and checksum records
 */

import type { MetricSummary } from '../evaluation/evaluationTypes.js';

// Re-export: CampaignResults is defined at the bottom of this file


// ─── Campaign-level experiment result ───────────────────────────────────────

export interface CampaignExperimentResult {
  experimentId: string;
  experimentName: string;
  scenarioFamily: string;
  sweepParameter?: string;
  sweepValue?: number | string;
  configId: string;
  seedList: number[];
  replicateCount: number;
  /** Deterministic scientific outputs only (no wall-clock) */
  deterministicSignatures: string[];
  contact: {
    precision: MetricSummary;
    recall: MetricSummary;
    f1Score: MetricSummary;
    durationMaeSeconds: MetricSummary;
    durationRmseSeconds: MetricSummary;
    fragmentationRate: MetricSummary;
    mergeRate: MetricSummary;
    truePositives?: MetricSummary;
    falsePositives?: MetricSummary;
    falseNegatives?: MetricSummary;
    totalGroundTruthContacts?: MetricSummary;
  };
  risk: {
    auroc: MetricSummary;
    auprc: MetricSummary;
    defaultF1: MetricSummary;
    defaultPrecision: MetricSummary;
    defaultRecall: MetricSummary;
    defaultSpecificity: MetricSummary;
    brierScore: MetricSummary;
    ece: MetricSummary;
  };
  edge: {
    rawObservations: MetricSummary;
    processedObservations: MetricSummary;
    detectedSessions: MetricSummary;
    reductionRatio: MetricSummary;
    throughputObsPerSec?: MetricSummary;
    processingDurationMs?: MetricSummary;
  };
  /** Wall-clock telemetry — excluded from deterministic checksums */
  telemetry?: {
    wallClockMs: number;
    hostPlatform: string;
    nodeVersion: string;
    cpuModel?: string;
    note: 'machine-dependent — do not use for scientific comparison';
  };
  generatedAt: string;
}

// ─── Baseline comparison result ─────────────────────────────────────────────

export interface BaselineComparisonResult {
  experimentId: string;
  seed: number;
  methods: Array<{
    name: string;
    description: string;
    auroc?: number;
    auprc?: number;
    brierScore: number;
    ece: number;
    f1AtDefault: number;
    precisionAtDefault: number;
    recallAtDefault: number;
    specificityAtDefault: number;
  }>;
}

export interface AggregatedBaselineResult {
  experimentId: string;
  seedList: number[];
  methods: Array<{
    name: string;
    description: string;
    auroc: MetricSummary;
    auprc: MetricSummary;
    brierScore: MetricSummary;
    ece: MetricSummary;
    f1AtDefault: MetricSummary;
    precisionAtDefault: MetricSummary;
    recallAtDefault: MetricSummary;
    specificityAtDefault: MetricSummary;
  }>;
  pairedDifferences?: Array<{
    baselineName: string;
    targetName: string;
    aurocDiff: MetricSummary;
    auprcDiff: MetricSummary;
    f1Diff: MetricSummary;
    brierDiff: MetricSummary;
    eceDiff: MetricSummary;
  }>;
}

// ─── Ablation result ─────────────────────────────────────────────────────────

export interface AblationVariantResult {
  variant: string;
  description: string;
  auroc: MetricSummary;
  auprc: MetricSummary;
  brierScore: MetricSummary;
  ece: MetricSummary;
  f1AtDefault: MetricSummary;
  /** Absolute difference vs full model (mean) */
  deltaAuroc?: number;
  deltaAuprc?: number;
  deltaF1?: number;
}

export interface AggregatedAblationResult {
  experimentId: string;
  seedList: number[];
  variants: AblationVariantResult[];
}

// ─── Scalability result ──────────────────────────────────────────────────────

export interface ScalabilityDataPoint {
  populationSize: number;
  gatewayCount: number;
  seed: number;
  rawObservations: number;
  processedObservations: number;
  detectedSessions: number;
  wallClockMs: number;
  throughputObsPerSec: number;
  f1Score: number;
}

export interface AggregatedScalabilityResult {
  experimentId: string;
  populationSize: number;
  gatewayCount: number;
  rawObservations: MetricSummary;
  processedObservations: MetricSummary;
  detectedSessions: MetricSummary;
  f1Score: MetricSummary;
  /** Machine-dependent — not for scientific comparison */
  wallClockMs: MetricSummary;
  throughputObsPerSec: MetricSummary;
}

// ─── Privacy result ──────────────────────────────────────────────────────────

export interface AggregatedPrivacyResult {
  experimentId: string;
  sweepParameter: string;
  sweepValue: number | string;
  seedList: number[];
  totalTransitions: number;
  linkageF1: MetricSummary | null;
  linkageSuccessRate: MetricSummary | null;
  unlinkabilityProxy: MetricSummary | null;
  identityTop1Accuracy: MetricSummary;
  sessionFragmentationRatio: MetricSummary;
  durationAttenuationRatio: MetricSummary;
  meanExposureDurationSec: MetricSummary;
  empiricalCollisionRate: MetricSummary;
}

// ─── Table row types ─────────────────────────────────────────────────────────

export interface ContactTableRow {
  configId: string;
  condition: string;
  n: number;
  precision_mean: number;
  precision_ci95_lower: number;
  precision_ci95_upper: number;
  recall_mean: number;
  recall_ci95_lower: number;
  recall_ci95_upper: number;
  f1_mean: number;
  f1_ci95_lower: number;
  f1_ci95_upper: number;
  duration_mae_s_mean: number;
  duration_rmse_s_mean: number;
  fragmentation_rate_mean: number;
}

export interface RiskBaselineTableRow {
  method: string;
  n: number;
  auroc_mean: number;
  auroc_ci95_lower: number;
  auroc_ci95_upper: number;
  auprc_mean: number;
  brier_mean: number;
  ece_mean: number;
  f1_mean: number;
  precision_mean: number;
  recall_mean: number;
}

export interface AblationTableRow {
  variant: string;
  n: number;
  auroc_mean: number;
  delta_auroc: string;
  auprc_mean: number;
  delta_auprc: string;
  f1_mean: number;
  delta_f1: string;
  brier_mean: number;
  ece_mean: number;
}

export interface RobustnessTableRow {
  sweep_parameter: string;
  sweep_value: string;
  n: number;
  f1_mean: number;
  f1_ci95_lower: number;
  f1_ci95_upper: number;
  auroc_mean: number;
  auprc_mean: number;
  brier_mean: number;
}

export interface ScalabilityTableRow {
  population_size: number;
  gateway_count: number;
  n: number;
  raw_observations_mean: number;
  detected_sessions_mean: number;
  f1_mean: number;
  wall_clock_ms_mean: number;
  throughput_obs_per_sec_mean: number;
  note: string;
}

export interface PrivacyTableRow {
  experiment: string;
  sweep_parameter: string;
  sweep_value: string;
  n: number;
  linkage_f1_mean: string;
  linkage_success_rate_mean: string;
  unlinkability_proxy_mean: string;
  identity_top1_mean: number;
  fragmentation_ratio_mean: number;
  duration_attenuation_mean: number;
}

// ─── Figure data types ───────────────────────────────────────────────────────

export interface FigureDataSeries {
  label: string;
  xValues: (number | string)[];
  yValues: number[];
  yErrorLower?: number[];
  yErrorUpper?: number[];
}

export interface FigureData {
  figureId: string;
  title: string;
  xLabel: string;
  yLabel: string;
  series: FigureDataSeries[];
  sourceExperimentIds: string[];
  /** Points are actual recorded experiment outputs — not smoothed or interpolated */
  dataIntegrityNote: string;
}

// ─── Manifest & checksum types ───────────────────────────────────────────────

export interface ExperimentManifestEntry {
  experimentId: string;
  configId: string;
  configVersion: string;
  seedList: number[];
  status: 'completed' | 'skipped' | 'failed';
  generatedAt: string;
  outputFiles: string[];
}

export interface CampaignManifest {
  campaignVersion: '7.0.0';
  protocolVersion: '1.0.0';
  seedSet: number[];
  frozenConfigIds: string[];
  experiments: ExperimentManifestEntry[];
  hostEnvironment: {
    platform: string;
    nodeVersion: string;
    cpuModel?: string;
    note: 'machine-dependent — wall-clock timings should not be used for scientific comparison';
  };
  generatedAt: string;
}

export interface ChecksumRecord {
  /** SHA-256 of JSON.stringify of the deterministic scientific artifact */
  artifactId: string;
  filePath: string;
  sha256: string;
  /** Whether this artifact is deterministic (true) or machine-dependent telemetry (false) */
  isDeterministic: boolean;
  note?: string;
}

export interface ChecksumManifest {
  generatedAt: string;
  records: ChecksumRecord[];
}

// ─── Top-level campaign results ────────────────────────────────────────────────

export interface CampaignResults {
  E1_reference: CampaignExperimentResult;
  E2_dense: CampaignExperimentResult;
  E3_baseline: AggregatedBaselineResult;
  E4_ablation: AggregatedAblationResult;
  E5_rssiSweep: CampaignExperimentResult[];
  E6_packetLossSweep: CampaignExperimentResult[];
  E7_advIntervalSweep: CampaignExperimentResult[];
  E8_gatewayDensitySweep: CampaignExperimentResult[];
  E9_privacyRotationSweep: AggregatedPrivacyResult[];
  E10_privacyNoiseSweep: AggregatedPrivacyResult[];
  E11_privacyPacketLossSweep: AggregatedPrivacyResult[];
  E12_privacyGatewaySweep: AggregatedPrivacyResult[];
  E13_privacyUtility: AggregatedPrivacyResult;
  E14_privacyMultiSeed: AggregatedPrivacyResult;
  E15_scalability: AggregatedScalabilityResult[];
}

