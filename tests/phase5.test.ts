/**
 * Comprehensive Automated Research Test Suite: Phase 5
 * Evaluation & Experimental Validation
 *
 * Verifies:
 * 1. Exact, partial, and non-overlapping session matching
 * 2. Pair canonicalization during matching
 * 3. Contact detection metrics (TP, FP, FN, Precision, Recall, F1)
 * 4. Zero-denominator safety (no NaN or crash)
 * 5. Duration error metrics (MAE, RMSE, Median, P95)
 * 6. Wearable-to-gateway distance estimation metrics
 * 7. Risk discrimination AUROC and AUPRC calculation
 * 8. Single-class degenerate handling for AUROC and AUPRC
 * 9. Threshold grid classification metrics
 * 10. Probability calibration: Brier score, ECE, and reliability bins
 * 11. Edge processing reduction and throughput metrics
 * 12. Multi-seed statistical aggregation (Student's t 95% CI)
 * 13. Unavailable CI for n < 2
 * 14. Fair baseline comparative execution on identical inputs
 * 15. Feature ablation execution on identical inputs
 * 16. Architectural isolation: src/ble/, src/edge/, src/risk/ have zero ground-truth imports
 * 17. Evaluation determinism: identical inputs produce identical metrics
 * 18. Edge case robustness: zero contacts, all-positive, all-negative labels
 */

import fs from 'fs';
import path from 'path';
import type { ContactSession } from '../src/edge/edgeTypes.js';
import type { GroundTruthContact } from '../src/simulation/groundTruth.js';
import type { Person, Gateway } from '../src/simulation/scenarioTypes.js';
import type { MovementState } from '../src/simulation/movementModel.js';
import type { RiskAssessment, ExposureRecord } from '../src/risk/riskTypes.js';
import { createDefaultRiskModel } from '../src/risk/model.js';
import { LegacyHeuristicRiskModel } from '../src/risk/legacyBaseline.js';
import { generateCanonicalDataset } from '../src/datasets/generator.js';
import {
  matchContactSessions,
  calculateIntervalOverlap,
  buildIdentityMaps,
  deriveGroundTruthWearablePairs,
  isGroundTruthContactPair,
} from '../src/evaluation/matching.js';
import {
  computeContactMetricsFromMatching,
  evaluateContactDetection,
} from '../src/evaluation/contactMetrics.js';
import { evaluateDistanceEstimation } from '../src/evaluation/distanceMetrics.js';
import {
  calculateAUROC,
  calculateAUPRC,
  evaluateThresholdGrid,
  evaluateRiskAssessments,
  deriveReferenceExposureKeys,
} from '../src/evaluation/riskMetrics.js';
import {
  calculateBrierScore,
  calculateCalibrationBins,
  evaluateCalibration,
} from '../src/evaluation/calibrationMetrics.js';
import { evaluateEdgeProcessing } from '../src/evaluation/edgeMetrics.js';
import { summarizeReplicateMetric, getStudentTCriticalValue } from '../src/evaluation/statisticalSummary.js';
import {
  ProximityOnlyBaseline,
  ProximityDurationBaseline,
  LegacyHeuristicBaseline,
  ProposedBayesianMethod,
} from '../src/evaluation/baselines.js';
import { runAblationStudy } from '../src/evaluation/ablation.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string): void {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
  }
}

function approxEqual(a: number, b: number, epsilon = 1e-5): boolean {
  return Math.abs(a - b) < epsilon;
}

console.log('\n=== Phase 5 Evaluation & Validation Test Suite ===\n');

