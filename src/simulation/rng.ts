/**
 * Deterministic Seeded Pseudo-Random Number Generator (PRNG).
 * Uses a Mulberry32 algorithm to guarantee reproducible sequences across simulation runs.
 */

export interface RandomGenerator {
  /** Return a pseudo-random float in [0, 1) */
  next(): number;
  /** Return a pseudo-random integer in [min, max] inclusive */
  nextInt(min: number, max: number): number;
  /** Return a pseudo-random float in [min, max) */
  nextFloat(min: number, max: number): number;
  /** Pick a random item from a non-empty array */
  choice<T>(items: readonly T[]): T;
  /** Return a normally distributed pseudo-random float */
  normal(mean?: number, stdDev?: number): number;
}

export class SeededRandom implements RandomGenerator {
  private state: number;

  constructor(seed: number) {
    // Force 32-bit unsigned integer
    this.state = (Math.floor(seed) >>> 0) || 0x12345678;
    // Advance state to disperse low-entropy seeds
    this.next();
    this.next();
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    const low = Math.ceil(min);
    const high = Math.floor(max);
    return Math.floor(this.next() * (high - low + 1)) + low;
  }

  nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  choice<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from an empty array');
    }
    const index = Math.floor(this.next() * items.length);
    return items[index];
  }

  normal(mean: number = 0, stdDev: number = 1): number {
    let u1 = this.next();
    let u2 = this.next();
    while (u1 === 0) u1 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }
}

