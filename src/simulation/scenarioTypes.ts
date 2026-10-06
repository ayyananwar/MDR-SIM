/**
 * Canonical Scenario & Domain Types for Research Simulation (Phase 1).
 * All coordinates are defined in metric units (meters) in a simulation Cartesian plane.
 * All simulation timestamps are expressed in simulation seconds.
 */

export type PersonRole =
  | 'healthcare-worker'
  | 'patient'
  | 'visitor';

export type SourceStatus =
  | 'non-source'
  | 'suspected'
  | 'confirmed';

export interface Person {
  personId: string;
  role: PersonRole;
  roomId: string;
  x: number;
  y: number;
  wearableId: string;
  sourceStatus: SourceStatus;
  active: boolean;
}

export type EnvironmentClass =
  | 'open-area'
  | 'corridor'
  | 'ward'
  | 'room'
  | 'icu'
  | 'laboratory';

export interface Room {
  roomId: string;
  name: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  environmentClass: EnvironmentClass;
}

export interface Gateway {
  gatewayId: string;
  x: number;
  y: number;
  roomId?: string;
}

export interface ContactDefinition {
  distanceThresholdMeters: number;
  minimumDurationSeconds: number;
  roomConstraint: 'same-room' | 'none';
}

import type { BLESimulationConfig } from '../ble/bleTypes.js';
import type { EdgeProcessingConfig } from '../edge/edgeTypes.js';
import type { RiskModelConfig } from '../risk/riskTypes.js';
import type { PseudonymConfig } from '../privacy/privacyTypes.js';

export interface SimulationConfig {
  datasetVersion: string;
  scenarioVersion: string;
  seed: number;
  durationSeconds: number;
  populationSize: number;
  gatewayCount: number;
  timeStepSeconds: number;
  rooms: Room[];
  contactDefinition: ContactDefinition;
  ble?: BLESimulationConfig;
  edge?: EdgeProcessingConfig;
  risk?: RiskModelConfig;
  privacy?: PseudonymConfig;
}

export interface Scenario {
  scenarioId: string;
  config: SimulationConfig;
  people: Person[];
  gateways: Gateway[];
  startTime: number;
  endTime: number;
}
