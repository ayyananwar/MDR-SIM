/**
 * Simulation Clock.
 * Decoupled from wall-clock time, UI rendering, and browser event loops.
 * Tracks discrete simulation time in seconds.
 */

export interface SimulationClock {
  /** Returns the current simulation time in seconds */
  now(): number;
  /** Advances simulation time by deltaSeconds and returns the new time */
  advance(deltaSeconds: number): number;
  /** Resets the clock to the initial start time */
  reset(initialTime?: number): void;
}

export class DiscreteSimulationClock implements SimulationClock {
  private currentTime: number;
  private readonly initialTime: number;

  constructor(initialTime: number = 0) {
    this.initialTime = initialTime;
    this.currentTime = initialTime;
  }

  now(): number {
    return this.currentTime;
  }

  advance(deltaSeconds: number): number {
    if (deltaSeconds < 0) {
      throw new Error(`Simulation clock cannot advance backwards: ${deltaSeconds}`);
    }
    this.currentTime += deltaSeconds;
    return this.currentTime;
  }

  reset(initialTime?: number): void {
    this.currentTime = initialTime !== undefined ? initialTime : this.initialTime;
  }
}
