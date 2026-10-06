# Research Simulation Data Model (v2.0)

## 1. Overview

Phase 1 establishes a canonical, strongly typed data model for hospital contact tracing research. This data model represents **hidden physical simulation truth** and is strictly decoupled from the browser UI, legacy rendering canvas, and future sensor observation models.

## 2. Coordinate System & Temporal Units

- **Spatial Coordinate System**: Metric 2D Cartesian plane where distances are expressed in **meters** ($m$). This replaces the legacy pixel-based display coordinate system.
- **Simulation Time**: Expressed as discrete elapsed **simulation seconds** ($s$) from $t = 0$. The simulation clock is decoupled from wall-clock time and browser refresh rates.

---

## 3. Core Entities & Schemas

### 3.1 Person
Represents an individual within the hospital environment.

```typescript
export type PersonRole = 'healthcare-worker' | 'patient' | 'visitor';
export type SourceStatus = 'non-source' | 'suspected' | 'confirmed';

export interface Person {
  personId: string;           // Canonical identifier, e.g., "P-0001"
  role: PersonRole;           // Functional hospital role
  roomId: string;             // Current assigned room identifier
  x: number;                  // Current X coordinate in meters
  y: number;                  // Current Y coordinate in meters
  wearableId: string;         // Assigned simulated wearable beacon ID
  sourceStatus: SourceStatus; // Truth status regarding pathogen shedding
  active: boolean;            // Whether the entity is actively within the facility
}
```

### 3.2 Room
Represents an enclosed or designated physical hospital zone with bounded metric geometry.

```typescript
export type EnvironmentClass =
  | 'open-area'
  | 'corridor'
  | 'ward'
  | 'room'
  | 'icu'
  | 'laboratory';

export interface Room {
  roomId: string;                      // Unique room key, e.g., "ward-a"
  name: string;                        // Human-readable room label
  xMin: number;                        // Lower X bound in meters
  xMax: number;                        // Upper X bound in meters
  yMin: number;                        // Lower Y bound in meters
  yMax: number;                        // Upper Y bound in meters
  environmentClass: EnvironmentClass;  // Architectural/environmental class
}
```

### 3.3 Gateway
Represents a fixed receiver deployed at a specific location within the facility.

```typescript
export interface Gateway {
  gatewayId: string;  // Unique receiver ID, e.g., "GW-WARDA-01"
  x: number;          // Fixed receiver X coordinate in meters
  y: number;          // Fixed receiver Y coordinate in meters
  roomId?: string;    // Optional enclosing room identifier
}
```

### 3.4 MovementState
Records the true physical location of an entity at a given simulation instant.

```typescript
export interface MovementState {
  personId: string;   // Subject entity ID
  timestamp: number;  // Simulation time in seconds
  roomId: string;     // Enclosing room at this instant
  x: number;          // Physical X coordinate in meters
  y: number;          // Physical Y coordinate in meters
}
```

### 3.5 GroundTruthContact
Represents a contiguous temporal interval where two entities met the physical proximity condition.

```typescript
export interface GroundTruthContact {
  personA: string;                     // Lexicographically smaller personId
  personB: string;                     // Lexicographically larger personId
  startTime: number;                   // Inception timestamp in simulation seconds
  endTime: number;                     // Termination timestamp in simulation seconds
  durationSeconds: number;             // Total qualifying contact duration (endTime - startTime)
  roomId: string;                      // Room where proximity occurred
  trueDistanceSamples: number[];       // Sampled Euclidean distances across time steps
  sourceStatusA: SourceStatus;         // Physical truth status of personA
  sourceStatusB: SourceStatus;         // Physical truth status of personB
}
```

### 3.6 ContactDefinition & SimulationConfig
Defines the experimental parameters governing the scenario and ground-truth evaluation.

```typescript
export interface ContactDefinition {
  distanceThresholdMeters: number;     // e.g. 2.0 meters
  minimumDurationSeconds: number;      // e.g. 30 seconds
  roomConstraint: 'same-room' | 'none'; // Whether wall separation invalidates proximity
}

export interface SimulationConfig {
  datasetVersion: string;
  scenarioVersion: string;
  seed: number;
  durationSeconds: number;
  populationSize: number;
  gatewayCount: number;
  timeStepSeconds: number;
  rooms: Room[];
  contactDefinition: ContactDefinition;
}
```
