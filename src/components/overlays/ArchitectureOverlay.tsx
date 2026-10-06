import React from 'react';
import { motion } from 'framer-motion';
import { X, Layers, Wifi, Radio, Router, Cpu, Server, BrainCircuit, LayoutDashboard, ArrowDown } from 'lucide-react';
import { useSimulationStore } from '../../stores/useSimulationStore';

const layers = [
  { name: 'Wearable Layer', icon: Wifi, color: '#3B82F6', desc: 'BLE wristbands on patients, staff, and visitors' },
  { name: 'BLE Communication', icon: Radio, color: '#8B5CF6', desc: 'ADV_NONCONN_IND packets with rotating Session IDs' },
  { name: 'Gateway Layer', icon: Router, color: '#F59E0B', desc: 'Raspberry Pi edge gateways capturing BLE advertisements' },
  { name: 'Edge Processing', icon: Cpu, color: '#10B981', desc: 'Packet validation, dedup, RSSI filtering, distance estimation' },
  { name: 'Central Server', icon: Server, color: '#6366F1', desc: 'Identity mapping, contact session storage, analytics' },
  { name: 'Bayesian Risk Engine', icon: BrainCircuit, color: '#EC4899', desc: 'Dynamic Bayesian Network for infection risk assessment' },
  { name: 'Hospital Dashboard', icon: LayoutDashboard, color: '#0EA5E9', desc: 'Real-time monitoring, alerts, exposure investigation' },
];

export default function ArchitectureOverlay() {
  const { currentLayer, toggleArchitectureOverlay } = useSimulationStore();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
      onClick={toggleArchitectureOverlay}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-[#111827] rounded-2xl shadow-2xl w-[520px] max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">System Architecture</h3>
              <p className="text-[11px] text-slate-500">BLE-Based MDR-TB Contact Tracing Framework</p>
            </div>
          </div>
          <button onClick={toggleArchitectureOverlay} className="w-8 h-8 rounded-lg hover:bg-[#1E293B] flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Layers */}
        <div className="px-6 py-5 space-y-2">
          {layers.map((layer, i) => {
            const isActive = currentLayer === layer.name;
            return (
              <React.Fragment key={layer.name}>
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-900/20 border-2 border-blue-500/20 shadow-sm'
                      : 'bg-[#0F172A] border-2 border-transparent hover:bg-[#1E293B]'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${layer.color}15` }}
                  >
                    <layer.icon className="w-4 h-4" style={{ color: layer.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white">{layer.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{layer.desc}</p>
                  </div>
                  {isActive && (
                    <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold rounded-full shadow-sm">
                      CURRENT
                    </span>
                  )}
                </motion.div>
                {i < layers.length - 1 && (
                  <div className="flex justify-center">
                    <ArrowDown className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#0F172A] border-t border-white/6">
          <p className="text-[10px] text-slate-500 text-center">
            Data flows from Wearable Layer through Edge Processing to Central Server. Privacy is preserved through rotating Session IDs.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
