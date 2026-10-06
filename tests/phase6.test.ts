/**
 * Comprehensive Automated Research Test Suite: Phase 6
 * Privacy, Pseudonymization & Security Evaluation
 *
 * Verifies:
 * 1. Mode A (Keyed HMAC-SHA256) vs Mode B (Simulation-Grade Deterministic PRNG) semantics
 * 2. Deterministic pseudonym generation and uniqueness across seeds
 * 3. Collision tracking ledger and theoretical birthday-bound calculation
 * 4. Rotation schedule epoch boundaries, jitter handling, and active lookup
 * 5. Authorized identity resolution vs unauthorized access denial
 * 6. Public observation cleanliness (only pseudonyms emitted, zero hidden truth)
 * 7. Architectural isolation: Attacker modules have zero imports of ground truth or registry
 * 8. Linkage attack metrics on known transition pairs
 * 9. Identity inference metrics under conservative baseline side-information
 * 10. Privacy–Utility trade-off: observation fragmentation and duration attenuation
 * 11. End-to-end dataset generation with optional privacy subsystem
 * 12. Deterministic reproducibility: repeated runs produce bitwise identical outputs
 */

import fs from 'fs';
import path from 'path';
import type { SimulationConfig, Person, Gateway } from '../src/simulation/scenarioTypes.js';
import type { BLEObservation } from '../src/ble/bleTypes.js';
import { generateCanonicalDataset } from '../src/datasets/generator.js';
import {
  PseudonymGenerator,
  RotationScheduleModel,
  IdentityRegistry,
  applyPseudonymsToObservations,
  resolvePseudonymousObservations,
  executeLinkageAttack,
  evaluateLinkagePredictions,
  executeIdentityInferenceAttack,
  evaluateIdentityInference,
  calculateMeanExposureDurationSeconds,
  calculatePrivacyTradeoff,
  evaluateSingleSeedPrivacy,
  runPrivacyExperimentSuite,
  type PseudonymConfig,
  type AuthorizationContext,
} from '../src/privacy/index.js';
import { getPrivacyScaffoldStatus } from '../src/evaluation/privacyMetrics.js';

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

function approxEqual(a: number, b: number, epsilon = 1e-4): boolean {
  return Math.abs(a - b) < epsilon;
}

console.log('\n=== Phase 6 Privacy, Pseudonymization & Security Test Suite ===\n');

// -------------------------------------------------------------
// Test 1: Mode Semantics (Keyed HMAC-SHA256 vs Simulation-Grade PRNG)
// -------------------------------------------------------------
{
  // HMAC-SHA256 requires explicit secretKey
  let threwWithoutKey = false;
  try {
    new PseudonymGenerator({
      mode: 'hmac-sha256',
      rotationIntervalSeconds: 60,
    });
  } catch (err) {
    threwWithoutKey = true;
  }
  assert(
    threwWithoutKey,
    'Security Semantics: HMAC-SHA256 mode strictly requires explicit secretKey'
  );

  // HMAC-SHA256 with key generates valid pseudonym
  const hmacGen = new PseudonymGenerator({
    mode: 'hmac-sha256',
    secretKey: 'authorized-research-secret-key-xyz',
    rotationIntervalSeconds: 60,
  });
  const hmacPseudo = hmacGen.generatePseudonym('W-0001', 0, 104729);
  assert(
    hmacPseudo.startsWith('PSEUDO-') && hmacPseudo.length > 10,
    'HMAC-SHA256: Generates valid keyed cryptographic pseudonym'
  );

  // Simulation-grade PRNG mode operates deterministically without secretKey
  const prngGen = new PseudonymGenerator({
    mode: 'simulation-grade-prng',
    rotationIntervalSeconds: 60,
  });
  const prngPseudo1 = prngGen.generatePseudonym('W-0001', 0, 104729);
  const prngPseudo2 = prngGen.generatePseudonym('W-0001', 0, 104729);
  assert(
    prngPseudo1 === prngPseudo2,
    'Simulation-Grade PRNG: Deterministically reproducible given same seed and epoch'
  );
}

