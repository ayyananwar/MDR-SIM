/**
 * Pseudonym Rotation Schedule Model (Phase 6).
 *
 * Implements deterministic epoch scheduling:
 * - Configurable rotation intervals (e.g. 30s, 60s, 120s, 300s, 600s)
 * - Optional randomized rotation jitter (+/- jitterSeconds)
 * - Active epoch lookup at any simulation timestamp t
 */

import { SeededRandom } from '../simulation/rng.js';
import type { PseudonymConfig, PseudonymEpoch } from './privacyTypes.js';
import { PseudonymGenerator } from './pseudonymGenerator.js';

export class RotationScheduleModel {
  private config: PseudonymConfig;
  private generator: PseudonymGenerator;
  private scheduleByWearable = new Map<string, PseudonymEpoch[]>();

  constructor(config: PseudonymConfig, generator?: PseudonymGenerator) {
    this.config = config;
    this.generator = generator ?? new PseudonymGenerator(config);
  }

  /**
   * Build complete rotation schedule for a set of wearables across the simulation window.
   */
  public generateSchedules(
    wearableIds: string[],
    durationSeconds: number,
    seed = 104729
  ): Map<string, PseudonymEpoch[]> {
    this.scheduleByWearable.clear();
    const durationMs = durationSeconds * 1000;
    const intervalMs = this.config.rotationIntervalSeconds * 1000;
    const jitterMaxMs = (this.config.rotationJitterSeconds ?? 0) * 1000;

    const scheduleRng = new SeededRandom((seed ^ 0xa5a5a5a5) >>> 0);

    for (const wearableId of wearableIds) {
      const epochs: PseudonymEpoch[] = [];

      if (intervalMs <= 0 || intervalMs >= durationMs) {
        // No rotation scenario: single static epoch across entire simulation
        const pseudonym = this.generator.generatePseudonym(wearableId, 0, seed);
        epochs.push({
          epochIndex: 0,
          pseudonym,
          wearableId,
          validFromMs: 0,
          validToMs: durationMs,
        });
      } else {
        // Multi-epoch rotation scenario
        let currentStartMs = 0;
        let epochIndex = 0;

        while (currentStartMs < durationMs) {
          // Calculate jitter for epoch boundary
          let jitter = 0;
          if (jitterMaxMs > 0) {
            jitter = scheduleRng.nextInt(-jitterMaxMs, jitterMaxMs);
          }

          let nextSwitchMs = currentStartMs + intervalMs + jitter;
          // Guard against non-advancing boundaries
          if (nextSwitchMs <= currentStartMs + 1000) {
            nextSwitchMs = currentStartMs + 1000;
          }
          if (nextSwitchMs > durationMs) {
            nextSwitchMs = durationMs;
          }

          const pseudonym = this.generator.generatePseudonym(wearableId, epochIndex, seed);

          epochs.push({
            epochIndex,
            pseudonym,
            wearableId,
            validFromMs: currentStartMs,
            validToMs: nextSwitchMs,
          });

          currentStartMs = nextSwitchMs;
          epochIndex++;
        }
      }

      this.scheduleByWearable.set(wearableId, epochs);
    }

    return this.scheduleByWearable;
  }

  /**
   * Look up active pseudonym for a wearable at a specific timestamp in milliseconds.
   */
  public getActivePseudonym(wearableId: string, timestampMs: number): string {
    const epochs = this.scheduleByWearable.get(wearableId);
    if (!epochs || epochs.length === 0) {
      return wearableId; // Fallback to raw ID if no schedule exists
    }

    for (const epoch of epochs) {
      if (timestampMs >= epoch.validFromMs && timestampMs < epoch.validToMs) {
        return epoch.pseudonym;
      }
    }

    // Return last epoch if timestamp exceeds end of simulation
    return epochs[epochs.length - 1].pseudonym;
  }

  /**
   * Get all epochs for a wearable.
   */
  public getWearableEpochs(wearableId: string): readonly PseudonymEpoch[] {
    return this.scheduleByWearable.get(wearableId) ?? [];
  }

  /**
   * Get all generated epochs across all wearables.
   */
  public getAllEpochs(): PseudonymEpoch[] {
    const all: PseudonymEpoch[] = [];
    for (const epochs of this.scheduleByWearable.values()) {
      all.push(...epochs);
    }
    return all;
  }

  public getGenerator(): PseudonymGenerator {
    return this.generator;
  }
}
