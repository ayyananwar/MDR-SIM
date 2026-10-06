import { BLEObservation } from '../ble/bleTypes.js';
import { DeduplicationConfig } from './edgeTypes.js';

export interface DeduplicationResult {
  deduplicated: BLEObservation[];
  duplicatesRemoved: number;
}

/**
 * Filters out duplicate observation frames arriving at the same gateway for the exact same event.
 *
 * Distinguishes genuine repeated periodic advertisements from duplicate transmissions:
 * - A duplicate has the SAME (wearableId, gatewayId, eventIndex) arriving within the timeWindowMs.
 * - Legitimate subsequent advertising events have DIFFERENT eventIndex values and are preserved.
 */
export function deduplicateObservations(
  observations: readonly BLEObservation[],
  config: DeduplicationConfig
): DeduplicationResult {
  if (!config.enabled) {
    return {
      deduplicated: [...observations],
      duplicatesRemoved: 0,
    };
  }

  const seenTimestamps = new Map<string, number>();
  const deduplicated: BLEObservation[] = [];
  let duplicatesRemoved = 0;

  for (const obs of observations) {
    const key = `${obs.wearableId}::${obs.gatewayId}::${obs.eventIndex}`;
    const prevTimestamp = seenTimestamps.get(key);

    if (prevTimestamp !== undefined && Math.abs(obs.timestamp - prevTimestamp) <= config.timeWindowMs) {
      duplicatesRemoved++;
    } else {
      seenTimestamps.set(key, obs.timestamp);
      deduplicated.push(obs);
    }
  }

  return {
    deduplicated,
    duplicatesRemoved,
  };
}
