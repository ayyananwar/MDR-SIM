import { Room, Person } from './scenarioTypes.js';
import { RandomGenerator } from './rng.js';

/**
 * MovementState represents the physical ground truth spatial state of a person
 * at a specific simulation timestamp.
 */
export interface MovementState {
  personId: string;
  timestamp: number;
  roomId: string;
  x: number;
  y: number;
}

/**
 * Check if a 2D coordinate is strictly inside a room's metric boundaries.
 */
export function isInsideRoom(x: number, y: number, room: Room): boolean {
  return x >= room.xMin && x <= room.xMax && y >= room.yMin && y <= room.yMax;
}

/**
 * Clamp a 2D coordinate strictly within a room's metric boundaries with an optional buffer.
 */
export function clampToRoom(
  x: number,
  y: number,
  room: Room,
  paddingMeters: number = 0.1
): { x: number; y: number } {
  const minX = Math.min(room.xMin + paddingMeters, room.xMax);
  const maxX = Math.max(room.xMax - paddingMeters, room.xMin);
  const minY = Math.min(room.yMin + paddingMeters, room.yMax);
  const maxY = Math.max(room.yMax - paddingMeters, room.yMin);

  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY),
  };
}

export interface MovementModelConfig {
  /** Maximum walking speed in meters per second */
  maxSpeedMps?: number;
  /** Probability per second of changing movement heading */
  directionChangeProbability?: number;
  /** Probability per second of pausing/stationary state */
  pauseProbability?: number;
  /** Probability per second of attempting room transition */
  roomTransitionProbability?: number;
}

interface PersonInternalMovement {
  personId: string;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  roomId: string;
  isStationary: boolean;
  pauseRemainingSeconds: number;
}

/**
 * Deterministic movement model driven by a seeded random generator.
 * Does not emit BLE, RSSI, or packet data.
 */
export class DeterministicMovementModel {
  private states: Map<string, PersonInternalMovement> = new Map();
  private rooms: Map<string, Room> = new Map();
  private roomsList: Room[] = [];
  private config: Required<MovementModelConfig>;

  constructor(
    rooms: Room[],
    people: Person[],
    rng: RandomGenerator,
    config?: MovementModelConfig
  ) {
    this.roomsList = rooms;
    for (const r of rooms) {
      this.rooms.set(r.roomId, r);
    }

    this.config = {
      maxSpeedMps: config?.maxSpeedMps ?? 1.2,
      directionChangeProbability: config?.directionChangeProbability ?? 0.05,
      pauseProbability: config?.pauseProbability ?? 0.08,
      roomTransitionProbability: config?.roomTransitionProbability ?? 0.005,
    };

    // Initialize deterministic states
    for (const p of people) {
      const room = this.rooms.get(p.roomId) || rooms[0];
      const pos = clampToRoom(p.x, p.y, room);
      this.states.set(p.personId, {
        personId: p.personId,
        currentX: pos.x,
        currentY: pos.y,
        targetX: rng.nextFloat(room.xMin + 0.2, room.xMax - 0.2),
        targetY: rng.nextFloat(room.yMin + 0.2, room.yMax - 0.2),
        roomId: room.roomId,
        isStationary: false,
        pauseRemainingSeconds: 0,
      });
    }
  }

  /**
   * Advance physical movement by deltaSeconds using the seeded RNG.
   * Emits the exact physical MovementState for every person at the new timestamp.
   */
  step(
    timestamp: number,
    deltaSeconds: number,
    rng: RandomGenerator
  ): MovementState[] {
    const statesOut: MovementState[] = [];

    for (const [, state] of this.states) {
      const room = this.rooms.get(state.roomId)!;

      // Handle stationary pauses
      if (state.pauseRemainingSeconds > 0) {
        state.pauseRemainingSeconds = Math.max(0, state.pauseRemainingSeconds - deltaSeconds);
        statesOut.push({
          personId: state.personId,
          timestamp,
          roomId: state.roomId,
          x: state.currentX,
          y: state.currentY,
        });
        continue;
      }

      // Chance to start a pause
      if (rng.next() < this.config.pauseProbability * deltaSeconds) {
        state.pauseRemainingSeconds = rng.nextInt(3, 15);
        statesOut.push({
          personId: state.personId,
          timestamp,
          roomId: state.roomId,
          x: state.currentX,
          y: state.currentY,
        });
        continue;
      }

      // Chance to transition rooms (for mobile roles, or general wandering)
      if (
        this.roomsList.length > 1 &&
        rng.next() < this.config.roomTransitionProbability * deltaSeconds
      ) {
        const nextRoom = rng.choice(this.roomsList);
        state.roomId = nextRoom.roomId;
        const newPos = clampToRoom(
          rng.nextFloat(nextRoom.xMin + 0.2, nextRoom.xMax - 0.2),
          rng.nextFloat(nextRoom.yMin + 0.2, nextRoom.yMax - 0.2),
          nextRoom
        );
        state.currentX = newPos.x;
        state.currentY = newPos.y;
        state.targetX = rng.nextFloat(nextRoom.xMin + 0.2, nextRoom.xMax - 0.2);
        state.targetY = rng.nextFloat(nextRoom.yMin + 0.2, nextRoom.yMax - 0.2);

        statesOut.push({
          personId: state.personId,
          timestamp,
          roomId: state.roomId,
          x: state.currentX,
          y: state.currentY,
        });
        continue;
      }

      // Calculate vector towards target
      let dx = state.targetX - state.currentX;
      let dy = state.targetY - state.currentY;
      let distanceToTarget = Math.sqrt(dx * dx + dy * dy);

      // If arrived or close to target, pick a new target inside the current room
      if (
        distanceToTarget < 0.2 ||
        rng.next() < this.config.directionChangeProbability * deltaSeconds
      ) {
        state.targetX = rng.nextFloat(room.xMin + 0.2, room.xMax - 0.2);
        state.targetY = rng.nextFloat(room.yMin + 0.2, room.yMax - 0.2);
        dx = state.targetX - state.currentX;
        dy = state.targetY - state.currentY;
        distanceToTarget = Math.sqrt(dx * dx + dy * dy);
      }

      // Step towards target
      if (distanceToTarget > 0.001) {
        const stepDistance = Math.min(
          this.config.maxSpeedMps * deltaSeconds,
          distanceToTarget
        );
        const nextX = state.currentX + (dx / distanceToTarget) * stepDistance;
        const nextY = state.currentY + (dy / distanceToTarget) * stepDistance;

        // Strictly enforce room bounds
        const clamped = clampToRoom(nextX, nextY, room);
        state.currentX = clamped.x;
        state.currentY = clamped.y;
      }

      statesOut.push({
        personId: state.personId,
        timestamp,
        roomId: state.roomId,
        x: state.currentX,
        y: state.currentY,
      });
    }

    return statesOut;
  }
}
