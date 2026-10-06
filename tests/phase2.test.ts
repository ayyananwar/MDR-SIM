import assert from 'assert';
import { SeededRandom } from '../src/simulation/rng.js';
import { generateAdvertisingEvents } from '../src/ble/advertisingModel.js';
import {
  calculateIdealRSSI,
  sampleRssi,
  distanceBetweenPoints,
} from '../src/ble/rssiModel.js';
import { isPacketReceived } from '../src/ble/receptionModel.js';
import { generateBLEObservations } from '../src/ble/observationModel.js';
import { generateCanonicalDataset } from '../src/datasets/generator.js';
import { SimulationConfig } from '../src/simulation/scenarioTypes.js';
import { BLESimulationConfig } from '../src/ble/bleTypes.js';

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

console.log('=== Phase 2 BLE/RF Observation Test Suite ===\n');

// -------------------------------------------------------------
// Test 1: Advertising Schedule Monotonicity & Reproducibility
// -------------------------------------------------------------
test('Advertising Schedule: Timestamps strictly monotonic and reproducible with same seed', () => {
  const rng1 = new SeededRandom(104729);
  const rng2 = new SeededRandom(104729);

  const device = {
    wearableId: 'W-0001',
    advertisementType: 'legacy' as const,
    advertisingIntervalMs: 500,
    advertisingJitterMs: 10,
    enabled: true,
  };

  const events1 = generateAdvertisingEvents(device, 0, 10000, rng1);
  const events2 = generateAdvertisingEvents(device, 0, 10000, rng2);

  assert.strictEqual(events1.length, events2.length);
  assert.ok(events1.length >= 18 && events1.length <= 22);

  for (let i = 0; i < events1.length; i++) {
    assert.strictEqual(events1[i].timestamp, events2[i].timestamp);
    assert.strictEqual(events1[i].eventIndex, i);
    if (i > 0) {
      assert.ok(
        events1[i].timestamp > events1[i - 1].timestamp,
        `Timestamps not strictly increasing: ${events1[i].timestamp} <= ${events1[i - 1].timestamp}`
      );
    }
  }
});

// -------------------------------------------------------------
// Test 2: RSSI Determinism at Zero Noise
// -------------------------------------------------------------
test('RSSI Model: Exact deterministic values when noiseSigma = 0', () => {
  const config = {
    referenceDistanceMeters: 1.0,
    referenceRSSIDbm: -50.0,
    pathLossExponent: 2.5,
    noiseSigmaDb: 0.0,
  };

  const rng = new SeededRandom(12345);

  // At d = 1.0m, RSSI should be exactly A0 = -50 dBm
  const rssi1m = sampleRssi(1.0, config, rng);
  assert.strictEqual(rssi1m, -50.0);

  // At d = 10.0m, RSSI = -50 - 10 * 2.5 * log10(10) = -50 - 25 = -75 dBm
  const rssi10m = sampleRssi(10.0, config, rng);
  assert.strictEqual(rssi10m, -75.0);
});

// -------------------------------------------------------------
// Test 3: RSSI Decreases Monotonically with Distance (Zero Noise)
// -------------------------------------------------------------
test('RSSI Model: Signal strength decreases strictly with increasing distance', () => {
  const config = {
    referenceDistanceMeters: 1.0,
    referenceRSSIDbm: -50.0,
    pathLossExponent: 2.5,
    noiseSigmaDb: 0.0,
  };

  const distances = [0.5, 1.0, 2.0, 5.0, 10.0, 20.0];
  let previousRssi = Infinity;

  for (const d of distances) {
    const rssi = calculateIdealRSSI(d, config);
    assert.ok(
      rssi < previousRssi,
      `Expected RSSI at ${d}m (${rssi}) to be less than previous (${previousRssi})`
    );
    previousRssi = rssi;
  }
});

// -------------------------------------------------------------
// Test 4: RSSI Stochastic Variance with Noise
// -------------------------------------------------------------
test('RSSI Model: Gaussian noise creates variance while remaining reproducible', () => {
  const config = {
    referenceDistanceMeters: 1.0,
    referenceRSSIDbm: -50.0,
    pathLossExponent: 2.5,
    noiseSigmaDb: 6.0,
  };

  const rngA = new SeededRandom(9876);
  const rngB = new SeededRandom(9876);

  const samplesA: number[] = [];
  const samplesB: number[] = [];

  for (let i = 0; i < 50; i++) {
    samplesA.push(sampleRssi(2.0, config, rngA));
    samplesB.push(sampleRssi(2.0, config, rngB));
  }

  // Reproducibility
  for (let i = 0; i < 50; i++) {
    assert.strictEqual(samplesA[i], samplesB[i]);
  }

  // Variance: not all samples are identical
  const uniqueSamples = new Set(samplesA.map((s) => s.toFixed(3)));
  assert.ok(uniqueSamples.size > 40, 'Gaussian noise did not produce expected variance');
});

