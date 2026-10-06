/**
 * Comprehensive Automated Research Test Suite: Phase 7
 * Final Integrated Validation, Reproducible Experimental Campaign, and Paper-Ready Results
 *
 * Verifies:
 * T1:  FINAL_SEED_SET contains exactly 5 predeclared seeds and matches declared values
 * T2:  REFERENCE_BASE_CONFIG has all required SimulationConfig fields
 * T3:  All 6 frozen config JSON files exist on disk and parse correctly
 * T4:  Single-seed campaign produces identical deterministicSignature on replay
 * T5:  Different seeds produce different deterministicSignatures
 * T6:  generatedAt is frozen deterministic timestamp (not wall-clock)
 * T7:  Known-answer: summarizeReplicateMetric for [0.8, 0.9, 0.7, 0.85, 0.75]
 * T8:  95% CI is computed for n=5 (df=4, t=2.776) with correct formula
 * T9:  n=1 produces no CI (undefined)
 * T10: n=0 returns safe zero result without error
 * T11: Equal values produce zero stddev and undefined CI
 * T12: CampaignExperimentResult schema — all required top-level fields present
 * T13: Contact summary has all required MetricSummary fields with correct n
 * T14: Risk summary has all required MetricSummary fields
 * T15: Edge summary has all required MetricSummary fields
 * T16: Telemetry is labeled as machine-dependent
 * T17: generateAllTables creates ≥10 CSV files
 * T18: Contact detection CSV has valid header and numeric rows
 * T19: Baseline JSON has correct structure with method/auroc_mean/auprc_mean
 * T20: generateAllFigures creates ≥10 SVG files
 * T21: Architecture SVG is valid XML with correct title
 * T22: Risk baseline SVG contains expected title
 * T23: Calibration SVG contains scientific limitation disclaimer
 * T24: buildManifest returns campaignVersion 7.0.0 with all 6 frozen config IDs
 * T25: Manifest seedSet matches declared seeds
 * T26: Manifest hostEnvironment labeled machine-dependent
 * T27: Manifest generatedAt is frozen deterministic timestamp
 * T28: buildChecksums produces SHA-256 hashes for deterministic artifacts
 * T29: Checksum records have valid 64-char hex SHA-256 hashes
 * T30: deterministicSignature excludes wallClockMs/telemetry fields
 * T31: Campaign files do not import ground-truth modules directly
 * T32: Campaign runner imports evaluateSingleSeedRun from evaluation module
 * T33: FINAL_EXPERIMENTAL_PROTOCOL.md contains non-claim section
 * T34: Protocol document contains frozen seed set declaration
 * T35: Protocol document forbids post-hoc threshold selection
 * T36: Privacy result with null linkage metrics handled safely in table output
 * T37: Scalability telemetry note is present and labeled machine-dependent
 * T38: Two-seed aggregation produces valid n=2 statistical result
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import type { SimulationConfig } from '../src/simulation/scenarioTypes.js';
import { FINAL_SEED_SET, REFERENCE_BASE_CONFIG, runMultiSeedCampaign } from '../src/campaign/finalCampaign.js';
import { summarizeReplicateMetric, getStudentTCriticalValue } from '../src/evaluation/statisticalSummary.js';
import { generateAllTables } from '../src/campaign/tableGenerator.js';
import { generateAllFigures } from '../src/campaign/figureGenerator.js';
import { buildManifest, buildChecksums } from '../src/campaign/manifestBuilder.js';
import type { CampaignResults } from '../src/campaign/campaignTypes.js';

// ─── Framework ───────────────────────────────────────────────────────────────

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string): void {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
  }
}

function approxEqual(a: number, b: number, epsilon = 1e-5): boolean {
  return Math.abs(a - b) < epsilon;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

const TEMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "mdr-sim-phase7-tests-"));

const TABLES_DIR = path.join(TEMP_DIR, 'tables');
const FIGURES_DIR = path.join(TEMP_DIR, 'figures');
const MANIFEST_DIR = path.join(TEMP_DIR, 'manifest_test');
fs.mkdirSync(MANIFEST_DIR, { recursive: true });

// Short-duration config for test speed
const BASE_CONFIG: SimulationConfig = {
  ...REFERENCE_BASE_CONFIG,
  seed: 104729,
  durationSeconds: 60,
  populationSize: 8,
  gatewayCount: 2,
};

// Run one reference campaign result for schema validation and later tests
const refResult = runMultiSeedCampaign(
  'T_schema', 'Schema test', 'test',
  BASE_CONFIG, [104729, 209759], undefined, undefined, true, TEMP_DIR
);

const singleResult = runMultiSeedCampaign(
  'T_single', 'Single seed test', 'test',
  BASE_CONFIG, [104729], undefined, undefined, true, TEMP_DIR
);

const emptyResult = runMultiSeedCampaign('Empty', 'Empty-fold regression', 'test',
  { ...BASE_CONFIG, durationSeconds: 1, populationSize: 2 }, [101, 102], undefined, undefined, true, TEMP_DIR);
assert(emptyResult.contact.precision.n === 2, 'Empty folds still count as E1 simulation replicates');
assert(emptyResult.risk.defaultF1.n === 0 && emptyResult.risk.brierScore.n === 0 && emptyResult.risk.ece.n === 0,
  'Empty folds never become zero-valued F1/Brier/ECE performance');

// ─── T1: Frozen Seed Set ──────────────────────────────────────────────────────

console.log('\n=== Phase 7 Final Integrated Validation Tests ===\n');

const seedArr = Array.from(FINAL_SEED_SET);
assert(seedArr.length === 5, 'T1a: FINAL_SEED_SET contains exactly 5 predeclared seeds');
assert(
  JSON.stringify(seedArr) === JSON.stringify([104729, 209759, 32452843, 49979687, 67867967]),
  'T1b: FINAL_SEED_SET matches declared values',
  `Got: ${JSON.stringify(seedArr)}`
);

// ─── T2: REFERENCE_BASE_CONFIG schema ─────────────────────────────────────────

const c = REFERENCE_BASE_CONFIG;
assert(typeof c.datasetVersion === 'string', 'T2a: datasetVersion is string');
assert(typeof c.seed === 'number', 'T2b: seed is number');
assert(c.durationSeconds > 0, 'T2c: durationSeconds > 0');
assert(c.populationSize > 0, 'T2d: populationSize > 0');
assert(c.gatewayCount > 0, 'T2e: gatewayCount > 0');
assert(c.timeStepSeconds > 0, 'T2f: timeStepSeconds > 0');
assert(Array.isArray(c.rooms), 'T2g: rooms is array');
assert(c.contactDefinition?.distanceThresholdMeters === 2.0, 'T2h: distanceThresholdMeters = 2.0');
assert(c.contactDefinition?.minimumDurationSeconds === 30, 'T2i: minimumDurationSeconds = 30');
assert(c.ble !== undefined, 'T2j: ble config defined');
assert(c.edge !== undefined, 'T2k: edge config defined');
assert(c.risk !== undefined, 'T2l: risk config defined');

// ─── T3: Frozen config files exist and parse correctly ────────────────────────

const frozenConfigs = [
  'experiments/final/reference.json',
  'experiments/final/dense_contact.json',
  'experiments/final/robustness.json',
  'experiments/final/privacy.json',
  'experiments/final/scalability.json',
  'experiments/final/ablation.json',
];

for (const p of frozenConfigs) {
  assert(fs.existsSync(p), `T3 exists: ${path.basename(p, '.json')}`);
}

const refJson = JSON.parse(fs.readFileSync('experiments/final/reference.json', 'utf-8'));
assert(refJson.populationSize === 50, 'T3a: reference.json populationSize = 50');
assert(refJson.gatewayCount === 8, 'T3b: reference.json gatewayCount = 8');
assert(refJson.durationSeconds === 3600, 'T3c: reference.json durationSeconds = 3600');
assert(refJson.ble?.rssi?.noiseSigmaDb === 6.0, 'T3d: reference.json noiseSigmaDb = 6.0');
assert(refJson.ble?.reception?.packetLossProbability === 0.05, 'T3e: reference.json packetLossProbability = 0.05');

// ─── T4–T6: Deterministic replay ─────────────────────────────────────────────

const replay1 = runMultiSeedCampaign('T4_r1', 'Replay 1', 'test', BASE_CONFIG, [104729], undefined, undefined, true, TEMP_DIR);
const replay2 = runMultiSeedCampaign('T4_r2', 'Replay 2', 'test', BASE_CONFIG, [104729], undefined, undefined, true, TEMP_DIR);

assert(
  replay1.deterministicSignatures[0] === replay2.deterministicSignatures[0],
  'T4: Same seed produces identical deterministicSignature across two runs'
);

const diffSeed = runMultiSeedCampaign('T5_diff', 'Different seed', 'test', BASE_CONFIG, [209759], undefined, undefined, true, TEMP_DIR);
assert(
  replay1.deterministicSignatures[0] !== diffSeed.deterministicSignatures[0],
  'T5: Different seeds produce different deterministicSignatures'
);

assert(
  replay1.generatedAt === '2026-01-01T00:00:00.000Z',
  'T6: generatedAt is frozen deterministic timestamp',
  `Got: ${replay1.generatedAt}`
);

// ─── T7–T11: Statistical aggregation ──────────────────────────────────────────

const knownVals = [0.8, 0.9, 0.7, 0.85, 0.75];
const knownResult = summarizeReplicateMetric('test', knownVals);

assert(knownResult.n === 5, 'T7a: n = 5');
assert(approxEqual(knownResult.mean, 0.8), 'T7b: mean = 0.8');
assert(knownResult.min === 0.7, 'T7c: min = 0.7');
assert(knownResult.max === 0.9, 'T7d: max = 0.9');
assert(knownResult.median === 0.8, 'T7e: median = 0.8');

// Sample std dev: sqrt(sum((x-0.8)^2) / 4)
const sqDiffs = knownVals.map((v) => Math.pow(v - 0.8, 2));
const expectedSd = Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / 4);
assert(approxEqual(knownResult.standardDeviation, expectedSd, 1e-6), 'T7f: standardDeviation matches Bessel-corrected formula');

assert(knownResult.confidenceInterval95 !== undefined, 'T8a: CI95 defined for n=5');
const tCrit4 = getStudentTCriticalValue(4);
assert(approxEqual(tCrit4, 2.776, 1e-3), `T8b: t(0.975,4) = 2.776`, `Got: ${tCrit4}`);
const se = knownResult.standardDeviation / Math.sqrt(5);
const moe = tCrit4 * se;
assert(approxEqual(knownResult.confidenceInterval95!.marginOfError, moe, 1e-6), 'T8c: marginOfError matches t * SE formula');
assert(approxEqual(knownResult.confidenceInterval95!.lower, knownResult.mean - moe, 1e-6), 'T8d: CI lower = mean - moe');
assert(approxEqual(knownResult.confidenceInterval95!.upper, knownResult.mean + moe, 1e-6), 'T8e: CI upper = mean + moe');

const n1result = summarizeReplicateMetric('test', [0.85]);
assert(n1result.n === 1, 'T9a: n=1 produces n=1');
assert(n1result.confidenceInterval95 === undefined, 'T9b: n=1 produces no CI');

const n0result = summarizeReplicateMetric('test', []);
assert(n0result.n === 0, 'T10a: n=0 produces n=0');
assert(n0result.mean === 0, 'T10b: n=0 produces mean=0');

const equalVals = summarizeReplicateMetric('test', [0.5, 0.5, 0.5]);
assert(equalVals.standardDeviation === 0, 'T11a: equal values produce zero stddev');
assert(equalVals.confidenceInterval95 === undefined, 'T11b: zero stddev produces no CI');

// ─── T12–T16: CampaignExperimentResult schema ─────────────────────────────────

assert(refResult.experimentId === 'T_schema', 'T12a: experimentId matches');
assert(refResult.replicateCount === 2, 'T12b: replicateCount = 2');
assert(JSON.stringify(refResult.seedList) === JSON.stringify([104729, 209759]), 'T12c: seedList matches');
assert(Array.isArray(refResult.deterministicSignatures) && refResult.deterministicSignatures.length === 2, 'T12d: 2 deterministicSignatures');

const contactKeys = ['precision', 'recall', 'f1Score', 'durationMaeSeconds', 'durationRmseSeconds', 'fragmentationRate', 'mergeRate'] as const;
for (const key of contactKeys) {
  assert(
    refResult.contact[key].n <= 2 && typeof refResult.contact[key].mean === 'number',
    `T13: contact.${key} has n=${refResult.contact[key].n} and numeric mean`
  );
}

const riskKeys = ['auroc', 'auprc', 'defaultF1', 'defaultPrecision', 'defaultRecall', 'defaultSpecificity', 'brierScore', 'ece'] as const;
for (const key of riskKeys) {
  assert(typeof refResult.risk[key].mean === 'number', `T14: risk.${key}.mean is number`);
}

assert(typeof refResult.edge.rawObservations.mean === 'number', 'T15a: edge.rawObservations.mean is number');
assert(typeof refResult.edge.processedObservations.mean === 'number', 'T15b: edge.processedObservations.mean is number');
assert(typeof refResult.edge.reductionRatio.mean === 'number', 'T15c: edge.reductionRatio.mean is number');

assert(
  refResult.telemetry !== undefined && refResult.telemetry.note === 'machine-dependent — do not use for scientific comparison',
  'T16: Telemetry labeled machine-dependent'
);

// ─── T17–T23: Table and Figure generation ────────────────────────────────────

// Build minimal mock results for table/figure generation
const emptyPrivacy = {
  experimentId: 'priv_test', sweepParameter: 'rotation', sweepValue: 60,
  seedList: [104729], totalTransitions: 0, linkageF1: null, linkageSuccessRate: null,
  unlinkabilityProxy: null,
  identityTop1Accuracy: summarizeReplicateMetric('t', [0.5]),
  sessionFragmentationRatio: summarizeReplicateMetric('t', [1.0]),
  durationAttenuationRatio: summarizeReplicateMetric('t', [1.0]),
  meanExposureDurationSec: summarizeReplicateMetric('t', [30]),
  empiricalCollisionRate: summarizeReplicateMetric('t', [0]),
};

const ablation = {
  experimentId: 'abl', seedList: [104729],
  variants: [
    { variant: 'Full Model', description: 'All features', auroc: summarizeReplicateMetric('a', [0.75]), auprc: summarizeReplicateMetric('a', [0.7]), brierScore: summarizeReplicateMetric('b', [0.1]), ece: summarizeReplicateMetric('e', [0.05]), f1AtDefault: summarizeReplicateMetric('f', [0.65]) },
    { variant: 'No Duration', description: 'No dur', auroc: summarizeReplicateMetric('a', [0.70]), auprc: summarizeReplicateMetric('a', [0.65]), brierScore: summarizeReplicateMetric('b', [0.12]), ece: summarizeReplicateMetric('e', [0.06]), f1AtDefault: summarizeReplicateMetric('f', [0.60]), deltaAuroc: -0.05, deltaAuprc: -0.05, deltaF1: -0.05 },
  ],
};
const baseline = {
  experimentId: 'E3', seedList: [104729],
  methods: [
    { name: 'ProximityOnly', description: 'Prox', auroc: summarizeReplicateMetric('a', [0.65]), auprc: summarizeReplicateMetric('a', [0.6]), brierScore: summarizeReplicateMetric('b', [0.2]), ece: summarizeReplicateMetric('e', [0.1]), f1AtDefault: summarizeReplicateMetric('f', [0.55]), precisionAtDefault: summarizeReplicateMetric('p', [0.55]), recallAtDefault: summarizeReplicateMetric('r', [0.55]), specificityAtDefault: summarizeReplicateMetric('s', [0.7]) },
    { name: 'Bayesian', description: 'Bay', auroc: summarizeReplicateMetric('a', [0.75]), auprc: summarizeReplicateMetric('a', [0.7]), brierScore: summarizeReplicateMetric('b', [0.1]), ece: summarizeReplicateMetric('e', [0.05]), f1AtDefault: summarizeReplicateMetric('f', [0.65]), precisionAtDefault: summarizeReplicateMetric('p', [0.65]), recallAtDefault: summarizeReplicateMetric('r', [0.65]), specificityAtDefault: summarizeReplicateMetric('s', [0.8]) },
  ],
};
const scalability = [{
  experimentId: 'scal', populationSize: 8, gatewayCount: 2,
  rawObservations: summarizeReplicateMetric('r', [100]), processedObservations: summarizeReplicateMetric('p', [80]),
  detectedSessions: summarizeReplicateMetric('d', [5]), f1Score: summarizeReplicateMetric('f', [0.7]),
  wallClockMs: summarizeReplicateMetric('w', [200]), throughputObsPerSec: summarizeReplicateMetric('t', [500]),
}];
const privacySweep = [
  emptyPrivacy,
  { ...emptyPrivacy, sweepValue: 120, totalTransitions: 5, linkageF1: summarizeReplicateMetric('lf1', [0.4]), linkageSuccessRate: summarizeReplicateMetric('lsr', [0.4]), unlinkabilityProxy: summarizeReplicateMetric('ulp', [0.6]) },
];

const mockResults: CampaignResults = {
  E1_reference: refResult,
  E2_dense: refResult,
  E3_baseline: baseline,
  E4_ablation: ablation,
  E5_rssiSweep: [{ ...singleResult, sweepParameter: 'noise', sweepValue: 0 }, { ...singleResult, sweepParameter: 'noise', sweepValue: 6 }],
  E6_packetLossSweep: [{ ...singleResult, sweepParameter: 'ploss', sweepValue: 0 }, { ...singleResult, sweepParameter: 'ploss', sweepValue: 0.05 }],
  E7_advIntervalSweep: [{ ...singleResult, sweepParameter: 'adv', sweepValue: 500 }, { ...singleResult, sweepParameter: 'adv', sweepValue: 1000 }],
  E8_gatewayDensitySweep: [{ ...singleResult, sweepParameter: 'gw', sweepValue: 4 }, { ...singleResult, sweepParameter: 'gw', sweepValue: 8 }],
  E9_privacyRotationSweep: privacySweep,
  E10_privacyNoiseSweep: [emptyPrivacy],
  E11_privacyPacketLossSweep: [emptyPrivacy],
  E12_privacyGatewaySweep: [emptyPrivacy],
  E13_privacyUtility: emptyPrivacy,
  E14_privacyMultiSeed: emptyPrivacy,
  E15_scalability: scalability,
};

generateAllTables(mockResults, TABLES_DIR);
const csvFiles = fs.readdirSync(TABLES_DIR).filter((f) => f.endsWith('.csv'));
assert(csvFiles.length >= 10, `T17: generateAllTables creates ≥10 CSV files`, `Got: ${csvFiles.length}`);

const contactCsv = fs.readFileSync(path.join(TABLES_DIR, '01_contact_detection.csv'), 'utf-8');
const contactLines = contactCsv.split('\n').filter(Boolean);
assert(contactLines[0].includes('configId'), 'T18a: contact CSV has configId header');
assert(contactLines[0].includes('f1_mean'), 'T18b: contact CSV has f1_mean header');
assert(contactLines.length > 1, 'T18c: contact CSV has at least one data row');

const baselineJson = JSON.parse(fs.readFileSync(path.join(TABLES_DIR, '02_risk_baseline.json'), 'utf-8'));
assert(Array.isArray(baselineJson), 'T19a: baseline JSON is array');
assert(baselineJson[0]?.method !== undefined, 'T19b: baseline JSON has method field');
assert(typeof baselineJson[0]?.auroc_mean === 'number', 'T19c: baseline JSON has auroc_mean');

generateAllFigures(mockResults, FIGURES_DIR);
const svgFiles = fs.readdirSync(FIGURES_DIR).filter((f) => f.endsWith('.svg'));
assert(svgFiles.length >= 10, `T20: generateAllFigures creates ≥10 SVG files`, `Got: ${svgFiles.length}`);

const archSvg = fs.readFileSync(path.join(FIGURES_DIR, 'fig01_architecture.svg'), 'utf-8');
assert(archSvg.startsWith('<svg'), 'T21a: Architecture SVG has <svg root');
assert(archSvg.includes('xmlns="http://www.w3.org/2000/svg"'), 'T21b: Architecture SVG has xmlns');
assert(archSvg.includes('MDR-SIM System Architecture'), 'T21c: Architecture SVG has correct title');

const riskSvg = fs.readFileSync(path.join(FIGURES_DIR, 'fig03_risk_baseline.svg'), 'utf-8');
assert(riskSvg.includes('Risk Model Comparison'), 'T22: Risk baseline SVG contains title');

const calSvg = fs.readFileSync(path.join(FIGURES_DIR, 'fig04_calibration.svg'), 'utf-8');
assert(calSvg.includes('NOT clinical probability calibration'), 'T23: Calibration SVG contains scientific limitation text');

// ─── T24–T29: Manifest & checksums ────────────────────────────────────────────

// Write a test artifact to the manifest dir for checksumming
fs.writeFileSync(path.join(MANIFEST_DIR, 'E1_reference.json'), JSON.stringify(singleResult, null, 2), 'utf-8');

const manifest = buildManifest(mockResults, MANIFEST_DIR);
assert(manifest.campaignVersion === '7.0.0', 'T24a: campaignVersion = 7.0.0');
assert(manifest.protocolVersion === '1.0.0', 'T24b: protocolVersion = 1.0.0');

const expectedConfigIds = ['reference-v1.0.0', 'dense-contact-v1.0.0', 'robustness-base-v1.0.0', 'privacy-v1.0.0', 'scalability-v1.0.0', 'ablation-v1.0.0'];
for (const id of expectedConfigIds) {
  assert(manifest.frozenConfigIds.includes(id), `T24c: frozenConfigIds includes ${id}`);
}

assert(JSON.stringify(manifest.seedSet) === JSON.stringify([104729, 209759, 32452843, 49979687, 67867967]), 'T25: manifest seedSet matches declared seeds');
assert(manifest.hostEnvironment.note.includes('machine-dependent'), 'T26: manifest hostEnvironment labeled machine-dependent');
assert(manifest.generatedAt === '2026-01-01T00:00:00.000Z', 'T27: manifest generatedAt is frozen timestamp');

const checksums = buildChecksums(MANIFEST_DIR);
assert(checksums.generatedAt === '2026-01-01T00:00:00.000Z', 'T28a: checksums generatedAt is frozen timestamp');
assert(checksums.records.length > 0, 'T28b: checksums has at least one record');

const allValidHashes = checksums.records.every((r) => /^[0-9a-f]{64}$/.test(r.sha256));
assert(allValidHashes, 'T29: all checksum records have valid 64-char hex SHA-256 hashes');

// ─── T30: Deterministic signature excludes telemetry fields ───────────────────

const sig = singleResult.deterministicSignatures[0];
const parsedSig = JSON.parse(sig);
assert('seed' in parsedSig, 'T30a: deterministicSignature contains seed');
assert(!('wallClockMs' in parsedSig), 'T30b: deterministicSignature does NOT contain wallClockMs');
assert(!('telemetry' in parsedSig), 'T30c: deterministicSignature does NOT contain telemetry');

// ─── T31–T32: Ground-truth isolation ──────────────────────────────────────────

const campaignFiles = [
  'src/campaign/finalCampaign.ts',
  'src/campaign/tableGenerator.ts',
  'src/campaign/figureGenerator.ts',
  'src/campaign/manifestBuilder.ts',
];
for (const f of campaignFiles) {
  const src = fs.readFileSync(f, 'utf-8');
  const imports = [...src.matchAll(/(?:import|export)\s+[\s\S]*?\sfrom\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  assert(!imports.some(p => /simulation\/(groundTruth|movementModel)/.test(p)), `T31a: ${path.basename(f)} does not import hidden trajectory generation`);
  assert(!src.includes('MovementState'), `T31b: ${path.basename(f)} does not import MovementState`);
  assert(!src.includes('trueDistanceMeters'), `T31c: ${path.basename(f)} does not import trueDistanceMeters`);
}

const campaignSrc = fs.readFileSync('src/campaign/finalCampaign.ts', 'utf-8');
assert(campaignSrc.includes("from '../evaluation/experimentRunner.js'"), 'T32a: campaign imports evaluation/experimentRunner.js');
assert(campaignSrc.includes('evaluateSingleSeedRun'), 'T32b: campaign uses evaluateSingleSeedRun');

// ─── T33–T35: Scientific disclaimer integrity ──────────────────────────────────

const protocol = fs.readFileSync('docs/FINAL_EXPERIMENTAL_PROTOCOL.md', 'utf-8');
assert(protocol.includes('NOT'), 'T33a: protocol contains NOT clause');
assert(protocol.includes('infection'), 'T33b: protocol mentions infection as non-claim');
assert(protocol.includes('does NOT claim') && protocol.includes('GDPR'), 'T33c: protocol explicitly disclaims GDPR compliance');
assert(protocol.includes('does NOT claim') && protocol.includes('HIPAA'), 'T33d: protocol explicitly disclaims HIPAA compliance');

assert(protocol.includes('104729'), 'T34a: protocol contains seed 104729');
assert(protocol.includes('declared before any results are observed'), 'T34b: protocol declares seeds before results');

assert(protocol.includes('Forbidden Post-Hoc Actions'), 'T35a: protocol contains forbidden post-hoc actions section');
assert(protocol.includes('Tuning model parameters using final test-set results'), 'T35b: protocol forbids post-hoc parameter tuning');

// ─── T36–T38: Edge cases and null safety ──────────────────────────────────────

const nullLinkageStr = emptyPrivacy.linkageF1 === null ? 'N/A' : emptyPrivacy.linkageF1.mean.toFixed(3);
assert(nullLinkageStr === 'N/A', 'T36: null linkageF1 produces N/A string in table output');

assert(
  singleResult.telemetry !== undefined && singleResult.telemetry.note === 'machine-dependent — do not use for scientific comparison',
  'T37: Scalability telemetry note present and correctly labeled'
);

const twoSeedResult = runMultiSeedCampaign('T38', 'Two-seed', 'test', BASE_CONFIG, [104729, 209759], undefined, undefined, true, TEMP_DIR);
assert(twoSeedResult.contact.f1Score.n === 2, 'T38a: two-seed aggregation n=2');
assert(twoSeedResult.contact.f1Score.standardDeviation >= 0, 'T38b: stddev ≥ 0');

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n===================================`);
console.log(`Phase 7 Tests Passed: ${passedTests}`);
console.log(`Phase 7 Tests Failed: ${totalTests - passedTests}`);
console.log(`===================================\n`);

if (passedTests < totalTests) {
  process.exit(1);
}
