import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit, ArrowRight, TrendingUp, Activity, AlertTriangle,
  Info, ChevronRight, Zap, Shield, Target, Calculator, Sigma,
  BarChart2, FlaskConical, Cpu, Layers, Sparkles
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from 'recharts';
import { useRiskStore } from '../../stores/useRiskStore';
import { useHospitalStore } from '../../stores/useHospitalStore';
import { useContactStore } from '../../stores/useContactStore';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { calculateRisk, getRiskColor } from '../../utils/bayesian';
import { formatTime, getRoleColor } from '../../utils/formatters';

const DEMO_SCENARIOS = [
  { label: 'Brief Encounter', event: 'Patient meets doctor', duration: 5, rssi: -50, repeats: 1, mdr: false, expectedRisk: '~8%', color: '#10B981' },
  { label: 'Ward Proximity', event: 'Nurse proximity scan', duration: 8, rssi: -48, repeats: 2, mdr: false, expectedRisk: '~18%', color: '#3B82F6' },
  { label: 'Extended Stay', event: '20 min shared ward', duration: 20, rssi: -45, repeats: 3, mdr: false, expectedRisk: '~42%', color: '#F59E0B' },
  { label: 'Confirmed MDR+', event: 'Confirmed MDR-TB positive', duration: 20, rssi: -45, repeats: 4, mdr: true, expectedRisk: '~91%', color: '#EF4444' },
];

const FORMULA_VARS = [
  { label: 'Prior P(infected)', key: 'prior', color: '#3B82F6', desc: 'Hospital population baseline TB prevalence' },
  { label: 'Likelihood P(E|I)', key: 'likelihood', color: '#8B5CF6', desc: 'Likelihood of observed BLE contact given transmission' },
  { label: 'Posterior P(I|E)', key: 'posterior', color: '#EC4899', desc: 'Updated infection probability incorporating all evidence' },
];