// -------------------------------------------------------------
// Test 5: Safe Zero-Distance Clamping
// -------------------------------------------------------------
test('RSSI Model: Zero distance does not produce NaN or -Infinity', () => {
  const config = {
    referenceDistanceMeters: 1.0,
    referenceRSSIDbm: -50.0,
    pathLossExponent: 2.5,
    noiseSigmaDb: 0.0,
    minimumDistanceMeters: 0.1,
  };

  const rng = new SeededRandom(42);
  const rssiZero = sampleRssi(0.0, config, rng);

  assert.ok(Number.isFinite(rssiZero), `Zero distance produced non-finite RSSI: ${rssiZero}`);
  // Clamped to 0.1m: -50 - 25*log10(0.1) = -50 - (-25) = -25 dBm
  assert.strictEqual(rssiZero, -25.0);
});

// -------------------------------------------------------------
// Test 6: Reception Boundaries (0% and 100% Packet Loss)
// -------------------------------------------------------------
test('Reception Model: 0% loss receives all packets, 100% loss drops all packets', () => {
  const rng = new SeededRandom(55555);

  const config0 = { packetLossProbability: 0.0 };
  const config100 = { packetLossProbability: 1.0 };

  for (let i = 0; i < 20; i++) {
    assert.strictEqual(isPacketReceived(-60.0, config0, rng), true);
    assert.strictEqual(isPacketReceived(-60.0, config100, rng), false);
  }
});

// -------------------------------------------------------------
// Test 7: Receiver Sensitivity Floor
// -------------------------------------------------------------
test('Reception Model: Drops packets below receiver sensitivity floor', () => {
  const rng = new SeededRandom(777);
  const config = {
    packetLossProbability: 0.0,
    receiverSensitivityDbm: -95.0,
  };

  assert.strictEqual(isPacketReceived(-90.0, config, rng), true);
  assert.strictEqual(isPacketReceived(-95.1, config, rng), false);
});

// -------------------------------------------------------------
// Test 8: Multi-Gateway Reception
// -------------------------------------------------------------
test('Multi-Gateway: A single advertising event is observed by multiple gateways in range', () => {
  const baseConfig: SimulationConfig = {
    datasetVersion: '2.0',
    scenarioVersion: '1.0',
    seed: 104729,
    durationSeconds: 2,
    populationSize: 1,
    gatewayCount: 4,
    timeStepSeconds: 1,
    rooms: [],
    contactDefinition: {
      distanceThresholdMeters: 2.0,
      minimumDurationSeconds: 1,
      roomConstraint: 'same-room',
    },
    ble: {
      advertising: {
        intervalMs: 500,
        jitterMinMs: 0,
        jitterMaxMs: 0,
        advertisementType: 'legacy',
      },
      rssi: {
        referenceDistanceMeters: 1.0,
        referenceRSSIDbm: -50.0,
        pathLossExponent: 2.0,
        noiseSigmaDb: 0.0,
      },
      reception: {
        packetLossProbability: 0.0,
        receiverSensitivityDbm: -120.0,
      },
    },
  };

  const dataset = generateCanonicalDataset(baseConfig);
  assert.ok(dataset.bleObservations && dataset.bleObservations.length > 0);

  // Group by eventIndex
  const eventsByIndex = new Map<number, typeof dataset.bleObservations>();
  for (const obs of dataset.bleObservations) {
    const list = eventsByIndex.get(obs.eventIndex) || [];
    list.push(obs);
    eventsByIndex.set(obs.eventIndex, list);
  }

  // Each event should be received by all 4 gateways (since loss is 0% and sensitivity is -120 dBm)
  const firstEvent = eventsByIndex.get(0);
  assert.ok(firstEvent, 'First event not found');
  assert.strictEqual(firstEvent.length, 4, 'Single event should be received by all 4 gateways');

  const receivingGateways = new Set(firstEvent.map((o) => o.gatewayId));
  assert.strictEqual(receivingGateways.size, 4);
});