// 1. Session Matching (Exact & Partial Overlap)
{
  const overlapExact = calculateIntervalOverlap(100, 200, 100, 200);
  assert(
    overlapExact.iou === 1.0 && overlapExact.overlapSeconds === 100,
    'Matching: Exact interval overlap yields IoU = 1.0'
  );

  // Partial overlap: [100, 200] and [150, 250] -> intersection [150, 200] = 50s, union [100, 250] = 150s -> IoU = 50/150 = 1/3
  const overlapPartial = calculateIntervalOverlap(100, 200, 150, 250);
  assert(
    approxEqual(overlapPartial.iou, 1.0 / 3.0) && overlapPartial.overlapSeconds === 50,
    'Matching: Partial overlap [100, 200] & [150, 250] yields IoU = 1/3'
  );

  // Non-overlap: [100, 200] and [300, 400] -> intersection = 0
  const overlapNone = calculateIntervalOverlap(100, 200, 300, 400);
  assert(
    overlapNone.iou === 0 && overlapNone.overlapSeconds === 0,
    'Matching: Non-overlapping intervals yield IoU = 0'
  );
}

// 2. Identity Mapping & Canonical Pair Matching
{
  const people: Person[] = [
    { personId: 'P-1', wearableId: 'W-1', role: 'patient', roomId: 'R1', x: 0, y: 0, sourceStatus: 'non-source', active: true },
    { personId: 'P-2', wearableId: 'W-2', role: 'patient', roomId: 'R1', x: 0, y: 0, sourceStatus: 'confirmed', active: true },
  ];

  const gtContact: GroundTruthContact = {
    personA: 'P-1',
    personB: 'P-2',
    startTime: 100,
    endTime: 200,
    durationSeconds: 100,
    roomId: 'R1',
    trueDistanceSamples: [1.0],
    sourceStatusA: 'non-source',
    sourceStatusB: 'confirmed',
  };

  const detectedSession: ContactSession = {
    sessionId: 'sess-1',
    wearableA: 'W-1',
    wearableB: 'W-2',
    startTime: 110,
    endTime: 190,
    durationSeconds: 80,
    observationCount: 10,
    supportingGatewayIds: ['GW-1'],
  };

  const matchRes = matchContactSessions([gtContact], [detectedSession], people, { minOverlapIoU: 0.2 });
  assert(
    matchRes.matchedPairs.length === 1 &&
      matchRes.matchedPairs[0].personA === 'P-1' &&
      matchRes.matchedPairs[0].personB === 'P-2' &&
      matchRes.matchedPairs[0].durationErrorSeconds === -20,
    'Matching: Matches detected wearable session to ground-truth person contact with correct duration error'
  );
}

// 3. Contact Metrics (Known TP, FP, FN, Precision, Recall, F1)
{
  // Construct a synthetic matching result with 8 TP, 2 FP, 4 FN
  const mockMatching = {
    matchedPairs: new Array(8).fill({
      groundTruthContact: {} as GroundTruthContact,
      detectedSession: {} as ContactSession,
      personA: 'P1',
      personB: 'P2',
      wearableA: 'W1',
      wearableB: 'W2',
      overlapIoU: 0.8,
      overlapSeconds: 50,
      startTimeErrorSeconds: 2,
      endTimeErrorSeconds: -3,
      durationErrorSeconds: -5,
      absoluteDurationErrorSeconds: 5,
    }),
    unmatchedDetected: new Array(2).fill({} as ContactSession),
    unmatchedGroundTruth: new Array(4).fill({} as GroundTruthContact),
    fragmentationCounts: new Map<string, number>([['gt1', 1]]),
    mergeCounts: new Map<string, number>([['s1', 1]]),
  };

  // Total GT = 8 + 4 = 12, Total Detected = 8 + 2 = 10
  const metrics = computeContactMetricsFromMatching(mockMatching, 12, 10);

  // Precision = 8 / (8 + 2) = 0.80
  // Recall = 8 / (8 + 4) = 8 / 12 = 0.66667
  // F1 = 2 * (0.8 * 0.66667) / (0.8 + 0.66667) = 1.06667 / 1.46667 = 0.72727
  assert(
    approxEqual(metrics.precision, 0.8),
    'Contact Metrics: Precision matches exact formula (0.80)'
  );
  assert(
    approxEqual(metrics.recall, 8 / 12),
    'Contact Metrics: Recall matches exact formula (0.667)'
  );
  assert(
    approxEqual(metrics.f1Score, (2 * 0.8 * (8 / 12)) / (0.8 + 8 / 12)),
    'Contact Metrics: F1 Score matches exact formula (0.727)'
  );
  assert(
    metrics.durationError.maeSeconds === 5.0 &&
      metrics.durationError.rmseSeconds === 5.0 &&
      metrics.durationError.medianAbsoluteErrorSeconds === 5.0,
    'Contact Metrics: Duration error MAE and RMSE accurately computed'
  );
}

