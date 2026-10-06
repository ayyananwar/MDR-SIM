import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { SimulationConfig } from '../src/simulation/scenarioTypes.js';
import { SeededRandom } from '../src/simulation/rng.js';
import {
  calculateEuclideanDistance,
  getCanonicalPairKey,
  GroundTruthTracker,
} from '../src/simulation/groundTruth.js';
import { isInsideRoom, clampToRoom, MovementState } from '../src/simulation/movementModel.js';
import { generateCanonicalDataset } from '../src/datasets/generator.js';

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

console.log('=== Phase 1 Research Test Suite ===\n');

// -------------------------------------------------------------
// Test 1: Known Euclidean Distances (Position Truth Test)
// -------------------------------------------------------------
test('Known Euclidean Distance: 1 meter along X axis', () => {
  const dist = calculateEuclideanDistance(0, 0, 1, 0);
  assert.strictEqual(dist, 1.0);
});

test('Known Euclidean Distance: 5 meters (3-4-5 Pythagorean triangle)', () => {
  const dist = calculateEuclideanDistance(0, 0, 3, 4);
  assert.strictEqual(dist, 5.0);
});

test('Known Euclidean Distance: Zero distance for identical points', () => {
  const dist = calculateEuclideanDistance(12.5, -8.2, 12.5, -8.2);
  assert.strictEqual(dist, 0.0);
});

// -------------------------------------------------------------
// Test 2: Pair Symmetry & Key Canonicalization
// -------------------------------------------------------------
test('Pair Symmetry: Order invariance and deduplication', () => {
  const pair1 = getCanonicalPairKey('P-0001', 'P-0002');
  const pair2 = getCanonicalPairKey('P-0002', 'P-0001');

  assert.strictEqual(pair1.personA, 'P-0001');
  assert.strictEqual(pair1.personB, 'P-0002');
  assert.strictEqual(pair1.key, pair2.key);
  assert.strictEqual(pair1.key, 'P-0001::P-0002');
});

// -------------------------------------------------------------
// Test 3: Room Boundary Check & Clamping
// -------------------------------------------------------------
const testRoom = {
  roomId: 'test-room',
  name: 'Test Room',
  xMin: 0,
  xMax: 10,
  yMin: 0,
  yMax: 10,
  environmentClass: 'ward' as const,
};

test('Room Boundary: Correctly identifies internal and external coordinates', () => {
  assert.strictEqual(isInsideRoom(5, 5, testRoom), true);
  assert.strictEqual(isInsideRoom(0, 0, testRoom), true);
  assert.strictEqual(isInsideRoom(10, 10, testRoom), true);
  assert.strictEqual(isInsideRoom(-0.1, 5, testRoom), false);
  assert.strictEqual(isInsideRoom(10.1, 5, testRoom), false);
  assert.strictEqual(isInsideRoom(5, 10.5, testRoom), false);
});

test('Room Boundary: Clamps out-of-bounds coordinates to valid boundary', () => {
  const clamped = clampToRoom(-5, 15, testRoom, 0.2);
  assert.strictEqual(clamped.x, 0.2);
  assert.strictEqual(clamped.y, 9.8);
  assert.strictEqual(isInsideRoom(clamped.x, clamped.y, testRoom), true);
});

// -------------------------------------------------------------
// Test 4: Contact Threshold & Duration Tests
// -------------------------------------------------------------
test('Ground Truth Contact: Qualifies when distance <= threshold and duration >= minimum', () => {
  const tracker = new GroundTruthTracker(
    {
      distanceThresholdMeters: 2.0,
      minimumDurationSeconds: 30,
      roomConstraint: 'same-room',
    },
    { 'P-0001': 'confirmed', 'P-0002': 'non-source' }
  );

  // 40 seconds of proximity at 1.5m (threshold 2.0m, min duration 30s)
  for (let t = 0; t <= 40; t++) {
    const states: MovementState[] = [
      { personId: 'P-0001', timestamp: t, roomId: 'ward-a', x: 2.0, y: 2.0 },
      { personId: 'P-0002', timestamp: t, roomId: 'ward-a', x: 3.5, y: 2.0 }, // dx = 1.5m
    ];
    tracker.processStep(t, states);
  }

  const contacts = tracker.finalize();
  assert.strictEqual(contacts.length, 1);
  assert.strictEqual(contacts[0].personA, 'P-0001');
  assert.strictEqual(contacts[0].personB, 'P-0002');
  assert.strictEqual(contacts[0].startTime, 0);
  assert.strictEqual(contacts[0].endTime, 40);
  assert.strictEqual(contacts[0].durationSeconds, 40);
  assert.strictEqual(contacts[0].sourceStatusA, 'confirmed');
  assert.strictEqual(contacts[0].sourceStatusB, 'non-source');
  assert.strictEqual(contacts[0].trueDistanceSamples.length, 41);
  assert.strictEqual(contacts[0].trueDistanceSamples[0], 1.5);
});