// -------------------------------------------------------------
// Test 2: Pseudonym Determinism and Uniqueness Across Wearables
// -------------------------------------------------------------
{
  const gen = new PseudonymGenerator({
    mode: 'simulation-grade-prng',
    rotationIntervalSeconds: 60,
  });

  const p1 = gen.generatePseudonym('W-0001', 0, 104729);
  const p2 = gen.generatePseudonym('W-0002', 0, 104729);
  const p3 = gen.generatePseudonym('W-0001', 1, 104729);

  assert(
    p1 !== p2,
    'Pseudonym Uniqueness: Distinct wearables produce distinct pseudonyms in same epoch'
  );
  assert(
    p1 !== p3,
    'Pseudonym Rotation: Same wearable produces distinct pseudonyms across different epochs'
  );
}

// -------------------------------------------------------------
// Test 3: Collision Tracking & Birthday-Bound Calculation
// -------------------------------------------------------------
{
  // Test with small 8-bit namespace (256 possible values) to induce measurable collisions
  const smallNamespaceGen = new PseudonymGenerator({
    mode: 'simulation-grade-prng',
    namespaceBits: 8,
    rotationIntervalSeconds: 60,
  });

  // Generate 50 pseudonyms in a 256-value space (high collision chance via birthday paradox)
  for (let i = 0; i < 50; i++) {
    smallNamespaceGen.generatePseudonym(`W-${i}`, 0, 104729 + i);
  }

  const metrics = smallNamespaceGen.getCollisionMetrics();
  assert(
    metrics.totalGenerated === 50 && metrics.namespaceBits === 8,
    'Collision Metrics: Accurately records generated count and namespace bits'
  );
  assert(
    metrics.theoreticalBirthdayBound > 0.90,
    'Birthday Bound: Theoretical collision probability correctly calculated (>90% for 50 items in 256 space)'
  );
  assert(
    metrics.collisionCount > 0 && smallNamespaceGen.getCollisionLedger().length > 0,
    'Collision Ledger: Collisions are explicitly captured in collision ledger rather than silently overwritten'
  );
}

// -------------------------------------------------------------
// Test 4: Rotation Scheduling, Jitter, and Active Lookup
// -------------------------------------------------------------
{
  const config: PseudonymConfig = {
    mode: 'simulation-grade-prng',
    rotationIntervalSeconds: 60,
    rotationJitterSeconds: 5,
  };

  const model = new RotationScheduleModel(config);
  const schedules = model.generateSchedules(['W-0001'], 300, 104729);
  const epochs = schedules.get('W-0001')!;

  assert(
    epochs.length >= 4 && epochs.length <= 6,
    'Rotation Schedule: Generates expected epoch count for 300s duration with 60s interval'
  );
  assert(
    epochs[0].validFromMs === 0,
    'Rotation Schedule: First epoch starts precisely at t = 0'
  );

  // Active pseudonym lookup at t = 10s and t = 150s
  const pEarly = model.getActivePseudonym('W-0001', 10000);
  const pLate = model.getActivePseudonym('W-0001', 150000);
  assert(
    pEarly === epochs[0].pseudonym,
    'Active Lookup: Correctly resolves active pseudonym in epoch 0'
  );
  assert(
    pEarly !== pLate,
    'Active Lookup: Pseudonym changes as simulation timestamp advances'
  );
}

