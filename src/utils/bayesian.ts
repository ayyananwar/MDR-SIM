// ============================================================
// Bayesian Risk Calculation Utilities
// ============================================================

import type { RiskCategory } from '../types';

/**
 * Bayesian update: P(A|B) = P(B|A) * P(A) / P(B)
 * 
 * For our contact tracing:
 * - P(infected) = prior probability of infection
 * - P(evidence | infected) = likelihood given close contact parameters
 * - P(infected | evidence) = posterior probability after observation
 */
export function bayesianUpdate(
  prior: number,
  likelihood: number,
  evidenceProbability: number
): number {
  if (evidenceProbability === 0) return prior;
  const posterior = (likelihood * prior) / evidenceProbability;
  return Math.min(Math.max(posterior, 0), 1);
}

/**
 * Calculate likelihood based on contact parameters
 */
export function calculateLikelihood(
  durationMinutes: number,
  rssi: number,
  repeatedContacts: number,
  isMDRTBConfirmed: boolean
): number {
  // If contact is not with a confirmed MDR-TB positive person, transmission risk is zero
  if (!isMDRTBConfirmed) {
    return 0.01;
  }

  // Exposure to confirmed MDR-TB case:
  // Duration factor: longer exposure → higher transmission risk (>15 min significant)
  const durationFactor = Math.min(durationMinutes / 30, 1) * 0.35;

  // RSSI factor: stronger signal → closer proximity (-30 dBm close, -80 dBm far)
  const normalizedRSSI = Math.max(0, Math.min(1, (rssi + 80) / 50));
  const rssiFactor = normalizedRSSI * 0.35;

  // Repeated contacts: more interactions → higher cumulative risk
  const repeatFactor = Math.min(repeatedContacts / 5, 1) * 0.15;

  const baseMdrBoost = 0.15;

  let likelihood = durationFactor + rssiFactor + repeatFactor + baseMdrBoost;
  return Math.min(Math.max(likelihood, 0.05), 0.99);
}

/**
 * Calculate evidence probability (normalization constant)
 * P(B) = P(B|A)*P(A) + P(B|¬A)*P(¬A)
 */
export function calculateEvidence(
  prior: number,
  likelihood: number,
  falsePositiveRate: number = 0.05
): number {
  return likelihood * prior + falsePositiveRate * (1 - prior);
}

/**
 * Full Bayesian risk assessment
 */
export function calculateRisk(
  prior: number,
  durationMinutes: number,
  rssi: number,
  repeatedContacts: number,
  isMDRTBConfirmed: boolean
): { prior: number; likelihood: number; posterior: number; riskPercent: number; category: RiskCategory } {
  if (!isMDRTBConfirmed) {
    const riskPercent = Math.round(prior * 100);
    return { prior, likelihood: 0.01, posterior: prior, riskPercent, category: getRiskCategory(riskPercent) };
  }

  const likelihood = calculateLikelihood(durationMinutes, rssi, repeatedContacts, isMDRTBConfirmed);
  const evidence = calculateEvidence(prior, likelihood);
  const posterior = bayesianUpdate(prior, likelihood, evidence);
  const riskPercent = Math.round(posterior * 100);
  const category = getRiskCategory(riskPercent);

  return { prior, likelihood, posterior, riskPercent, category };
}

/**
 * Get risk category from percentage
 */
export function getRiskCategory(riskPercent: number): RiskCategory {
  if (riskPercent >= 70) return 'Critical';
  if (riskPercent >= 40) return 'High';
  if (riskPercent >= 20) return 'Medium';
  return 'Low';
}

/**
 * Get risk color for the category
 */
export function getRiskColor(category: RiskCategory): string {
  switch (category) {
    case 'Critical': return '#DC2626';
    case 'High': return '#F59E0B';
    case 'Medium': return '#3B82F6';
    case 'Low': return '#10B981';
  }
}

/**
 * Base prior probability for different roles
 */
export function getBasePrior(role: string): number {
  switch (role) {
    case 'patient': return 0.05;
    case 'doctor': return 0.02;
    case 'nurse': return 0.03;
    case 'visitor': return 0.01;
    default: return 0.02;
  }
}