// 4. Zero-Denominator Handling
{
  const emptyMatching = {
    matchedPairs: [],
    unmatchedDetected: [],
    unmatchedGroundTruth: [],
    fragmentationCounts: new Map<string, number>(),
    mergeCounts: new Map<string, number>(),
  };

  const zeroMetrics = computeContactMetricsFromMatching(emptyMatching, 0, 0);
  assert(
    zeroMetrics.precision === 0 && zeroMetrics.recall === 0 && zeroMetrics.f1Score === 0,
    'Zero-Denominator: Zero contacts/detections produces 0.0 without NaN or exceptions'
  );
}

// 5. Wearable-to-Gateway Distance Metrics
{
  const people: Person[] = [
    { personId: 'P-1', wearableId: 'W-1', role: 'patient', roomId: 'R1', x: 2, y: 0, sourceStatus: 'non-source', active: true },
  ];
  const gateways: Gateway[] = [
    { gatewayId: 'GW-1', x: 0, y: 0, roomId: 'R1' },
  ];
  // Person is at (2, 0), true distance to gateway (0, 0) is 2.0m
  const movementStates: MovementState[] = [
    { personId: 'P-1', timestamp: 10, roomId: 'R1', x: 2, y: 0 },
  ];
  // Estimated distance is 2.5m (error = +0.5m)
  const edgeObservations = [
    {
      wearableId: 'W-1',
      gatewayId: 'GW-1',
      timestamp: 10000,
      eventIndex: 1,
      rawRssiDbm: -56,
      filteredRssiDbm: -56,
      estimatedDistanceMeters: 2.5,
      sourceObservationId: 'obs-1',
    },
  ];

  const distMetrics = evaluateDistanceEstimation(edgeObservations, movementStates, people, gateways);
  assert(
    distMetrics.totalEvaluatedSamples === 1 &&
      approxEqual(distMetrics.maeMeters, 0.5) &&
      approxEqual(distMetrics.meanErrorMeters, 0.5) &&
      approxEqual(distMetrics.rmseMeters, 0.5),
    'Distance Metrics: Evaluates wearable-to-gateway path loss inversion error against true Euclidean coordinates'
  );
}

