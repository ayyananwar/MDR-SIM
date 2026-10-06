import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { BLEObservation } from '../src/ble/bleTypes.js';
import { EdgeProcessingConfig } from '../src/edge/edgeTypes.js';
import { validateObservation } from '../src/edge/validation.js';
import { normalizeObservations } from '../src/edge/normalization.js';
import { deduplicateObservations } from '../src/edge/deduplication.js';
import { CausalRSSIFilter } from '../src/edge/rssiFilter.js';
import { estimateWearableToGatewayDistance } from '../src/edge/proximityEstimator.js';
import { generateCandidatePairs } from '../src/edge/candidatePairs.js';
import { reconstructContactSessions } from '../src/edge/sessionizer.js';
import { processBLEObservations } from '../src/edge/edgePipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let testsPassed = 0;
let testsFailed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    testsPassed++;
  } catch (err: any) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err?.message || err}`);
    testsFailed++;
  }
}

console.log('=== Phase 3 Edge Processing & Contact Detection Test Suite ===\n');

const defaultConfig: EdgeProcessingConfig = {
  validation: {
    minRssiDbm: -110,
    maxRssiDbm: 0,
    maxTimestampSkewMs: 5000,
  },
  deduplication: {
    enabled: true,
    timeWindowMs: 20,
  },
  rssiFilter: {
    method: 'median',
    windowSize: 5,
  },
  proximity: {
    model: 'log-distance',
    thresholdDistanceMeters: 2.0,
    referenceRSSIDbm: -50.0,
    pathLossExponent: 2.5,
    referenceDistanceMeters: 1.0,
  },
  candidateGeneration: {
    temporalWindowMs: 1000,
  },
  sessionization: {
    minimumObservationCount: 3,
    minimumDurationSeconds: 30,
    maxGapSeconds: 5,
  },
};

// -------------------------------------------------------------
// Test 1: Observation Validation
// -------------------------------------------------------------
test('Validation: Valid observations accepted; corrupt/out-of-bound rejected', () => {
  const validObs: BLEObservation = {
    wearableId: 'W-0001',
    gatewayId: 'GW-01',
    timestamp: 1000,
    eventIndex: 0,
    rssiDbm: -65.0,
    advertisementType: 'legacy',
    received: true,
  };

  assert.strictEqual(validateObservation(validObs, defaultConfig.validation).valid, true);

  // Invalid RSSI
  assert.strictEqual(
    validateObservation({ ...validObs, rssiDbm: -125.0 }, defaultConfig.validation).valid,
    false
  );
  assert.strictEqual(
    validateObservation({ ...validObs, rssiDbm: 10.0 }, defaultConfig.validation).valid,
    false
  );

  // Missing IDs
  assert.strictEqual(
    validateObservation({ ...validObs, wearableId: '' }, defaultConfig.validation).valid,
    false
  );
  assert.strictEqual(
    validateObservation({ ...validObs, gatewayId: '' }, defaultConfig.validation).valid,
    false
  );

  // Invalid timestamp or eventIndex
  assert.strictEqual(
    validateObservation({ ...validObs, timestamp: -5 }, defaultConfig.validation).valid,
    false
  );
  assert.strictEqual(
    validateObservation({ ...validObs, eventIndex: -1 }, defaultConfig.validation).valid,
    false
  );
});

// -------------------------------------------------------------
// Test 2: Deterministic Normalization
// -------------------------------------------------------------
test('Normalization: Stable chronological sorting', () => {
  const raw: BLEObservation[] = [
    { wearableId: 'W-0002', gatewayId: 'GW-01', timestamp: 2000, eventIndex: 1, rssiDbm: -60, advertisementType: 'legacy', received: true },
    { wearableId: 'W-0001', gatewayId: 'GW-01', timestamp: 1000, eventIndex: 0, rssiDbm: -55, advertisementType: 'legacy', received: true },
    { wearableId: 'W-0001', gatewayId: 'GW-02', timestamp: 1000, eventIndex: 0, rssiDbm: -58, advertisementType: 'legacy', received: true },
  ];

  const sorted = normalizeObservations(raw);
  assert.strictEqual(sorted[0].wearableId, 'W-0001');
  assert.strictEqual(sorted[0].gatewayId, 'GW-01');
  assert.strictEqual(sorted[1].wearableId, 'W-0001');
  assert.strictEqual(sorted[1].gatewayId, 'GW-02');
  assert.strictEqual(sorted[2].wearableId, 'W-0002');
  assert.strictEqual(sorted[2].timestamp, 2000);
});

// -------------------------------------------------------------
// Test 3: Deduplication
// -------------------------------------------------------------
test('Deduplication: Filters duplicate frames while preserving legitimate periodic events', () => {
  const obsList: BLEObservation[] = [
    // Event 0 arriving at t=1000
    { wearableId: 'W-0001', gatewayId: 'GW-01', timestamp: 1000, eventIndex: 0, rssiDbm: -50, advertisementType: 'legacy', received: true },
    // Duplicate reflection of event 0 arriving at t=1005 (within 20ms window)
    { wearableId: 'W-0001', gatewayId: 'GW-01', timestamp: 1005, eventIndex: 0, rssiDbm: -51, advertisementType: 'legacy', received: true },
    // Legitimate next advertising event (eventIndex 1) arriving at t=1500
    { wearableId: 'W-0001', gatewayId: 'GW-01', timestamp: 1500, eventIndex: 1, rssiDbm: -50, advertisementType: 'legacy', received: true },
  ];

  const result = deduplicateObservations(obsList, defaultConfig.deduplication);
  assert.strictEqual(result.duplicatesRemoved, 1);
  assert.strictEqual(result.deduplicated.length, 2);
  assert.strictEqual(result.deduplicated[0].eventIndex, 0);
  assert.strictEqual(result.deduplicated[1].eventIndex, 1);
});

// -------------------------------------------------------------
// Test 4: Causal RSSI Filtering (Moving Average, Median, EMA)
// -------------------------------------------------------------
test('RSSI Filter: Moving average, Median, and EMA match exact mathematical formulas', () => {
  // Moving Average: window = 3
  const maFilter = new CausalRSSIFilter({ method: 'moving-average', windowSize: 3 });
  assert.strictEqual(maFilter.filter('W1', 'GW1', -60), -60);
  assert.strictEqual(maFilter.filter('W1', 'GW1', -70), -65); // (-60 + -70)/2 = -65
  assert.strictEqual(maFilter.filter('W1', 'GW1', -80), -70); // (-60 + -70 + -80)/3 = -70
  assert.strictEqual(maFilter.filter('W1', 'GW1', -90), -80); // (-70 + -80 + -90)/3 = -80

  // Median: window = 5
  // Inputs: -60, -80, -61, -79, -60 -> sorted: [-80, -79, -61, -60, -60] -> median: -61
  const medFilter = new CausalRSSIFilter({ method: 'median', windowSize: 5 });
  medFilter.filter('W1', 'GW1', -60);
  medFilter.filter('W1', 'GW1', -80);
  medFilter.filter('W1', 'GW1', -61);
  medFilter.filter('W1', 'GW1', -79);
  const med5 = medFilter.filter('W1', 'GW1', -60);
  assert.strictEqual(med5, -61);

  // EMA: alpha = 0.5
  const emaFilter = new CausalRSSIFilter({ method: 'ema', windowSize: 5, alpha: 0.5 });
  assert.strictEqual(emaFilter.filter('W1', 'GW1', -60), -60);
  assert.strictEqual(emaFilter.filter('W1', 'GW1', -80), -70); // 0.5 * -80 + 0.5 * -60 = -70
});

// -------------------------------------------------------------
// Test 5: Causality (Zero Look-Ahead)
// -------------------------------------------------------------
test('Causality: Filtering at time t does not depend on future observations', () => {
  const filter1 = new CausalRSSIFilter({ method: 'median', windowSize: 3 });
  const filter2 = new CausalRSSIFilter({ method: 'median', windowSize: 3 });

  // Stream 1 evaluates up to sample 2
  filter1.filter('W1', 'GW1', -50);
  const valAtT = filter1.filter('W1', 'GW1', -70);

  // Stream 2 evaluates up to sample 2, and then sample 3
  filter2.filter('W1', 'GW1', -50);
  const valAtT2 = filter2.filter('W1', 'GW1', -70);
  filter2.filter('W1', 'GW1', -40); // Future sample

  assert.strictEqual(valAtT, valAtT2);
});

// -------------------------------------------------------------
// Test 6: Inverting Path Loss for Distance Estimation
// -------------------------------------------------------------
test('Proximity Estimation: Inverts log-distance path loss correctly', () => {
  const config = defaultConfig.proximity;
  // At -50 dBm, distance should be exactly 1.0m (d0)
  const d1 = estimateWearableToGatewayDistance(-50.0, config);
  assert.strictEqual(d1, 1.0);

  // At -75 dBm: exponent = (-50 - (-75)) / 25 = 25/25 = 1 -> 1.0 * 10^1 = 10.0m
  const d10 = estimateWearableToGatewayDistance(-75.0, config);
  assert.strictEqual(d10, 10.0);
});

// -------------------------------------------------------------
// Test 7: Candidate Pair Generation
// -------------------------------------------------------------
test('Candidate Pairs: Coincident observations generate candidate pair; temporally distant do not', () => {
  const edgeObsCoincident = [
    { wearableId: 'W-0001', gatewayId: 'GW-01', timestamp: 1000, eventIndex: 0, rawRssiDbm: -52, filteredRssiDbm: -52, estimatedDistanceMeters: 1.2, sourceObservationId: '1' },
    { wearableId: 'W-0002', gatewayId: 'GW-01', timestamp: 1200, eventIndex: 0, rawRssiDbm: -53, filteredRssiDbm: -53, estimatedDistanceMeters: 1.3, sourceObservationId: '2' },
  ];

  const res1 = generateCandidatePairs(
    edgeObsCoincident,
    defaultConfig.candidateGeneration,
    defaultConfig.proximity
  );
  assert.strictEqual(res1.evidenceList.length, 1);
  assert.strictEqual(res1.candidatePairs.length, 1);
  assert.strictEqual(res1.candidatePairs[0].wearableA, 'W-0001');
  assert.strictEqual(res1.candidatePairs[0].wearableB, 'W-0002');

  // Distant in time (> temporalWindowMs = 1000ms)
  const edgeObsDistant = [
    { wearableId: 'W-0001', gatewayId: 'GW-01', timestamp: 1000, eventIndex: 0, rawRssiDbm: -52, filteredRssiDbm: -52, estimatedDistanceMeters: 1.2, sourceObservationId: '1' },
    { wearableId: 'W-0002', gatewayId: 'GW-01', timestamp: 5000, eventIndex: 0, rawRssiDbm: -53, filteredRssiDbm: -53, estimatedDistanceMeters: 1.3, sourceObservationId: '2' },
  ];

  const res2 = generateCandidatePairs(
    edgeObsDistant,
    defaultConfig.candidateGeneration,
    defaultConfig.proximity
  );
  assert.strictEqual(res2.evidenceList.length, 0);
  assert.strictEqual(res2.candidatePairs.length, 0);
});

// -------------------------------------------------------------
// Test 8: Pair Canonicalization
// -------------------------------------------------------------
test('Pair Canonicalization: A/B and B/A map to identical canonical record (A < B)', () => {
  const edgeObsReversed = [
    { wearableId: 'W-0002', gatewayId: 'GW-01', timestamp: 1000, eventIndex: 0, rawRssiDbm: -52, filteredRssiDbm: -52, estimatedDistanceMeters: 1.2, sourceObservationId: '1' },
    { wearableId: 'W-0001', gatewayId: 'GW-01', timestamp: 1050, eventIndex: 0, rawRssiDbm: -53, filteredRssiDbm: -53, estimatedDistanceMeters: 1.3, sourceObservationId: '2' },
  ];

  const res = generateCandidatePairs(
    edgeObsReversed,
    defaultConfig.candidateGeneration,
    defaultConfig.proximity
  );
  assert.strictEqual(res.evidenceList[0].wearableA, 'W-0001');
  assert.strictEqual(res.evidenceList[0].wearableB, 'W-0002');
});

// -------------------------------------------------------------
// Test 9: Temporal Accumulation & Qualifying Session
// -------------------------------------------------------------
test('Sessionizer: Persistent evidence produces qualifying contact session', () => {
  const evidenceList = [];
  // 35 seconds of persistent evidence (min duration = 30s, min count = 3)
  for (let s = 0; s <= 35; s++) {
    evidenceList.push({
      wearableA: 'W-0001',
      wearableB: 'W-0002',
      timestamp: s * 1000,
      gatewayId: 'GW-01',
      evidenceStrength: 1.0,
      rssiA: -52.0,
      rssiB: -53.0,
    });
  }

  const sessions = reconstructContactSessions(evidenceList, defaultConfig.sessionization);
  assert.strictEqual(sessions.length, 1);
  assert.strictEqual(sessions[0].wearableA, 'W-0001');
  assert.strictEqual(sessions[0].wearableB, 'W-0002');
  assert.strictEqual(sessions[0].startTime, 0);
  assert.strictEqual(sessions[0].endTime, 35);
  assert.strictEqual(sessions[0].durationSeconds, 35);
  assert.strictEqual(sessions[0].observationCount, 36);
  assert.deepStrictEqual(sessions[0].supportingGatewayIds, ['GW-01']);
});

// -------------------------------------------------------------
// Test 10: Packet Loss Gap Tolerance
// -------------------------------------------------------------
test('Gap Tolerance: A small missing interval (below maxGapSeconds) does not split session', () => {
  const evidenceList = [];
  // 0s to 15s
  for (let s = 0; s <= 15; s++) {
    evidenceList.push({
      wearableA: 'W-0001',
      wearableB: 'W-0002',
      timestamp: s * 1000,
      gatewayId: 'GW-01',
      evidenceStrength: 1.0,
      rssiA: -52.0,
      rssiB: -53.0,
    });
  }
  // Missing 3 seconds (t=16, 17, 18) - gap = 4s <= maxGapSeconds (5s)
  // Resumes at t=19s to 35s
  for (let s = 19; s <= 35; s++) {
    evidenceList.push({
      wearableA: 'W-0001',
      wearableB: 'W-0002',
      timestamp: s * 1000,
      gatewayId: 'GW-01',
      evidenceStrength: 1.0,
      rssiA: -52.0,
      rssiB: -53.0,
    });
  }

  const sessions = reconstructContactSessions(evidenceList, defaultConfig.sessionization);
  assert.strictEqual(sessions.length, 1, 'Small gap below maxGapSeconds should not split session');
  assert.strictEqual(sessions[0].durationSeconds, 35);
});

// -------------------------------------------------------------
// Test 11: Large Gap Splitting
// -------------------------------------------------------------
test('Gap Splitting: Gap exceeding maxGapSeconds splits into separate candidate sessions', () => {
  const evidenceList = [];
  // Session 1: 0s to 35s (qualifies)
  for (let s = 0; s <= 35; s++) {
    evidenceList.push({
      wearableA: 'W-0001',
      wearableB: 'W-0002',
      timestamp: s * 1000,
      gatewayId: 'GW-01',
      evidenceStrength: 1.0,
      rssiA: -52.0,
      rssiB: -53.0,
    });
  }
  // Large gap: 20 seconds (gap > 5s)
  // Session 2: 55s to 90s (35s duration, qualifies)
  for (let s = 55; s <= 90; s++) {
    evidenceList.push({
      wearableA: 'W-0001',
      wearableB: 'W-0002',
      timestamp: s * 1000,
      gatewayId: 'GW-01',
      evidenceStrength: 1.0,
      rssiA: -52.0,
      rssiB: -53.0,
    });
  }

  const sessions = reconstructContactSessions(evidenceList, defaultConfig.sessionization);
  assert.strictEqual(sessions.length, 2, 'Large gap should split into two distinct sessions');
  assert.strictEqual(sessions[0].startTime, 0);
  assert.strictEqual(sessions[0].endTime, 35);
  assert.strictEqual(sessions[1].startTime, 55);
  assert.strictEqual(sessions[1].endTime, 90);
});

// -------------------------------------------------------------
// Test 12: Minimum Observation Count Qualification
// -------------------------------------------------------------
test('Session Qualification: Insufficient observation count discarded', () => {
  const evidenceList = [
    { wearableA: 'W-0001', wearableB: 'W-0002', timestamp: 0, gatewayId: 'GW-01', evidenceStrength: 1.0, rssiA: -50, rssiB: -50 },
    { wearableA: 'W-0001', wearableB: 'W-0002', timestamp: 35000, gatewayId: 'GW-01', evidenceStrength: 1.0, rssiA: -50, rssiB: -50 },
  ]; // Only 2 observations across 35s (min count = 3)

  const sessions = reconstructContactSessions(evidenceList, defaultConfig.sessionization);
  assert.strictEqual(sessions.length, 0);
});

// -------------------------------------------------------------
// Test 13: Minimum Duration Qualification
// -------------------------------------------------------------
test('Session Qualification: Insufficient duration discarded', () => {
  const evidenceList = [];
  // 10 observations over only 15 seconds (min duration = 30s)
  for (let s = 0; s <= 15; s++) {
    evidenceList.push({
      wearableA: 'W-0001',
      wearableB: 'W-0002',
      timestamp: s * 1000,
      gatewayId: 'GW-01',
      evidenceStrength: 1.0,
      rssiA: -50,
      rssiB: -50,
    });
  }

  const sessions = reconstructContactSessions(evidenceList, defaultConfig.sessionization);
  assert.strictEqual(sessions.length, 0);
});

// -------------------------------------------------------------
// Test 14: Multi-Gateway Corroboration
// -------------------------------------------------------------
test('Multi-Gateway: Multiple gateways observing same pair corroborate one session', () => {
  const evidenceList = [];
  // Both GW-01 and GW-02 observe W1 and W2 over 35 seconds
  for (let s = 0; s <= 35; s++) {
    evidenceList.push({
      wearableA: 'W-0001',
      wearableB: 'W-0002',
      timestamp: s * 1000,
      gatewayId: 'GW-01',
      evidenceStrength: 1.0,
      rssiA: -52.0,
      rssiB: -53.0,
    });
    evidenceList.push({
      wearableA: 'W-0001',
      wearableB: 'W-0002',
      timestamp: s * 1000,
      gatewayId: 'GW-02',
      evidenceStrength: 1.0,
      rssiA: -58.0,
      rssiB: -59.0,
    });
  }

  const sessions = reconstructContactSessions(evidenceList, defaultConfig.sessionization);
  assert.strictEqual(sessions.length, 1, 'Multiple gateways should merge into single session');
  assert.deepStrictEqual(sessions[0].supportingGatewayIds, ['GW-01', 'GW-02']);
});

// -------------------------------------------------------------
// Test 15: Static Ground-Truth Dependency Isolation Check
// -------------------------------------------------------------
test('Architecture: src/edge/ has zero imports from groundTruth, scenarioGenerator, or movementModel', () => {
  const edgeDir = path.join(__dirname, '../src/edge');
  const files = fs.readdirSync(edgeDir).filter((f) => f.endsWith('.ts'));

  const forbiddenFiles = ['groundTruth', 'scenarioGenerator', 'movementModel'];

  for (const file of files) {
    const fullPath = path.join(edgeDir, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const importLines = content
      .split('\n')
      .filter((l) => l.trim().startsWith('import '));

    for (const line of importLines) {
      for (const forbidden of forbiddenFiles) {
        assert.strictEqual(
          line.includes(forbidden),
          false,
          `Forbidden ground-truth import in ${file}: "${line}"`
        );
      }
    }
  }
});

// -------------------------------------------------------------
// Test 16: Output Cleanliness (No Hidden Truth in Edge Output)
// -------------------------------------------------------------
test('Output Cleanliness: Edge observations and contact sessions strictly omit hidden truth', () => {
  const rawObs: BLEObservation[] = [];
  for (let s = 0; s <= 35; s++) {
    rawObs.push({ wearableId: 'W-0001', gatewayId: 'GW-01', timestamp: s * 1000, eventIndex: s, rssiDbm: -52, advertisementType: 'legacy', received: true });
    rawObs.push({ wearableId: 'W-0002', gatewayId: 'GW-01', timestamp: s * 1000 + 50, eventIndex: s, rssiDbm: -53, advertisementType: 'legacy', received: true });
  }

  const result = processBLEObservations(rawObs, defaultConfig);
  assert.strictEqual(result.sessions.length, 1);

  // Check edge observations
  for (const obs of result.observations) {
    const anyObs = obs as any;
    assert.strictEqual(anyObs.trueDistanceMeters, undefined);
    assert.strictEqual(anyObs.personId, undefined);
    assert.strictEqual(anyObs.personName, undefined);
    assert.strictEqual(anyObs.role, undefined);
    assert.strictEqual(anyObs.sourceStatus, undefined);
    assert.strictEqual(anyObs.x, undefined);
    assert.strictEqual(anyObs.y, undefined);
  }

  // Check contact sessions
  for (const sess of result.sessions) {
    const anySess = sess as any;
    assert.strictEqual(anySess.isTruePositive, undefined);
    assert.strictEqual(anySess.isFalsePositive, undefined);
    assert.strictEqual(anySess.trueDistance, undefined);
    assert.strictEqual(anySess.groundTruthSessionId, undefined);
  }
});

// -------------------------------------------------------------
// Test 17: Deterministic Session IDs
// -------------------------------------------------------------
test('Session IDs: Deterministically generated from wearables and startTime', () => {
  const rawObs: BLEObservation[] = [];
  for (let s = 0; s <= 35; s++) {
    rawObs.push({ wearableId: 'W-0001', gatewayId: 'GW-01', timestamp: s * 1000, eventIndex: s, rssiDbm: -52, advertisementType: 'legacy', received: true });
    rawObs.push({ wearableId: 'W-0002', gatewayId: 'GW-01', timestamp: s * 1000 + 50, eventIndex: s, rssiDbm: -53, advertisementType: 'legacy', received: true });
  }

  const result1 = processBLEObservations(rawObs, defaultConfig);
  const result2 = processBLEObservations(rawObs, defaultConfig);

  assert.strictEqual(result1.sessions[0].sessionId, 'SESS-W-0001-W-0002-0');
  assert.strictEqual(result1.sessions[0].sessionId, result2.sessions[0].sessionId);
});

// -------------------------------------------------------------
// Test 18: Full Pipeline Determinism
// -------------------------------------------------------------
test('Pipeline Determinism: Same input produces byte-for-byte identical results', () => {
  const rawObs: BLEObservation[] = [];
  for (let s = 0; s <= 40; s++) {
    rawObs.push({ wearableId: 'W-0001', gatewayId: 'GW-01', timestamp: s * 1000, eventIndex: s, rssiDbm: -50 - (s % 5), advertisementType: 'legacy', received: true });
    rawObs.push({ wearableId: 'W-0002', gatewayId: 'GW-01', timestamp: s * 1000 + 20, eventIndex: s, rssiDbm: -51 - (s % 3), advertisementType: 'legacy', received: true });
  }

  const res1 = processBLEObservations(rawObs, defaultConfig);
  const res2 = processBLEObservations(rawObs, defaultConfig);

  assert.strictEqual(JSON.stringify(res1.observations), JSON.stringify(res2.observations));
  assert.strictEqual(JSON.stringify(res1.sessions), JSON.stringify(res2.sessions));
});

console.log(`\n===================================`);
console.log(`Phase 3 Tests Passed: ${testsPassed}`);
console.log(`Phase 3 Tests Failed: ${testsFailed}`);
console.log(`===================================\n`);

if (testsFailed > 0) {
  process.exit(1);
}
