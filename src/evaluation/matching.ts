/**
 * Contact-Session Temporal Matching Algorithm (Phase 5).
 *
 * Implements canonical entity identity resolution (Person <-> Wearable) and
 * temporal overlap evaluation via Intersection-over-Union (IoU):
 *
 * IoU = Duration(intersection) / Duration(union)
 *
 * CRITICAL BOUNDARY:
 * Person-to-Wearable identity resolution is strictly evaluation-only.
 */

import type { GroundTruthContact } from '../simulation/groundTruth.js';
import type { Person } from '../simulation/scenarioTypes.js';
import type { ContactSession } from '../edge/edgeTypes.js';
import type { MatchedSessionPair, MatchingConfig } from './evaluationTypes.js';

export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  minOverlapIoU: 0.2,
  minOverlapSeconds: 5.0,
  maxTemporalDiscrepancySeconds: 60.0,
};

export interface MatchingResult {
  matchedPairs: MatchedSessionPair[];
  unmatchedGroundTruth: GroundTruthContact[];
  unmatchedDetected: ContactSession[];
  fragmentationCounts: Map<string, number>; // groundTruth key -> count of overlapping detected sessions
  mergeCounts: Map<string, number>; // detected session ID -> count of overlapping groundTruth contacts
}

/**
 * Construct bidirectional canonical identity maps between Person and Wearable.
 */
export function buildIdentityMaps(people: Person[]): {
  personToWearable: Map<string, string>;
  wearableToPerson: Map<string, string>;
} {
  const personToWearable = new Map<string, string>();
  const wearableToPerson = new Map<string, string>();

  for (const person of people) {
    personToWearable.set(person.personId, person.wearableId);
    wearableToPerson.set(person.wearableId, person.personId);
  }

  return { personToWearable, wearableToPerson };
}

/**
 * Canonicalize wearable pair so that wearableA < wearableB.
 */
export function getCanonicalWearablePair(w1: string, w2: string): {
  wearableA: string;
  wearableB: string;
  key: string;
} {
  if (w1 < w2) {
    return { wearableA: w1, wearableB: w2, key: `${w1}::${w2}` };
  }
  return { wearableA: w2, wearableB: w1, key: `${w2}::${w1}` };
}

/**
 * Calculate temporal overlap metrics between two time intervals [startA, endA] and [startB, endB].
 */
export function calculateIntervalOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): {
  overlapSeconds: number;
  unionSeconds: number;
  iou: number;
} {
  const interStart = Math.max(startA, startB);
  const interEnd = Math.min(endA, endB);
  const overlapSeconds = Math.max(0, interEnd - interStart);

  const unionStart = Math.min(startA, startB);
  const unionEnd = Math.max(endA, endB);
  const unionSeconds = Math.max(1e-6, unionEnd - unionStart);

  const iou = overlapSeconds / unionSeconds;

  return { overlapSeconds, unionSeconds, iou };
}

/**
 * Match detected contact sessions to independent ground-truth contacts.
 */
