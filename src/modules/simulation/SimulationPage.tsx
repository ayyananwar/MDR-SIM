import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, MapPin, Watch, Radio, Battery, Fingerprint, Hash, Wifi,
  Play, Pause, FastForward, RotateCcw, Eye, ShieldAlert, Activity,
  Sliders, Layers, Sparkles
} from 'lucide-react';
import { useHospitalStore } from '../../stores/useHospitalStore';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useRiskStore } from '../../stores/useRiskStore';
import { HOSPITAL_ROOMS, GATEWAY_CONFIGS } from '../../data/simulation';
import { getRoleColor, getRoomName, formatPercent } from '../../utils/formatters';
import type { Person } from '../../types';

export default function SimulationPage() {
  const { patients, doctors, nurses, visitors, gateways, packets, allPeople: getAllPeople } = useHospitalStore();
  const {
    showBLESignals, toggleBLESignals,
    showGatewayCoverage, toggleGatewayCoverage,
    showRSSIView, toggleRSSIView,
    showBayesianOverlay, toggleBayesianOverlay,
    setCurrentLayer,
    isRunning, start, pause, reset,
    speed, setSpeed,
  } = useSimulationStore();
  const { assessments } = useRiskStore();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [hoveredPerson, setHoveredPerson] = useState<Person | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  const allPeople = useMemo(() => [...patients, ...doctors, ...nurses, ...visitors], [patients, doctors, nurses, visitors]);

  useEffect(() => {
    setCurrentLayer('BLE Communication');
  }, [setCurrentLayer]);

  // Update selected person live
  useEffect(() => {
    if (selectedPerson) {
      const updated = allPeople.find(p => p.id === selectedPerson.id);
      if (updated) {
        setSelectedPerson(updated);
      }
    }
  }, [allPeople, selectedPerson]);

  const packetCounts = useMemo(() => {
    return gateways.map(gw => ({
      id: gw.id,
      name: gw.name.replace(' Gateway', ''),
      count: packets.filter(p => p.gatewayId === gw.id).length,
      position: gw.position,
    }));
  }, [gateways, packets]);

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col gap-4 max-w-[1700px] mx-auto overflow-hidden">
      
      {/* ============ TOP CONTROL & TELEMETRY HUD ============ */}
      <div className="relative rounded-2xl p-4 bg-slate-900/90 border border-indigo-500/20 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Status & Active Census */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                Live Hospital Floorplan
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Real-Time Twin
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Spatial tracking of {allPeople.length} active individuals across 13 clinical zones
              </p>
            </div>
          </div>

          {/* Role Census Badges */}
          <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-800">
            {[
              { label: 'Patients', count: patients.length, color: '#3B82F6' },
              { label: 'Doctors', count: doctors.length, color: '#10B981' },
              { label: 'Nurses', count: nurses.length, color: '#8B5CF6' },
              { label: 'Visitors', count: visitors.length, color: '#F97316' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950/60 rounded-lg border border-slate-800 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                <span className="font-bold text-slate-200 font-mono">{item.count}</span>
                <span className="text-slate-400 text-[10px]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Simulation Engine Controls & Layer Toggles */}
        <div className="flex items-center gap-3 flex-wrap">
          
          {/* Layer Visibility Toggles */}
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => toggleBLESignals()}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all text-[11px] flex items-center gap-1 ${
                showBLESignals
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3 h-3" />
              BLE Waves
            </button>

            <button
              onClick={() => toggleGatewayCoverage()}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all text-[11px] flex items-center gap-1 ${
                showGatewayCoverage
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wifi className="w-3 h-3" />
              Gateways
            </button>

            <button
              onClick={() => toggleBayesianOverlay()}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all text-[11px] flex items-center gap-1 ${
                showBayesianOverlay
                  ? 'bg-red-600/30 text-red-300 border border-red-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              Risk Overlay
            </button>

            <button
              onClick={() => toggleRSSIView()}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all text-[11px] flex items-center gap-1 ${
                showRSSIView
                  ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Hash className="w-3 h-3" />
              Session IDs
            </button>
          </div>

          {/* Engine Play/Pause & Speed Stepper */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => isRunning ? pause() : start()}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
                isRunning
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/30'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isRunning ? 'Pause' : 'Play'}
            </button>

            {/* Speed Multipliers */}
            <div className="flex items-center gap-1 px-1">
              {[1, 2, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s as any)}
                  className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold transition-all ${
                    speed === s
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <button
              onClick={reset}
              title="Reset Simulation"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* ============ MAIN DIGITAL TWIN CANVAS ============ */}
      <div className="relative flex-1 rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-indigo-500/20 shadow-2xl overflow-hidden min-h-[500px]">
        <div className="relative w-full h-full rounded-[calc(1rem-2px)] bg-slate-950 overflow-hidden">
          
          {/* Blueprint Grid Texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.35) 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* SVG Floorplan Canvas with Native Aspect ViewBox */}
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 900 560"
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 select-none"
          >
            <defs>
              <linearGradient id="simGradCritical" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(239, 68, 68, 0.16)" />
                <stop offset="100%" stopColor="rgba(239, 68, 68, 0.04)" />
              </linearGradient>
              <linearGradient id="simGradClinical" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(16, 185, 129, 0.14)" />
                <stop offset="100%" stopColor="rgba(16, 185, 129, 0.04)" />
              </linearGradient>
              <linearGradient id="simGradSupport" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(99, 102, 241, 0.14)" />
                <stop offset="100%" stopColor="rgba(99, 102, 241, 0.04)" />
              </linearGradient>
              <linearGradient id="simGradPublic" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(245, 158, 11, 0.12)" />
                <stop offset="100%" stopColor="rgba(245, 158, 11, 0.03)" />
              </linearGradient>
            </defs>

            {/* Gateway Scan Coverage Circles */}
            {showGatewayCoverage && GATEWAY_CONFIGS.map((gw) => (
              <g key={`coverage-${gw.id}`}>
                <circle
                  cx={gw.position.x}
                  cy={gw.position.y}
                  r={gw.scanRadius}
                  fill="rgba(234, 179, 8, 0.04)"
                  stroke="rgba(234, 179, 8, 0.25)"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                >
                  <animate attributeName="r" values={`${gw.scanRadius - 4};${gw.scanRadius + 4};${gw.scanRadius - 4}`} dur="4s" repeatCount="indefinite" />
                </circle>
                <circle
                  cx={gw.position.x}
                  cy={gw.position.y}
                  r={gw.scanRadius * 0.4}
                  fill="transparent"
                  stroke="rgba(234, 179, 8, 0.1)"
                  strokeWidth={1}
                />
              </g>
            ))}

            {/* Architectural Rooms */}
            {HOSPITAL_ROOMS.map((room) => {
              const isHovered = hoveredRoom === room.id;
              const isCritical = room.category === 'critical';

              return (
                <g
                  key={room.id}
                  onMouseEnter={() => setHoveredRoom(room.id)}
                  onMouseLeave={() => setHoveredRoom(null)}
                  className="cursor-default"
                >
                  {/* Outer Wall Boundary */}
                  <rect
                    x={room.position.x}
                    y={room.position.y}
                    width={room.width}
                    height={room.height}
                    rx={12}
                    fill={
                      room.category === 'critical' ? 'url(#simGradCritical)' :
                      room.category === 'clinical' ? 'url(#simGradClinical)' :
                      room.category === 'support' ? 'url(#simGradSupport)' : 'url(#simGradPublic)'
                    }
                    stroke={
                      isHovered
                        ? '#818CF8'
                        : isCritical
                        ? 'rgba(239, 68, 68, 0.45)'
                        : 'rgba(255, 255, 255, 0.1)'
                    }
                    strokeWidth={isHovered ? 2 : 1.2}
                  />

                  {/* Header Strip inside room */}
                  <rect
                    x={room.position.x + 1}
                    y={room.position.y + 1}
                    width={room.width - 2}
                    height={22}
                    rx={11}
                    fill="rgba(255, 255, 255, 0.03)"
                  />

                  {/* Room Sector Code */}
                  <text
                    x={room.position.x + 10}
                    y={room.position.y + 15}
                    fill="#94A3B8"
                    fontSize={9}
                    fontFamily="monospace"
                    fontWeight="700"
                  >
                    {room.code}
                  </text>

                  {/* Room Name & Category */}
                  <text
                    x={room.position.x + room.width / 2}
                    y={room.position.y + room.height / 2 + 8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#E2E8F0"
                    fontSize={10}
                    fontWeight="600"
                  >
                    {room.icon} {room.name}
                  </text>
                </g>
              );
            })}

            {/* Gateway Nodes */}
            {gateways.map((gw) => (
              <g key={gw.id}>
                {/* Rotating beacon base */}
                <circle
                  cx={gw.position.x}
                  cy={gw.position.y}
                  r={16}
                  fill="rgba(234, 179, 8, 0.18)"
                  stroke="#EAB308"
                  strokeWidth={1.5}
                />
                <rect
                  x={gw.position.x - 6}
                  y={gw.position.y - 6}
                  width={12}
                  height={12}
                  rx={2}
                  fill="#EAB308"
                  transform={`rotate(45 ${gw.position.x} ${gw.position.y})`}
                />

                {/* Gateway Label & Packet Counter */}
                <g transform={`translate(${gw.position.x + 14}, ${gw.position.y - 18})`}>
                  <rect
                    x={0}
                    y={0}
                    width={90}
                    height={22}
                    rx={6}
                    fill="rgba(15, 23, 42, 0.9)"
                    stroke="rgba(234, 179, 8, 0.3)"
                    strokeWidth={1}
                  />
                  <text x={8} y={14} fill="#FDE047" fontSize={9} fontWeight="700" fontFamily="monospace">
                    {gw.name.replace(' Gateway', '')}
                  </text>
                  <text x={82} y={14} textAnchor="end" fill="#94A3B8" fontSize={8} fontFamily="monospace">
                    {packets.filter(p => p.gatewayId === gw.id).length}p
                  </text>
                </g>
              </g>
            ))}

            {/* Live Occupants / Avatars */}
            {allPeople.map((person) => {
              const roleCol = getRoleColor(person.role);
              const isSelected = selectedPerson?.id === person.id;
              const isPositive = person.isMDRTBPositive;
              const assessment = assessments[person.id];

              return (
                <g
                  key={person.id}
                  onClick={() => setSelectedPerson(person)}
                  onMouseEnter={() => setHoveredPerson(person)}
                  onMouseLeave={() => setHoveredPerson(null)}
                  className="cursor-pointer"
                >
                  {/* BLE Wave Radiation Rings */}
                  {showBLESignals && (
                    <circle
                      cx={person.position.x}
                      cy={person.position.y}
                      r={24}
                      fill="transparent"
                      stroke={roleCol}
                      strokeWidth={1}
                      opacity={0.3}
                    >
                      <animate attributeName="r" values="12;32;12" dur="2.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.6;0;0.6" dur="2.5s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Infection Risk Halo */}
                  {isPositive && (
                    <circle
                      cx={person.position.x}
                      cy={person.position.y}
                      r={18}
                      fill="rgba(239, 68, 68, 0.25)"
                      stroke="#EF4444"
                      strokeWidth={1.5}
                    >
                      <animate attributeName="r" values="14;22;14" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Selected Indicator Ring */}
                  {isSelected && (
                    <circle
                      cx={person.position.x}
                      cy={person.position.y}
                      r={17}
                      fill="transparent"
                      stroke="#38BDF8"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                    >
                      <animateTransform attributeName="transform" type="rotate" from={`0 ${person.position.x} ${person.position.y}`} to={`360 ${person.position.x} ${person.position.y}`} dur="6s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Main Pin Dot */}
                  <circle
                    cx={person.position.x}
                    cy={person.position.y}
                    r={9}
                    fill={roleCol}
                    stroke="#0F172A"
                    strokeWidth={2}
                    className="transition-transform duration-300 hover:scale-125"
                  />

                  {/* Avatar Icon */}
                  <text
                    x={person.position.x}
                    y={person.position.y + 3}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={9}
                    className="pointer-events-none"
                  >
                    {person.avatar}
                  </text>

                  {/* RSSI / Session Tag */}
                  {showRSSIView && (
                    <text
                      x={person.position.x}
                      y={person.position.y + 18}
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize={8}
                      fontFamily="monospace"
                      className="pointer-events-none"
                    >
                      {person.sessionId}
                    </text>
                  )}

                  {/* Bayesian Risk Tag Badge */}
                  {showBayesianOverlay && assessment && (
                    <g transform={`translate(${person.position.x - 14}, ${person.position.y - 24})`}>
                      <rect
                        x={0}
                        y={0}
                        width={28}
                        height={12}
                        rx={6}
                        fill={
                          assessment.category === 'Critical' ? '#DC2626' :
                          assessment.category === 'High' ? '#D97706' :
                          assessment.category === 'Medium' ? '#2563EB' : '#059669'
                        }
                      />
                      <text x={14} y={9} textAnchor="middle" fill="#FFFFFF" fontSize={7} fontWeight="800">
                        {assessment.riskPercent}%
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Floating Key / HUD Legend */}
          <div className="absolute bottom-4 right-4 flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-[11px] text-slate-300 shadow-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">Roster:</span>
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

        {/* ============ SLIDE-OVER TELEMETRY INSPECTOR ============ */}
        <AnimatePresence>
          {selectedPerson && (
            <motion.div
              initial={{ x: 360, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 360, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="absolute right-0 top-0 bottom-0 w-[340px] bg-slate-900/95 border-l border-indigo-500/20 shadow-2xl z-40 backdrop-blur-2xl flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Individual Telemetry
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedPerson(null)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Avatar & Profile */}
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-white/10"
                    style={{ background: `${getRoleColor(selectedPerson.role)}20` }}
                  >
                    {selectedPerson.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{selectedPerson.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider capitalize"
                        style={{ color: getRoleColor(selectedPerson.role) }}
                      >
                        {selectedPerson.role}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">• {selectedPerson.hospitalId}</span>
                    </div>
                  </div>
                  {selectedPerson.isMDRTBPositive && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                      MDR-TB+
                    </span>
                  )}
                </div>

                {/* Bayesian Risk Level */}
                {assessments[selectedPerson.id] && (
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Bayesian Exposure Risk</span>
                      <span
                        className="font-bold font-mono text-xs px-2 py-0.5 rounded"
                        style={{
                          background:
                            assessments[selectedPerson.id].category === 'Critical' ? 'rgba(239, 68, 68, 0.2)' :
                            assessments[selectedPerson.id].category === 'High' ? 'rgba(245, 158, 11, 0.2)' :
                            assessments[selectedPerson.id].category === 'Medium' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color:
                            assessments[selectedPerson.id].category === 'Critical' ? '#FCA5A5' :
                            assessments[selectedPerson.id].category === 'High' ? '#FCD34D' :
                            assessments[selectedPerson.id].category === 'Medium' ? '#93C5FD' : '#6EE7B7',
                        }}
                      >
                        {assessments[selectedPerson.id].riskPercent}% {assessments[selectedPerson.id].category}
                      </span>
                    </div>

                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full transition-all duration-500 rounded-full"
                        style={{
                          width: `${assessments[selectedPerson.id].riskPercent}%`,
                          background:
                            assessments[selectedPerson.id].category === 'Critical' ? '#DC2626' :
                            assessments[selectedPerson.id].category === 'High' ? '#F59E0B' :
                            assessments[selectedPerson.id].category === 'Medium' ? '#3B82F6' : '#10B981',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Vitals & Telemetry */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Device Hardware</p>
                  {[
                    { icon: Watch, label: 'Wristband Node ID', value: selectedPerson.wearableId, mono: true },
                    { icon: Radio, label: 'BLE Hardware MAC', value: selectedPerson.bleDeviceId, mono: true },
                    { icon: Hash, label: 'Ephemeral Session', value: selectedPerson.sessionId, mono: true },
                    { icon: MapPin, label: 'Current Zone', value: getRoomName(selectedPerson.currentRoom) },
                    { icon: Battery, label: 'Node Battery', value: `${selectedPerson.battery}%` },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs">
                      <div className="flex items-center gap-2">
                        <item.icon className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-400 text-[11px]">{item.label}</span>
                      </div>
                      <span className={`font-semibold text-slate-200 ${item.mono ? 'font-mono text-[11px]' : ''}`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Edge Security Shield Card */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/50 to-slate-900 border border-indigo-500/20 text-center">
                  <div className="w-8 h-8 mx-auto mb-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Watch className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-indigo-200">Rolling BLE Ephemeral Session</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Privacy-preserving token rotating every ~25s to prevent static hardware tracking.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
