/**
 * Privacy & Pseudonym Linkage Metrics Evaluation (Phase 6).
 *
 * Exposes production privacy evaluation functions, linkage assessment,
 * collision quantification, and privacy-utility trade-offs.
 */

import type { PrivacyMetricsScaffold } from './evaluationTypes.js';

export {
  executeLinkageAttack,
  evaluateLinkagePredictions,
} from '../privacy/linkageAttack.js';

export {
  executeIdentityInferenceAttack,
  evaluateIdentityInference,
} from '../privacy/identityInference.js';

export {
  calculateMeanExposureDurationSeconds,
  calculatePrivacyTradeoff,
} from '../privacy/privacyMetrics.js';

export {
  evaluateSingleSeedPrivacy,
  runPrivacyExperimentSuite,
} from '../privacy/privacyExperiment.js';

/**
 * Get current Phase 6 privacy evaluation implementation status.
 */
export function getPrivacyScaffoldStatus(): PrivacyMetricsScaffold {
  return {
    rotationImplemented: true,
    phase: 'phase6-production',
    notes:
      'Phase 6 privacy mechanisms (pseudonym rotation, multi-observation linkage attack, identity inference, and privacy-utility tradeoff) fully implemented.',
  };
}