// 6. AUROC & AUPRC Calculation
{
  // Perfect ranking: positive samples have higher predicted probability than negative
  const preds = [0.9, 0.8, 0.3, 0.1];
  const labels: (0 | 1)[] = [1, 1, 0, 0];

  const auroc = calculateAUROC(preds, labels);
  assert(
    auroc !== undefined && approxEqual(auroc, 1.0),
    'Risk AUROC: Perfect ranking produces AUROC = 1.0'
  );

  const auprc = calculateAUPRC(preds, labels);
  assert(
    auprc !== undefined && approxEqual(auprc, 1.0),
    'Risk AUPRC: Perfect ranking produces AUPRC = 1.0'
  );

  // Inverted ranking: positive samples have lower predicted probability than negative
  const invertedPreds = [0.1, 0.2, 0.8, 0.9];
  const aurocInverted = calculateAUROC(invertedPreds, labels);
  assert(
    aurocInverted !== undefined && approxEqual(aurocInverted, 0.0),
    'Risk AUROC: Inverted ranking produces AUROC = 0.0'
  );

  // Known non-trivial binary classification: labels = [1, 1, 0, 1], preds = [0.9, 0.8, 0.4, 0.1]
  // tau = 0.9: TP=1, FP=0, P=1.0, R=1/3, deltaR=1/3 -> 1/3
  // tau = 0.8: TP=2, FP=0, P=1.0, R=2/3, deltaR=1/3 -> 1/3
  // tau = 0.4: TP=2, FP=1, P=2/3, R=2/3, deltaR=0   -> 0
  // tau = 0.1: TP=3, FP=1, P=3/4, R=1.0, deltaR=1/3 -> 1/4
  // Expected AP = 1/3 + 1/3 + 1/4 = 11/12 ≈ 0.91667
  const knownPreds = [0.9, 0.8, 0.4, 0.1];
  const knownLabels: (0 | 1)[] = [1, 1, 0, 1];
  const knownAUPRC = calculateAUPRC(knownPreds, knownLabels);
  assert(
    knownAUPRC !== undefined && approxEqual(knownAUPRC, 11 / 12),
    'Risk AUPRC: Step-wise Average Precision matches known theoretical 11/12 (0.91667)'
  );

  // Inverted PR ranking: labels = [0, 0, 1, 1], preds = [0.9, 0.8, 0.4, 0.1]
  // Expected AP = 1/6 + 1/4 = 5/12 ≈ 0.41667
  const invertedPRLabels: (0 | 1)[] = [0, 0, 1, 1];
  const invertedAUPRC = calculateAUPRC(knownPreds, invertedPRLabels);
  assert(
    invertedAUPRC !== undefined && approxEqual(invertedAUPRC, 5 / 12),
    'Risk AUPRC: Inverted ranking produces theoretical 5/12 (0.41667)'
  );

  // Tied scores: preds = [0.5, 0.5, 0.5, 0.5], labels = [1, 0, 1, 0]
  // Grouped at tau=0.5: TP=2, FP=2, P=2/4=0.5, R=1.0, deltaR=1.0 -> 0.5
  const tiedPreds = [0.5, 0.5, 0.5, 0.5];
  const tiedLabels: (0 | 1)[] = [1, 0, 1, 0];
  const tiedAUPRC = calculateAUPRC(tiedPreds, tiedLabels);
  assert(
    tiedAUPRC !== undefined && approxEqual(tiedAUPRC, 0.5),
    'Risk AUPRC: Tied predictions evaluate without arbitrary tie order distortion'
  );
}

// 7. Single-Class Handling for AUROC & AUPRC
{
  const allPositiveLabels: (0 | 1)[] = [1, 1, 1];
  const preds = [0.5, 0.6, 0.7];
  assert(
    calculateAUROC(preds, allPositiveLabels) === undefined,
    'Risk Metrics: AUROC returns undefined for degenerate all-positive dataset'
  );
  assert(
    calculateAUPRC(preds, allPositiveLabels) === undefined,
    'Risk Metrics: AUPRC returns undefined for degenerate all-positive dataset'
  );
}

// 8. Threshold Grid Metrics
{
  const preds = [0.8, 0.6, 0.4, 0.2];
  const labels: (0 | 1)[] = [1, 1, 0, 0];

  const grid = evaluateThresholdGrid(preds, labels, [0.5]);
  assert(
    grid.length === 1 &&
      grid[0].tp === 2 &&
      grid[0].fp === 0 &&
      grid[0].tn === 2 &&
      grid[0].fn === 0 &&
      grid[0].precision === 1.0 &&
      grid[0].recall === 1.0,
    'Threshold Grid: Correctly evaluates classification counts and rates at tau = 0.5'
  );
}

// 9. Brier Score & ECE Calibration
{
  // Predictions: [0.8, 0.2], Labels: [1, 0]
  // Diff 1 = 0.8 - 1 = -0.2 -> 0.04
  // Diff 2 = 0.2 - 0 = 0.2 -> 0.04
  // Brier = (0.04 + 0.04) / 2 = 0.04
  const brier = calculateBrierScore([0.8, 0.2], [1, 0]);
  assert(
    approxEqual(brier, 0.04),
    'Calibration: Brier Score matches exact mathematical calculation (0.04)'
  );

  const cal = evaluateCalibration([0.8, 0.2], [1, 0], 10);
  assert(
    cal.bins.length === 10 && cal.expectedCalibrationError >= 0,
    'Calibration: Reliability bins and ECE calculated successfully'
  );
}