function RiskGauge({ riskPercent, category }: { riskPercent: number; category: string }) {
  const color = getRiskColor(category as any);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (riskPercent / 100) * circumference;

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 8px ${color}80)`,
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black font-mono tracking-tight" style={{ color }}>
          {riskPercent}%
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
          Infection P(I|E)
        </span>
      </div>
    </div>
  );
}

export default function RiskEnginePage() {
  const { assessments } = useRiskStore();
  const { patients, doctors, nurses } = useHospitalStore();
  const sessions = useContactStore((s) => s.sessions);
  const { setCurrentLayer } = useSimulationStore();

  useEffect(() => { setCurrentLayer('Bayesian Risk Engine'); }, [setCurrentLayer]);

  // Interactive calculator
  const [duration, setDuration] = useState(10);
  const [rssi, setRssi] = useState(-55);
  const [repeats, setRepeats] = useState(1);
  const [mdrConfirmed, setMdrConfirmed] = useState(false);
  const [prior, setPrior] = useState(0.05);
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');

  const calcResult = useMemo(() =>
    calculateRisk(prior, duration, rssi, repeats, mdrConfirmed),
    [prior, duration, rssi, repeats, mdrConfirmed]
  );

  const sortedAssessments = useMemo(() =>
    Object.values(assessments).sort((a, b) => b.riskPercent - a.riskPercent),
    [assessments]
  );

  const selectedAssessment = selectedPersonId ? assessments[selectedPersonId] : null;

  const timelineData = useMemo(() => {
    if (!selectedAssessment) return [];
    return selectedAssessment.history.map((h, i) => ({
      index: i,
      event: h.event.length > 22 ? h.event.substring(0, 22) + '…' : h.event,
      risk: h.riskPercent,
      time: formatTime(h.timestamp),
    }));
  }, [selectedAssessment]);

  const sliders = [
    { label: 'Prior Baseline Probability', min: 0.01, max: 0.5, step: 0.01, val: prior, set: setPrior, color: '#3B82F6', fmt: (v: number) => (v * 100).toFixed(1) + '%' },
    { label: 'Cumulative Duration (Δt)', min: 1, max: 60, step: 1, val: duration, set: setDuration, color: '#8B5CF6', fmt: (v: number) => v + ' min' },
    { label: 'Signal Strength (RSSI)', min: -90, max: -30, step: 1, val: rssi, set: setRssi, color: '#06B6D4', fmt: (v: number) => v + ' dBm' },
    { label: 'Repeated Encounters (k)', min: 0, max: 10, step: 1, val: repeats, set: setRepeats, color: '#F59E0B', fmt: (v: number) => v + 'x' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-w-[1700px] mx-auto" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ============ HEADER HUD ============ */}
      <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-violet-950/20 to-slate-900 border border-violet-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-violet-500/10 to-transparent pointer-events-none" />
        <div className="absolute -left-6 -bottom-8 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shadow-inner">
              <BrainCircuit className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Bayesian Transmission Risk Engine
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  P(I | E) = P(E | I) · P(I) / P(E)
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Continuous probabilistic updates derived from BLE signal attenuation, proximity duration, and clinical lab verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex flex-col items-center px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-lg font-black font-mono text-violet-400">{sortedAssessments.length}</span>
              <span className="text-[9px] text-slate-500 uppercase tracking-wide">Assessed Persons</span>
            </div>
            <div className="flex flex-col items-center px-3.5 py-1.5 rounded-xl bg-red-950/30 border border-red-500/25">
              <span className="text-lg font-black font-mono text-red-400">
                {sortedAssessments.filter((a) => a.category === 'High' || a.category === 'Critical').length}
              </span>
              <span className="text-[9px] text-red-400 uppercase tracking-wide">High / Critical</span>
            </div>
            <div className="flex flex-col items-center px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-lg font-black font-mono text-cyan-400">{sessions.length}</span>
              <span className="text-[9px] text-slate-500 uppercase tracking-wide">Contact Sessions</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============ ROW 1: CALCULATOR + DECOMPOSITION + LEADERBOARD ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Bayesian Parameter Controls — 5 cols */}
        <div className="lg:col-span-5 rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-slate-800 shadow-xl">
          <div className="rounded-[calc(1rem-2px)] p-5 sm:p-6 bg-slate-900/95 backdrop-blur-xl h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Interactive Bayesian Parameter Simulator</h3>
                  <p className="text-[10px] text-slate-400">Tweak physical transmission variables in real-time</p>
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-4">
                {sliders.map((s) => (
                  <div key={s.label}>
                    <div className="flex justify-between mb-1.5 text-xs">
                      <span className="font-semibold text-slate-300">{s.label}</span>
                      <span className="font-bold font-mono" style={{ color: s.color }}>{s.fmt(s.val)}</span>
                    </div>
                    <input
                      type="range"
                      min={s.min}
                      max={s.max}
                      step={s.step}
                      value={s.val}
                      onChange={(e) => s.set(parseFloat(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-800 accent-violet-500"
                    />
                  </div>
                ))}

                {/* MDR Status Toggle */}
                <div className="pt-2">
                  <button
                    onClick={() => setMdrConfirmed(!mdrConfirmed)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all border ${
                      mdrConfirmed
                        ? 'bg-red-500/20 border-red-500/40 text-red-200 shadow-sm shadow-red-500/20'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className={`w-4 h-4 ${mdrConfirmed ? 'text-red-400' : 'text-slate-500'}`} />
                      <div className="text-left">
                        <span className="text-xs font-bold block">Index Contact Confirmed MDR-TB</span>
                        <span className="text-[10px] text-slate-400 block">Applies clinical microbiology multiplier (W_MDR = 2.5)</span>
                      </div>
                    </div>
                    <div className={`w-8 h-4 rounded-full transition-colors flex items-center p-0.5 ${mdrConfirmed ? 'bg-red-600 justify-end' : 'bg-slate-700 justify-start'}`}>
                      <div className="w-3 h-3 bg-white rounded-full shadow" />
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Scenario Presets */}
            <div className="mt-5 pt-4 border-t border-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Clinical Scenario Presets</p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_SCENARIOS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => {
                      setDuration(s.duration);
                      setRssi(s.rssi);
                      setRepeats(s.repeats);
                      setMdrConfirmed(s.mdr);
                    }}
                    className="p-2.5 rounded-xl border border-slate-800 hover:border-violet-500/40 bg-slate-950/50 hover:bg-violet-950/20 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-200 group-hover:text-white">{s.label}</span>
                      <span className="text-[11px] font-black font-mono" style={{ color: s.color }}>{s.expectedRisk}</span>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-0.5 truncate">{s.event}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results Gauge & Bayes Decomposition — 4 cols */}
        <div className="lg:col-span-4 flex flex-col gap-5">

          {/* Posterior Gauge Card */}
          <div className="rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-slate-800 shadow-xl">
            <div className="rounded-[calc(1rem-2px)] p-5 bg-slate-900/95 backdrop-blur-xl text-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-center gap-2">
                <Target className="w-4 h-4 text-violet-400" />
                Computed Posterior Risk
              </h3>

              <RiskGauge riskPercent={calcResult.riskPercent} category={calcResult.category} />

              <div className="mt-3 inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold border"
                style={{
                  background: `${getRiskColor(calcResult.category as any)}15`,
                  borderColor: `${getRiskColor(calcResult.category as any)}40`,
                  color: getRiskColor(calcResult.category as any),
                }}
              >
                {calcResult.category} Transmission Probability
              </div>
            </div>
          </div>

          {/* Mathematical Decomposition */}
          <div className="rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-violet-500/20 shadow-xl flex-1">
            <div className="rounded-[calc(1rem-2px)] p-5 bg-slate-900/95 backdrop-blur-xl h-full flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-2">
                  <Sigma className="w-4 h-4 text-violet-400" />
                  Bayes Component Decomposition
                </h3>

                <div className="space-y-3">
                  {FORMULA_VARS.map((v) => {
                    const val = calcResult[v.key as keyof typeof calcResult] as number;
                    const pct = Math.min(100, Math.max(0, val * 100));

                    return (
                      <div key={v.key}>
                        <div className="flex justify-between mb-1 text-xs">
                          <span className="font-semibold text-slate-300">{v.label}</span>
                          <span className="font-bold font-mono" style={{ color: v.color }}>{val.toFixed(4)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: v.color }}
                          />
                        </div>
                        <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">{v.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Update Rule Callout */}
              <div className="mt-4 p-3 rounded-xl bg-violet-950/30 border border-violet-500/25 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-violet-200 leading-relaxed">
                  <strong className="text-white">Sequential Updating Rule:</strong> The computed posterior P(I|E) automatically becomes the prior P(I) for the subsequent BLE contact session.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Risk Rankings Leaderboard — 3 cols */}
        <div className="lg:col-span-3 rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-slate-800 shadow-xl">
          <div className="rounded-[calc(1rem-2px)] p-5 bg-slate-900/95 backdrop-blur-xl h-full flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-rose-400" />
              Live Clinical Risk Census
            </h3>

            <div className="space-y-1 flex-1 overflow-y-auto pr-0.5 max-h-[520px]">
              {sortedAssessments.map((a, i) => {
                const color = getRiskColor(a.category as any);
                const isSelected = selectedPersonId === a.personId;

                return (
                  <div
                    key={a.personId}
                    onClick={() => setSelectedPersonId(isSelected ? '' : a.personId)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/40 shadow-md shadow-indigo-500/10'
                        : 'border-transparent hover:bg-slate-900/60 hover:border-slate-800'
                    }`}
                  >
                    <span className="text-[10px] font-mono text-slate-500 w-4 text-center">{i + 1}</span>

                    <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: color }} />

                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-200 truncate">{a.personName}</p>
                      <p className="text-[9px] text-slate-500 capitalize">{a.personRole}</p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-black font-mono" style={{ color }}>{a.riskPercent}%</p>
                      <p className="text-[8px] font-semibold uppercase" style={{ color }}>{a.category}</p>
                    </div>
                  </div>
                );
              })}

              {sortedAssessments.length === 0 && (
                <div className="text-center py-12 text-slate-600">
                  <FlaskConical className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs">Start simulation to populate clinical risk scores</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ============ ROW 2: RISK TIMELINE TRAJECTORY ============ */}
      <AnimatePresence>
        {selectedAssessment && timelineData.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-indigo-500/20 shadow-xl"
          >
            <div className="rounded-[calc(1rem-2px)] p-5 bg-slate-900/95 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  Bayesian Update Trajectory — {selectedAssessment.personName} ({selectedAssessment.personRole})
                </h3>
                <button
                  onClick={() => setSelectedPersonId('')}
                  className="text-[10px] text-slate-500 hover:text-slate-300 px-2 py-0.5 rounded border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  Dismiss
                </button>
              </div>

              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={timelineData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
                  <defs>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="event" tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 11,
                      borderRadius: 10,
                      background: 'rgba(15,23,42,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#F1F5F9',
                    }}
                    formatter={(v: any) => [`${v}%`, 'Bayesian Risk']}
                  />
                  <ReferenceLine y={20} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'Low', fontSize: 9, fill: '#10B981' }} />
                  <ReferenceLine y={40} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: 'Medium', fontSize: 9, fill: '#F59E0B' }} />
                  <ReferenceLine y={70} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Critical', fontSize: 9, fill: '#EF4444' }} />
                  <Area
                    type="monotone"
                    dataKey="risk"
                    stroke="#8B5CF6"
                    strokeWidth={2.5}
                    fill="url(#riskGrad)"
                    dot={{ fill: '#8B5CF6', r: 4 }}
                    activeDot={{ r: 6, fill: '#C4B5FD' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
