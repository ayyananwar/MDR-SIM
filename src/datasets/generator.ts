import fs from 'fs';
import path from 'path';
import { SimulationConfig } from '../simulation/scenarioTypes.js';
import { SeededRandom } from '../simulation/rng.js';
import { DiscreteSimulationClock } from '../simulation/clock.js';
import { generateCanonicalScenario } from '../simulation/scenarioGenerator.js';
import { DeterministicMovementModel, MovementState } from '../simulation/movementModel.js';
import { GroundTruthTracker } from '../simulation/groundTruth.js';
import { CanonicalDataset, DatasetMetadata } from './schema.js';
import { ExperimentManifest, createExperimentManifest } from './manifest.js';
import { generateBLEObservations } from '../ble/observationModel.js';
import { BLEObservation } from '../ble/bleTypes.js';
import { processBLEObservations } from '../edge/edgePipeline.js';
import { EdgeObservation, ContactSession } from '../edge/edgeTypes.js';
import {
  extractExposureRecords,
  createDefaultRiskModel,
  assessExposureRecords,
  RiskAssessment,
  FittedRiskModel,
} from '../risk/index.js';
import {
  PseudonymGenerator,
  RotationScheduleModel,
  IdentityRegistry,
  applyPseudonymsToObservations,
  type PseudonymEpoch,
} from '../privacy/index.js';
import type { SourceStatus } from '../simulation/scenarioTypes.js';

export interface DatasetGeneratorOptions {
  outputDir?: string;
  silent?: boolean;
}

/**
 * Generate a complete canonical research dataset in memory.
 * Pure, deterministic, and self-contained.
 *
 * CRITICAL SCIENTIFIC INTEGRITY:
 * Uses a separate isolated RNG stream for BLE observations so that
 * changes to BLE parameters cannot alter physical movement or ground truth.
 */
