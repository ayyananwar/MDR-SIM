// ============================================================
// Simulation Store — Controls simulation tick, movement, BLE
// ============================================================

import { create } from 'zustand';
import type { SimulationControls, ArchitectureLayer } from '../types';

interface SimulationState extends SimulationControls {
  tickCount: number;
  currentLayer: ArchitectureLayer;
  guidedWorkflowActive: boolean;
  guidedWorkflowStep: number;
  architectureOverlayOpen: boolean;

  // Actions
  start: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: 1 | 2 | 5) => void;
  tick: () => void;
  toggleBLESignals: () => void;
  togglePacketFlow: () => void;
  toggleRSSIView: () => void;
  toggleGatewayCoverage: () => void;
  toggleBayesianOverlay: () => void;
  setCurrentLayer: (layer: ArchitectureLayer) => void;
  startGuidedWorkflow: () => void;
  stopGuidedWorkflow: () => void;
  setGuidedWorkflowStep: (step: number) => void;
  toggleArchitectureOverlay: () => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  isRunning: true,
  speed: 1,
  tickCount: 0,
  showBLESignals: true,
  showPacketFlow: true,
  showRSSIView: false,
  showGatewayCoverage: true,
  showBayesianOverlay: false,
  currentLayer: 'Hospital Dashboard',
  guidedWorkflowActive: false,
  guidedWorkflowStep: 0,
  architectureOverlayOpen: false,

  start: () => set({ isRunning: true }),
  pause: () => set({ isRunning: false }),
  reset: () => set({ isRunning: false, tickCount: 0, guidedWorkflowActive: false, guidedWorkflowStep: 0 }),
  setSpeed: (speed) => set({ speed }),
  tick: () => set((s) => ({ tickCount: s.tickCount + 1 })),
  toggleBLESignals: () => set((s) => ({ showBLESignals: !s.showBLESignals })),
  togglePacketFlow: () => set((s) => ({ showPacketFlow: !s.showPacketFlow })),
  toggleRSSIView: () => set((s) => ({ showRSSIView: !s.showRSSIView })),
  toggleGatewayCoverage: () => set((s) => ({ showGatewayCoverage: !s.showGatewayCoverage })),
  toggleBayesianOverlay: () => set((s) => ({ showBayesianOverlay: !s.showBayesianOverlay })),
  setCurrentLayer: (layer) => set({ currentLayer: layer }),
  startGuidedWorkflow: () => set({ guidedWorkflowActive: true, guidedWorkflowStep: 0, isRunning: true }),
  stopGuidedWorkflow: () => set({ guidedWorkflowActive: false, guidedWorkflowStep: 0 }),
  setGuidedWorkflowStep: (step) => set({ guidedWorkflowStep: step }),
  toggleArchitectureOverlay: () => set((s) => ({ architectureOverlayOpen: !s.architectureOverlayOpen })),
}));