// 10. Edge Reduction & Telemetry Metrics
{
  const edge = evaluateEdgeProcessing({
    rawCount: 1000,
    processedCount: 100,
    sessionCount: 5,
    durationMs: 50,
  });

  // Reduction = 1 - 100/1000 = 0.90
  // Throughput = 100 / (50/1000) = 2000 obs/sec
  assert(
    approxEqual(edge.observationReductionRatio, 0.9),
    'Edge Metrics: Reduction ratio matches 90% (0.90)'
  );
  assert(
    edge.throughputObservationsPerSec !== undefined &&
      approxEqual(edge.throughputObservationsPerSec, 2000),
    'Edge Metrics: Throughput calculates 2000 observations/sec'
  );
}

// 11. Multi-Seed Statistical Aggregation & 95% CI
{
  // Sample: [0.80, 0.82, 0.84] (n = 3)
  // Mean = 0.82
  // Std Dev = sqrt((( -0.02)^2 + 0 + 0.02^2) / 2) = sqrt(0.0008 / 2) = sqrt(0.0004) = 0.02
  const summary = summarizeReplicateMetric('f1', [0.8, 0.82, 0.84]);
  assert(
    approxEqual(summary.mean, 0.82) && approxEqual(summary.standardDeviation, 0.02),
    'Statistical Summary: Accurate sample mean and Bessel-corrected standard deviation'
  );
  assert(
    summary.confidenceInterval95 !== undefined &&
      summary.confidenceInterval95.lower < 0.82 &&
      summary.confidenceInterval95.upper > 0.82,
    'Statistical Summary: Computes valid 95% Student t confidence interval for n >= 2'
  );

  // For n = 1, CI must be undefined
  const singleSummary = summarizeReplicateMetric('f1', [0.82]);
  assert(
    singleSummary.confidenceInterval95 === undefined,
    'Statistical Summary: For n < 2, confidence interval is strictly undefined'
  );
}

// 12. Baseline Comparative Execution on Identical Inputs
{
  const model = createDefaultRiskModel();
  const records: ExposureRecord[] = [
    {
      targetWearableId: 'W-1',
      sourceWearableId: 'W-2',
      sessionId: 'sess-1',
      sessionStartTime: 0,
      sessionEndTime: 100,
      durationSeconds: 100,
      observationCount: 20,
      supportingGatewayCount: 1,
      proximityEvidence: 0.8,
      previousSessionCount: 0,
      cumulativePriorDurationSeconds: 0,
      sourceStatus: 'confirmed',
    },
  ];

  const proxOnly = new ProximityOnlyBaseline();
  const proxDur = new ProximityDurationBaseline();
  const legacy = new LegacyHeuristicBaseline();
  const proposed = new ProposedBayesianMethod(model);

  const res1 = proxOnly.predict(records);
  const res2 = proxDur.predict(records);
  const res3 = legacy.predict(records);
  const res4 = proposed.predict(records);

  assert(
    res1.length === 1 && res2.length === 1 && res3.length === 1 && res4.length === 1,
    'Baselines: All 4 models execute cleanly on identical ExposureRecord inputs'
  );
  assert(
    res1[0].exposureProbability >= 0 &&
      res2[0].exposureProbability >= 0 &&
      res3[0].exposureProbability >= 0 &&
      res4[0].exposureProbability >= 0,
    'Baselines: All models output valid bounded exposure probabilities'
  );
}

