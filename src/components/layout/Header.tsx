import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Layers, Sparkles } from 'lucide-react';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useHospitalStore } from '../../stores/useHospitalStore';

const routeNames: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Smart Hospital Dashboard', subtitle: 'Real-time telemetry & clinical surveillance' },
  '/simulation': { title: 'Live Digital Hospital', subtitle: 'Interactive 2D spatial twin & BLE RF tracing' },
  '/registration': { title: 'Patient & Staff Registration', subtitle: 'Wearable provisioning & hardware linkage' },
  '/gateway': { title: 'Edge Gateway Telemetry', subtitle: 'Raspberry Pi IoT ingestion & 8-stage pipeline' },
  '/risk-engine': { title: 'Bayesian Risk Engine', subtitle: 'Dynamic probabilistic infection assessment' },
  '/exposure': { title: 'Exposure Investigation', subtitle: 'Multi-hop contact tracing & isolation protocol' },
  '/dataset-generator': { title: 'Synthetic Dataset & DBN Suite', subtitle: '100,000 encounters & CPT derivation' },
};

export default function Header() {
  const location = useLocation();
  const [time, setTime] = useState(new Date());
  const { isRunning, currentLayer, toggleArchitectureOverlay } = useSimulationStore();
  const alerts = useHospitalStore((s) => s.alerts);
  const unacknowledged = alerts.filter((a) => !a.acknowledged).length;

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const route = routeNames[location.pathname] || { title: 'MedTrace Digital Twin', subtitle: 'Smart Hospital Infection Surveillance' };

  return (
    <header className="h-14 flex items-center justify-between px-6 sticky top-0 z-20 border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-[14px] font-semibold text-slate-100 leading-tight tracking-tight">{route.title}</h2>
          <p className="text-[11px] font-medium text-slate-400">{route.subtitle}</p>
        </div>
        {isRunning && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold tracking-wider text-emerald-400">LIVE SURVEILLANCE</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Architecture Layer Chip */}
        <button
          onClick={toggleArchitectureOverlay}
          className="btn-tactile flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 transition-colors shadow-sm"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px] text-slate-400">Layer:</span>
          <span className="text-[11px] font-semibold text-indigo-200">{currentLayer}</span>
        </button>

        {/* Alerts */}
        <div className="relative">
          <button
            className={`btn-tactile w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              unacknowledged > 0
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
                : 'bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08]'
            }`}
            title={`${unacknowledged} unacknowledged alerts`}
          >
            <Bell className="w-4 h-4" />
          </button>
          {unacknowledged > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center bg-gradient-to-tr from-rose-600 to-red-500 shadow-md animate-pulse">
              {unacknowledged}
            </span>
          )}
        </div>

        {/* Real-time Clock */}
        <div className="text-[12px] font-mono tabular-nums px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300 shadow-inner">
          {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </div>
      </div>
    </header>
  );
}
