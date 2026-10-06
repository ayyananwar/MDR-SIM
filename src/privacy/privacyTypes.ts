/**
 * Canonical Domain Types for Privacy, Pseudonymization & Security Evaluation (Phase 6).
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * 1. Observable BLE traffic emits ONLY ephemeral pseudonyms. Stable wearable IDs,
 *    person IDs, coordinates, and clinical statuses are strictly prohibited in public broadcasts.
 * 2. Authorized identity resolution requires an explicit AuthorizationContext with
 *    valid administrative or investigator credentials.
 * 3. Attacker models consume exclusively observable public data and declared side information.
 * 4. Ground truth evaluation occurs strictly post-inference.
 */

export type PseudonymGenerationMode = 'hmac-sha256' | 'simulation-grade-prng';

export type IdentifierReusePolicy = 'disallow' | 'allow';

export interface PseudonymConfig {
  /** Generation mode: Keyed HMAC-SHA256 vs Simulation-grade deterministic PRNG */
  mode: PseudonymGenerationMode;
  /** Explicit secret key for HMAC-SHA256 (required if mode === 'hmac-sha256') */
  secretKey?: string;
  /** Base rotation interval in simulation seconds (e.g. 30, 60, 120, 300) */
  rotationIntervalSeconds: number;
  /** Optional symmetric rotation jitter in seconds: +/- jitterSeconds */
  rotationJitterSeconds?: number;
  /** Number of bits in pseudonym suffix namespace (e.g. 32 or 64, default 64) */
  namespaceBits?: number;
  /** Policy for handling identifier collisions or reuse */
  reusePolicy?: IdentifierReusePolicy;
}

export interface PseudonymEpoch {
  /** Sequential epoch index for this wearable */
  epochIndex: number;
  /** Ephemeral broadcast identifier (e.g. "PSEUDO-7F3A9C128E5B4D01") */
  pseudonym: string;
  /** Internal stable wearable identifier (authorized domain only) */
  wearableId: string;
  /** Validity start in simulation milliseconds */
  validFromMs: number;
  /** Validity end in simulation milliseconds */
  validToMs: number;
}

export type AuthorizationRole = 'admin' | 'authorized-investigator' | 'public';

export interface AuthorizationContext {
  role: AuthorizationRole;
  token?: string;
  requesterId?: string;
}

export interface ResolvedIdentity {
  wearableId: string;
  personId?: string;
  role?: string;
  sourceStatus?: string;
}

export interface CollisionRecord {
  pseudonym: string;
  originalWearableId: string;
  collidingWearableId: string;
  epochIndex: number;
  timestampMs: number;
}

export interface CollisionMetrics {
  totalGenerated: number;
  collisionCount: number;
  empiricalCollisionRate: number;
  namespaceBits: number;
  theoreticalBirthdayBound: number;
}

export interface LinkageCandidate {
  pseudonymA: string;
  pseudonymB: string;
  timeGapSeconds: number;
  gatewayA: string;
  gatewayB: string;
  gatewayDistanceMeters: number;
  meanRssiA: number;
  meanRssiB: number;
  similarityScore: number;
  predictedSameDevice: boolean;
}

export interface LinkageMetrics {
  totalCandidateTransitions: number;
  totalTransitions: number;
  trueSameDeviceCount: number;
  trueDifferentDeviceCount: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  /** Linkage success rate: TP / totalTransitions (undefined when totalTransitions is 0) */
  linkageSuccessRate?: number;
  /** Empirical unlinkability proxy: 1 - linkageSuccessRate (undefined when totalTransitions is 0) */
  unlinkabilityProxy?: number;
  identifierPersistenceDurationSeconds?: number;
}

export interface IdentityInferencePrediction {
  pseudonym: string;
  predictedPersonId: string;
  predictedRank: number;
  confidence: number;
  truePersonId?: string;
  isCorrect: boolean;
}

export interface IdentityInferenceMetrics {
  totalEvaluatedPseudonyms: number;
  top1Matches: number;
  top1Accuracy: number;
  top3Matches: number;
  top3Accuracy: number;
  coverage: number;
}

export interface PrivacyTradeoffMetrics {
  rotationIntervalSeconds: number;
  authorizedSessionCount: number;
  unprivilegedSessionCount: number;
  sessionFragmentationRatio: number;
  authorizedMeanDurationSeconds: number;
  unprivilegedMeanDurationSeconds: number;
  durationAttenuationRatio: number;
}

export interface ConsolidatedPrivacyResult {
  experimentId: string;
  config: PseudonymConfig;
  collisionMetrics: CollisionMetrics;
  linkageMetrics: LinkageMetrics;
  identityInferenceMetrics: IdentityInferenceMetrics;
  tradeoffMetrics?: PrivacyTradeoffMetrics;
  replicateCount: number;
  generatedAt: string;
}
