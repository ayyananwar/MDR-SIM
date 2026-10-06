/**
 * Standardized Baseline Models for Comparative Evaluation (Phase 5).
 *
 * CRITICAL SCIENTIFIC FAIRNESS CONSTRAINT:
 * All baselines receive the exact same observable ExposureRecord[] or ContactSession[]
 * input as the proposed Bayesian model. No baseline receives hidden ground truth,
 * physical coordinates, or true distances during inference.
 */

import { LegacyHeuristicRiskModel } from '../risk/legacyBaseline.js';
import { extractFeatures } from '../risk/featureExtraction.js';
import { assessExposureRecords } from '../risk/model.js';
import type { ExposureRecord, ExposureFeatures, FittedRiskModel, RiskAssessment } from '../risk/riskTypes.js';

export interface EvaluationMethod {
  readonly name: string;
  readonly description: string;
  train?(records: ExposureRecord[], labels: (0 | 1)[]): void;
  predict(records: ExposureRecord[]): RiskAssessment[];
}

/**
 * Baseline 1: Proximity-Only Model.
 * Uses only observed proximity evidence score as exposure probability.
 */
export class ProximityOnlyBaseline implements EvaluationMethod {
  public readonly name = 'Proximity-Only Baseline';
  public readonly description = 'Estimates exposure probability purely from normalized RF proximity evidence';

  public predict(records: ExposureRecord[]): RiskAssessment[] {
    return records.map((record) => {
      const features = extractFeatures(record);
      const prob = Math.max(0.01, Math.min(0.99, features.proximityEvidence));
      return {
        targetWearableId: record.targetWearableId,
        sourceWearableId: record.sourceWearableId,
        sessionId: record.sessionId,
        modelVersion: 'baseline-proximity-only',
        exposureProbability: prob,
        priorProbability: 0.1,
        evidence: features,
        inferenceTimestamp: record.sessionEndTime,
      };
    });
  }
}

/**
 * Baseline 2: Proximity + Duration Model.
 * Combines normalized RF proximity evidence with contact session duration.
 */
export class ProximityDurationBaseline implements EvaluationMethod {
  public readonly name = 'Proximity + Duration Baseline';
  public readonly description = 'Additive combination of normalized proximity evidence and session duration';

  public predict(records: ExposureRecord[]): RiskAssessment[] {
    return records.map((record) => {
      const features = extractFeatures(record);
      const normDuration = Math.min(1.0, features.durationSeconds / 300.0);
      const score = 0.5 * features.proximityEvidence + 0.5 * normDuration;
      const prob = Math.max(0.01, Math.min(0.99, score));
      return {
        targetWearableId: record.targetWearableId,
        sourceWearableId: record.sourceWearableId,
        sessionId: record.sessionId,
        modelVersion: 'baseline-proximity-duration',
        exposureProbability: prob,
        priorProbability: 0.1,
        evidence: features,
        inferenceTimestamp: record.sessionEndTime,
      };
    });
  }
}

/**
 * Baseline 3: Legacy Heuristic Risk Model.
 * Preserved pre-existing weighted additive scoring algorithm.
 */
export class LegacyHeuristicBaseline implements EvaluationMethod {
  public readonly name = 'Legacy Heuristic Baseline';
  public readonly description = 'Preserved weighted additive scoring model (duration, RSSI, repeats, source boost)';
  private legacyModel = new LegacyHeuristicRiskModel();

  public predict(records: ExposureRecord[]): RiskAssessment[] {
    return records.map((record) => {
      const features = extractFeatures(record);
      return this.legacyModel.predict(features, {
        targetWearableId: record.targetWearableId,
        sourceWearableId: record.sourceWearableId,
        sessionId: record.sessionId,
        timestamp: record.sessionEndTime,
      });
    });
  }
}

/**
 * Proposed Model: Causal Bayesian Likelihood Model (Phase 4).
 */
export class ProposedBayesianMethod implements EvaluationMethod {
  public readonly name = 'Proposed Bayesian Model';
  public readonly description = 'Interpretable Bayesian likelihood ratio model with Dirichlet smoothing';

  constructor(private fittedModel: FittedRiskModel) {}

  public predict(records: ExposureRecord[]): RiskAssessment[] {
    return assessExposureRecords(records, this.fittedModel);
  }
}

import { LogisticRegression } from '../risk/logisticRegression.js';
import { buildIdentityMaps, getCanonicalWearablePair } from './matching.js';
import type { CanonicalDataset } from '../datasets/schema.js';

export { getLabelsForRecords } from './recordLabels.js';

/**
 * Baseline 5: Prior-Only Baseline.
 * Uses only the empirical prevalence of the positive class as the predicted probability for all samples.
 */
export class PriorOnlyBaseline implements EvaluationMethod {
  public readonly name = 'Prior-Only Baseline';
  public readonly description = 'Constant predictor using empirical class prevalence';

  constructor(private dataset?: CanonicalDataset) {}

  public predict(records: ExposureRecord[]): RiskAssessment[] {
    const prob = 0.1;

    return records.map((record) => {
      const features = extractFeatures(record);
      return {
        targetWearableId: record.targetWearableId,
        sourceWearableId: record.sourceWearableId,
        sessionId: record.sessionId,
        modelVersion: 'baseline-prior-only',
        exposureProbability: prob,
        priorProbability: prob,
        evidence: features,
        inferenceTimestamp: record.sessionEndTime,
      };
    });
  }
}

/**
 * Baseline 6: Regularized Logistic Regression.
 * Uses Leave-One-Seed-Out (LOSO) cross-validation. The train() method is called with 
 * all records from independent seeds, preventing any trajectory or session leakage.
 */
export class LogisticRegressionBaseline implements EvaluationMethod {
  public readonly name = 'Logistic Regression Baseline';
  public readonly description = 'Regularized generalized linear baseline (LOSO-CV)';
  private model: LogisticRegression;

  constructor() {
    this.model = new LogisticRegression(5);
  }

  private extractNumericFeatures(features: ExposureFeatures): number[] {
    return [
      features.durationSeconds || 0,
      features.proximityEvidence || 0,
      features.encounterCount || 0,
      features.cumulativeDurationSeconds || 0,
      features.sourceStatus === 'confirmed' ? 1.0 : (features.sourceStatus === 'suspected' ? 0.5 : 0.0)
    ];
  }

  public train(records: ExposureRecord[], labels: (0 | 1)[]): void {
    const trainX = records.map(r => this.extractNumericFeatures(extractFeatures(r)));
    this.model.fit(trainX, labels, 200, 0.05, 0.1);
  }

  public predict(records: ExposureRecord[]): RiskAssessment[] {
    return records.map((record) => {
      const features = extractFeatures(record);
      const x = this.extractNumericFeatures(features);
      let prob = this.model.predictProbability(x);
      prob = Math.max(0.0001, Math.min(0.9999, prob)); // Bound probability safely
      
      return {
        targetWearableId: record.targetWearableId,
        sourceWearableId: record.sourceWearableId,
        sessionId: record.sessionId,
        modelVersion: 'baseline-logistic-regression',
        exposureProbability: prob,
        priorProbability: 0.1, // Fixed nominal prior
        evidence: features,
        inferenceTimestamp: record.sessionEndTime,
      };
    });
  }
}
