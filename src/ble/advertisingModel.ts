import { BLEDeviceProfile, AdvertisingEvent } from './bleTypes.js';
import { RandomGenerator } from '../simulation/rng.js';

/**
 * Generates a discrete sequence of BLE advertising events for a device profile
 * over the specified simulation interval [startTimeMs, endTimeMs].
 *
 * Implements Bluetooth-style advertising event scheduling:
 * t_{k+1} = t_k + intervalMs + rand(0, jitterMs)
 *
 * @param device The configured BLE device profile
 * @param startTimeMs Simulation window start in milliseconds
 * @param endTimeMs Simulation window end in milliseconds
 * @param rng Deterministic seeded random number generator
 */
export function generateAdvertisingEvents(
  device: BLEDeviceProfile,
  startTimeMs: number,
  endTimeMs: number,
  rng: RandomGenerator
): AdvertisingEvent[] {
  if (!device.enabled || device.advertisingIntervalMs <= 0 || startTimeMs >= endTimeMs) {
    return [];
  }

  const events: AdvertisingEvent[] = [];
  let eventIndex = 0;

  // Initial random phase offset to avoid artificial synchronization across devices
  const initialJitter = rng.nextInt(0, Math.max(0, device.advertisingJitterMs));
  let currentTimestamp = startTimeMs + initialJitter;

  while (currentTimestamp <= endTimeMs) {
    events.push({
      wearableId: device.wearableId,
      eventIndex,
      timestamp: Math.round(currentTimestamp),
      advertisementType: device.advertisementType,
    });

    eventIndex++;

    // Bluetooth advDelay timing perturbation: periodic interval + random jitter
    const delayJitter = rng.nextInt(0, Math.max(0, device.advertisingJitterMs));
    currentTimestamp += device.advertisingIntervalMs + delayJitter;
  }

  return events;
}