// -------------------------------------------------------------
// Test 9: BLE Observation Schema & Hidden Truth Isolation
// -------------------------------------------------------------
test('Observation Schema: Contains required fields and strictly omits hidden truth', () => {
  const baseConfig: SimulationConfig = {
    datasetVersion: '2.0',
    scenarioVersion: '1.0',
    seed: 104729,
    durationSeconds: 5,
    populationSize: 2,
    gatewayCount: 2,
    timeStepSeconds: 1,
    rooms: [],
    contactDefinition: {
      distanceThresholdMeters: 2.0,
      minimumDurationSeconds: 1,
      roomConstraint: 'same-room',
    },
    ble: {
      advertising: {
        intervalMs: 1000,
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

  const dataset = generateCanonicalDataset(baseConfig);
  assert.ok(dataset.bleObservations && dataset.bleObservations.length > 0);

  for (const obs of dataset.bleObservations) {
    // Required fields present
    assert.ok(typeof obs.wearableId === 'string' && obs.wearableId.startsWith('W-'));
    assert.ok(typeof obs.gatewayId === 'string' && obs.gatewayId.startsWith('GW-'));
    assert.ok(typeof obs.timestamp === 'number' && obs.timestamp >= 0);
    assert.ok(typeof obs.eventIndex === 'number' && obs.eventIndex >= 0);
    assert.ok(typeof obs.rssiDbm === 'number');
    assert.strictEqual(obs.advertisementType, 'legacy');
    assert.strictEqual(obs.received, true);

    // Hidden truth fields strictly absent
    const anyObs = obs as any;
    assert.strictEqual(anyObs.trueDistanceMeters, undefined);
    assert.strictEqual(anyObs.personId, undefined);
    assert.strictEqual(anyObs.personName, undefined);
    assert.strictEqual(anyObs.role, undefined);
    assert.strictEqual(anyObs.sourceStatus, undefined);
    assert.strictEqual(anyObs.x, undefined);
    assert.strictEqual(anyObs.y, undefined);
    assert.strictEqual(anyObs.roomId, undefined);
  }
});

// -------------------------------------------------------------
// Test 10: Full Dataset Observation Reproducibility (Same Seed)
// -------------------------------------------------------------
test('Reproducibility: Identical seed produces identical BLE observations', () => {
  const testConfig: SimulationConfig = {
    datasetVersion: '2.0',
    scenarioVersion: '1.0',
    seed: 104729,
    durationSeconds: 30,
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
        jitterMaxMs: 10,
        advertisementType: 'legacy',
      },
      rssi: {
        referenceDistanceMeters: 1.0,
        referenceRSSIDbm: -50.0,
        pathLossExponent: 2.5,
        noiseSigmaDb: 4.0,
      },
      reception: {
        packetLossProbability: 0.1,
      },
    },
  };

  const run1 = generateCanonicalDataset({ ...testConfig });
  const run2 = generateCanonicalDataset({ ...testConfig });

  assert.ok(run1.bleObservations && run2.bleObservations);
  assert.strictEqual(run1.bleObservations.length, run2.bleObservations.length);

  for (let i = 0; i < run1.bleObservations.length; i++) {
    const o1 = run1.bleObservations[i];
    const o2 = run2.bleObservations[i];
    assert.strictEqual(o1.wearableId, o2.wearableId);
    assert.strictEqual(o1.gatewayId, o2.gatewayId);
    assert.strictEqual(o1.timestamp, o2.timestamp);
    assert.strictEqual(o1.eventIndex, o2.eventIndex);
    assert.strictEqual(o1.rssiDbm, o2.rssiDbm);
  }
});

// -------------------------------------------------------------
// Test 11: Different Seed Produces Stochastic Variation
// -------------------------------------------------------------
test('Stochastic Variation: Different seed alters BLE observation outputs', () => {
  const testConfig: SimulationConfig = {
    datasetVersion: '2.0',
    scenarioVersion: '1.0',
    seed: 104729,
    durationSeconds: 30,
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
        jitterMaxMs: 10,
        advertisementType: 'legacy',
      },
      rssi: {
        referenceDistanceMeters: 1.0,
        referenceRSSIDbm: -50.0,
        pathLossExponent: 2.5,
        noiseSigmaDb: 4.0,
      },
      reception: {
        packetLossProbability: 0.1,
      },
    },
  };

  const runA = generateCanonicalDataset({ ...testConfig, seed: 104729 });
  const runB = generateCanonicalDataset({ ...testConfig, seed: 54321 });

  assert.ok(runA.bleObservations && runB.bleObservations);

  // Compare RSSI values
  let diffCount = 0;
  const minLen = Math.min(runA.bleObservations.length, runB.bleObservations.length);
  for (let i = 0; i < minLen; i++) {
    if (runA.bleObservations[i].rssiDbm !== runB.bleObservations[i].rssiDbm) {
      diffCount++;
    }
  }

  assert.ok(
    diffCount > minLen * 0.8,
    `Expected >80% RSSI differences between seeds, got ${diffCount}/${minLen}`
  );
});

