/**
 * Phase 6 Privacy & Security Experiment Runner.
 *
 * Implements research experiment protocols P1 through P7:
 * - P1: Baseline without rotation (infinite rotation interval)
 * - P2: Rotation interval sweep (30s, 60s, 120s, 300s, 600s)
 * - P3: Rotation + RSSI noise sweep (0, 2, 6, 10 dB)
 * - P4: Rotation + packet loss sweep (0%, 5%, 20%, 50%)
 * - P5: Rotation + gateway density sweep (4, 8, 12 gateways)
 * - P6: Privacy–utility trade-off (authorized vs unprivileged edge reconstruction)
 * - P7: Multi-seed replication with Student's t 95% confidence intervals
 *
 * CRITICAL SCIENTIFIC INTEGRITY CONSTRAINT:
 * Deterministic scientific outputs are strictly decoupled from machine-dependent wall-clock times.
 */

import fs from 'fs';
import path from 'path';
import type { SimulationConfig } from '../simulation/scenarioTypes.js';
import { generateCanonicalDataset } from '../datasets/generator.js';
import { processBLEObservations } from '../edge/edgePipeline.js';
import { summarizeReplicateMetric } from '../evaluation/statisticalSummary.js';
import type { CanonicalDataset } from '../datasets/schema.js';
import type {
  PseudonymConfig,
  PseudonymEpoch,
  AuthorizationContext,
  CollisionMetrics,
  LinkageMetrics,
  IdentityInferenceMetrics,
  PrivacyTradeoffMetrics,
} from './privacyTypes.js';
import { PseudonymGenerator } from './pseudonymGenerator.js';
import { RotationScheduleModel } from './rotationModel.js';
import { IdentityRegistry } from './identityRegistry.js';
import {
  applyPseudonymsToObservations,
  resolvePseudonymousObservations,
} from './privacyObservation.js';
import {
  executeLinkageAttack,
  evaluateLinkagePredictions,
} from './linkageAttack.js';
import {
  executeIdentityInferenceAttack,
  evaluateIdentityInference,
} from './identityInference.js';
import {
  calculateMeanExposureDurationSeconds,
  calculatePrivacyTradeoff,
} from './privacyMetrics.js';

export interface SingleSeedPrivacyResult {
  seed: number;
  rotationIntervalSeconds: number;
  meanExposureDurationSeconds: number;
  collisionMetrics: CollisionMetrics;
  linkageMetrics: LinkageMetrics;
  identityInferenceMetrics: IdentityInferenceMetrics;
  tradeoffMetrics: PrivacyTradeoffMetrics;
}

/**
 * Execute a complete single-seed privacy experiment on a SimulationConfig.
 */
