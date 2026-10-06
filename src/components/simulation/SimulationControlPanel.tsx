import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, RotateCcw, Zap, UserPlus, Stethoscope,
  HeartPulse, Users, AlertTriangle, Radio, Package,
  Signal, Radar, BrainCircuit, ChevronUp, ChevronDown, Settings2,
} from 'lucide-react';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useHospitalStore } from '../../stores/useHospitalStore';

export default function SimulationControlPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const sim = useSimulationStore();
  const hospital = useHospitalStore();

  const speedLabels: Record<number, string> = { 1: '1x', 2: '2x', 5: '5x' };

  return (
    <motion.div
      className="fixed right-5 bottom-5 z-50"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <div className="bg-[#0F172A]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
           style={{ width: isExpanded ? 280 : 280 }}>
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-white">Simulation Control</span>
            <div className={`w-2 h-2 rounded-full ${sim.isRunning ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {/* Playback Controls */}
              <div className="px-4 pb-3 border-b border-white/5">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-semibold">Playback</p>
                <div className="flex gap-2">
                  {!sim.isRunning ? (
                    <button onClick={sim.start} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors">
                      <Play className="w-3.5 h-3.5" /> Start
                    </button>
                  ) : (
                    <button onClick={sim.pause} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition-colors">
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                  )}
                  <button onClick={() => { sim.reset(); }} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Speed */}
                <div className="flex items-center gap-2 mt-2">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  <span className="text-[10px] text-slate-400">Speed</span>
                  <div className="flex gap-1 ml-auto">
                    {([1, 2, 5] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => sim.setSpeed(s)}
                        className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors ${
                          sim.speed === s
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                      >
                        {speedLabels[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Add People */}
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-semibold">Add People</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => hospital.registerPatient({ name: `Patient ${Math.floor(Math.random()*100)}`, age: 30 + Math.floor(Math.random()*40), gender: Math.random() > 0.5 ? 'Male' : 'Female', department: 'General Ward', symptoms: ['Cough','Fever'], visitType: 'Inpatient' })}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-[11px] font-medium rounded-lg transition-colors">
                    <UserPlus className="w-3 h-3" /> Patient
                  </button>
                  <button onClick={() => hospital.addDoctor()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-medium rounded-lg transition-colors">
                    <Stethoscope className="w-3 h-3" /> Doctor
                  </button>
                  <button onClick={() => hospital.addNurse()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-[11px] font-medium rounded-lg transition-colors">
                    <HeartPulse className="w-3 h-3" /> Nurse
                  </button>
                  <button onClick={() => hospital.addVisitor()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 text-[11px] font-medium rounded-lg transition-colors">
                    <Users className="w-3 h-3" /> Visitor
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-semibold">Visualization</p>
                <div className="space-y-1">
                  {[
                    { label: 'BLE Signals', icon: Radio, active: sim.showBLESignals, toggle: sim.toggleBLESignals },
                    { label: 'Packet Flow', icon: Package, active: sim.showPacketFlow, toggle: sim.togglePacketFlow },
                    { label: 'RSSI View', icon: Signal, active: sim.showRSSIView, toggle: sim.toggleRSSIView },
                    { label: 'Gateway Coverage', icon: Radar, active: sim.showGatewayCoverage, toggle: sim.toggleGatewayCoverage },
                    { label: 'Bayesian Overlay', icon: BrainCircuit, active: sim.showBayesianOverlay, toggle: sim.toggleBayesianOverlay },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={item.toggle}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                        item.active
                          ? 'bg-blue-600/20 text-blue-300'
                          : 'bg-slate-800 text-slate-500 hover:text-slate-400'
                      }`}
                    >
                      <item.icon className="w-3 h-3" />
                      {item.label}
                      <div className={`ml-auto w-7 h-4 rounded-full transition-colors flex items-center ${item.active ? 'bg-blue-600 justify-end' : 'bg-slate-600 justify-start'}`}>
                        <div className="w-3 h-3 bg-white rounded-full mx-0.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* MDR-TB Action */}
              <div className="px-4 py-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-semibold">Actions</p>
                <button
                  onClick={() => {
                    const patients = hospital.patients.filter(p => !p.isMDRTBPositive);
                    if (patients.length > 0) {
                      const target = patients[Math.floor(Math.random() * patients.length)];
                      hospital.markMDRTBPositive(target.id);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-semibold rounded-lg transition-colors border border-red-500/20"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Mark Random Patient MDR-TB+
                </button>
                <button
                  onClick={() => sim.startGuidedWorkflow()}
                  className="w-full flex items-center justify-center gap-2 py-2 mt-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-xs font-semibold rounded-lg transition-colors border border-violet-500/20"
                >
                  <Play className="w-3.5 h-3.5" />
                  Guided Workflow
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
