/**
 * Pseudonym Generation Subsystem (Phase 6).
 *
 * Implements two distinct generation modes:
 * 1. Mode A: Keyed HMAC-SHA256 (requires explicit private secret key)
 * 2. Mode B: Simulation-Grade Deterministic PRNG (for reproducible simulation only)
 *
 * CRITICAL SCIENTIFIC INTEGRITY CONSTRAINTS:
 * - Mode B must NEVER be described as cryptographically secure.
 * - Mode A security depends strictly on the secrecy and entropy of the secret key.
 * - Collisions are instrumented and logged, not silently ignored.
 */

import crypto from 'crypto';
import { SeededRandom } from '../simulation/rng.js';
import type {
  PseudonymConfig,
  CollisionRecord,
  CollisionMetrics,
} from './privacyTypes.js';

export class PseudonymGenerator {
  private config: PseudonymConfig;
  private collisionLedger: CollisionRecord[] = [];
  private generatedRegistry = new Map<string, { wearableId: string; epochIndex: number }>();
  private totalGeneratedCount = 0;

  constructor(config: PseudonymConfig) {
    if (config.mode === 'hmac-sha256' && !config.secretKey) {
      throw new Error(
        'HMAC-SHA256 pseudonym generation mode requires an explicit secretKey in PseudonymConfig.'
      );
    }
    this.config = config;
  }

  /**
   * Generate a pseudonymous broadcast identifier for a given wearable and epoch.
   */
  public generatePseudonym(
    wearableId: string,
    epochIndex: number,
    seed = 104729
  ): string {
    const namespaceBits = this.config.namespaceBits ?? 64;
    const hexLength = Math.max(1, Math.floor(namespaceBits / 4));

    let rawHex: string;

    if (this.config.mode === 'hmac-sha256') {
      // Keyed Cryptographic Mode: Requires secret key
      const hmac = crypto.createHmac('sha256', this.config.secretKey!);
      hmac.update(`${wearableId}:${epochIndex}:${seed}`);
      rawHex = hmac.digest('hex').substring(0, hexLength).toUpperCase();
    } else {
      // Simulation-Grade Deterministic Mode: strictly for reproducible simulation
      // NOT cryptographically secure.
      const mixedSeed = (
        (seed ^ (this.hashStringToInt(wearableId) * 0x9e3779b9) ^ (epochIndex * 0x85ebca6b)) >>> 0
      );
      const prng = new SeededRandom(mixedSeed);
      rawHex = this.generatePrngHex(prng, hexLength).toUpperCase();
    }

    const candidatePseudonym = `PSEUDO-${rawHex}`;
    this.totalGeneratedCount++;

    // Collision Detection & Logging
    const existing = this.generatedRegistry.get(candidatePseudonym);
    if (existing) {
      if (existing.wearableId !== wearableId || existing.epochIndex !== epochIndex) {
        this.collisionLedger.push({
          pseudonym: candidatePseudonym,
          originalWearableId: existing.wearableId,
          collidingWearableId: wearableId,
          epochIndex,
          timestampMs: Date.now(),
        });
      }
    } else {
      this.generatedRegistry.set(candidatePseudonym, { wearableId, epochIndex });
    }

    return candidatePseudonym;
  }

  /**
   * Compute comprehensive collision metrics and theoretical birthday bound approximation.
   */
  public getCollisionMetrics(): CollisionMetrics {
    const k = this.totalGeneratedCount;
    const bits = this.config.namespaceBits ?? 64;
    const s = Math.pow(2, bits);

    // Theoretical birthday-bound collision approximation: P(collision) ≈ 1 - exp(-k*(k-1) / (2*S))
    let theoreticalBound = 0;
    if (k > 1) {
      const exponent = -((k * (k - 1)) / (2 * s));
      theoreticalBound = 1 - Math.exp(exponent);
    }

    const collisionCount = this.collisionLedger.length;
    const empiricalCollisionRate = k > 0 ? collisionCount / k : 0;

    return {
      totalGenerated: k,
      collisionCount,
      empiricalCollisionRate,
      namespaceBits: bits,
      theoreticalBirthdayBound: Math.max(0, Math.min(1, theoreticalBound)),
    };
  }

  public getCollisionLedger(): readonly CollisionRecord[] {
    return this.collisionLedger;
  }

  private hashStringToInt(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  private generatePrngHex(prng: SeededRandom, length: number): string {
    let hex = '';
    while (hex.length < length) {
      const byte = prng.nextInt(0, 255);
      hex += byte.toString(16).padStart(2, '0');
    }
    return hex.substring(0, length);
  }
}
