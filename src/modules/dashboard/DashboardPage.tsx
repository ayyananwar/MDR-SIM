import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Stethoscope, HeartPulse, UserCheck, Watch, Router,
  AlertTriangle, Activity, TrendingUp, ArrowUpRight,
  Wifi, ShieldCheck, Zap, Radio, Layers, Eye, RefreshCw, Cpu
} from 'lucide-react';
import { useHospitalStore } from '../../stores/useHospitalStore';
import { useContactStore } from '../../stores/useContactStore';
import { useRiskStore } from '../../stores/useRiskStore';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { formatTime, getRoleColor } from '../../utils/formatters';
import { HOSPITAL_ROOMS, GATEWAY_CONFIGS } from '../../data/simulation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const tooltipStyle = {
  contentStyle: {
    fontSize: '11px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(15, 23, 42, 0.96)',
    color: '#F8FAFC',
    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)',
    backdropFilter: 'blur(16px)',
    padding: '8px 12px',
  },
  itemStyle: {
    color: '#E2E8F0',
    fontWeight: 600,
  },
};

export default function DashboardPage() {
  const { patients, doctors, nurses, visitors, wearables, gateways, activityFeed, alerts } = useHospitalStore();
  const sessions = useContactStore((s) => s.sessions);
  const { assessments } = useRiskStore();
  const { setCurrentLayer, isRunning, speed } = useSimulationStore();
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'patient' | 'doctor' | 'nurse' | 'visitor'>('all');
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  useEffect(() => {
    setCurrentLayer('Hospital Dashboard');
  }, [setCurrentLayer]);

  const highRiskCount = useMemo(() =>
    Object.values(assessments).filter((a) => a.category === 'High' || a.category === 'Critical').length,
    [assessments]
  );

  const todaySessions = sessions.length;
  const activeWearables = wearables.filter((w) => w.status === 'Active').length;
  const onlineGateways = gateways.filter((g) => g.isOnline).length;
  const allPeople = useMemo(() => [...patients, ...doctors, ...nurses, ...visitors], [patients, doctors, nurses, visitors]);

  const filteredPeople = useMemo(() => {
    if (selectedRoleFilter === 'all') return allPeople;
    return allPeople.filter(p => p.role === selectedRoleFilter);
  }, [allPeople, selectedRoleFilter]);

  // Risk distribution data
  const riskDist = useMemo(() => {
    const counts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    Object.values(assessments).forEach((a) => {
      counts[a.category] = (counts[a.category] || 0) + 1;
    });
    return [
      { name: 'Low Risk', value: counts.Low, color: '#10B981', gradient: 'url(#gradLow)' },
      { name: 'Moderate', value: counts.Medium, color: '#3B82F6', gradient: 'url(#gradMed)' },
      { name: 'High Risk', value: counts.High, color: '#F59E0B', gradient: 'url(#gradHigh)' },
      { name: 'Critical', value: counts.Critical, color: '#EF4444', gradient: 'url(#gradCrit)' },
    ];
  }, [assessments]);

  // Wearable status pie
  const wearableStats = useMemo(() => [
    { name: 'Active', value: wearables.filter(w => w.status === 'Active').length, color: '#10B981' },
    { name: 'Inactive', value: wearables.filter(w => w.status === 'Inactive').length, color: '#64748B' },
    { name: 'Charging', value: wearables.filter(w => w.status === 'Charging').length, color: '#F59E0B' },
    { name: 'Unassigned', value: wearables.filter(w => w.status === 'Unassigned').length, color: '#334155' },
  ].filter(d => d.value > 0), [wearables]);

  // Gateway stats for chart
  const gwStats = useMemo(() =>
    gateways.map(g => ({
      name: g.name.replace(' Gateway', ''),
      received: g.packetsReceived,
      processed: g.packetsProcessed,
      sessions: g.contactSessionsGenerated,
    })), [gateways]);

  // Room occupancy map
  const roomOccupancy = useMemo(() => {
    const occ: Record<string, number> = {};
    allPeople.forEach(p => {
      occ[p.currentRoom] = (occ[p.currentRoom] || 0) + 1;
    });
    return occ;
  }, [allPeople]);

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-w-[1600px] mx-auto" style={{ height: 'calc(100vh - 56px)' }}>
      
      {/* ============ COMMAND STRIP / TELEMETRY HEADER ============ */}
      <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-indigo-500/20 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
              <Activity className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Hospital Command Deck
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Telemetry Online
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time BLE mesh tracking, Bayesian risk assessment, and clinical contact tracing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono">
              <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span className="text-slate-400">Simulation:</span>
              <span className={`font-bold ${isRunning ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isRunning ? `RUNNING (${speed}x)` : 'PAUSED'}
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Gateways:</span>
              <span className="font-bold text-cyan-300">{onlineGateways}/{gateways.length} Synced</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-slate-400">Active Nodes:</span>
              <span className="font-bold text-violet-300">{activeWearables}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============ ROW 1: PRIMARY KPI BENTO CARDS ============ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {[
          {
            label: 'PATIENTS IN CARE',
            value: patients.length,
            subLabel: 'Wearables Active',
            subValue: `${activeWearables} Assigned`,
            icon: Users,
            accent: '#3B82F6',
            gradient: 'from-blue-600/20 to-blue-900/5',
            border: 'border-blue-500/20',
            glow: 'rgba(59, 130, 246, 0.3)',
            trend: '+3 Inbound',
            up: true,
          },
          {
            label: 'DOCTORS ON DUTY',
            value: doctors.length,
            subLabel: 'Active Consultation',
            subValue: '6 Suites Staffed',
            icon: Stethoscope,
            accent: '#10B981',
            gradient: 'from-emerald-600/20 to-emerald-900/5',
            border: 'border-emerald-500/20',
            glow: 'rgba(16, 185, 129, 0.3)',
            trend: '100% Shift Coverage',
            up: true,
          },
          {
            label: 'NURSING SPECIALISTS',
            value: nurses.length,
            subLabel: 'Contact Sessions',
            subValue: `${todaySessions} Logged`,
            icon: HeartPulse,
            accent: '#8B5CF6',
            gradient: 'from-violet-600/20 to-violet-900/5',
            border: 'border-violet-500/20',
            glow: 'rgba(139, 92, 246, 0.3)',
            trend: 'Ward Round Active',
            up: true,
          },
          {
            label: 'CONFIRMED EXPOSURES',
            value: highRiskCount,
            subLabel: 'Airborne Containment',
            subValue: highRiskCount > 0 ? 'Triage Alert' : 'Sterile Status',
            icon: AlertTriangle,
            accent: highRiskCount > 0 ? '#EF4444' : '#10B981',
            gradient: highRiskCount > 0 ? 'from-red-600/25 to-red-950/10' : 'from-emerald-600/20 to-emerald-900/5',
            border: highRiskCount > 0 ? 'border-red-500/30' : 'border-emerald-500/20',
            glow: highRiskCount > 0 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.3)',
            trend: highRiskCount > 0 ? `${highRiskCount} Critical Cases` : 'Zero Airborne Breach',
            up: highRiskCount === 0,
          },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className={`group relative overflow-hidden rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent ${kpi.border} shadow-xl hover:shadow-2xl transition-all duration-300`}
          >
            <div className="relative rounded-[calc(1rem-2px)] p-5 h-full flex flex-col justify-between bg-slate-900/90 backdrop-blur-xl">
              <div
                className="absolute -top-10 -right-10 w-28 h-28 rounded-full pointer-events-none opacity-40 group-hover:opacity-75 group-hover:scale-125 transition-all duration-500"
                style={{ background: kpi.glow, filter: 'blur(32px)' }}
              />

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {kpi.label}
                  </span>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${kpi.accent}15`, border: `1px solid ${kpi.accent}30` }}
                  >
                    <kpi.icon className="w-5 h-5" style={{ color: kpi.accent }} />
                  </div>
                </div>

                <div className="flex items-baseline gap-3 mt-3">
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
                    {kpi.value}
                  </span>
                  <span
                    className="text-[11px] font-semibold flex items-center gap-0.5 px-2 py-0.5 rounded-full"
                    style={{
                      background: `${kpi.accent}15`,
                      color: kpi.accent,
                    }}
                  >
                    <ArrowUpRight className="w-3 h-3" />
                    {kpi.trend}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px] font-medium">{kpi.subLabel}</span>
                <span className="font-bold text-slate-200 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
                  {kpi.subValue}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ============ ROW 2: ARCHITECTURAL DIGITAL TWIN & REAL-TIME EVENT HUD ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left 8 Cols: Architectural Hospital Floorplan */}
        <div className="lg:col-span-8 rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-indigo-500/20 shadow-2xl">
          <div className="rounded-[calc(1rem-2px)] p-5 bg-slate-900/95 backdrop-blur-2xl flex flex-col h-full">
            
            {/* Header & Role Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  Live Hospital Floorplan • Digital Twin
                </h3>
              </div>

              {/* Role Filter Chips */}
              <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80 text-[11px]">
                {[
                  { id: 'all', label: `All (${allPeople.length})` },
                  { id: 'patient', label: `Patients (${patients.length})`, color: '#3B82F6' },
                  { id: 'doctor', label: `Doctors (${doctors.length})`, color: '#10B981' },
                  { id: 'nurse', label: `Nurses (${nurses.length})`, color: '#A78BFA' },
                  { id: 'visitor', label: `Visitors (${visitors.length})`, color: '#FB923C' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedRoleFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      selectedRoleFilter === f.id
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Digital Twin Floor Canvas */}
            <div className="relative rounded-xl overflow-hidden flex-1 min-h-[360px] bg-slate-950 border border-slate-800/80 shadow-inner">
              
              {/* High-tech blueprint grid overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.3) 1px, transparent 0)',
                  backgroundSize: '24px 24px',
                }}
              />

              <svg width="100%" height="100%" viewBox="0 0 900 560" className="absolute inset-0 select-none">
                <defs>
                  {/* Subtle room gradient fills */}
                  <linearGradient id="roomGradCritical" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(239, 68, 68, 0.16)" />
                    <stop offset="100%" stopColor="rgba(239, 68, 68, 0.05)" />
                  </linearGradient>
                  <linearGradient id="roomGradClinical" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(16, 185, 129, 0.14)" />
                    <stop offset="100%" stopColor="rgba(16, 185, 129, 0.04)" />
                  </linearGradient>
                  <linearGradient id="roomGradSupport" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(99, 102, 241, 0.14)" />
                    <stop offset="100%" stopColor="rgba(99, 102, 241, 0.04)" />
                  </linearGradient>
                  <linearGradient id="roomGradPublic" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(245, 158, 11, 0.12)" />
                    <stop offset="100%" stopColor="rgba(245, 158, 11, 0.03)" />
                  </linearGradient>
                </defs>

                {/* Gateway Coverage Zones */}
                {GATEWAY_CONFIGS.map((gw) => (
                  <g key={`gw-range-${gw.id}`}>
                    <circle
                      cx={gw.position.x}
                      cy={gw.position.y}
                      r={gw.scanRadius}
                      fill="rgba(234, 179, 8, 0.03)"
                      stroke="rgba(234, 179, 8, 0.18)"
                      strokeWidth={1}
                      strokeDasharray="6 4"
                    />
                    <circle
                      cx={gw.position.x}
                      cy={gw.position.y}
                      r={gw.scanRadius * 0.5}
                      fill="transparent"
                      stroke="rgba(234, 179, 8, 0.08)"
                      strokeWidth={1}
                    />
                  </g>
                ))}

                {/* Architectural Hospital Rooms */}
                {HOSPITAL_ROOMS.map((room) => {
                  const occupants = roomOccupancy[room.id] || 0;
                  const isHovered = hoveredRoom === room.id;
                  const isCritical = room.category === 'critical';

                  return (
                    <g
                      key={room.id}
                      onMouseEnter={() => setHoveredRoom(room.id)}
                      onMouseLeave={() => setHoveredRoom(null)}
                      className="cursor-pointer transition-all"
                    >
                      {/* Room Chassis Outline */}
                      <rect
                        x={room.position.x}
                        y={room.position.y}
                        width={room.width}
                        height={room.height}
                        rx={12}
                        fill={
                          room.category === 'critical' ? 'url(#roomGradCritical)' :
                          room.category === 'clinical' ? 'url(#roomGradClinical)' :
                          room.category === 'support' ? 'url(#roomGradSupport)' : 'url(#roomGradPublic)'
                        }
                        stroke={
                          isHovered
                            ? '#818CF8'
                            : isCritical
                            ? 'rgba(239, 68, 68, 0.4)'
                            : 'rgba(255, 255, 255, 0.08)'
                        }
                        strokeWidth={isHovered ? 2 : 1.2}
                      />

                      {/* Header bar inside room */}
                      <rect
                        x={room.position.x + 1}
                        y={room.position.y + 1}
                        width={room.width - 2}
                        height={24}
                        rx={11}
                        fill="rgba(255, 255, 255, 0.03)"
                      />

                      {/* Room Code Badge */}
                      <text
                        x={room.position.x + 10}
                        y={room.position.y + 16}
                        fill="#94A3B8"
                        fontSize={9}
                        fontFamily="monospace"
                        fontWeight="700"
                      >
                        {room.code}
                      </text>

                      {/* Room Occupancy counter */}
                      <text
                        x={room.position.x + room.width - 12}
                        y={room.position.y + 16}
                        textAnchor="end"
                        fill={occupants > 0 ? '#38BDF8' : '#64748B'}
                        fontSize={9}
                        fontFamily="monospace"
                        fontWeight="700"
                      >
                        {occupants} OCC
                      </text>

                      {/* Room Name & Icon */}
                      <text
                        x={room.position.x + room.width / 2}
                        y={room.position.y + room.height / 2 + 6}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#CBD5E1"
                        fontSize={10}
                        fontWeight="600"
                      >
                        {room.icon} {room.name}
                      </text>
                    </g>
                  );
                })}

                {/* Gateway Beacons */}
                {GATEWAY_CONFIGS.map((gw) => (
                  <g key={`gw-node-${gw.id}`}>
                    <circle
                      cx={gw.position.x}
                      cy={gw.position.y}
                      r={14}
                      fill="rgba(234, 179, 8, 0.2)"
                      stroke="#EAB308"
                      strokeWidth={1.5}
                    />
                    <rect
                      x={gw.position.x - 5}
                      y={gw.position.y - 5}
                      width={10}
                      height={10}
                      rx={2}
                      fill="#EAB308"
                      transform={`rotate(45 ${gw.position.x} ${gw.position.y})`}
                    />
                    <text
                      x={gw.position.x}
                      y={gw.position.y + 24}
                      textAnchor="middle"
                      fill="#FCD34D"
                      fontSize={8}
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {gw.id}
                    </text>
                  </g>
                ))}

                {/* People Avatars */}
                {filteredPeople.map((person) => {
                  const roleCol = getRoleColor(person.role);
                  const isPositive = person.isMDRTBPositive;

                  return (
                    <g key={person.id} className="transition-all duration-700">
                      {/* Aura */}
                      <circle
                        cx={person.position.x}
                        cy={person.position.y}
                        r={isPositive ? 16 : 10}
                        fill={isPositive ? 'rgba(239, 68, 68, 0.25)' : `${roleCol}20`}
                        stroke={isPositive ? 'rgba(239, 68, 68, 0.7)' : 'transparent'}
                        strokeWidth={1.5}
                      >
                        {isPositive && (
                          <animate attributeName="r" values="12;20;12" dur="1.5s" repeatCount="indefinite" />
                        )}
                      </circle>

                      {/* Person Pin */}
                      <circle
                        cx={person.position.x}
                        cy={person.position.y}
                        r={6}
                        fill={roleCol}
                        stroke="#0F172A"
                        strokeWidth={1.5}
                      />

                      {/* Micro role label */}
                      <text
                        x={person.position.x}
                        y={person.position.y - 9}
                        textAnchor="middle"
                        fill="#F1F5F9"
                        fontSize={8}
                        fontWeight="700"
                      >
                        {person.avatar}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Floating Blueprint Key */}
              <div className="absolute bottom-3 right-3 flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-[10px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Patient</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Doctor</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Nurse</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Gateway</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 font-bold">MDR-TB+</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Tactical Live Event Stream & Alert Feed */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          
          {/* Active Clinical Alerts Card */}
          <div className="rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-red-500/20 shadow-xl">
            <div className="rounded-[calc(1rem-2px)] p-4 sm:p-5 bg-slate-900/95 backdrop-blur-xl flex flex-col">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Clinical Infection Alerts
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                  {alerts.length} Flagged
                </span>
              </div>

              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="p-2.5 rounded-xl border flex items-start gap-2.5 bg-red-950/20 border-red-500/20"
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0 animate-ping" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-red-200">{alert.title}</p>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5 line-clamp-2">{alert.message}</p>
                      <span className="text-[9px] font-mono text-slate-500 mt-1 block">{formatTime(alert.timestamp)}</span>
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    <ShieldCheck className="w-6 h-6 mx-auto mb-1.5 text-emerald-400" />
                    No airborne breach detected
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Real-time Telemetry Event Stream */}
          <div className="rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-slate-800 shadow-xl flex-1">
            <div className="rounded-[calc(1rem-2px)] p-4 sm:p-5 bg-slate-900/95 backdrop-blur-xl flex flex-col h-full">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Live Telemetry Ingestion
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  {activityFeed.length} Events
                </span>
              </div>

              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 flex-1 font-mono">
                {activityFeed.slice(0, 15).map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-slate-800/40 transition-colors text-[11px]"
                  >
                    <span className="text-slate-500 text-[10px] whitespace-nowrap mt-0.5">
                      {formatTime(evt.timestamp).split(':').slice(1).join(':')}
                    </span>
                    <span
                      className={`leading-relaxed ${
                        evt.severity === 'critical'
                          ? 'text-red-400 font-semibold'
                          : evt.severity === 'warning'
                          ? 'text-amber-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {evt.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ ROW 3: ANALYTICS BENTO GRID ============ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Bayesian Exposure Stratification */}
        <div className="rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-slate-800 shadow-xl">
          <div className="rounded-[calc(1rem-2px)] p-5 bg-slate-900/95 backdrop-blur-xl h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Bayesian Risk Stratification
              </h3>
              <span className="text-[10px] font-mono text-slate-400">P(Infection | Contacts)</span>
            </div>

            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={riskDist} barCategoryGap="20%">
                <defs>
                  <linearGradient id="gradLow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="gradMed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60A5FA" />
                    <stop offset="100%" stopColor="#2563EB" />
                  </linearGradient>
                  <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#D97706" />
                  </linearGradient>
                  <linearGradient id="gradCrit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F87171" />
                    <stop offset="100%" stopColor="#DC2626" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {riskDist.map((entry) => (
                    <Cell key={entry.name} fill={entry.gradient} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Wearable Mesh Node Health */}
        <div className="rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-slate-800 shadow-xl">
          <div className="rounded-[calc(1rem-2px)] p-5 bg-slate-900/95 backdrop-blur-xl h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Watch className="w-4 h-4 text-cyan-400" />
                Wearable Fleet Allocation
              </h3>
              <span className="text-[10px] font-mono text-cyan-400">{wearables.length} Total Tags</span>
            </div>

            <div className="relative flex items-center justify-center my-auto" style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={wearableStats}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={62}
                    paddingAngle={4}
                    strokeWidth={0}
                  >
                    {wearableStats.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold font-mono text-white">{activeWearables}</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-400">Active</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              {wearableStats.map((s) => (
                <div key={s.name} className="flex items-center gap-2 bg-slate-950/40 px-2 py-1 rounded-lg border border-slate-800/60">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-[10px] text-slate-300 font-medium">{s.name}</span>
                  <span className="text-[10px] font-mono text-slate-400 ml-auto">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Edge Gateway Throughput */}
        <div className="rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-slate-800 shadow-xl">
          <div className="rounded-[calc(1rem-2px)] p-5 bg-slate-900/95 backdrop-blur-xl h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Router className="w-4 h-4 text-amber-400" />
                Edge Gateway Ingestion
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                89% Bandwidth Saved
              </span>
            </div>

            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={gwStats} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="received" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Packets Ingested" />
                <Bar dataKey="processed" fill="#10B981" radius={[4, 4, 0, 0]} name="Edge Processed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