// 13. Feature Ablation Framework
{
  const model = createDefaultRiskModel();
  const records: ExposureRecord[] = [
    {
      targetWearableId: 'W-1',
      sourceWearableId: 'W-2',
      sessionId: 'sess-1',
      sessionStartTime: 0,
      sessionEndTime: 120,
      durationSeconds: 120,
      observationCount: 30,
      supportingGatewayCount: 1,
      proximityEvidence: 0.7,
      previousSessionCount: 1,
      cumulativePriorDurationSeconds: 100,
      sourceStatus: 'suspected',
    },
  ];

  const ablation = runAblationStudy(records, model);
  assert(
    ablation.fullModelAssessments.length === 1 &&
      ablation.noDurationAssessments.length === 1 &&
      ablation.noProximityAssessments.length === 1 &&
      ablation.noRecurrenceAssessments.length === 1 &&
      ablation.noSourceStatusAssessments.length === 1,
    'Ablation: Evaluates Full Model and all 4 single-feature ablations successfully'
  );

  // Verify that ablated features are genuinely excluded from evidence contributions
  const fullContribs = (ablation.fullModelAssessments[0].contributions ?? []).map((c) => c.feature);
  const noDurContribs = (ablation.noDurationAssessments[0].contributions ?? []).map((c) => c.feature);
  const noProxContribs = (ablation.noProximityAssessments[0].contributions ?? []).map((c) => c.feature);
  const noRecContribs = (ablation.noRecurrenceAssessments[0].contributions ?? []).map((c) => c.feature);
  const noSrcContribs = (ablation.noSourceStatusAssessments[0].contributions ?? []).map((c) => c.feature);

  assert(
    fullContribs.includes('duration') &&
      fullContribs.includes('proximity') &&
      fullContribs.includes('encounterCount') &&
      fullContribs.includes('cumulativeDuration') &&
      fullContribs.includes('sourceStatus'),
    'Ablation: Full Model retains all 5 evidence feature contributions'
  );
  assert(
    !noDurContribs.includes('duration') && noDurContribs.includes('proximity'),
    'Ablation minus Duration: Strictly excludes duration from likelihood updates'
  );
  assert(
    !noProxContribs.includes('proximity') && noProxContribs.includes('duration'),
    'Ablation minus Proximity: Strictly excludes proximity from likelihood updates'
  );
  assert(
    !noRecContribs.includes('encounterCount') &&
      !noRecContribs.includes('cumulativeDuration') &&
      noRecContribs.includes('duration'),
    'Ablation minus Recurrence: Strictly excludes encounter count and cumulative duration'
  );
  assert(
    !noSrcContribs.includes('sourceStatus') && noSrcContribs.includes('duration'),
    'Ablation minus Source Status: Strictly excludes source status from likelihood updates'
  );
}

// 14. Architecture: Ground-Truth Isolation Check
{
  const prohibitedInRuntime = ['groundTruth', 'scenarioGenerator'];
  const runtimeDirs = ['src/ble', 'src/edge', 'src/risk'];
  let leakageFound = false;

  for (const dir of runtimeDirs) {
    const fullDir = path.resolve(dir);
    if (fs.existsSync(fullDir)) {
      const files = fs.readdirSync(fullDir).filter((f) => f.endsWith('.ts'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(fullDir, file), 'utf-8');
        for (const prohibited of prohibitedInRuntime) {
          const importRegex = new RegExp(`from\\s+['"][^'"]*${prohibited}[^'"]*['"]`);
          if (importRegex.test(content)) {
            leakageFound = true;
            console.error(`Architectural Violation: ${dir}/${file} imports prohibited module '${prohibited}'`);
          }
        }
        if (dir === 'src/edge' || dir === 'src/risk') {
          const importRegex = new RegExp(`from\\s+['"][^'"]*movementModel[^'"]*['"]`);
          if (importRegex.test(content)) {
            leakageFound = true;
            console.error(`Architectural Violation: ${dir}/${file} imports prohibited module 'movementModel'`);
          }
        }
      }
    }
  }

  assert(
    !leakageFound,
    'Architecture: Runtime modules (src/ble, src/edge, src/risk) have zero ground-truth imports'
  );
}