test('Ground Truth Contact: Rejected when distance > threshold', () => {
  const tracker = new GroundTruthTracker(
    {
      distanceThresholdMeters: 2.0,
      minimumDurationSeconds: 30,
      roomConstraint: 'same-room',
    },
    { 'P-0001': 'confirmed', 'P-0002': 'non-source' }
  );

  // 40 seconds of proximity at 3.0m (threshold 2.0m)
  for (let t = 0; t <= 40; t++) {
    const states: MovementState[] = [
      { personId: 'P-0001', timestamp: t, roomId: 'ward-a', x: 2.0, y: 2.0 },
      { personId: 'P-0002', timestamp: t, roomId: 'ward-a', x: 5.0, y: 2.0 }, // dx = 3.0m
    ];
    tracker.processStep(t, states);
  }

  const contacts = tracker.finalize();
  assert.strictEqual(contacts.length, 0);
});

test('Ground Truth Contact: Rejected when duration < minimumDurationSeconds', () => {
  const tracker = new GroundTruthTracker(
    {
      distanceThresholdMeters: 2.0,
      minimumDurationSeconds: 30,
      roomConstraint: 'same-room',
    },
    { 'P-0001': 'confirmed', 'P-0002': 'non-source' }
  );

  // Proximity only lasts 15 seconds (min duration 30s)
  for (let t = 0; t <= 15; t++) {
    const states: MovementState[] = [
      { personId: 'P-0001', timestamp: t, roomId: 'ward-a', x: 2.0, y: 2.0 },
      { personId: 'P-0002', timestamp: t, roomId: 'ward-a', x: 3.0, y: 2.0 }, // dx = 1.0m
    ];
    tracker.processStep(t, states);
  }
  // Moves away
  for (let t = 16; t <= 40; t++) {
    const states: MovementState[] = [
      { personId: 'P-0001', timestamp: t, roomId: 'ward-a', x: 2.0, y: 2.0 },
      { personId: 'P-0002', timestamp: t, roomId: 'ward-a', x: 10.0, y: 2.0 },
    ];
    tracker.processStep(t, states);
  }

  const contacts = tracker.finalize();
  assert.strictEqual(contacts.length, 0);
});

// -------------------------------------------------------------
// Test 5: Room Constraint Enforcement
// -------------------------------------------------------------
test('Room Constraint: Proximity in different rooms ignored when roomConstraint="same-room"', () => {
  const tracker = new GroundTruthTracker(
    {
      distanceThresholdMeters: 2.0,
      minimumDurationSeconds: 30,
      roomConstraint: 'same-room',
    },
    { 'P-0001': 'non-source', 'P-0002': 'non-source' }
  );

  // Entities are 0.5m apart across a thin wall (different rooms) for 60s
  for (let t = 0; t <= 60; t++) {
    const states: MovementState[] = [
      { personId: 'P-0001', timestamp: t, roomId: 'ward-a', x: 14.8, y: 20.0 },
      { personId: 'P-0002', timestamp: t, roomId: 'ward-b', x: 15.3, y: 20.0 }, // dx = 0.5m
    ];
    tracker.processStep(t, states);
  }

  const contacts = tracker.finalize();
  assert.strictEqual(contacts.length, 0);
});

test('Room Constraint: Proximity recorded when roomConstraint="none"', () => {
  const tracker = new GroundTruthTracker(
    {
      distanceThresholdMeters: 2.0,
      minimumDurationSeconds: 30,
      roomConstraint: 'none',
    },
    { 'P-0001': 'non-source', 'P-0002': 'non-source' }
  );

  for (let t = 0; t <= 60; t++) {
    const states: MovementState[] = [
      { personId: 'P-0001', timestamp: t, roomId: 'ward-a', x: 14.8, y: 20.0 },
      { personId: 'P-0002', timestamp: t, roomId: 'ward-b', x: 15.3, y: 20.0 }, // dx = 0.5m
    ];
    tracker.processStep(t, states);
  }

  const contacts = tracker.finalize();
  assert.strictEqual(contacts.length, 1);
  assert.strictEqual(contacts[0].durationSeconds, 60);
});

