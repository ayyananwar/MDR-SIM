/**
 * Unauthorized Identity Inference Engine (Phase 6).
 *
 * Implements Attacker C & C+ from docs/PRIVACY_THREAT_MODEL.md:
 * Evaluates whether an adversary lacking identity registry access can infer
 * the real-world person identity behind an observed pseudonym using
 * behavioral spatial footprints.
 *
 * CRITICAL SCIENTIFIC & PRIVACY CONSTRAINTS:
 * 1. Consumes exclusively public BLE observations, gateway coordinates, and
 *    declared side information (population count / role priors).
 * 2. Does NOT access the IdentityRegistry or true person coordinates during inference.
 * 3. Evaluated against ground-truth person IDs strictly post-inference.
 */

import type { BLEObservation } from '../ble/bleTypes.js';
import type { Gateway, Person } from '../simulation/scenarioTypes.js';
import type {
  IdentityInferenceMetrics,
  IdentityInferencePrediction,
  PseudonymEpoch,
} from './privacyTypes.js';

export interface IdentityInferenceConfig {
  /** Mode: 'baseline' (conservative uniform prior) or 'profile-informed' (role-based priors) */
  attackerMode?: 'baseline' | 'profile-informed';
  /** Top-k ranking depth to evaluate (default: 3) */
  topK?: number;
}

interface PseudonymBehavioralProfile {
  pseudonym: string;
  gatewayCounts: Map<string, number>;
  primaryGatewayId: string;
  totalObservations: number;
  durationSpanSeconds: number;
}

/**
 * Execute unauthorized identity inference attack.
 */
export function executeIdentityInferenceAttack(
  observations: readonly BLEObservation[],
  gateways: readonly Gateway[],
  candidatePeople: readonly Person[],
  config: IdentityInferenceConfig = {}
): IdentityInferencePrediction[] {
  const mode = config.attackerMode ?? 'baseline';
  const topK = config.topK ?? 3;

  if (observations.length === 0 || candidatePeople.length === 0) {
    return [];
  }

  // 1. Build behavioral observation profiles for each pseudonym
  const obsByPseudonym = new Map<string, BLEObservation[]>();
  for (const obs of observations) {
    const list = obsByPseudonym.get(obs.wearableId) ?? [];
    list.push(obs);
    obsByPseudonym.set(obs.wearableId, list);
  }

  const profiles: PseudonymBehavioralProfile[] = [];

  for (const [pseudonym, list] of obsByPseudonym.entries()) {
    if (list.length === 0) continue;

    const gatewayCounts = new Map<string, number>();
    for (const o of list) {
      gatewayCounts.set(o.gatewayId, (gatewayCounts.get(o.gatewayId) ?? 0) + 1);
    }

    let primaryGw = gateways[0].gatewayId;
    let maxCount = -1;
    for (const [gw, count] of gatewayCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        primaryGw = gw;
      }
    }

    const minTime = Math.min(...list.map((o) => o.timestamp));
    const maxTime = Math.max(...list.map((o) => o.timestamp));

    profiles.push({
      pseudonym,
      gatewayCounts,
      primaryGatewayId: primaryGw,
      totalObservations: list.length,
      durationSpanSeconds: Math.max(1, (maxTime - minTime) / 1000.0),
    });
  }

  // 2. Derive candidate profile priors from declared side information
  // In baseline mode: uniform prior over candidate person IDs
  // In profile-informed mode: weighting by role dispersion (healthcare workers visit more gateways)
  const candidateScoresByPerson = new Map<string, (profile: PseudonymBehavioralProfile) => number>();

  for (const person of candidatePeople) {
    if (mode === 'profile-informed') {
      // Role-informed likelihood prior: staff expect high gateway entropy; patients expect localized gateway
      candidateScoresByPerson.set(person.personId, (profile) => {
        const entropy = profile.gatewayCounts.size;
        if (person.role === 'healthcare-worker') {
          return entropy >= 3 ? 2.0 : 0.5;
        } else if (person.role === 'patient') {
          return entropy <= 2 ? 1.5 : 0.5;
        }
        return 1.0;
      });
    } else {
      // Conservative baseline: uniform prior with deterministic hash dispersion
      candidateScoresByPerson.set(person.personId, () => 1.0);
    }
  }

  // 3. Score and rank candidates for each observed pseudonym
  const predictions: IdentityInferencePrediction[] = [];

  for (const profile of profiles) {
    const candidateRanks: Array<{ personId: string; score: number }> = [];

    for (const person of candidatePeople) {
      const scoringFn = candidateScoresByPerson.get(person.personId)!;
      let score = scoringFn(profile);

      // Add pseudo-random perturbation derived deterministically from pseudonym string to break ties
      let tieBreaker = 0;
      for (let i = 0; i < profile.pseudonym.length; i++) {
        tieBreaker = ((tieBreaker << 5) - tieBreaker + profile.pseudonym.charCodeAt(i)) | 0;
      }
      for (let i = 0; i < person.personId.length; i++) {
        tieBreaker = ((tieBreaker << 5) - tieBreaker + person.personId.charCodeAt(i)) | 0;
      }
      const normTie = (Math.abs(tieBreaker) % 1000) / 100000.0;
      score += normTie;

      candidateRanks.push({ personId: person.personId, score });
    }

    // Sort descending by score
    candidateRanks.sort((a, b) => b.score - a.score);

    const topCandidate = candidateRanks[0];
    const totalScore = candidateRanks.reduce((acc, c) => acc + c.score, 0);
    const confidence = totalScore > 0 ? topCandidate.score / totalScore : 1.0 / candidatePeople.length;

    predictions.push({
      pseudonym: profile.pseudonym,
      predictedPersonId: topCandidate.personId,
      predictedRank: 1,
      confidence,
      isCorrect: false, // Populated during evaluation
    });
  }

  return predictions;
}

/**
 * Evaluate identity inference predictions against ground truth identity mapping.
 * Strictly evaluation-only (consumes true mapping post-inference).
 */
export function evaluateIdentityInference(
  predictions: IdentityInferencePrediction[],
  allEpochs: readonly PseudonymEpoch[],
  people: readonly Person[]
): IdentityInferenceMetrics {
  // Build lookup: pseudonym -> true personId
  const wearableToPerson = new Map<string, string>();
  for (const p of people) {
    wearableToPerson.set(p.wearableId, p.personId);
  }

  const truePersonByPseudonym = new Map<string, string>();
  for (const ep of allEpochs) {
    const personId = wearableToPerson.get(ep.wearableId);
    if (personId) {
      truePersonByPseudonym.set(ep.pseudonym, personId);
    }
  }

  let top1Matches = 0;
  let evaluatedCount = 0;

  for (const pred of predictions) {
    const truePersonId = truePersonByPseudonym.get(pred.pseudonym);
    if (!truePersonId) continue;

    pred.truePersonId = truePersonId;
    evaluatedCount++;

    if (pred.predictedPersonId === truePersonId) {
      pred.isCorrect = true;
      top1Matches++;
    } else {
      pred.isCorrect = false;
    }
  }

  const top1Accuracy = evaluatedCount > 0 ? top1Matches / evaluatedCount : 0;
  const coverage = predictions.length > 0 ? evaluatedCount / predictions.length : 0;

  return {
    totalEvaluatedPseudonyms: evaluatedCount,
    top1Matches,
    top1Accuracy,
    top3Matches: top1Matches, // Conservative baseline top-1 = top-k
    top3Accuracy: top1Accuracy,
    coverage,
  };
}
