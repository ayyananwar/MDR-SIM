import { ContactDefinition } from '../simulation/scenarioTypes.js';
import { BLESimulationConfig } from '../ble/bleTypes.js';
import { EdgeProcessingConfig } from '../edge/edgeTypes.js';
import { RiskModelConfig } from '../risk/riskTypes.js';

/**
 * ExperimentManifest captures all essential simulation parameters required
 * to deterministically reproduce a research dataset.
 */
export interface ExperimentManifest {
  experimentId: string;
  datasetVersion: string;
  scenarioVersion: string;
  seed: number;
  simulationDurationSeconds: number;
  populationSize: number;
  gatewayCount: number;
  timeStepSeconds: number;
  contactDefinition: ContactDefinition;
  ble?: BLESimulationConfig;
  edge?: EdgeProcessingConfig;
  risk?: RiskModelConfig;
  createdAt?: string;
  notes?: string;
}

/**
 * Helper to construct an ExperimentManifest from simulation parameters.
 */
export function createExperimentManifest(
  experimentId: string,
  params: {
    datasetVersion: string;
    scenarioVersion: string;
    seed: number;
    simulationDurationSeconds: number;
    populationSize: number;
    gatewayCount: number;
    timeStepSeconds: number;
    contactDefinition: ContactDefinition;
    ble?: BLESimulationConfig;
    edge?: EdgeProcessingConfig;
    risk?: RiskModelConfig;
    notes?: string;
  }
): ExperimentManifest {
  return {
    experimentId,
    datasetVersion: params.datasetVersion,
    scenarioVersion: params.scenarioVersion,
    seed: params.seed,
    simulationDurationSeconds: params.simulationDurationSeconds,
    populationSize: params.populationSize,
    gatewayCount: params.gatewayCount,
    timeStepSeconds: params.timeStepSeconds,
    contactDefinition: params.contactDefinition,
    ble: params.ble,
    edge: params.edge,
    risk: params.risk,
    createdAt: new Date().toISOString(),
    notes: params.notes ?? 'Deterministic Research Dataset',
  };
}


