import { Scenario } from '../simulation/scenarioTypes.js';
import { MovementState } from '../simulation/movementModel.js';
import { RandomGenerator } from '../simulation/rng.js';
import {
  BLESimulationConfig,
  BLEObservation,
  BLEDeviceProfile,
} from './bleTypes.js';
import { generateAdvertisingEvents } from './advertisingModel.js';
import { distanceBetweenPoints, sampleRssi } from './rssiModel.js';
import { isPacketReceived } from './receptionModel.js';

interface PositionSample {
  x: number;
  y: number;
  roomId: string;
}

/**
 * Interpolates a person's physical position at a continuous simulation time in seconds.
 */
function getPositionAtTime(
  timeSeconds: number,
  statesByTime: Map<number, MovementState>,
  fallbackState: MovementState
): PositionSample {
  const tLow = Math.floor(timeSeconds);
  const tHigh = Math.ceil(timeSeconds);

  const stateLow = statesByTime.get(tLow) || fallbackState;
  const stateHigh = statesByTime.get(tHigh) || stateLow;

  if (tLow === tHigh || stateLow === stateHigh) {
    return {
      x: stateLow.x,
      y: stateLow.y,
      roomId: stateLow.roomId,
    };
  }

  const alpha = timeSeconds - tLow;
  return {
    x: (1 - alpha) * stateLow.x + alpha * stateHigh.x,
    y: (1 - alpha) * stateLow.y + alpha * stateHigh.y,
    // Discrete room assignment remains in origin room until transition step completes
    roomId: alpha < 0.5 ? stateLow.roomId : stateHigh.roomId,
  };
}

/**
 * Generates the full sequence of BLE observations captured by edge gateways
 * from the underlying physical simulation state.
 *
 * CRITICAL SCIENTIFIC PROPERTY:
 * The output BLEObservation[] strictly models over-the-air packet receptions.
 * Hidden simulation truth (distances, person identities, source status)
 * is NEVER leaked into the returned observation objects.
 */
export function generateBLEObservations(
  scenario: Scenario,
  movementStates: MovementState[],
  config: BLESimulationConfig,
  rng: RandomGenerator
): BLEObservation[] {
  // Index movement states by personId and timestamp
  const personStatesMap = new Map<string, Map<number, MovementState>>();
  for (const state of movementStates) {
    let pMap = personStatesMap.get(state.personId);
    if (!pMap) {
      pMap = new Map();
      personStatesMap.set(state.personId, pMap);
    }
    pMap.set(state.timestamp, state);
  }

  const durationMs = scenario.config.durationSeconds * 1000;
  const observations: BLEObservation[] = [];

  // 1. Process each person's wearable beacon
  for (const person of scenario.people) {
    if (!person.active) continue;

    const pStates = personStatesMap.get(person.personId);
    const initialFallback: MovementState = {
      personId: person.personId,
      timestamp: 0,
      roomId: person.roomId,
      x: person.x,
      y: person.y,
    };

    // Configure device profile
    const deviceProfile: BLEDeviceProfile = {
      wearableId: person.wearableId,
      advertisementType: config.advertising.advertisementType,
      advertisingIntervalMs: config.advertising.intervalMs,
      advertisingJitterMs: config.advertising.jitterMaxMs,
      enabled: true,
    };

    // Generate advertising event schedule
    const events = generateAdvertisingEvents(deviceProfile, 0, durationMs, rng);

    // 2. Evaluate physical reception for each event across all gateways
    for (const event of events) {
      const eventTimeSeconds = event.timestamp / 1000.0;
      const pos = getPositionAtTime(eventTimeSeconds, pStates || new Map(), initialFallback);

      // Inspect each deployed gateway
      for (const gateway of scenario.gateways) {
        // Internal simulator quantity: true physical distance in metric meters.
        // NEVER expose this value through the BLEObservation object!
        const trueDistanceMeters = distanceBetweenPoints(
          pos.x,
          pos.y,
          gateway.x,
          gateway.y
        );

        // Fetch optional device and environment calibration profiles
        const deviceOffset = config.deviceProfiles?.[person.wearableId]?.rssiOffsetDb;
        const envProfile = config.environmentProfiles?.[pos.roomId];

        // Sample observed RSSI with log-distance path loss and Gaussian noise
        const rssiDbm = sampleRssi(trueDistanceMeters, config.rssi, rng, {
          deviceOffsetDb: deviceOffset,
          envOffsetDb: envProfile?.meanOffsetDb,
          additionalNoiseSigmaDb: envProfile?.additionalNoiseSigmaDb,
        });

        // Evaluate stochastic gateway packet reception
        const received = isPacketReceived(rssiDbm, config.reception, rng);

        if (received) {
          observations.push({
            wearableId: event.wearableId,
            gatewayId: gateway.gatewayId,
            timestamp: event.timestamp,
            eventIndex: event.eventIndex,
            rssiDbm: Math.round(rssiDbm * 100) / 100,
            advertisementType: event.advertisementType,
            received: true,
          });
        }
      }
    }
  }

  // 3. Stable deterministic sort: timestamp -> eventIndex -> wearableId -> gatewayId
  observations.sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    if (a.eventIndex !== b.eventIndex) return a.eventIndex - b.eventIndex;
    if (a.wearableId !== b.wearableId) return a.wearableId.localeCompare(b.wearableId);
    return a.gatewayId.localeCompare(b.gatewayId);
  });

  return observations;
}
