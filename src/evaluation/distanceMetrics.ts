/**
 * Wearable-to-Gateway Distance Estimation Metrics (Phase 5).
 *
 * CRITICAL SCIENTIFIC BOUNDARY:
 * Compares RF path-loss inverted distance estimates (wearable -> gateway)
 * against hidden simulated ground-truth Euclidean coordinates.
 *
 * IMPORTANT:
 * This evaluates wearable-to-gateway RF path-loss inversion accuracy under
 * multipath and log-normal shadowing noise. It is NOT person-to-person ranging
 * and must never be used as a proxy for physical inter-person distance.
 */

import type { EdgeObservation } from '../edge/edgeTypes.js';
import type { MovementState } from '../simulation/movementModel.js';
import type { Gateway, Person } from '../simulation/scenarioTypes.js';
import { calculateEuclideanDistance } from '../simulation/groundTruth.js';
import type { DistanceMetrics } from './evaluationTypes.js';
import { buildIdentityMaps } from './matching.js';

/**
 * Calculate percentiles from a sorted numeric array.
 */
function calculatePercentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

/**
 * Evaluate wearable-to-gateway distance estimation error across edge observations.
 */
export function evaluateDistanceEstimation(
  edgeObservations: EdgeObservation[],
  movementStates: MovementState[] | undefined,
  people: Person[],
  gateways: Gateway[],
  sampleLimit = 10000
): DistanceMetrics {
  if (!movementStates || movementStates.length === 0 || edgeObservations.length === 0) {
    return {
      totalEvaluatedSamples: 0,
      maeMeters: 0,
      rmseMeters: 0,
      medianAbsoluteErrorMeters: 0,
      p95AbsoluteErrorMeters: 0,
      meanErrorMeters: 0,
    };
  }

  const { wearableToPerson } = buildIdentityMaps(people);

  // Gateway lookup
  const gatewayMap = new Map<string, Gateway>();
  for (const gw of gateways) {
    gatewayMap.set(gw.gatewayId, gw);
  }

  // Index movement states by `${personId}-${timestampSeconds}`
  const stateMap = new Map<string, MovementState>();
  for (const state of movementStates) {
    stateMap.set(`${state.personId}-${state.timestamp}`, state);
  }

  const errors: number[] = [];
  const absErrors: number[] = [];

  // Downsample if edgeObservations array is massive to keep evaluation fast & deterministic
  const stride = Math.max(1, Math.floor(edgeObservations.length / sampleLimit));

  for (let i = 0; i < edgeObservations.length; i += stride) {
    const obs = edgeObservations[i];
    if (obs.estimatedDistanceMeters === undefined) continue;

    const personId = wearableToPerson.get(obs.wearableId);
    if (!personId) continue;

    const gw = gatewayMap.get(obs.gatewayId);
    if (!gw) continue;

    const tSec = Math.round(obs.timestamp / 1000);
    const state = stateMap.get(`${personId}-${tSec}`);
    if (!state) continue;

    const trueDistance = calculateEuclideanDistance(state.x, state.y, gw.x, gw.y);
    const estimatedDistance = obs.estimatedDistanceMeters;

    const err = estimatedDistance - trueDistance;
    errors.push(err);
    absErrors.push(Math.abs(err));
  }

  if (absErrors.length === 0) {
    return {
      totalEvaluatedSamples: 0,
      maeMeters: 0,
      rmseMeters: 0,
      medianAbsoluteErrorMeters: 0,
      p95AbsoluteErrorMeters: 0,
      meanErrorMeters: 0,
    };
  }

  absErrors.sort((a, b) => a - b);
  const sumError = errors.reduce((acc, v) => acc + v, 0);
  const sumAbsError = absErrors.reduce((acc, v) => acc + v, 0);
  const sumSquaredError = errors.reduce((acc, v) => acc + v * v, 0);

  const n = absErrors.length;
  return {
    totalEvaluatedSamples: n,
    maeMeters: sumAbsError / n,
    rmseMeters: Math.sqrt(sumSquaredError / n),
    medianAbsoluteErrorMeters: calculatePercentile(absErrors, 50),
    p95AbsoluteErrorMeters: calculatePercentile(absErrors, 95),
    meanErrorMeters: sumError / n,
  };
}