export function matchContactSessions(
  groundTruthContacts: GroundTruthContact[],
  detectedSessions: ContactSession[],
  people: Person[],
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG
): MatchingResult {
  const { personToWearable, wearableToPerson } = buildIdentityMaps(people);

  // Group detected sessions by canonical wearable key: `${wearableA}::${wearableB}`
  const detectedByPair = new Map<string, ContactSession[]>();
  for (const session of detectedSessions) {
    const key = `${session.wearableA}::${session.wearableB}`;
    const list = detectedByPair.get(key) ?? [];
    list.push(session);
    detectedByPair.set(key, list);
  }

  // Candidate match record
  interface CandidateMatch {
    gtContact: GroundTruthContact;
    detectedSession: ContactSession;
    iou: number;
    overlapSeconds: number;
    personA: string;
    personB: string;
    wearableA: string;
    wearableB: string;
  }

  const allCandidates: CandidateMatch[] = [];
  const fragmentationCounts = new Map<string, number>();
  const mergeCounts = new Map<string, number>();

  // Find all qualifying overlaps
  for (let i = 0; i < groundTruthContacts.length; i++) {
    const gt = groundTruthContacts[i];
    const gtKey = `gt-${gt.personA}-${gt.personB}-${gt.startTime}`;

    const w1 = personToWearable.get(gt.personA);
    const w2 = personToWearable.get(gt.personB);
    if (!w1 || !w2) continue;

    const { wearableA, wearableB, key: pairKey } = getCanonicalWearablePair(w1, w2);
    const sessions = detectedByPair.get(pairKey) ?? [];

    let overlappingSessionsCount = 0;

    for (const det of sessions) {
      const { overlapSeconds, iou } = calculateIntervalOverlap(
        gt.startTime,
        gt.endTime,
        det.startTime,
        det.endTime
      );

      const minOverlapSec = config.minOverlapSeconds ?? 0;
      if (iou >= config.minOverlapIoU && overlapSeconds >= minOverlapSec) {
        overlappingSessionsCount++;
        allCandidates.push({
          gtContact: gt,
          detectedSession: det,
          iou,
          overlapSeconds,
          personA: gt.personA,
          personB: gt.personB,
          wearableA,
          wearableB,
        });

        // Increment merge counts for this detected session
        mergeCounts.set(det.sessionId, (mergeCounts.get(det.sessionId) ?? 0) + 1);
      }
    }

    fragmentationCounts.set(gtKey, overlappingSessionsCount);
  }

  // Sort candidates by highest IoU for greedy 1-to-1 matching
  allCandidates.sort((a, b) => b.iou - a.iou);

  const matchedGtKeys = new Set<string>();
  const matchedDetIds = new Set<string>();
  const matchedPairs: MatchedSessionPair[] = [];

  for (const candidate of allCandidates) {
    const gtKey = `gt-${candidate.gtContact.personA}-${candidate.gtContact.personB}-${candidate.gtContact.startTime}`;
    const detId = candidate.detectedSession.sessionId;

    if (!matchedGtKeys.has(gtKey) && !matchedDetIds.has(detId)) {
      matchedGtKeys.add(gtKey);
      matchedDetIds.add(detId);

      const startError = candidate.detectedSession.startTime - candidate.gtContact.startTime;
      const endError = candidate.detectedSession.endTime - candidate.gtContact.endTime;
      const durationError = candidate.detectedSession.durationSeconds - candidate.gtContact.durationSeconds;

      matchedPairs.push({
        groundTruthContact: candidate.gtContact,
        detectedSession: candidate.detectedSession,
        personA: candidate.personA,
        personB: candidate.personB,
        wearableA: candidate.wearableA,
        wearableB: candidate.wearableB,
        overlapIoU: candidate.iou,
        overlapSeconds: candidate.overlapSeconds,
        startTimeErrorSeconds: startError,
        endTimeErrorSeconds: endError,
        durationErrorSeconds: durationError,
        absoluteDurationErrorSeconds: Math.abs(durationError),
      });
    }
  }

  // Collect unmatched
  const unmatchedGroundTruth = groundTruthContacts.filter((gt) => {
    const gtKey = `gt-${gt.personA}-${gt.personB}-${gt.startTime}`;
    return !matchedGtKeys.has(gtKey);
  });

  const unmatchedDetected = detectedSessions.filter((det) => !matchedDetIds.has(det.sessionId));

  return {
    matchedPairs,
    unmatchedGroundTruth,
    unmatchedDetected,
    fragmentationCounts,
    mergeCounts,
  };
}

/**
 * Resolves ground-truth person pairs into canonical wearable pair keys.
 * Format: `${wearableA}::${wearableB}` where wearableA < wearableB.
 */
export function deriveGroundTruthWearablePairs(
  groundTruthContacts: GroundTruthContact[],
  people: Person[]
): Set<string> {
  const { personToWearable } = buildIdentityMaps(people);
  const canonicalPairs = new Set<string>();

  for (const contact of groundTruthContacts) {
    const wA = personToWearable.get(contact.personA);
    const wB = personToWearable.get(contact.personB);
    if (!wA || !wB) continue;
    const { key } = getCanonicalWearablePair(wA, wB);
    canonicalPairs.add(key);
  }

  return canonicalPairs;
}

/**
 * Check if a risk assessment wearable pair matches an authoritative ground-truth contact pair.
 * Handles reversed pair ordering and canonicalizes wearable IDs.
 */
export function isGroundTruthContactPair(
  targetWearableId: string | undefined,
  sourceWearableId: string | undefined,
  canonicalGroundTruthPairs: Set<string>
): boolean {
  if (!targetWearableId || !sourceWearableId) return false;
  const { key } = getCanonicalWearablePair(targetWearableId, sourceWearableId);
  return canonicalGroundTruthPairs.has(key);
}