// -------------------------------------------------------------
// Test 12: CRITICAL SCIENTIFIC TEST: Ground Truth Invariance
// -------------------------------------------------------------
test('Ground Truth Invariance: Changing BLE config leaves ground truth 100% identical', () => {
  const baseConfig: SimulationConfig = {
    datasetVersion: '2.0',
    scenarioVersion: '1.0',
    seed: 104729,
    durationSeconds: 120,
    populationSize: 10,
    gatewayCount: 4,
    timeStepSeconds: 1,
    rooms: [],
    contactDefinition: {
      distanceThresholdMeters: 2.0,
      minimumDurationSeconds: 10,
      roomConstraint: 'same-room',
    },
  };

  // Run 0: No BLE at all (Phase 1 pure)
  const runNoBle = generateCanonicalDataset({ ...baseConfig });

  // Run A: High frequency advertising, zero noise, zero loss
  const runBleA = generateCanonicalDataset({
    ...baseConfig,
    ble: {
      advertising: {
        intervalMs: 200,
        jitterMinMs: 0,
        jitterMaxMs: 5,
        advertisementType: 'legacy',
      },
      rssi: {
        referenceDistanceMeters: 1.0,
        referenceRSSIDbm: -45.0,
        pathLossExponent: 3.0,
        noiseSigmaDb: 0.0,
      },
      reception: {
        packetLossProbability: 0.0,
      },
    },
  });

  // Run B: Low frequency advertising, high noise, 50% packet loss, extended advertising
  const runBleB = generateCanonicalDataset({
    ...baseConfig,
    ble: {
      advertising: {
        intervalMs: 1500,
        jitterMinMs: 0,
        jitterMaxMs: 20,
        advertisementType: 'extended',
      },
      rssi: {
        referenceDistanceMeters: 1.0,
        referenceRSSIDbm: -60.0,
        pathLossExponent: 1.8,
        noiseSigmaDb: 10.0,
      },
      reception: {
        packetLossProbability: 0.5,
      },
    },
  });

  // Verify that physical movement states are 100% identical
  assert.strictEqual(runNoBle.movementStates.length, runBleA.movementStates.length);
  assert.strictEqual(runNoBle.movementStates.length, runBleB.movementStates.length);

  for (let i = 0; i < runNoBle.movementStates.length; i++) {
    const m0 = runNoBle.movementStates[i];
    const mA = runBleA.movementStates[i];
    const mB = runBleB.movementStates[i];
    assert.strictEqual(m0.x, mA.x);
    assert.strictEqual(m0.y, mA.y);
    assert.strictEqual(m0.x, mB.x);
    assert.strictEqual(m0.y, mB.y);
  }

  // Verify that ground truth contacts are 100% identical
  assert.strictEqual(runNoBle.groundTruthContacts.length, runBleA.groundTruthContacts.length);
  assert.strictEqual(runNoBle.groundTruthContacts.length, runBleB.groundTruthContacts.length);

  for (let i = 0; i < runNoBle.groundTruthContacts.length; i++) {
    const c0 = runNoBle.groundTruthContacts[i];
    const cA = runBleA.groundTruthContacts[i];
    const cB = runBleB.groundTruthContacts[i];

    assert.strictEqual(c0.personA, cA.personA);
    assert.strictEqual(c0.personB, cA.personB);
    assert.strictEqual(c0.startTime, cA.startTime);
    assert.strictEqual(c0.endTime, cA.endTime);
    assert.strictEqual(c0.durationSeconds, cA.durationSeconds);

    assert.strictEqual(c0.personA, cB.personA);
    assert.strictEqual(c0.personB, cB.personB);
    assert.strictEqual(c0.startTime, cB.startTime);
    assert.strictEqual(c0.endTime, cB.endTime);
    assert.strictEqual(c0.durationSeconds, cB.durationSeconds);
  }

  // Confirm that BLE observations differ drastically between A and B
  assert.ok(runBleA.bleObservations && runBleB.bleObservations);
  assert.notStrictEqual(runBleA.bleObservations.length, runBleB.bleObservations.length);
});

console.log(`\n===================================`);
console.log(`Phase 2 Tests Passed: ${testsPassed}`);
console.log(`Phase 2 Tests Failed: ${testsFailed}`);
console.log(`===================================\n`);

if (testsFailed > 0) {
  process.exit(1);
}
