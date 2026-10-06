/**
 * Canonical BLE & RF Domain Types for Research Simulation (Phase 2).
 *
 * Ground truth physical state generates BLE observations, but emitted observations
 * strictly omit hidden geometric truth (e.g. true distance, coordinates, room)
 * and person identity information (e.g. personId, name, clinical status).
 */

export type AdvertisementType =
  | 'legacy'
  | 'extended';

export interface AdvertisingConfig {
  /** Base advertising interval in milliseconds */
  intervalMs: number;
  /** Minimum pseudo-random advertising delay jitter in milliseconds (e.g. 0) */
  jitterMinMs: number;
  /** Maximum pseudo-random advertising delay jitter in milliseconds (e.g. 10) */
  jitterMaxMs: number;
  /** Simulated BLE advertising framing format */
  advertisementType: AdvertisementType;
}

export interface BLEDeviceProfile {
  /** Stable wearable tag hardware/firmware identifier */
  wearableId: string;
  /** Framing type */
  advertisementType: AdvertisementType;
  /** Configured baseline advertising interval in milliseconds */
  advertisingIntervalMs: number;
  /** Maximum randomized timing delay jitter in milliseconds */
  advertisingJitterMs: number;
  /** Whether the beacon transmitter is active */
  enabled: boolean;
}

export interface AdvertisingEvent {
  /** Emitting wearable beacon identifier */
  wearableId: string;
  /** Monotonic event counter for this device */
  eventIndex: number;
  /** Simulation timestamp in integer milliseconds */
  timestamp: number;
  /** Framing format */
  advertisementType: AdvertisementType;
}

export type ParameterSource =
  | 'measured'
  | 'literature'
  | 'calibrated'
  | 'simulation'
  | 'derived';

export interface RSSIParameter {
  value: number;
  source: ParameterSource;
  rationale: string;
  citation?: string;
}

export interface RSSIModelConfig {
  /** Calibration reference distance in meters (d0, typically 1.0 m) */
  referenceDistanceMeters: number;
  /** Expected RSSI at reference distance d0 (A0, in dBm, e.g. -50 dBm) */
  referenceRSSIDbm: number;
  /** Path-loss exponent (n, e.g. 2.0 for free space, 2.5-3.5 for obstructed hospital) */
  pathLossExponent: number;
  /** Standard deviation of log-normal shadowing noise in dB (sigma) */
  noiseSigmaDb: number;
  /** Minimum evaluation distance in meters to prevent log10(0) singularity (default: 0.1 m) */
  minimumDistanceMeters?: number;
}

export interface BLEDeviceRFProfile {
  /** Static calibration or hardware antenna gain/loss offset in dB */
  rssiOffsetDb?: number;
}

export interface EnvironmentRFProfile {
  /** Mean environmental attenuation offset in dB */
  meanOffsetDb?: number;
  /** Additional shadow fading standard deviation in dB */
  additionalNoiseSigmaDb?: number;
}

export interface ReceptionConfig {
  /** Baseline stochastic packet loss probability (0.0 to 1.0) */
  packetLossProbability: number;
  /** Receiver hardware sensitivity floor in dBm (e.g. -95 dBm) */
  receiverSensitivityDbm?: number;
  /** Reception decision model */
  receptionMode?: 'constant' | 'rssi-dependent';
}

export interface BLESimulationConfig {
  advertising: AdvertisingConfig;
  rssi: RSSIModelConfig;
  reception: ReceptionConfig;
  deviceProfiles?: Record<string, BLEDeviceRFProfile>;
  environmentProfiles?: Record<string, EnvironmentRFProfile>;
}

/**
 * Public BLE Observation emitted by edge gateways.
 * Represents what a gateway receiver intercepts over the air.
 *
 * CRITICAL SCIENTIFIC INTEGRITY CONSTRAINT:
 * Strictly excludes hidden simulation truth (trueDistanceMeters, room, x, y)
 * and person identity (personId, name, role, sourceStatus).
 */
export interface BLEObservation {
  /** Wearable beacon identifier */
  wearableId: string;
  /** Intercepting gateway identifier */
  gatewayId: string;
  /** Simulation timestamp in milliseconds */
  timestamp: number;
  /** Monotonic advertising event index */
  eventIndex: number;
  /** Observed received signal strength indicator in dBm */
  rssiDbm: number;
  /** Framing format */
  advertisementType: AdvertisementType;
  /** Successful observation flag */
  received: true;
}
