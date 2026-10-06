import { BLEObservation } from '../ble/bleTypes.js';

/**
 * Normalizes an array of BLE observations into a strictly sorted chronological sequence.
 * Enforces deterministic sorting:
 * 1. timestamp ASC
 * 2. eventIndex ASC
 * 3. wearableId ASC
 * 4. gatewayId ASC
 */
export function normalizeObservations(
  observations: readonly BLEObservation[]
): BLEObservation[] {
  return [...observations].sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    if (a.eventIndex !== b.eventIndex) return a.eventIndex - b.eventIndex;
    if (a.wearableId !== b.wearableId) return a.wearableId.localeCompare(b.wearableId);
    return a.gatewayId.localeCompare(b.gatewayId);
  });
}
