import { BLEObservation } from '../ble/bleTypes.js';
import { ValidationConfig } from './edgeTypes.js';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates a single BLE observation against physical signal boundaries and structural schema constraints.
 */
export function validateObservation(
  obs: BLEObservation,
  config: ValidationConfig
): ValidationResult {
  if (!obs.wearableId || typeof obs.wearableId !== 'string' || obs.wearableId.trim() === '') {
    return { valid: false, reason: 'Missing or invalid wearableId' };
  }

  if (!obs.gatewayId || typeof obs.gatewayId !== 'string' || obs.gatewayId.trim() === '') {
    return { valid: false, reason: 'Missing or invalid gatewayId' };
  }

  if (typeof obs.timestamp !== 'number' || !Number.isFinite(obs.timestamp) || obs.timestamp < 0) {
    return { valid: false, reason: `Invalid timestamp: ${obs.timestamp}` };
  }

  if (typeof obs.eventIndex !== 'number' || !Number.isFinite(obs.eventIndex) || obs.eventIndex < 0) {
    return { valid: false, reason: `Invalid eventIndex: ${obs.eventIndex}` };
  }

  if (typeof obs.rssiDbm !== 'number' || !Number.isFinite(obs.rssiDbm)) {
    return { valid: false, reason: `Non-finite RSSI: ${obs.rssiDbm}` };
  }

  const minRssi = config.minRssiDbm ?? -110.0;
  const maxRssi = config.maxRssiDbm ?? 0.0;

  if (obs.rssiDbm < minRssi || obs.rssiDbm > maxRssi) {
    return {
      valid: false,
      reason: `RSSI ${obs.rssiDbm} dBm out of valid bounds [${minRssi}, ${maxRssi}]`,
    };
  }

  if (obs.advertisementType !== 'legacy' && obs.advertisementType !== 'extended') {
    return {
      valid: false,
      reason: `Unrecognized advertisement type: ${obs.advertisementType}`,
    };
  }

  if (obs.received !== true) {
    return { valid: false, reason: 'Observation not marked as received' };
  }

  return { valid: true };
}