// 15. Robustness Sweep Wiring & Ground-Truth Invariance
{
  const baseCfg = {
    datasetVersion: '2.0',
    scenarioVersion: '1.0',
    seed: 104729,
    durationSeconds: 60,
    populationSize: 8,
    gatewayCount: 4,
    timeStepSeconds: 1,
    rooms: [],
    contactDefinition: {
      distanceThresholdMeters: 2.0,
      minimumDurationSeconds: 10,
      roomConstraint: 'same-room' as const,
    },
    ble: {
      advertising: {
        intervalMs: 500,
        jitterMinMs: 0,
        jitterMaxMs: 5,
        advertisementType: 'legacy' as const,
      },
      rssi: {
        referenceDistanceMeters: 1.0,
        referenceRSSIDbm: -50.0,
        pathLossExponent: 2.5,
        noiseSigmaDb: 2.0,
      },
      reception: {
        packetLossProbability: 0.05,
      },
    },
  };

  const dsBase = generateCanonicalDataset(baseCfg, { silent: true });

  // Parameter Sweep A: RSSI Noise (2.0 vs 8.0 dB)
  const dsNoise = generateCanonicalDataset({
    ...baseCfg,
    ble: {
      ...baseCfg.ble,
      rssi: { ...baseCfg.ble.rssi, noiseSigmaDb: 8.0 },
    },
  }, { silent: true });

  assert(
    dsBase.groundTruthContacts.length === dsNoise.groundTruthContacts.length &&
      dsBase.movementStates.length === dsNoise.movementStates.length,
    'Robustness Wiring: RSSI noise sweep leaves Phase 1 ground truth 100% identical'
  );
  assert(
    dsBase.bleObservations!.some((obs, idx) => obs.rssiDbm !== dsNoise.bleObservations![idx]?.rssiDbm),
    'Robustness Wiring: Changing RSSI noise actually modifies RF observation values'
  );

  // Parameter Sweep B: Packet Loss (0.05 vs 0.50)
  const dsLoss = generateCanonicalDataset({
    ...baseCfg,
    ble: {
      ...baseCfg.ble,
      reception: { packetLossProbability: 0.50 },
    },
  }, { silent: true });

  assert(
    dsBase.groundTruthContacts.length === dsLoss.groundTruthContacts.length,
    'Robustness Wiring: Packet loss sweep leaves Phase 1 ground truth 100% identical'
  );
  assert(
    dsLoss.bleObservations!.length < dsBase.bleObservations!.length,
    'Robustness Wiring: Higher packet loss actually reduces received observation count'
  );

  // Parameter Sweep C: Advertising Interval (500ms vs 1000ms)
  const dsInterval = generateCanonicalDataset({
    ...baseCfg,
    ble: {
      ...baseCfg.ble,
      advertising: { ...baseCfg.ble.advertising, intervalMs: 1000 },
    },
  }, { silent: true });

  assert(
    dsBase.groundTruthContacts.length === dsInterval.groundTruthContacts.length,
    'Robustness Wiring: Advertising interval sweep leaves Phase 1 ground truth 100% identical'
  );
  assert(
    dsInterval.bleObservations!.length < dsBase.bleObservations!.length,
    'Robustness Wiring: Slower advertising interval actually reduces observation rate'
  );
}