// -------------------------------------------------------------
// Test 5: Authorized Identity Resolution vs Unauthorized Access Denial
// -------------------------------------------------------------
{
  const people: Person[] = [
    { personId: 'P-0001', wearableId: 'W-0001', role: 'patient', roomId: 'ward-a', x: 2, y: 3, sourceStatus: 'confirmed', active: true },
  ];

  const config: PseudonymConfig = {
    mode: 'simulation-grade-prng',
    rotationIntervalSeconds: 120,
  };

  const rotation = new RotationScheduleModel(config);
  rotation.generateSchedules(['W-0001'], 3600, 104729);
  const epochs = rotation.getAllEpochs();

  const registry = new IdentityRegistry();
  registry.registerSchedules(epochs, people);

  const testPseudo = epochs[0].pseudonym;
  const testTimeMs = 5000;

  // Case A: Authorized context (admin / investigator)
  const authContext: AuthorizationContext = { role: 'authorized-investigator' };
  const resolved = registry.resolvePseudonym(testPseudo, testTimeMs, authContext);
  assert(
    resolved !== null &&
      resolved.wearableId === 'W-0001' &&
      resolved.personId === 'P-0001' &&
      resolved.sourceStatus === 'confirmed',
    'Authorized Resolution: Investigator credentials successfully resolve pseudonym -> wearable -> person'
  );

  // Case B: Unauthorized / Public context
  const publicContext: AuthorizationContext = { role: 'public' };
  const denied = registry.resolvePseudonym(testPseudo, testTimeMs, publicContext);
  assert(
    denied === null,
    'Unauthorized Resolution: Public role is strictly denied identity resolution (returns null)'
  );
}

// -------------------------------------------------------------
// Test 6: Public Observation Cleanliness
// -------------------------------------------------------------
{
  const rawObservations: BLEObservation[] = [
    {
      wearableId: 'W-0001',
      gatewayId: 'GW-1',
      timestamp: 15000,
      eventIndex: 1,
      rssiDbm: -65,
      advertisementType: 'legacy',
      received: true,
    },
  ];

  const config: PseudonymConfig = {
    mode: 'simulation-grade-prng',
    rotationIntervalSeconds: 60,
  };
  const rotation = new RotationScheduleModel(config);
  rotation.generateSchedules(['W-0001'], 300, 104729);

  const publicObs = applyPseudonymsToObservations(rawObservations, rotation);
  assert(
    publicObs.length === 1 && publicObs[0].wearableId.startsWith('PSEUDO-'),
    'Observation Anonymization: Emitted observation replaces static wearableId with active pseudonym'
  );
  assert(
    (publicObs[0] as any).personId === undefined &&
      (publicObs[0] as any).sourceStatus === undefined &&
      (publicObs[0] as any).x === undefined,
    'Observation Cleanliness: Public observations strictly omit person metadata and true coordinates'
  );
}

// -------------------------------------------------------------
// Test 7: Architecture - Attacker Ground-Truth & Registry Isolation
// -------------------------------------------------------------
{
  const attackerFiles = [
    'src/privacy/linkageAttack.ts',
    'src/privacy/identityInference.ts',
  ];
  const prohibited = ['groundTruth', 'scenarioGenerator', 'movementModel', 'IdentityRegistry'];

  let leakageFound = false;

  for (const relFile of attackerFiles) {
    const fullPath = path.resolve(relFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      for (const p of prohibited) {
        const importRegex = new RegExp(`from\\s+['"][^'"]*${p}[^'"]*['"]`);
        if (importRegex.test(content)) {
          leakageFound = true;
          console.error(`Violation: ${relFile} imports prohibited module '${p}'`);
        }
      }
    }
  }

  assert(
    !leakageFound,
    'Architectural Isolation: Attacker modules (linkage & inference) have zero imports of ground truth or IdentityRegistry'
  );
}

