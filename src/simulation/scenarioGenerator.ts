import {
  SimulationConfig,
  Scenario,
  Room,
  Gateway,
  Person,
  PersonRole,
  SourceStatus,
} from './scenarioTypes.js';
import { RandomGenerator } from './rng.js';

/**
 * Standard reference hospital room layout in metric space (meters).
 */
export const DEFAULT_HOSPITAL_ROOMS: Room[] = [
  {
    roomId: 'reception',
    name: 'Main Reception',
    xMin: 0,
    xMax: 15,
    yMin: 0,
    yMax: 10,
    environmentClass: 'open-area',
  },
  {
    roomId: 'waiting-area',
    name: 'Outpatient Waiting Area',
    xMin: 15,
    xMax: 30,
    yMin: 0,
    yMax: 10,
    environmentClass: 'open-area',
  },
  {
    roomId: 'corridor-main',
    name: 'Central Corridor',
    xMin: 0,
    xMax: 45,
    yMin: 10,
    yMax: 15,
    environmentClass: 'corridor',
  },
  {
    roomId: 'ward-a',
    name: 'General Medical Ward A',
    xMin: 0,
    xMax: 15,
    yMin: 15,
    yMax: 30,
    environmentClass: 'ward',
  },
  {
    roomId: 'ward-b',
    name: 'Infectious Diseases Ward B',
    xMin: 15,
    xMax: 30,
    yMin: 15,
    yMax: 30,
    environmentClass: 'ward',
  },
  {
    roomId: 'icu',
    name: 'Intensive Care Unit (ICU)',
    xMin: 30,
    xMax: 45,
    yMin: 15,
    yMax: 30,
    environmentClass: 'icu',
  },
  {
    roomId: 'laboratory',
    name: 'Diagnostic Laboratory',
    xMin: 30,
    xMax: 45,
    yMin: 0,
    yMax: 10,
    environmentClass: 'laboratory',
  },
  {
    roomId: 'doctor-room-1',
    name: 'Consultation Room 1',
    xMin: 45,
    xMax: 55,
    yMin: 0,
    yMax: 12,
    environmentClass: 'room',
  },
  {
    roomId: 'doctor-room-2',
    name: 'Consultation Room 2',
    xMin: 45,
    xMax: 55,
    yMin: 12,
    yMax: 24,
    environmentClass: 'room',
  },
];

/**
 * Generate canonical gateways positioned at the geometric centers of rooms.
 */
export function generateCanonicalGateways(rooms: Room[], count: number): Gateway[] {
  const gateways: Gateway[] = [];
  const roomsToUse = rooms.slice(0, count);

  for (let i = 0; i < count; i++) {
    const room = roomsToUse[i % roomsToUse.length];
    const centerX = (room.xMin + room.xMax) / 2;
    const centerY = (room.yMin + room.yMax) / 2;

    gateways.push({
      gatewayId: `GW-${room.roomId.toUpperCase().slice(0, 8)}-${String(i + 1).padStart(2, '0')}`,
      x: centerX,
      y: centerY,
      roomId: room.roomId,
    });
  }

  return gateways;
}

/**
 * Generates a complete canonical scenario deterministically from configuration and RNG.
 */
export function generateCanonicalScenario(
  config: SimulationConfig,
  rng: RandomGenerator
): Scenario {
  const rooms = config.rooms && config.rooms.length > 0
    ? config.rooms
    : DEFAULT_HOSPITAL_ROOMS;

  const gateways = generateCanonicalGateways(rooms, config.gatewayCount);
  const people: Person[] = [];

  const roles: PersonRole[] = ['healthcare-worker', 'patient', 'visitor'];

  for (let i = 1; i <= config.populationSize; i++) {
    const personId = `P-${String(i).padStart(4, '0')}`;
    const wearableId = `W-${String(i).padStart(4, '0')}`;

    // Deterministic role assignment
    const roleRand = rng.next();
    let role: PersonRole;
    if (roleRand < 0.35) {
      role = 'healthcare-worker';
    } else if (roleRand < 0.8) {
      role = 'patient';
    } else {
      role = 'visitor';
    }

    // Deterministic source status assignment
    const statusRand = rng.next();
    let sourceStatus: SourceStatus = 'non-source';
    if (statusRand < 0.08) {
      sourceStatus = 'confirmed';
    } else if (statusRand < 0.2) {
      sourceStatus = 'suspected';
    }

    // Room assignment and initial placement
    const room = rng.choice(rooms);
    const padding = 0.5;
    const x = rng.nextFloat(
      Math.min(room.xMin + padding, room.xMax),
      Math.max(room.xMax - padding, room.xMin)
    );
    const y = rng.nextFloat(
      Math.min(room.yMin + padding, room.yMax),
      Math.max(room.yMax - padding, room.yMin)
    );

    people.push({
      personId,
      role,
      roomId: room.roomId,
      x,
      y,
      wearableId,
      sourceStatus,
      active: true,
    });
  }

  return {
    scenarioId: `SCENARIO-${config.seed}`,
    config: {
      ...config,
      rooms,
    },
    people,
    gateways,
    startTime: 0,
    endTime: config.durationSeconds,
  };
}