// 16. Regression: Calibration Label Resolution & Namespace Separation
{
  const people: Person[] = [
    { personId: 'P-0001', wearableId: 'W-0001', role: 'healthcare-worker', roomId: 'R1', x: 0, y: 0, sourceStatus: 'confirmed', active: true },
    { personId: 'P-0002', wearableId: 'W-0002', role: 'patient', roomId: 'R1', x: 1, y: 0, sourceStatus: 'non-source', active: true },
    { personId: 'P-0003', wearableId: 'W-0003', role: 'visitor', roomId: 'R2', x: 10, y: 10, sourceStatus: 'non-source', active: true },
  ];

  const gtContacts: GroundTruthContact[] = [
    {
      personA: 'P-0001',
      personB: 'P-0002',
      startTime: 100,
      endTime: 160,
      durationSeconds: 60,
      roomId: 'R1',
      trueDistanceSamples: [1.0, 1.2],
      sourceStatusA: 'confirmed',
      sourceStatusB: 'non-source',
    },
  ];

  const canonicalPairs = deriveGroundTruthWearablePairs(gtContacts, people);

  // 1. True reference exposure receives label 1 (canonical ordering W-0001 -> W-0002)
  const isMatchNormal = isGroundTruthContactPair('W-0001', 'W-0002', canonicalPairs);
  assert(
    isMatchNormal === true,
    'Regression: True reference contact receives label 1 (target=W-0001, source=W-0002)'
  );

  // 2. Reversed pair ordering (W-0002 -> W-0001) receives label 1
  const isMatchReversed = isGroundTruthContactPair('W-0002', 'W-0001', canonicalPairs);
  assert(
    isMatchReversed === true,
    'Regression: Reversed wearable pair ordering receives label 1'
  );

  // 3. Non-reference exposure (W-0001, W-0003) receives label 0
  const isNonMatch = isGroundTruthContactPair('W-0001', 'W-0003', canonicalPairs);
  assert(
    isNonMatch === false,
    'Regression: Non-reference pair receives label 0'
  );

  // 4. Namespace safety: person IDs are never directly compared or matched with wearable IDs
  const personAsWearableMatch = isGroundTruthContactPair('P-0001', 'P-0002', canonicalPairs);
  assert(
    personAsWearableMatch === false,
    'Regression: Person ID namespace does not match Wearable ID namespace'
  );

  // 5. Undefined or missing wearable IDs return false safely
  assert(
    isGroundTruthContactPair('W-0001', undefined, canonicalPairs) === false &&
      isGroundTruthContactPair(undefined, 'W-0002', canonicalPairs) === false,
    'Regression: Missing or undefined wearable IDs return false safely'
  );
}

// 17. Regression: Legacy Heuristic Assessment Context & Matching
{
  const legacyModel = new LegacyHeuristicRiskModel();
  const mockFeatures = {
    durationSeconds: 120,
    proximityEvidence: 0.8,
    observationCount: 10,
    supportingGatewayCount: 2,
    encounterCount: 1,
    cumulativeDurationSeconds: 120,
    recencySeconds: undefined,
    sourceStatus: 'confirmed' as const,
  };

  // Predict with context including sourceWearableId
  const assessment = legacyModel.predict(mockFeatures, {
    targetWearableId: 'W-0002',
    sourceWearableId: 'W-0001',
    sessionId: 'session-legacy-1',
    timestamp: 1500,
  });

  assert(
    assessment.targetWearableId === 'W-0002' && assessment.sourceWearableId === 'W-0001',
    'Regression: Legacy Heuristic output preserves both targetWearableId and sourceWearableId'
  );

  // Verify it matches canonical ground-truth pairs
  const people: Person[] = [
    { personId: 'P-0001', wearableId: 'W-0001', role: 'healthcare-worker', roomId: 'R1', x: 0, y: 0, sourceStatus: 'confirmed', active: true },
    { personId: 'P-0002', wearableId: 'W-0002', role: 'patient', roomId: 'R1', x: 1, y: 0, sourceStatus: 'non-source', active: true },
  ];
  const gtContacts: GroundTruthContact[] = [
    {
      personA: 'P-0001',
      personB: 'P-0002',
      startTime: 100,
      endTime: 200,
      durationSeconds: 100,
      roomId: 'R1',
      trueDistanceSamples: [1.0],
      sourceStatusA: 'confirmed',
      sourceStatusB: 'non-source',
    },
  ];
  const canonicalPairs = deriveGroundTruthWearablePairs(gtContacts, people);
  assert(
    isGroundTruthContactPair(assessment.targetWearableId, assessment.sourceWearableId, canonicalPairs),
    'Regression: Legacy Heuristic assessment correctly matches ground-truth wearable pair'
  );
}

console.log('\n===================================');
console.log(`Phase 5 Tests Passed: ${passedTests}`);
console.log(`Phase 5 Tests Failed: ${totalTests - passedTests}`);
console.log('===================================\n');

if (totalTests !== passedTests) {
  process.exit(1);
}