export function generateCanonicalDataset(
  config: SimulationConfig,
  options?: { silent?: boolean }
): CanonicalDataset {
  // Movement & scenario RNG stream
  const movementRng = new SeededRandom(config.seed);
  const clock = new DiscreteSimulationClock(0);

  // 1. Generate canonical scenario
  const scenario = generateCanonicalScenario(config, movementRng);

  // 2. Initialize movement model
  const movementModel = new DeterministicMovementModel(
    scenario.config.rooms,
    scenario.people,
    movementRng
  );

  // 3. Initialize ground truth tracker
  const sourceStatusMap = new Map<string, typeof scenario.people[0]['sourceStatus']>();
  for (const person of scenario.people) {
    sourceStatusMap.set(person.personId, person.sourceStatus);
  }
  const groundTruthTracker = new GroundTruthTracker(
    config.contactDefinition,
    sourceStatusMap
  );

  // 4. Record initial movement states at t=0
  const allMovementStates: MovementState[] = [];
  const initialStates: MovementState[] = scenario.people.map((p) => ({
    personId: p.personId,
    timestamp: 0,
    roomId: p.roomId,
    x: p.x,
    y: p.y,
  }));
  allMovementStates.push(...initialStates);
  groundTruthTracker.processStep(0, initialStates);

  // 5. Execute physical simulation loop
  const totalSteps = Math.floor(config.durationSeconds / config.timeStepSeconds);
  for (let step = 1; step <= totalSteps; step++) {
    const timestamp = clock.advance(config.timeStepSeconds);
    const stepStates = movementModel.step(timestamp, config.timeStepSeconds, movementRng);
    allMovementStates.push(...stepStates);
    groundTruthTracker.processStep(timestamp, stepStates);
  }

  // 6. Finalize independent ground truth contact sessions
  const groundTruthContacts = groundTruthTracker.finalize();

  // 7. Optional Phase 2: BLE Observation Generation
  let bleObservations: BLEObservation[] | undefined;
  if (config.ble) {
    // Isolated deterministic stream for BLE advertising, path-loss noise, and packet loss
    const bleRng = new SeededRandom((config.seed ^ 0x5a5a5a5a) >>> 0);
    bleObservations = generateBLEObservations(
      scenario,
      allMovementStates,
      config.ble,
      bleRng
    );
  }

  // 7b. Optional Phase 6: Privacy & Pseudonym Rotation
  let pseudonymEpochs: PseudonymEpoch[] | undefined;
  let identityRegistry: IdentityRegistry | undefined;
  if (config.privacy && bleObservations) {
    const generator = new PseudonymGenerator(config.privacy);
    const rotationModel = new RotationScheduleModel(config.privacy, generator);
    const wearableIds = scenario.people.map((p) => p.wearableId);
    rotationModel.generateSchedules(wearableIds, config.durationSeconds, config.seed);
    pseudonymEpochs = rotationModel.getAllEpochs();

    identityRegistry = new IdentityRegistry();
    identityRegistry.registerSchedules(pseudonymEpochs, scenario.people);

    // Public observation view receives rotating pseudonyms
    bleObservations = applyPseudonymsToObservations(bleObservations, rotationModel);
  }

  // 8. Optional Phase 3: Edge Processing & Contact Reconstruction
  let edgeObservations: EdgeObservation[] | undefined;
  let detectedContactSessions: ContactSession[] | undefined;
  if (config.edge && bleObservations) {
    const edgeResult = processBLEObservations(bleObservations, config.edge);
    edgeObservations = edgeResult.observations;
    detectedContactSessions = edgeResult.sessions;
  }

  // 9. Optional Phase 4: Probabilistic Exposure-Risk Modeling
  let riskAssessments: RiskAssessment[] | undefined;
  let fittedRiskModel: FittedRiskModel | undefined;
  if (config.risk && detectedContactSessions) {
    // Construct authorized source status registry from scenario population
    const sourceStatusRegistry: Record<string, SourceStatus> = {};
    for (const person of scenario.people) {
      sourceStatusRegistry[person.wearableId] = person.sourceStatus;
    }

    fittedRiskModel = createDefaultRiskModel(config.risk);
    const exposureRecords = extractExposureRecords(detectedContactSessions, {
      sourceStatusRegistry,
      directed: true,
    });
    riskAssessments = assessExposureRecords(exposureRecords, fittedRiskModel);
  }

  // 10. Assemble metadata & manifest
  const metadata: DatasetMetadata = {
    datasetVersion: config.datasetVersion,
    scenarioVersion: config.scenarioVersion,
    scenarioId: scenario.scenarioId,
    seed: config.seed,
    durationSeconds: config.durationSeconds,
    populationSize: config.populationSize,
    gatewayCount: config.gatewayCount,
    timeStepSeconds: config.timeStepSeconds,
    generatedAt: new Date().toISOString(),
  };

  const manifest: ExperimentManifest = createExperimentManifest(
    `EXP-${config.seed}-${Date.now()}`,
    {
      datasetVersion: config.datasetVersion,
      scenarioVersion: config.scenarioVersion,
      seed: config.seed,
      simulationDurationSeconds: config.durationSeconds,
      populationSize: config.populationSize,
      gatewayCount: config.gatewayCount,
      timeStepSeconds: config.timeStepSeconds,
      contactDefinition: config.contactDefinition,
      ble: config.ble,
      edge: config.edge,
      risk: config.risk,
    }
  );

  return {
    metadata,
    manifest,
    rooms: scenario.config.rooms,
    gateways: scenario.gateways,
    people: scenario.people,
    movementStates: allMovementStates,
    groundTruthContacts,
    bleObservations,
    edgeObservations,
    detectedContactSessions,
    riskAssessments,
    fittedRiskModel,
    pseudonymEpochs,
    identityRegistry,
  };
}

function writeJsonArraySync(filePath: string, items: any[]): void {
  const fd = fs.openSync(filePath, 'w');
  fs.writeSync(fd, '[\n');
  const len = items.length;
  const chunkSize = 5000;
  for (let i = 0; i < len; i += chunkSize) {
    const end = Math.min(i + chunkSize, len);
    let chunkStr = '';
    for (let j = i; j < end; j++) {
      const isLast = j === len - 1;
      chunkStr += '  ' + JSON.stringify(items[j]) + (isLast ? '\n' : ',\n');
    }
    fs.writeSync(fd, chunkStr);
  }
  fs.writeSync(fd, ']\n');
  fs.closeSync(fd);
}

/**
 * Write a canonical dataset to target directory as discrete JSON files.
 */
