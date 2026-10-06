/**
 * Privacy Observation Pipeline (Phase 6).
 *
 * Replaces static hardware wearable identifiers in public BLE observations
 * with ephemeral rotating pseudonyms according to the active rotation schedule.
 *
 * CRITICAL SCIENTIFIC INTEGRITY CONSTRAINT:
 * Emitted pseudonymous observations strictly exclude static wearable IDs,
 * person IDs, room IDs, and ground truth.
 */

import type { BLEObservation } from '../ble/bleTypes.js';
import type { RotationScheduleModel } from './rotationModel.js';
import type { IdentityRegistry } from './identityRegistry.js';
import type { AuthorizationContext } from './privacyTypes.js';

/**
 * Anonymize public BLE observations by replacing static wearableId with the active pseudonym.
 */
export function applyPseudonymsToObservations(
  observations: readonly BLEObservation[],
  rotationModel: RotationScheduleModel
): BLEObservation[] {
  const result: BLEObservation[] = [];

  for (const obs of observations) {
    const activePseudonym = rotationModel.getActivePseudonym(obs.wearableId, obs.timestamp);
    result.push({
      ...obs,
      wearableId: activePseudonym,
    });
  }

  return result;
}

/**
 * Resolve pseudonymous BLE observations back to stable wearable IDs for the authorized edge view.
 */
export function resolvePseudonymousObservations(
  pseudonymousObservations: readonly BLEObservation[],
  registry: IdentityRegistry,
  context: AuthorizationContext
): BLEObservation[] {
  const result: BLEObservation[] = [];

  for (const obs of pseudonymousObservations) {
    const resolved = registry.resolvePseudonym(obs.wearableId, obs.timestamp, context);
    result.push({
      ...obs,
      wearableId: resolved ? resolved.wearableId : obs.wearableId,
    });
  }

  return result;
}
