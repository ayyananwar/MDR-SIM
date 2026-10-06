import { RSSIModelConfig, RSSIParameter } from './bleTypes.js';
import { RandomGenerator } from '../simulation/rng.js';

/**
 * Standard parameter provenance metadata documenting experimental simulation assumptions.
 */
export const DEFAULT_RSSI_PARAMETERS: Record<string, RSSIParameter> = {
  referenceDistanceMeters: {
    value: 1.0,
    source: 'simulation',
    rationale: 'Standard standard 1-meter BLE RSSI calibration reference distance.',
    citation: 'Bluetooth Core Specification v5.4, Vol 6.',
  },
  referenceRSSIDbm: {
    value: -50.0,
    source: 'simulation',
    rationale: 'Nominal 0 dBm TX power received at 1 meter in indoor line-of-sight conditions.',
  },
  pathLossExponent: {
    value: 2.5,
    source: 'literature',
    rationale: 'Representative path-loss exponent for indoor semi-obstructed hospital wards (range: 2.0 - 3.5).',
    citation: 'Rappaport, Wireless Communications: Principles and Practice.',
  },
  noiseSigmaDb: {
    value: 6.0,
    source: 'simulation',
    rationale: 'Log-normal shadow fading standard deviation representing multi-path and clutter.',
  },
};

/**
 * Calculate exact 2D Euclidean distance between metric coordinates in meters.
 */
export function distanceBetweenPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates the deterministic ideal RSSI without shadow fading or stochastic noise.
 *
 * Implements log-distance path-loss model:
 * RSSI(d) = A_0 - 10 * n * log10(max(d, d_min) / d_0)
 *
 * Zero-distance safety: Clamps evaluation distance to at least minimumDistanceMeters (default 0.1m)
 * to avoid log10(0) singularity or infinite power.
 */
export function calculateIdealRSSI(
  distanceMeters: number,
  config: RSSIModelConfig
): number {
  const d0 = config.referenceDistanceMeters > 0 ? config.referenceDistanceMeters : 1.0;
  const dMin = config.minimumDistanceMeters !== undefined && config.minimumDistanceMeters > 0
    ? config.minimumDistanceMeters
    : 0.1;

  // Safe clamping to prevent log10(0)
  const effectiveDistance = Math.max(distanceMeters, dMin);

  // Path loss in dB: 10 * n * log10(d / d0)
  const pathLossDb = 10 * config.pathLossExponent * Math.log10(effectiveDistance / d0);

  return config.referenceRSSIDbm - pathLossDb;
}

export interface SampleRssiOptions {
  deviceOffsetDb?: number;
  envOffsetDb?: number;
  additionalNoiseSigmaDb?: number;
}

/**
 * Generates an observed RSSI sample including path-loss, device/environmental offsets,
 * and zero-mean Gaussian shadow fading noise.
 *
 * RSSI_observed = RSSI_ideal(d) + Delta_device + Delta_env + N(0, sigma^2)
 */
export function sampleRssi(
  distanceMeters: number,
  config: RSSIModelConfig,
  rng: RandomGenerator,
  options?: SampleRssiOptions
): number {
  const idealRssi = calculateIdealRSSI(distanceMeters, config);
  const deviceOffset = options?.deviceOffsetDb ?? 0.0;
  const envOffset = options?.envOffsetDb ?? 0.0;

  const baseSigma = config.noiseSigmaDb >= 0 ? config.noiseSigmaDb : 0.0;
  const extraSigma = options?.additionalNoiseSigmaDb ?? 0.0;
  const totalSigma = Math.sqrt(baseSigma * baseSigma + extraSigma * extraSigma);

  let noise = 0.0;
  if (totalSigma > 0) {
    noise = rng.normal(0, totalSigma);
  }

  return idealRssi + deviceOffset + envOffset + noise;
}
