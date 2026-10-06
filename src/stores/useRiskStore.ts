// ============================================================
// Risk Store — Bayesian Risk Assessments
// ============================================================

import { create } from 'zustand';
import type { RiskAssessment, RiskCategory } from '../types';
import { calculateRisk, getBasePrior, getRiskCategory } from '../utils/bayesian';

interface RiskState {
  assessments: Record<string, RiskAssessment>;

  // Actions
  initializeRisk: (personId: string, personName: string, personRole: string) => void;
  updateRisk: (
    personId: string,
    durationMinutes: number,
    rssi: number,
    repeatedContacts: number,
    isMDRTBConfirmed: boolean,
    eventDescription: string
  ) => RiskAssessment | null;
  propagateRisk: (infectedPersonId: string, contactPersonIds: string[], contactDurations: number[], contactRSSIs: number[]) => void;
  getRiskFor: (personId: string) => RiskAssessment | undefined;
  getHighRiskPeople: () => RiskAssessment[];
  reset: () => void;
}

export const useRiskStore = create<RiskState>((set, get) => ({
  assessments: {},

  initializeRisk: (personId, personName, personRole) => {
    const basePrior = getBasePrior(personRole);
    const assessment: RiskAssessment = {
      personId,
      personName,
      personRole: personRole as RiskAssessment['personRole'],
      prior: basePrior,
      likelihood: 0,
      posterior: basePrior,
      riskPercent: Math.round(basePrior * 100),
      category: getRiskCategory(Math.round(basePrior * 100)),
      history: [{
        timestamp: Date.now(),
        event: 'Initial risk assessment',
        prior: basePrior,
        posterior: basePrior,
        riskPercent: Math.round(basePrior * 100),
      }],
      lastUpdated: Date.now(),
    };

    set((s) => ({
      assessments: { ...s.assessments, [personId]: assessment },
    }));
  },

  updateRisk: (personId, durationMinutes, rssi, repeatedContacts, isMDRTBConfirmed, eventDescription) => {
    const current = get().assessments[personId];
    if (!current) return null;

    const basePrior = getBasePrior(current.personRole);
    const result = calculateRisk(basePrior, durationMinutes, rssi, repeatedContacts, isMDRTBConfirmed);

    const updated: RiskAssessment = {
      ...current,
      prior: result.prior,
      likelihood: result.likelihood,
      posterior: result.posterior,
      riskPercent: result.riskPercent,
      category: result.category,
      history: [
        ...current.history,
        {
          timestamp: Date.now(),
          event: eventDescription,
          prior: result.prior,
          posterior: result.posterior,
          riskPercent: result.riskPercent,
        },
      ].slice(-20),
      lastUpdated: Date.now(),
    };

    set((s) => ({
      assessments: { ...s.assessments, [personId]: updated },
    }));

    return updated;
  },

  propagateRisk: (infectedPersonId, contactPersonIds, contactDurations, contactRSSIs) => {
    contactPersonIds.forEach((contactId, i) => {
      const duration = contactDurations[i] || 10;
      const rssi = contactRSSIs[i] || -55;
      get().updateRisk(
        contactId,
        duration,
        rssi,
        1,
        true,
        `Contact with MDR-TB positive patient`
      );
    });
  },

  getRiskFor: (personId) => get().assessments[personId],

  getHighRiskPeople: () => {
    return Object.values(get().assessments).filter(
      (a) => a.category === 'High' || a.category === 'Critical'
    );
  },

  reset: () => set({ assessments: {} }),
}));
