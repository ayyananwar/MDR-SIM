import { SourceStatus, ContactDefinition } from './scenarioTypes.js';
import { MovementState } from './movementModel.js';

/**
 * GroundTruthContact represents a sessionized physical proximity event between two persons,
 * calculated strictly from hidden spatial coordinates and room assignments.
 *
 * It is completely independent from BLE advertising, RSSI observations, packet loss,
 * gateway detection, or risk models.
 */
export interface GroundTruthContact {
  /** Canonical person ID (lexicographically lower) */
  personA: string;
  /** Canonical person ID (lexicographically higher) */
  personB: string;

  /** Simulation timestamp (seconds) when qualifying proximity began */
  startTime: number;
  /** Simulation timestamp (seconds) when qualifying proximity ended */
  endTime: number;

  /** Total elapsed duration of the contact session in seconds */
  durationSeconds: number;

  /** Room ID where contact occurred (or comma-separated if occurred across rooms) */
  roomId: string;

  /** Sampled ground-truth Euclidean distances (meters) at each evaluation step */
  trueDistanceSamples: number[];

  /** True source status of personA */
  sourceStatusA: SourceStatus;
  /** True source status of personB */
  sourceStatusB: SourceStatus;
}

/**
 * Calculates exact 2D Euclidean distance between two metric coordinates.
 */
export function calculateEuclideanDistance(
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
 * Generates a canonical sorted pair key for two person IDs.
 */
export function getCanonicalPairKey(id1: string, id2: string): {
  personA: string;
  personB: string;
  key: string;
} {
  if (id1 < id2) {
    return { personA: id1, personB: id2, key: `${id1}::${id2}` };
  }
  return { personA: id2, personB: id1, key: `${id2}::${id1}` };
}

interface ActiveSession {
  personA: string;
  personB: string;
  startTime: number;
  lastSampleTime: number;
  lastRoomId: string;
  distanceSamples: number[];
  sourceStatusA: SourceStatus;
  sourceStatusB: SourceStatus;
}

/**
 * Stateful Ground Truth Sessionizer.
 * Tracks continuous spatial proximity intervals across discrete simulation timesteps.
 */
export class GroundTruthTracker {
  private contactDef: ContactDefinition;
  private sourceStatusMap: Map<string, SourceStatus>;
  private activeSessions: Map<string, ActiveSession> = new Map();
  private completedContacts: GroundTruthContact[] = [];

  constructor(
    contactDef: ContactDefinition,
    personSourceStatuses: Record<string, SourceStatus> | Map<string, SourceStatus>
  ) {
    this.contactDef = contactDef;
    this.sourceStatusMap =
      personSourceStatuses instanceof Map
        ? personSourceStatuses
        : new Map(Object.entries(personSourceStatuses));
  }

  /**
   * Process a discrete simulation timestep with true positions of all persons.
   *
   * @param timestamp Current simulation time in seconds
   * @param currentStates List of true physical movement states for each active person
   */
  processStep(timestamp: number, currentStates: MovementState[]): void {
    const statesMap = new Map<string, MovementState>();
    for (const state of currentStates) {
      statesMap.set(state.personId, state);
    }

    const stateList = Array.from(statesMap.values());
    const matchedKeysThisStep = new Set<string>();

    // Inspect all unique pairs
    for (let i = 0; i < stateList.length; i++) {
      for (let j = i + 1; j < stateList.length; j++) {
        const state1 = stateList[i];
        const state2 = stateList[j];

        // Check room constraint
        if (
          this.contactDef.roomConstraint === 'same-room' &&
          state1.roomId !== state2.roomId
        ) {
          continue;
        }

        // Calculate true Euclidean distance
        const distance = calculateEuclideanDistance(
          state1.x,
          state1.y,
          state2.x,
          state2.y
        );

        if (distance <= this.contactDef.distanceThresholdMeters) {
          const { personA, personB, key } = getCanonicalPairKey(
            state1.personId,
            state2.personId
          );
          matchedKeysThisStep.add(key);

          const statusA = this.sourceStatusMap.get(personA) ?? 'non-source';
          const statusB = this.sourceStatusMap.get(personB) ?? 'non-source';

          let session = this.activeSessions.get(key);
          if (!session) {
            session = {
              personA,
              personB,
              startTime: timestamp,
              lastSampleTime: timestamp,
              lastRoomId: state1.roomId,
              distanceSamples: [distance],
              sourceStatusA: statusA,
              sourceStatusB: statusB,
            };
            this.activeSessions.set(key, session);
          } else {
            session.lastSampleTime = timestamp;
            session.lastRoomId = state1.roomId;
            session.distanceSamples.push(distance);
          }
        }
      }
    }

    // Close any active sessions that were not active during this step
    for (const [key, session] of this.activeSessions.entries()) {
      if (!matchedKeysThisStep.has(key)) {
        this.closeSession(session);
        this.activeSessions.delete(key);
      }
    }
  }

  /**
   * Finalize all remaining active sessions at the end of the simulation.
   */
  finalize(): GroundTruthContact[] {
    for (const [, session] of this.activeSessions.entries()) {
      this.closeSession(session);
    }
    this.activeSessions.clear();
    return this.getCompletedContacts();
  }

  /**
   * Get all qualified ground truth contact sessions recorded so far.
   */
  getCompletedContacts(): GroundTruthContact[] {
    return [...this.completedContacts];
  }

  private closeSession(session: ActiveSession): void {
    const duration = session.lastSampleTime - session.startTime;
    // Only sessions that meet or exceed the minimum configured duration qualify
    if (duration >= this.contactDef.minimumDurationSeconds) {
      this.completedContacts.push({
        personA: session.personA,
        personB: session.personB,
        startTime: session.startTime,
        endTime: session.lastSampleTime,
        durationSeconds: duration,
        roomId: session.lastRoomId,
        trueDistanceSamples: [...session.distanceSamples],
        sourceStatusA: session.sourceStatusA,
        sourceStatusB: session.sourceStatusB,
      });
    }
  }
}