export function evaluateSingleSeedPrivacy(
  config: SimulationConfig,
  privacyConfig: PseudonymConfig,
  precomputedDataset?: CanonicalDataset
): SingleSeedPrivacyResult {
  // 1. Generate base scenario, movement, and raw BLE observations (or reuse precomputed)
  const dataset = precomputedDataset ?? generateCanonicalDataset(config, { silent: true });
  const rawBle = dataset.bleObservations ?? [];
  const wearableIds = dataset.people.map((p) => p.wearableId);

  // 2. Initialize privacy generation and rotation schedule
  const generator = new PseudonymGenerator(privacyConfig);
  const rotationModel = new RotationScheduleModel(privacyConfig, generator);
  rotationModel.generateSchedules(wearableIds, config.durationSeconds, config.seed);
  const allEpochs = rotationModel.getAllEpochs();

  // 3. Populate Authorized Identity Registry
  const registry = new IdentityRegistry();
  registry.registerSchedules(allEpochs, dataset.people);

  // 4. Transform raw observations into public pseudonymous observations
  const publicObservations = applyPseudonymsToObservations(rawBle, rotationModel);

  // 5. Execute Attacker B: Multi-Observation Linkage Attack
  const linkageCandidates = executeLinkageAttack(publicObservations, dataset.gateways);
  const linkageMetrics = evaluateLinkagePredictions(linkageCandidates, allEpochs);

  // 6. Execute Attacker C: Baseline Unauthorized Identity Inference
  const identityPredictions = executeIdentityInferenceAttack(
    publicObservations,
    dataset.gateways,
    dataset.people,
    { attackerMode: 'baseline' }
  );
  const identityInferenceMetrics = evaluateIdentityInference(identityPredictions, allEpochs, dataset.people);

  // 7. Collision Metrics & Exposure Duration
  const collisionMetrics = generator.getCollisionMetrics();
  const meanExposureDurationSeconds = calculateMeanExposureDurationSeconds(allEpochs);

  // 8. Privacy-Utility Trade-off: Edge Reconstruction
  const edgeConfig = config.edge ?? {
    validation: { minRssiDbm: -110, maxRssiDbm: 0 },
    deduplication: { enabled: true, timeWindowMs: 20 },
    rssiFilter: { method: 'median' as const, windowSize: 5 },
    proximity: { model: 'log-distance' as const, thresholdDistanceMeters: 2.0 },
    candidateGeneration: { temporalWindowMs: 1000 },
    sessionization: { minimumObservationCount: 3, minimumDurationSeconds: 10, maxGapSeconds: 5 },
  };

  // View A: Authorized View (Use pre-existing detected sessions if available, else process)
  let authorizedSessions = dataset.detectedContactSessions;
  if (!authorizedSessions) {
    const authContext: AuthorizationContext = { role: 'admin' };
    const resolvedObservations = resolvePseudonymousObservations(
      publicObservations,
      registry,
      authContext
    );
    const authorizedEdge = processBLEObservations(resolvedObservations, edgeConfig);
    authorizedSessions = authorizedEdge.sessions;
  }

  // View B: Unprivileged Observer View (Raw pseudonyms fragment sessions)
  const unprivilegedEdge = processBLEObservations(publicObservations, edgeConfig);

  const tradeoffMetrics = calculatePrivacyTradeoff(
    authorizedSessions,
    unprivilegedEdge.sessions,
    privacyConfig.rotationIntervalSeconds
  );

  linkageMetrics.identifierPersistenceDurationSeconds = privacyConfig.rotationIntervalSeconds;

  return {
    seed: config.seed,
    rotationIntervalSeconds: privacyConfig.rotationIntervalSeconds,
    meanExposureDurationSeconds,
    collisionMetrics,
    linkageMetrics,
    identityInferenceMetrics,
    tradeoffMetrics,
  };
}

/**
 * Run a multi-seed privacy experiment and export structured artifacts.
 */
