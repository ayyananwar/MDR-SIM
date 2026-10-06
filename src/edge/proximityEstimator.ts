import { ProximityConfig } from './edgeTypes.js';

/**
 * Estimates wearable-to-gateway physical distance in meters by inverting
 * the calibrated log-distance path-loss model using the filtered RSSI.
 *
 * d_hat = d_0 * 10^((A_0 - RSSI_filtered) / (10 * n))
 *
 * CRITICAL SCIENTIFIC DISTINCTION:
 * This calculates estimated wearable-to-gateway distance from observed RSSI.
 * It does NOT calculate direct wearable-to-wearable distance.
 */
export function estimateWearableToGatewayDistance(
  filteredRssi: number,
  config: ProximityConfig
): number {
  const d0 = config.referenceDistanceMeters ?? 1.0;
  const a0 = config.referenceRSSIDbm ?? -50.0;
  const n = config.pathLossExponent ?? 2.5;

  const exponent = (a0 - filteredRssi) / (10.0 * n);
  const estimatedMeters = d0 * Math.pow(10, exponent);

  return Math.round(estimatedMeters * 100) / 100;
}

/**
 * Evaluates whether a filtered RSSI sample qualifies as proximity evidence
 * under the configured proximity model.
 */
export function isWithinProximityThreshold(
  filteredRssi: number,
  config: ProximityConfig
): boolean {
  if (config.model === 'rssi-only') {
    // Equivalent RSSI threshold at configured threshold distance
    const a0 = config.referenceRSSIDbm ?? -50.0;
    const n = config.pathLossExponent ?? 2.5;
    const d0 = config.referenceDistanceMeters ?? 1.0;
    const thresholdRssi = a0 - 10.0 * n * Math.log10(config.thresholdDistanceMeters / d0);
    return filteredRssi >= thresholdRssi;
  }

  const estDistance = estimateWearableToGatewayDistance(filteredRssi, config);
  return estDistance <= config.thresholdDistanceMeters;
}
