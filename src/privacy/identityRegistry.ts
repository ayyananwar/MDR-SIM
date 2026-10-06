/**
 * Authorized Identity Registry (Phase 6).
 *
 * Implements authoritative resolution:
 * Pseudonym -> WearableId -> PersonId
 *
 * CRITICAL ACCESS CONTROL CONSTRAINT:
 * Resolution succeeds ONLY when the caller provides an AuthorizationContext
 * with 'admin' or 'authorized-investigator' credentials. Unprivileged callers
 * receive null / access denial.
 */

import type { Person } from '../simulation/scenarioTypes.js';
import type {
  AuthorizationContext,
  PseudonymEpoch,
  ResolvedIdentity,
} from './privacyTypes.js';

export class IdentityRegistry {
  private epochsByPseudonym = new Map<string, PseudonymEpoch[]>();
  private personByWearable = new Map<string, Person>();

  /**
   * Register generated rotation schedules and population metadata into the authorized store.
   */
  public registerSchedules(epochs: PseudonymEpoch[], people: Person[]): void {
    this.epochsByPseudonym.clear();
    this.personByWearable.clear();

    for (const epoch of epochs) {
      const list = this.epochsByPseudonym.get(epoch.pseudonym) ?? [];
      list.push(epoch);
      this.epochsByPseudonym.set(epoch.pseudonym, list);
    }

    for (const p of people) {
      this.personByWearable.set(p.wearableId, p);
    }
  }

  /**
   * Attempt to resolve a pseudonymous identifier to its underlying wearable and person identity.
   *
   * @param pseudonym The intercepted broadcast identifier
   * @param timestampMs Simulation timestamp in milliseconds
   * @param context Authorization credentials of the caller
   * @returns Resolved identity if authorized, or null if denied / not found
   */
  public resolvePseudonym(
    pseudonym: string,
    timestampMs: number,
    context: AuthorizationContext
  ): ResolvedIdentity | null {
    // 1. Authorization Gate
    if (!this.isAuthorized(context)) {
      return null;
    }

    // 2. Lookup Epoch
    const epochs = this.epochsByPseudonym.get(pseudonym);
    if (!epochs || epochs.length === 0) {
      return null;
    }

    // Find epoch valid at the specified timestamp
    let matchingEpoch = epochs.find(
      (e) => timestampMs >= e.validFromMs && timestampMs <= e.validToMs
    );
    if (!matchingEpoch) {
      matchingEpoch = epochs[0];
    }

    const person = this.personByWearable.get(matchingEpoch.wearableId);

    return {
      wearableId: matchingEpoch.wearableId,
      personId: person?.personId,
      role: person?.role,
      sourceStatus: person?.sourceStatus,
    };
  }

  /**
   * Batch resolve a list of pseudonyms at given timestamps for authorized edge processing.
   */
  public batchResolve(
    queries: Array<{ pseudonym: string; timestampMs: number }>,
    context: AuthorizationContext
  ): Map<string, string> {
    const map = new Map<string, string>();
    if (!this.isAuthorized(context)) {
      return map;
    }

    for (const q of queries) {
      const resolved = this.resolvePseudonym(q.pseudonym, q.timestampMs, context);
      if (resolved) {
        map.set(`${q.pseudonym}@${q.timestampMs}`, resolved.wearableId);
      }
    }

    return map;
  }

  /**
   * Verify whether the provided authorization context possesses resolution privileges.
   */
  public isAuthorized(context?: AuthorizationContext): boolean {
    if (!context) return false;
    return context.role === 'admin' || context.role === 'authorized-investigator';
  }

  /**
   * Get total registered active pseudonyms count (authorized view only).
   */
  public getRegisteredPseudonymCount(context: AuthorizationContext): number {
    if (!this.isAuthorized(context)) return 0;
    return this.epochsByPseudonym.size;
  }
}