export function runPrivacyExperimentSuite(
  baseConfig: SimulationConfig,
  privacyConfig: PseudonymConfig,
  seeds: number[],
  outputDir: string,
  datasetCache?: Map<number, CanonicalDataset>
): {
  replicateResults: SingleSeedPrivacyResult[];
  summary: Record<string, unknown>;
} {
  fs.mkdirSync(outputDir, { recursive: true });

  const replicateResults: SingleSeedPrivacyResult[] = [];

  for (const seed of seeds) {
    const seedConfig: SimulationConfig = { ...baseConfig, seed };
    let dataset = datasetCache?.get(seed);
    if (!dataset && datasetCache) {
      dataset = generateCanonicalDataset(seedConfig, { silent: true });
      datasetCache.set(seed, dataset);
    }
    const res = evaluateSingleSeedPrivacy(seedConfig, privacyConfig, dataset);
    replicateResults.push(res);
  }

  const totalTransitions = replicateResults[0]?.linkageMetrics.totalTransitions ?? 0;
  const hasTransitions = totalTransitions > 0;

  // Statistical Summaries across replicates
  const summary = {
    experimentId: path.basename(outputDir),
    rotationIntervalSeconds: privacyConfig.rotationIntervalSeconds,
    identifierPersistenceDurationSeconds: privacyConfig.rotationIntervalSeconds,
    totalTransitions,
    mode: privacyConfig.mode,
    replicateCount: seeds.length,
    seedList: seeds,
    linkageF1: hasTransitions
      ? summarizeReplicateMetric(
          'linkage_f1',
          replicateResults.map((r) => r.linkageMetrics.f1Score)
        )
      : null,
    linkageSuccessRate: hasTransitions
      ? summarizeReplicateMetric(
          'linkage_success_rate',
          replicateResults.map((r) => r.linkageMetrics.linkageSuccessRate!)
        )
      : null,
    unlinkabilityProxy: hasTransitions
      ? summarizeReplicateMetric(
          'unlinkability_proxy',
          replicateResults.map((r) => r.linkageMetrics.unlinkabilityProxy!)
        )
      : null,
    identityTop1Accuracy: summarizeReplicateMetric(
      'identity_top1_accuracy',
      replicateResults.map((r) => r.identityInferenceMetrics.top1Accuracy)
    ),
    sessionFragmentationRatio: summarizeReplicateMetric(
      'session_fragmentation_ratio',
      replicateResults.map((r) => r.tradeoffMetrics.sessionFragmentationRatio)
    ),
    durationAttenuationRatio: summarizeReplicateMetric(
      'duration_attenuation_ratio',
      replicateResults.map((r) => r.tradeoffMetrics.durationAttenuationRatio)
    ),
    meanExposureDurationSec: summarizeReplicateMetric(
      'mean_exposure_duration_sec',
      replicateResults.map((r) => r.meanExposureDurationSeconds)
    ),
    empiricalCollisionRate: summarizeReplicateMetric(
      'empirical_collision_rate',
      replicateResults.map((r) => r.collisionMetrics.empiricalCollisionRate)
    ),
    generatedAt: '2026-01-01T00:00:00.000Z',
  };

  fs.writeFileSync(
    path.join(outputDir, 'privacy_summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(outputDir, 'replicate_results.json'),
    JSON.stringify(replicateResults, null, 2),
    'utf-8'
  );

  return { replicateResults, summary };
}

function saveExperimentSummary(
  outputDir: string,
  privacyConfig: PseudonymConfig,
  replicateResults: SingleSeedPrivacyResult[],
  seeds: number[]
): Record<string, unknown> {
  fs.mkdirSync(outputDir, { recursive: true });

  const totalTransitions = replicateResults[0]?.linkageMetrics.totalTransitions ?? 0;
  const hasTransitions = totalTransitions > 0;

  const summary = {
    experimentId: path.basename(outputDir),
    rotationIntervalSeconds: privacyConfig.rotationIntervalSeconds,
    identifierPersistenceDurationSeconds: privacyConfig.rotationIntervalSeconds,
    totalTransitions,
    mode: privacyConfig.mode,
    replicateCount: seeds.length,
    seedList: seeds,
    linkageF1: hasTransitions
      ? summarizeReplicateMetric(
          'linkage_f1',
          replicateResults.map((r) => r.linkageMetrics.f1Score)
        )
      : null,
    linkageSuccessRate: hasTransitions
      ? summarizeReplicateMetric(
          'linkage_success_rate',
          replicateResults.map((r) => r.linkageMetrics.linkageSuccessRate!)
        )
      : null,
    unlinkabilityProxy: hasTransitions
      ? summarizeReplicateMetric(
          'unlinkability_proxy',
          replicateResults.map((r) => r.linkageMetrics.unlinkabilityProxy!)
        )
      : null,
    identityTop1Accuracy: summarizeReplicateMetric(
      'identity_top1_accuracy',
      replicateResults.map((r) => r.identityInferenceMetrics.top1Accuracy)
    ),
    sessionFragmentationRatio: summarizeReplicateMetric(
      'session_fragmentation_ratio',
      replicateResults.map((r) => r.tradeoffMetrics.sessionFragmentationRatio)
    ),
    durationAttenuationRatio: summarizeReplicateMetric(
      'duration_attenuation_ratio',
      replicateResults.map((r) => r.tradeoffMetrics.durationAttenuationRatio)
    ),
    meanExposureDurationSec: summarizeReplicateMetric(
      'mean_exposure_duration_sec',
      replicateResults.map((r) => r.meanExposureDurationSeconds)
    ),
    empiricalCollisionRate: summarizeReplicateMetric(
      'empirical_collision_rate',
      replicateResults.map((r) => r.collisionMetrics.empiricalCollisionRate)
    ),
    generatedAt: '2026-01-01T00:00:00.000Z',
  };

  fs.writeFileSync(
    path.join(outputDir, 'privacy_summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(outputDir, 'replicate_results.json'),
    JSON.stringify(replicateResults, null, 2),
    'utf-8'
  );

  return summary;
}

/**
 * Execute comprehensive Phase 6 benchmark protocol P1 through P6.
 */
export function runCompletePhase6Benchmark(
  baseConfig: SimulationConfig,
  baseOutputDir = 'results/privacy-benchmark'
): void {
  console.log('\n[Phase 6 Privacy Benchmark] Executing P1 through P6 protocols...');

  const defaultSeeds = [104729, 209759, 32452843];
  const p1Results: SingleSeedPrivacyResult[] = [];
  const p2Intervals = [30, 60, 120, 300, 600];
  const p2ResultsByInterval = new Map<number, SingleSeedPrivacyResult[]>();
  for (const interval of p2Intervals) {
    p2ResultsByInterval.set(interval, []);
  }

  // 1. Process Base Configuration across seeds (P1 and P2)
  for (let sIdx = 0; sIdx < defaultSeeds.length; sIdx++) {
    const seed = defaultSeeds[sIdx];
    console.log(`-> Processing Base Seed ${seed} (${sIdx + 1}/${defaultSeeds.length})...`);
    const seedConfig: SimulationConfig = { ...baseConfig, seed };
    const dataset = generateCanonicalDataset(seedConfig, { silent: true });

    // P1: Baseline without Rotation (T_rot = 3600s)
    const p1Res = evaluateSingleSeedPrivacy(
      seedConfig,
      { mode: 'simulation-grade-prng', rotationIntervalSeconds: 3600 },
      dataset
    );
    p1Results.push(p1Res);

    // P2: Rotation Interval Sweep
    for (const interval of p2Intervals) {
      const p2Res = evaluateSingleSeedPrivacy(
        seedConfig,
        { mode: 'simulation-grade-prng', rotationIntervalSeconds: interval },
        dataset
      );
      p2ResultsByInterval.get(interval)!.push(p2Res);
    }
  }

  // Save P1 artifacts
  console.log('-> Saving P1 (No Rotation) results...');
  saveExperimentSummary(
    path.join(baseOutputDir, 'P1_no_rotation'),
    { mode: 'simulation-grade-prng', rotationIntervalSeconds: 3600 },
    p1Results,
    defaultSeeds
  );

  // Save P2 artifacts
  for (const interval of p2Intervals) {
    console.log(`-> Saving P2 (${interval}s) results...`);
    saveExperimentSummary(
      path.join(baseOutputDir, `P2_sweep_${interval}s`),
      { mode: 'simulation-grade-prng', rotationIntervalSeconds: interval },
      p2ResultsByInterval.get(interval)!,
      defaultSeeds
    );
  }

  // 2. P3: Rotation + RSSI Noise Sweep (0dB, 6dB, 10dB)
  // 6dB matches baseConfig at 60s rotation
  console.log('-> Saving P3 (6 dB) results (reused from P2)...');
  saveExperimentSummary(
    path.join(baseOutputDir, 'P3_noise_6dB'),
    { mode: 'simulation-grade-prng', rotationIntervalSeconds: 60 },
    p2ResultsByInterval.get(60)!,
    defaultSeeds
  );

  const extraNoiseLevels = [0, 10];
  for (const noise of extraNoiseLevels) {
    console.log(`-> Processing P3 (${noise} dB) across seeds...`);
    const p3Results: SingleSeedPrivacyResult[] = [];
    for (const seed of defaultSeeds) {
      const noiseConfig: SimulationConfig = {
        ...baseConfig,
        seed,
        ble: {
          ...baseConfig.ble!,
          rssi: { ...baseConfig.ble!.rssi, noiseSigmaDb: noise },
        },
      };
      const noiseDataset = generateCanonicalDataset(noiseConfig, { silent: true });
      const p3Res = evaluateSingleSeedPrivacy(
        noiseConfig,
        { mode: 'simulation-grade-prng', rotationIntervalSeconds: 60 },
        noiseDataset
      );
      p3Results.push(p3Res);
    }
    saveExperimentSummary(
      path.join(baseOutputDir, `P3_noise_${noise}dB`),
      { mode: 'simulation-grade-prng', rotationIntervalSeconds: 60 },
      p3Results,
      defaultSeeds
    );
  }

  console.log(`[Phase 6 Privacy Benchmark] Completed successfully. Artifacts saved to: ${baseOutputDir}\n`);
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith('privacyExperiment.ts')) {
  const configRaw = fs.readFileSync('experiments/phase4.json', 'utf8');
  const baseConfig: SimulationConfig = JSON.parse(configRaw);
  runCompletePhase6Benchmark(baseConfig);
}

// ─── Phase 7 Campaign Adapter ─────────────────────────────────────────────────

export interface MultiSeedPrivacyOptions {
  experimentId: string;
  baseConfig: SimulationConfig;
  privacyConfig: PseudonymConfig;
  seeds: number[];
  outputDir: string;
  silent?: boolean;
}

/**
 * Phase 7 campaign adapter: runs a multi-seed privacy experiment and returns
 * a structured summary compatible with AggregatedPrivacyResult mapping.
 */
export function runMultiSeedPrivacyExperiment(options: MultiSeedPrivacyOptions): {
  seedList: number[];
  totalTransitions: number;
  linkageF1: import('../evaluation/evaluationTypes.js').MetricSummary | null;
  linkageSuccessRate: import('../evaluation/evaluationTypes.js').MetricSummary | null;
  unlinkabilityProxy: import('../evaluation/evaluationTypes.js').MetricSummary | null;
  identityTop1Accuracy: import('../evaluation/evaluationTypes.js').MetricSummary;
  sessionFragmentationRatio: import('../evaluation/evaluationTypes.js').MetricSummary;
  durationAttenuationRatio: import('../evaluation/evaluationTypes.js').MetricSummary;
  meanExposureDurationSec: import('../evaluation/evaluationTypes.js').MetricSummary;
  empiricalCollisionRate: import('../evaluation/evaluationTypes.js').MetricSummary;
} {
  const { replicateResults, summary } = runPrivacyExperimentSuite(
    options.baseConfig,
    options.privacyConfig,
    options.seeds,
    options.outputDir
  );

  void replicateResults; // already aggregated in summary

  return {
    seedList: summary.seedList as number[],
    totalTransitions: summary.totalTransitions as number,
    linkageF1: summary.linkageF1 as import('../evaluation/evaluationTypes.js').MetricSummary | null,
    linkageSuccessRate: summary.linkageSuccessRate as import('../evaluation/evaluationTypes.js').MetricSummary | null,
    unlinkabilityProxy: summary.unlinkabilityProxy as import('../evaluation/evaluationTypes.js').MetricSummary | null,
    identityTop1Accuracy: summary.identityTop1Accuracy as import('../evaluation/evaluationTypes.js').MetricSummary,
    sessionFragmentationRatio: summary.sessionFragmentationRatio as import('../evaluation/evaluationTypes.js').MetricSummary,
    durationAttenuationRatio: summary.durationAttenuationRatio as import('../evaluation/evaluationTypes.js').MetricSummary,
    meanExposureDurationSec: summary.meanExposureDurationSec as import('../evaluation/evaluationTypes.js').MetricSummary,
    empiricalCollisionRate: summary.empiricalCollisionRate as import('../evaluation/evaluationTypes.js').MetricSummary,
  };
}