// -------------------------------------------------------------
// Test 6: Ground Truth Architectural Independence
// -------------------------------------------------------------
test('Architectural Independence: groundTruth.ts has zero BLE/risk imports', () => {
  const groundTruthFilePath = path.join(__dirname, '../src/simulation/groundTruth.ts');
  const fileContent = fs.readFileSync(groundTruthFilePath, 'utf-8');

  const forbiddenTerms = [
    'ble',
    'rssi',
    'packet',
    'bayesian',
    'risk',
    'pseudonym',
    'observation',
    'detector',
  ];

  // Inspect import lines only
  const importLines = fileContent
    .split('\n')
    .filter((line) => line.trim().startsWith('import '));

  for (const line of importLines) {
    for (const term of forbiddenTerms) {
      assert.strictEqual(
        line.toLowerCase().includes(term),
        false,
        `Forbidden dependency detected in groundTruth.ts import: "${line}" contains "${term}"`
      );
    }
  }
});

// -------------------------------------------------------------
// Test 7: Seed Reproducibility & Variance
// -------------------------------------------------------------
const testConfig: SimulationConfig = {
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

test('Reproducibility: Identical seed produces identical dataset and ground truth', () => {
  const run1 = generateCanonicalDataset({ ...testConfig, seed: 104729 });
  const run2 = generateCanonicalDataset({ ...testConfig, seed: 104729 });

  assert.strictEqual(run1.people.length, run2.people.length);
  assert.strictEqual(run1.movementStates.length, run2.movementStates.length);
  assert.strictEqual(run1.groundTruthContacts.length, run2.groundTruthContacts.length);

  // Compare every movement state
  for (let i = 0; i < run1.movementStates.length; i++) {
    const s1 = run1.movementStates[i];
    const s2 = run2.movementStates[i];
    assert.strictEqual(s1.personId, s2.personId);
    assert.strictEqual(s1.timestamp, s2.timestamp);
    assert.strictEqual(s1.x, s2.x);
    assert.strictEqual(s1.y, s2.y);
    assert.strictEqual(s1.roomId, s2.roomId);
  }

  // Compare ground truth contacts
  for (let i = 0; i < run1.groundTruthContacts.length; i++) {
    const c1 = run1.groundTruthContacts[i];
    const c2 = run2.groundTruthContacts[i];
    assert.strictEqual(c1.personA, c2.personA);
    assert.strictEqual(c1.personB, c2.personB);
    assert.strictEqual(c1.startTime, c2.startTime);
    assert.strictEqual(c1.endTime, c2.endTime);
    assert.strictEqual(c1.durationSeconds, c2.durationSeconds);
  }
});

test('Stochastic Variance: Different seeds produce distinct trajectories', () => {
  const runA = generateCanonicalDataset({ ...testConfig, seed: 104729 });
  const runB = generateCanonicalDataset({ ...testConfig, seed: 54321 });

  assert.strictEqual(runA.people.length, runB.people.length);

  // Check that positions differ
  let differences = 0;
  for (let i = 0; i < runA.movementStates.length; i++) {
    if (
      runA.movementStates[i].x !== runB.movementStates[i].x ||
      runA.movementStates[i].y !== runB.movementStates[i].y
    ) {
      differences++;
    }
  }

  assert.ok(
    differences > runA.movementStates.length * 0.9,
    `Expected >90% position differences between different seeds, got ${differences}/${runA.movementStates.length}`
  );
});

// -------------------------------------------------------------
// Test 8: All Movements Remain Strictly Within Room Bounds
// -------------------------------------------------------------
test('Room Invariance: All movement coordinates remain strictly inside room bounds', () => {
  const dataset = generateCanonicalDataset({ ...testConfig, seed: 104729, durationSeconds: 60 });
  const roomMap = new Map(dataset.rooms.map((r) => [r.roomId, r]));

  for (const move of dataset.movementStates) {
    const room = roomMap.get(move.roomId);
    assert.ok(room, `Movement referenced unknown room ${move.roomId}`);
    assert.ok(
      move.x >= room.xMin && move.x <= room.xMax,
      `X coordinate ${move.x} outside room ${room.roomId} [${room.xMin}, ${room.xMax}]`
    );
    assert.ok(
      move.y >= room.yMin && move.y <= room.yMax,
      `Y coordinate ${move.y} outside room ${room.roomId} [${room.yMin}, ${room.yMax}]`
    );
  }
});

console.log(`\n===================================`);
console.log(`Tests Passed: ${testsPassed}`);
console.log(`Tests Failed: ${testsFailed}`);
console.log(`===================================\n`);

if (testsFailed > 0) {
  process.exit(1);
}