export function writeDatasetToDisk(
  dataset: CanonicalDataset,
  targetDir: string
): void {
  fs.mkdirSync(targetDir, { recursive: true });

  fs.writeFileSync(
    path.join(targetDir, 'metadata.json'),
    JSON.stringify(dataset.metadata, null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(targetDir, 'rooms.json'),
    JSON.stringify(dataset.rooms, null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(targetDir, 'gateways.json'),
    JSON.stringify(dataset.gateways, null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(targetDir, 'people.json'),
    JSON.stringify(dataset.people, null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(targetDir, 'movement_states.json'),
    JSON.stringify(dataset.movementStates, null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(targetDir, 'ground_truth_contacts.json'),
    JSON.stringify(dataset.groundTruthContacts, null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(targetDir, 'experiment_manifest.json'),
    JSON.stringify(dataset.manifest, null, 2),
    'utf-8'
  );

  if (dataset.bleObservations) {
    writeJsonArraySync(path.join(targetDir, 'ble_observations.json'), dataset.bleObservations);
  }

  if (dataset.edgeObservations) {
    writeJsonArraySync(path.join(targetDir, 'edge_observations.json'), dataset.edgeObservations);
  }

  if (dataset.detectedContactSessions) {
    fs.writeFileSync(
      path.join(targetDir, 'detected_contact_sessions.json'),
      JSON.stringify(dataset.detectedContactSessions, null, 2),
      'utf-8'
    );
  }

  if (dataset.riskAssessments) {
    writeJsonArraySync(path.join(targetDir, 'risk_assessments.json'), dataset.riskAssessments);
  }

  if (dataset.fittedRiskModel) {
    fs.writeFileSync(
      path.join(targetDir, 'risk_model.json'),
      JSON.stringify(dataset.fittedRiskModel, null, 2),
      'utf-8'
    );
  }
}

// CLI entry point
function runCLI() {
  const args = process.argv.slice(2);
  let configPath = fs.existsSync('experiments/phase4.json')
    ? 'experiments/phase4.json'
    : fs.existsSync('experiments/phase3.json')
    ? 'experiments/phase3.json'
    : fs.existsSync('experiments/phase2.json')
    ? 'experiments/phase2.json'
    : 'experiments/phase1.json';
  let overrideSeed: number | undefined;
  let outDir = 'output/dataset';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--config' && args[i + 1]) {
      configPath = args[i + 1];
      i++;
    } else if (arg.startsWith('--config=')) {
      configPath = arg.split('=')[1];
    } else if (arg === '--seed' && args[i + 1]) {
      overrideSeed = parseInt(args[i + 1], 10);
      i++;
    } else if (arg.startsWith('--seed=')) {
      overrideSeed = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--out' && args[i + 1]) {
      outDir = args[i + 1];
      i++;
    } else if (arg.startsWith('--out=')) {
      outDir = arg.split('=')[1];
    } else if (arg.endsWith('.json')) {
      configPath = arg;
    } else if (arg.startsWith('output/') || arg.includes('output\\') || arg.startsWith('out/')) {
      outDir = arg;
    }
  }

  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`);
    process.exit(1);
  }

  const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const config: SimulationConfig = {
    ...rawConfig,
    seed: overrideSeed !== undefined ? overrideSeed : rawConfig.seed,
  };

  console.log(`[Canonical Dataset Generator] Initializing simulation...`);
  console.log(`- Config: ${configPath}`);
  console.log(`- Seed: ${config.seed}`);
  console.log(`- Duration: ${config.durationSeconds}s`);
  console.log(`- Population: ${config.populationSize}`);
  console.log(`- Gateways: ${config.gatewayCount}`);
  console.log(`- BLE Enabled: ${Boolean(config.ble)}`);
  console.log(`- Edge Detection Enabled: ${Boolean(config.edge)}`);
  console.log(`- Output Directory: ${outDir}`);

  const startTime = Date.now();
  const dataset = generateCanonicalDataset(config);
  writeDatasetToDisk(dataset, outDir);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`[Canonical Dataset Generator] Completed in ${elapsed}s.`);
  console.log(`- Generated Movement Records: ${dataset.movementStates.length}`);
  console.log(`- Generated Ground Truth Contacts: ${dataset.groundTruthContacts.length}`);
  if (dataset.bleObservations) {
    console.log(`- Generated BLE Observations: ${dataset.bleObservations.length}`);
  }
  if (dataset.detectedContactSessions) {
    console.log(`- Generated Detected Contact Sessions: ${dataset.detectedContactSessions.length}`);
  }
  console.log(`- Files written successfully to: ${outDir}`);
}

// Execute if run directly from command line
if (process.argv[1] && (process.argv[1].endsWith('generator.ts') || process.argv[1].endsWith('generator.js'))) {
  runCLI();
}
