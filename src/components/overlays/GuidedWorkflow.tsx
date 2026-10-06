import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, ChevronRight, Check } from 'lucide-react';
import { useSimulationStore } from '../../stores/useSimulationStore';

const GUIDED_STEPS = [
  { id: 1, title: 'Patient Registration', desc: 'A new patient arrives at the hospital reception', route: '/registration', duration: 4000 },
  { id: 2, title: 'Wearable Assignment', desc: 'BLE wristband assigned with unique device ID', route: '/registration', duration: 3000 },
  { id: 3, title: 'BLE Broadcasting', desc: 'Wearable begins broadcasting ADV_NONCONN_IND packets', route: '/simulation', duration: 3000 },
  { id: 4, title: 'Gateway Detection', desc: 'Nearby Raspberry Pi gateway detects BLE advertisement', route: '/gateway', duration: 3500 },
  { id: 5, title: 'Packet Validation', desc: 'Edge gateway validates packet integrity and format', route: '/gateway', duration: 2500 },
  { id: 6, title: 'Duplicate Removal', desc: 'Duplicate packets filtered to reduce noise', route: '/gateway', duration: 2500 },
  { id: 7, title: 'RSSI Filtering', desc: 'Signal strength filtered for distance estimation accuracy', route: '/gateway', duration: 2500 },
  { id: 8, title: 'Contact Session Generation', desc: 'Close-proximity contact sessions created from filtered data', route: '/gateway', duration: 3000 },
  { id: 9, title: 'Server Synchronization', desc: 'Processed data synced to central hospital server', route: '/gateway', duration: 2500 },
  { id: 10, title: 'Identity Mapping', desc: 'Session IDs mapped to patient identities (server-side only)', route: '/registration', duration: 3000 },
  { id: 11, title: 'Bayesian Risk Assessment', desc: 'Dynamic Bayesian Network calculates infection probability', route: '/risk-engine', duration: 4000 },
  { id: 12, title: 'Dashboard Update', desc: 'KPIs, risk distributions, and alerts updated in real-time', route: '/', duration: 3000 },
  { id: 13, title: 'Patient Marked MDR-TB+', desc: 'Infection control officer confirms MDR-TB positive status', route: '/exposure', duration: 3500 },
  { id: 14, title: 'Exposure Investigation', desc: 'Contact network traced, timeline generated, risks propagated', route: '/exposure', duration: 4000 },
  { id: 15, title: 'Risk Alerts Generated', desc: 'High-risk contacts notified, containment protocol initiated', route: '/', duration: 3000 },
];

export default function GuidedWorkflow() {
  const navigate = useNavigate();
  const { guidedWorkflowActive, guidedWorkflowStep, setGuidedWorkflowStep, stopGuidedWorkflow } = useSimulationStore();

  const currentStep = GUIDED_STEPS[guidedWorkflowStep];

  const advanceStep = useCallback(() => {
    if (guidedWorkflowStep < GUIDED_STEPS.length - 1) {
      const nextStep = guidedWorkflowStep + 1;
      setGuidedWorkflowStep(nextStep);
      navigate(GUIDED_STEPS[nextStep].route);
    } else {
      stopGuidedWorkflow();
    }
  }, [guidedWorkflowStep, setGuidedWorkflowStep, stopGuidedWorkflow, navigate]);

  useEffect(() => {
    if (!guidedWorkflowActive || !currentStep) return;
    navigate(currentStep.route);
    const timer = setTimeout(advanceStep, currentStep.duration);
    return () => clearTimeout(timer);
  }, [guidedWorkflowActive, guidedWorkflowStep, currentStep, advanceStep, navigate]);

  if (!guidedWorkflowActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-16 right-5 z-50 w-[340px]"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
      >
        <div className="bg-[#111827]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/6 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 to-blue-600">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-white" />
              <span className="text-xs font-bold text-white">Guided Workflow</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/80 font-mono">
                {guidedWorkflowStep + 1}/{GUIDED_STEPS.length}
              </span>
              <button onClick={stopGuidedWorkflow} className="w-6 h-6 rounded-lg bg-[#111827]/20 hover:bg-[#111827]/30 flex items-center justify-center transition-colors">
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-[#1E293B]">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-blue-500"
              initial={{ width: '0%' }}
              animate={{ width: `${((guidedWorkflowStep + 1) / GUIDED_STEPS.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Current Step */}
          {currentStep && (
            <div className="p-4 guided-step-card">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-indigo-300">{currentStep.id}</span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{currentStep.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{currentStep.desc}</p>
                </div>
              </div>
            </div>
          )}

          {/* Steps List */}
          <div className="px-4 pb-3 max-h-[200px] overflow-y-auto">
            <div className="space-y-1">
              {GUIDED_STEPS.map((step, i) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] ${
                    i === guidedWorkflowStep
                      ? 'bg-blue-900/20 text-blue-400 font-semibold'
                      : i < guidedWorkflowStep
                      ? 'text-slate-400'
                      : 'text-slate-500'
                  }`}
                >
                  {i < guidedWorkflowStep ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : i === guidedWorkflowStep ? (
                    <ChevronRight className="w-3 h-3 text-blue-400" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-white/8" />
                  )}
                  <span>{step.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
