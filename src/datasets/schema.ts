import { Room, Gateway, Person } from '../simulation/scenarioTypes.js';
import { MovementState } from '../simulation/movementModel.js';
import { GroundTruthContact } from '../simulation/groundTruth.js';
import { ExperimentManifest } from './manifest.js';
import { BLEObservation } from '../ble/bleTypes.js';
import { EdgeObservation, ContactSession } from '../edge/edgeTypes.js';
import { RiskAssessment, FittedRiskModel } from '../risk/riskTypes.js';
import type { PseudonymEpoch } from '../privacy/privacyTypes.js';
import type { IdentityRegistry } from '../privacy/identityRegistry.js';

export interface DatasetMetadata {
  datasetVersion: string;
  scenarioVersion: string;
  scenarioId: string;
  seed: number;
  durationSeconds: number;
  populationSize: number;
  gatewayCount: number;
  timeStepSeconds: number;
  generatedAt?: string;
}

export interface CanonicalDataset {
  metadata: DatasetMetadata;
  manifest: ExperimentManifest;
  rooms: Room[];
  gateways: Gateway[];
  people: Person[];
  movementStates: MovementState[];
  groundTruthContacts: GroundTruthContact[];
  bleObservations?: BLEObservation[];
  edgeObservations?: EdgeObservation[];
  detectedContactSessions?: ContactSession[];
  riskAssessments?: RiskAssessment[];
  fittedRiskModel?: FittedRiskModel;
  pseudonymEpochs?: PseudonymEpoch[];
  identityRegistry?: IdentityRegistry;
}


