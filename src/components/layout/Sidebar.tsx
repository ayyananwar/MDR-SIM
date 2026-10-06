import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MonitorPlay,
  UserPlus,
  Router,
  BrainCircuit,
  SearchCheck,
  Activity,
  Shield,
  Zap,
  Database,
} from 'lucide-react';
import { useSimulationStore } from '../../stores/useSimulationStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', desc: 'System Overview', layer: 'Hospital Dashboard' as const },
  { to: '/simulation', icon: MonitorPlay, label: 'Live Simulation', desc: 'Digital Twin', layer: 'BLE Communication' as const },
  { to: '/registration', icon: UserPlus, label: 'Registration', desc: 'Patient Intake', layer: 'Wearable Layer' as const },
  { to: '/gateway', icon: Router, label: 'Edge Gateways', desc: 'IoT Pipeline', layer: 'Gateway Layer' as const },
  { to: '/risk-engine', icon: BrainCircuit, label: 'Risk Engine', desc: 'Bayesian Network', layer: 'Bayesian Risk Engine' as const },
  { to: '/exposure', icon: SearchCheck, label: 'Exposure Investigation', desc: 'Contact Tracing', layer: 'Central Server' as const },
  { to: '/dataset-generator', icon: Database, label: 'Dataset & DBN Suite', desc: '100k Generator & CPTs', layer: 'Bayesian Risk Engine' as const },
];

export default function Sidebar() {
  const location = useLocation();
  const { isRunning, speed, setCurrentLayer } = useSimulationStore();

  return (
    <aside className="w-64 shrink-0 h-screen flex flex-col z-30 border-r"
      style={{
        background: 'linear-gradient(180deg, #070A12 0%, #0B0F1A 100%)',
        borderColor: 'rgba(255,255,255,0.04)',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center relative"
            style={{
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)',
            }}
          >
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white text-[15px] font-bold tracking-tight">MedTrace</h1>
            <p className="text-[10px] font-medium tracking-wider uppercase"
              style={{ color: '#6366F1' }}
            >
              Smart Hospital
            </p>
          </div>
        </div>
      </div>

      {/* System Status Banner */}
      <div className="mx-3 mt-4 mb-1 px-3 py-2.5 rounded-xl" style={{
        background: isRunning 
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.03))'
          : 'linear-gradient(135deg, rgba(100, 116, 139, 0.08), rgba(100, 116, 139, 0.03))',
        border: `1px solid ${isRunning ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.1)'}`,
      }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400' : 'bg-slate-500'}`}
              style={isRunning ? { boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)' } : {}}
            />
            <span className={`text-[11px] font-semibold ${isRunning ? 'text-emerald-400' : 'text-slate-500'}`}>
              {isRunning ? 'SIMULATION ACTIVE' : 'PAUSED'}
            </span>
          </div>
          {isRunning && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md"
              style={{
                background: 'rgba(99, 102, 241, 0.1)',
                color: '#A5B4FC',
                border: '1px solid rgba(99, 102, 241, 0.15)',
              }}
            >
              {speed}x
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <p className="px-3 pt-2 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Command Modules
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setCurrentLayer(item.layer)}
            className={({ isActive }) =>
              `sidebar-link btn-tactile group ${isActive ? 'active' : 'text-slate-400 hover:text-slate-200'}`
            }
          >
            <item.icon className="w-[18px] h-[18px] flex-shrink-0 transition-transform group-hover:scale-110" />
            <div className="min-w-0">
              <span className="block text-[13px] font-medium leading-tight">{item.label}</span>
              <span className="block text-[11px] mt-0.5 text-slate-400 group-hover:text-slate-300 transition-colors">{item.desc}</span>
            </div>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/[0.06] bg-slate-950/40">
        <div className="flex items-center gap-2 mb-1.5">
          <Zap className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span className="text-[11px] font-semibold text-slate-300">
            BLE Contact Tracing
          </span>
        </div>
        <p className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
          <span>MDR-TB Digital Twin</span>
          <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300 text-[9px]">v2.2.0</span>
        </p>
      </div>
    </aside>
  );
}