// -------------------------------------------------------------
// Test 8: Linkage Attack Execution & Metrics Evaluation
// -------------------------------------------------------------
{
  const gateways: Gateway[] = [
    { gatewayId: 'GW-1', roomId: 'ward-a', x: 5, y: 5 },
    { gatewayId: 'GW-2', roomId: 'ward-b', x: 6, y: 5 }, // 1 meter away
  ];

  // Synthetic public observations for two pseudonyms belonging to same device
  // Pseudo-A seen at GW-1 from t = 0s to 50s
  // Pseudo-B seen at GW-2 from t = 52s to 100s (immediate transition 1m away -> high linkage score)
  const obs: BLEObservation[] = [
    { wearableId: 'PSEUDO-A', gatewayId: 'GW-1', timestamp: 0, eventIndex: 0, rssiDbm: -55, advertisementType: 'legacy', received: true },
    { wearableId: 'PSEUDO-A', gatewayId: 'GW-1', timestamp: 50000, eventIndex: 1, rssiDbm: -55, advertisementType: 'legacy', received: true },
    { wearableId: 'PSEUDO-B', gatewayId: 'GW-2', timestamp: 52000, eventIndex: 2, rssiDbm: -56, advertisementType: 'legacy', received: true },
    { wearableId: 'PSEUDO-B', gatewayId: 'GW-2', timestamp: 100000, eventIndex: 3, rssiDbm: -56, advertisementType: 'legacy', received: true },
  ];

  const candidates = executeLinkageAttack(obs, gateways, { linkageThreshold: 0.50 });
  assert(
    candidates.length === 1 && candidates[0].predictedSameDevice,
    'Linkage Attack: Correctly predicts linkage across adjacent temporal/spatial pseudonym boundary'
  );

  // Evaluate against ground truth where Pseudo-A and Pseudo-B belong to W-1
  const epochs = [
    { epochIndex: 0, pseudonym: 'PSEUDO-A', wearableId: 'W-1', validFromMs: 0, validToMs: 50000 },
    { epochIndex: 1, pseudonym: 'PSEUDO-B', wearableId: 'W-1', validFromMs: 50001, validToMs: 100000 },
  ];

  const metrics = evaluateLinkagePredictions(candidates, epochs);
  assert(
    metrics.truePositives === 1 && metrics.precision === 1.0 && metrics.recall === 1.0,
    'Linkage Metrics: Accurately evaluates true positives, precision, and recall on known linkage pair'
  );
  assert(
    metrics.unlinkabilityProxy !== undefined && approxEqual(metrics.unlinkabilityProxy, 0.0),
    'Unlinkability Proxy: Successfully linked pair yields empirical unlinkability proxy = 0.0'
  );
}

// -------------------------------------------------------------
// Test 9: Identity Inference Attack (Attacker C Baseline)
// -------------------------------------------------------------
{
  const gateways: Gateway[] = [
    { gatewayId: 'GW-1', roomId: 'reception', x: 5, y: 5 },
  ];
  const people: Person[] = [
    { personId: 'P-0001', wearableId: 'W-0001', role: 'patient', roomId: 'reception', x: 5, y: 5, sourceStatus: 'non-source', active: true },
    { personId: 'P-0002', wearableId: 'W-0002', role: 'patient', roomId: 'reception', x: 5, y: 5, sourceStatus: 'non-source', active: true },
  ];

  const obs: BLEObservation[] = [
    { wearableId: 'PSEUDO-TEST', gatewayId: 'GW-1', timestamp: 1000, eventIndex: 1, rssiDbm: -50, advertisementType: 'legacy', received: true },
  ];

  const predictions = executeIdentityInferenceAttack(obs, gateways, people, { attackerMode: 'baseline' });
  assert(
    predictions.length === 1 && predictions[0].predictedPersonId.startsWith('P-'),
    'Identity Inference: Generates candidate prediction under conservative baseline side-information'
  );

  const epochs = [
    { epochIndex: 0, pseudonym: 'PSEUDO-TEST', wearableId: 'W-0001', validFromMs: 0, validToMs: 10000 },
  ];

  const metrics = evaluateIdentityInference(predictions, epochs, people);
  assert(
    metrics.totalEvaluatedPseudonyms === 1 && metrics.coverage === 1.0,
    'Identity Inference Metrics: Accurately calculates evaluation coverage'
  );
}

// -------------------------------------------------------------
// Test 10: Privacy–Utility Trade-Off (Observation Fragmentation)
// -------------------------------------------------------------
{
  const authorizedSessions = [
    {
      sessionId: 'auth-sess-1',
      wearableA: 'W-1',
      wearableB: 'W-2',
      startTime: 100,
      endTime: 220,
      durationSeconds: 120,
      observationCount: 60,
      supportingGatewayIds: ['GW-1'],
    },
  ];

  // When unprivileged observer sees rotation at t=160, session is fragmented into 2 shorter sessions
  const unprivilegedSessions = [
    {
      sessionId: 'unpriv-sess-1',
      wearableA: 'PSEUDO-A1',
      wearableB: 'PSEUDO-B1',
      startTime: 100,
      endTime: 160,
      durationSeconds: 60,
      observationCount: 30,
      supportingGatewayIds: ['GW-1'],
    },
    {
      sessionId: 'unpriv-sess-2',
      wearableA: 'PSEUDO-A2',
      wearableB: 'PSEUDO-B2',
      startTime: 160,
      endTime: 220,
      durationSeconds: 60,
      observationCount: 30,
      supportingGatewayIds: ['GW-1'],
    },
  ];

  const tradeoff = calculatePrivacyTradeoff(authorizedSessions, unprivilegedSessions, 60);
  assert(
    approxEqual(tradeoff.sessionFragmentationRatio, 2.0),
    'Privacy-Utility Tradeoff: Fragmentation ratio correctly measures session splitting (2.0)'
  );
  assert(
    approxEqual(tradeoff.durationAttenuationRatio, 0.5),
    'Privacy-Utility Tradeoff: Duration attenuation ratio correctly measures mean duration halving (0.5)'
  );
}

// -------------------------------------------------------------
// Test 11: End-to-End Dataset Generation with Privacy Config
// -------------------------------------------------------------
{
  const baseConfig: SimulationConfig = {
    datasetVersion: '2.0',
    scenarioVersion: '1.0',
    seed: 104729,
    durationSeconds: 60,
    populationSize: 5,
    gatewayCount: 3,
    timeStepSeconds: 1,
    rooms: [],
    contactDefinition: {
      distanceThresholdMeters: 2.0,
      minimumDurationSeconds: 10,
      roomConstraint: 'same-room',
    },
    ble: {
      advertising: {
        intervalMs: 500,
        jitterMinMs: 0,
        jitterMaxMs: 5,
        advertisementType: 'legacy',
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
    privacy: {
      mode: 'simulation-grade-prng',
      rotationIntervalSeconds: 30,
    },
  };

  const ds = generateCanonicalDataset(baseConfig, { silent: true });
  assert(
    ds.pseudonymEpochs !== undefined && ds.pseudonymEpochs.length > 0,
    'Dataset Generator: Correctly populates pseudonymEpochs when privacy config is present'
  );
  assert(
    ds.identityRegistry !== undefined,
    'Dataset Generator: Correctly populates identityRegistry when privacy config is present'
  );
  assert(
    ds.bleObservations !== undefined && ds.bleObservations[0].wearableId.startsWith('PSEUDO-'),
    'Dataset Generator: Emitted BLE observations contain pseudonyms'
  );

  // Verify privacy scaffold status
  const scaffold = getPrivacyScaffoldStatus();
  assert(
    scaffold.rotationImplemented && scaffold.phase === 'phase6-production',
    'Evaluation Scaffold: Phase 6 privacy implementation status is active production'
  );
}

// -------------------------------------------------------------
// Test 12: Deterministic Replay Across Runs (Bitwise Identical)
// -------------------------------------------------------------
{
  const baseConfig: SimulationConfig = {
    datasetVersion: '2.0',
    scenarioVersion: '1.0',
    seed: 104729,
    durationSeconds: 60,
    populationSize: 6,
    gatewayCount: 3,
    timeStepSeconds: 1,
    rooms: [],
    contactDefinition: {
      distanceThresholdMeters: 2.0,
      minimumDurationSeconds: 10,
      roomConstraint: 'same-room',
    },
    ble: {
      advertising: {
        intervalMs: 500,
        jitterMinMs: 0,
        jitterMaxMs: 5,
        advertisementType: 'legacy',
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

  const privConfig: PseudonymConfig = {
    mode: 'simulation-grade-prng',
    rotationIntervalSeconds: 30,
  };

  const run1 = evaluateSingleSeedPrivacy(baseConfig, privConfig);
  const run2 = evaluateSingleSeedPrivacy(baseConfig, privConfig);

  assert(
    run1.linkageMetrics.f1Score === run2.linkageMetrics.f1Score &&
      run1.linkageMetrics.linkageSuccessRate === run2.linkageMetrics.linkageSuccessRate &&
      run1.identityInferenceMetrics.top1Accuracy === run2.identityInferenceMetrics.top1Accuracy &&
      run1.tradeoffMetrics.sessionFragmentationRatio === run2.tradeoffMetrics.sessionFragmentationRatio,
    'Deterministic Replay: Identical seed and configuration produce bitwise identical privacy evaluation results'
  );
}

// -------------------------------------------------------------
// Test 14: P1 Zero-Transition Unlinkability Semantics
// -------------------------------------------------------------
{
  const baseConfig: SimulationConfig = {
    datasetVersion: '2.0',
    scenarioVersion: '1.0',
    seed: 104729,
    durationSeconds: 60,
    populationSize: 6,
    gatewayCount: 3,
    timeStepSeconds: 1,
    rooms: [],
    contactDefinition: {
      distanceThresholdMeters: 2.0,
      minimumDurationSeconds: 10,
      roomConstraint: 'same-room',
    },
    ble: {
      advertising: {
        intervalMs: 500,
        jitterMinMs: 0,
        jitterMaxMs: 5,
        advertisementType: 'legacy',
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

  // Static identifiers: rotation interval >= duration (no transitions occur)
  const staticPrivConfig: PseudonymConfig = {
    mode: 'simulation-grade-prng',
    rotationIntervalSeconds: 3600,
  };

  const res = evaluateSingleSeedPrivacy(baseConfig, staticPrivConfig);

  assert(
    res.linkageMetrics.totalTransitions === 0,
    'P1 Semantics: Total pseudonym transitions is strictly 0 when identifiers do not rotate'
  );
  assert(
    res.linkageMetrics.linkageSuccessRate === undefined,
    'P1 Semantics: linkageSuccessRate is strictly undefined (not 0.0) when totalTransitions is 0'
  );
  assert(
    res.linkageMetrics.unlinkabilityProxy === undefined,
    'P1 Semantics: unlinkabilityProxy is strictly undefined (not 1.0) when totalTransitions is 0'
  );
  assert(
    res.linkageMetrics.identifierPersistenceDurationSeconds === 3600,
    'P1 Semantics: Identifier persistence duration is explicitly tracked (3600s)'
  );
}

// -------------------------------------------------------------
// Test 15: RSSI Noise Propagation & Ground-Truth Invariance
// -------------------------------------------------------------
{
  const baseConfig: SimulationConfig = {
    datasetVersion: '2.0',
    scenarioVersion: '1.0',
    seed: 104729,
    durationSeconds: 60,
    populationSize: 6,
    gatewayCount: 3,
    timeStepSeconds: 1,
    rooms: [],
    contactDefinition: {
      distanceThresholdMeters: 2.0,
      minimumDurationSeconds: 10,
      roomConstraint: 'same-room',
    },
    ble: {
      advertising: {
        intervalMs: 500,
        jitterMinMs: 0,
        jitterMaxMs: 5,
        advertisementType: 'legacy',
      },
      rssi: {
        referenceDistanceMeters: 1.0,
        referenceRSSIDbm: -50.0,
        pathLossExponent: 2.5,
        noiseSigmaDb: 0.0,
      },
      reception: {
        packetLossProbability: 0.0,
      },
    },
  };

  const configNoise0 = { ...baseConfig };
  const configNoise10 = {
    ...baseConfig,
    ble: {
      ...baseConfig.ble!,
      rssi: { ...baseConfig.ble!.rssi, noiseSigmaDb: 10.0 },
    },
  };

  const ds0 = generateCanonicalDataset(configNoise0, { silent: true });
  const ds10 = generateCanonicalDataset(configNoise10, { silent: true });

  // 1. Ground truth invariance check
  assert(
    JSON.stringify(ds0.groundTruthContacts) === JSON.stringify(ds10.groundTruthContacts),
    'RSSI Noise Invariance: Phase 1 ground truth contacts are 100% byte-for-byte identical across noise levels'
  );
  assert(
    JSON.stringify(ds0.movementStates) === JSON.stringify(ds10.movementStates),
    'RSSI Noise Invariance: Phase 1 movement states are 100% byte-for-byte identical across noise levels'
  );

  // 2. Observable RSSI difference check
  const obs0Rssi = (ds0.bleObservations ?? []).slice(0, 100).map((o) => o.rssiDbm);
  const obs10Rssi = (ds10.bleObservations ?? []).slice(0, 100).map((o) => o.rssiDbm);

  const rssiDiffers = obs0Rssi.some((v, idx) => Math.abs(v - obs10Rssi[idx]) > 0.01);
  assert(
    rssiDiffers,
    'RSSI Noise Propagation: Changing noiseSigmaDb directly modifies observable BLE RSSI values'
  );
}

// -------------------------------------------------------------
// Test 16: Seed Independence Verification
// -------------------------------------------------------------
{
  const baseConfig: SimulationConfig = {
    datasetVersion: '2.0',
    scenarioVersion: '1.0',
    seed: 104729,
    durationSeconds: 60,
    populationSize: 6,
    gatewayCount: 3,
    timeStepSeconds: 1,
    rooms: [],
    contactDefinition: {
      distanceThresholdMeters: 2.0,
      minimumDurationSeconds: 10,
      roomConstraint: 'same-room',
    },
    ble: {
      advertising: {
        intervalMs: 500,
        jitterMinMs: 0,
        jitterMaxMs: 5,
        advertisementType: 'legacy',
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

  const privConfig: PseudonymConfig = {
    mode: 'simulation-grade-prng',
    rotationIntervalSeconds: 30,
  };

  const resSeedA = evaluateSingleSeedPrivacy({ ...baseConfig, seed: 104729 }, privConfig);
  const resSeedB = evaluateSingleSeedPrivacy({ ...baseConfig, seed: 209759 }, privConfig);

  assert(
    resSeedA.seed !== resSeedB.seed,
    'Seed Independence: Evaluated seeds are distinct'
  );
  assert(
    resSeedA.collisionMetrics.totalGenerated > 0 &&
      resSeedB.collisionMetrics.totalGenerated > 0,
    'Seed Independence: Both seeds generate valid pseudonyms'
  );
  // Underlying scenario outputs differ
  const dsA = generateCanonicalDataset({ ...baseConfig, seed: 104729 }, { silent: true });
  const dsB = generateCanonicalDataset({ ...baseConfig, seed: 209759 }, { silent: true });
  assert(
    JSON.stringify(dsA.movementStates.slice(0, 10)) !== JSON.stringify(dsB.movementStates.slice(0, 10)),
    'Seed Independence: Changing seed produces distinct stochastic movement trajectories'
  );
}

console.log('\n===================================');
console.log(`Phase 6 Tests Passed: ${passedTests}`);
console.log(`Phase 6 Tests Failed: ${totalTests - passedTests}`);
console.log('===================================\n');

if (totalTests !== passedTests) {
  process.exit(1);
}
