import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Router, Cpu, MemoryStick, Signal, ArrowDown, Check, Package,
  X, Wifi, Database, Server, Filter, Ruler, Handshake, HardDrive,
  Activity, Zap, ShieldCheck, Radio, TrendingUp, Eye, Layers
} from 'lucide-react';
import { useHospitalStore } from '../../stores/useHospitalStore';
import { useSimulationStore } from '../../stores/useSimulationStore';
import type { BLEPacket } from '../../types';
import { formatTime, formatRSSI, formatDistance } from '../../utils/formatters';

const PIPELINE_STAGES = [
  { key: 'received',           label: 'BLE Packet Ingested',       icon: Package,    color: '#3B82F6', desc: 'Raw ADV_IND/ADV_NONCONN_IND advertisement received by edge gateway antenna' },
  { key: 'validated',          label: 'Packet Validation',          icon: Check,      color: '#10B981', desc: 'MAC address whitelist check, CRC verification, manufacturer-specific data parsing' },
  { key: 'deduplication',      label: 'Deduplication Filter',       icon: Filter,     color: '#8B5CF6', desc: 'Bloom filter removes repeated advertisements from same device within 500ms window' },
  { key: 'rssi-filtered',      label: 'RSSI Proximity Filter',      icon: Signal,     color: '#F59E0B', desc: 'Discard signals below -85 dBm (>6m range), apply Kalman smoothing to RSSI stream' },
  { key: 'distance-estimated', label: 'Log-Normal Distance Est.',   icon: Ruler,      color: '#EC4899', desc: 'RSSI → meters using path loss exponent n=2.7 calibrated for hospital environment' },
  { key: 'session-generated',  label: 'Contact Session Creation',   icon: Handshake,  color: '#06B6D4', desc: 'Proximity ≤2m for ≥10s triggers a contact session object with person pair + timestamps' },
  { key: 'stored',             label: 'Edge Persistent Storage',    icon: HardDrive,  color: '#6366F1', desc: 'Session record written to gateway SQLite ring buffer (72h retention, encrypted)' },
  { key: 'synced',             label: 'Central Server Sync',        icon: Server,     color: '#10B981', desc: 'Deduplicated session batch POSTed to cloud API over mTLS. Bayesian risk engine triggered.' },
];

export default function GatewayPage() {
  const { gateways, packets } = useHospitalStore();
  const { setCurrentLayer } = useSimulationStore();
  const [selectedGw, setSelectedGw] = useState(gateways[0]?.id || '');
  const [inspectedPacket, setInspectedPacket] = useState<BLEPacket | null>(null);
  const [packetPipelineStage, setPacketPipelineStage] = useState(0);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);

  useEffect(() => { setCurrentLayer('Gateway Layer'); }, [setCurrentLayer]);

  const activeGw = useMemo(() => gateways.find(g => g.id === selectedGw) || gateways[0], [gateways, selectedGw]);
  const gwPackets = useMemo(() => packets.filter(p => p.gatewayId === (activeGw?.id || '')).slice(0, 40), [packets, activeGw]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPacketPipelineStage((prev) => (prev + 1) % PIPELINE_STAGES.length);
    }, 650);
    return () => clearInterval(interval);
  }, []);

  const totalReceived  = useMemo(() => gateways.reduce((s, g) => s + g.packetsReceived, 0),  [gateways]);
  const totalValidated = useMemo(() => gateways.reduce((s, g) => s + g.packetsValidated, 0), [gateways]);
  const totalUnique    = useMemo(() => gateways.reduce((s, g) => s + g.packetsUnique, 0),    [gateways]);
  const totalSessions  = useMemo(() => gateways.reduce((s, g) => s + g.contactSessionsGenerated, 0), [gateways]);
  const reductionPct   = totalReceived > 0 ? Math.round((1 - totalSessions / totalReceived) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-w-[1700px] mx-auto" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ============ HEADER ============ */}
      <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-amber-950/15 to-slate-900 border border-amber-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 w-72 h-full bg-gradient-to-l from-amber-500/8 to-transparent pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/12 border border-amber-500/25 flex items-center justify-center shadow-inner">
              <Router className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                BLE Edge Gateway Layer
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  IoT Mesh Network
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Raspberry Pi 4B gateways running Bluez · MQTT · Edge deduplication pipeline
              </p>
            </div>
          </div>

          {/* Global Funnel Stats */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: 'Raw Packets', value: totalReceived, color: '#3B82F6' },
              { label: 'Validated',   value: totalValidated, color: '#10B981' },
              { label: 'Unique',      value: totalUnique, color: '#8B5CF6' },
              { label: 'Sessions',    value: totalSessions, color: '#F59E0B' },
            ].map((s, i) => (
              <div key={s.label} className="flex flex-col items-center px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-lg font-black font-mono" style={{ color: s.color }}>{s.value}</span>
                <span className="text-[9px] text-slate-500 uppercase tracking-wide">{s.label}</span>
              </div>
            ))}
            <div className="flex flex-col items-center px-3 py-1.5 rounded-xl bg-emerald-950/30 border border-emerald-500/25">
              <span className="text-lg font-black text-emerald-300">{reductionPct}%</span>
              <span className="text-[9px] text-emerald-500 uppercase tracking-wide">Reduction</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============ ROW 1: GATEWAY CARDS ============ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {gateways.map((gw, i) => {
          const isSelected = selectedGw === gw.id;
          const gwPktCount = packets.filter(p => p.gatewayId === gw.id).length;

          return (
            <motion.div
              key={gw.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setSelectedGw(gw.id)}
              className={`cursor-pointer rounded-2xl p-1 transition-all duration-200 ${
                isSelected
                  ? 'bg-gradient-to-b from-amber-400/20 to-transparent shadow-xl shadow-amber-500/15'
                  : 'bg-gradient-to-b from-white/8 to-transparent hover:shadow-lg'
              } border ${isSelected ? 'border-amber-500/40' : 'border-slate-800 hover:border-slate-700'}`}
            >
              <div className="rounded-[calc(1rem-2px)] p-4 bg-slate-900/95 backdrop-blur-xl h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isSelected
                        ? 'bg-amber-500/20 border border-amber-500/40'
                        : 'bg-slate-800 border border-slate-700'
                    }`}>
                      <Router className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-white leading-tight">{gw.name}</p>
                      <p className="text-[9px] font-mono text-slate-500">{gw.id}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${gw.isOnline ? 'bg-emerald-400' : 'bg-red-500'}`}
                      style={gw.isOnline ? { boxShadow: '0 0 8px rgba(52, 211, 153, 0.6)' } : {}} />
                    <span className={`text-[8px] font-bold uppercase ${gw.isOnline ? 'text-emerald-500' : 'text-red-500'}`}>
                      {gw.syncStatus}
                    </span>
                  </div>
                </div>

                {/* Metric Cells */}
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {[
                    { l: 'Nearby Devices', v: gw.nearbyDevices.length, mono: false },
                    { l: 'Pkts Ingested', v: gw.packetsReceived, mono: true },
                    { l: 'In Buffer', v: gwPktCount, mono: true },
                    { l: 'Sessions', v: gw.contactSessionsGenerated, mono: false },
                  ].map(m => (
                    <div key={m.l} className="rounded-xl p-2 bg-slate-950/50 border border-slate-800/60">
                      <p className="text-[8px] text-slate-500 font-semibold uppercase tracking-wide">{m.l}</p>
                      <p className={`text-sm font-bold text-white mt-0.5 ${m.mono ? 'font-mono' : ''}`}>{m.v}</p>
                    </div>
                  ))}
                </div>

                {/* CPU / RAM Progress */}
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[9px] mb-1">
                      <span className="text-slate-500 font-semibold">CPU</span>
                      <span className="font-mono text-indigo-300">{gw.cpu}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-700"
                        style={{ width: `${gw.cpu}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[9px] mb-1">
                      <span className="text-slate-500 font-semibold">RAM</span>
                      <span className="font-mono text-violet-300">{gw.memory}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-700"
                        style={{ width: `${gw.memory}%` }} />
                    </div>
                  </div>
                </div>

                {/* RSSI Range */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] font-mono text-slate-500">
                  RSSI Range: {gw.rssiRange?.min ?? '-85'} → {gw.rssiRange?.max ?? '-40'} dBm
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ============ ROW 2: PIPELINE + LIVE PACKETS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Edge Processing Pipeline — 5 cols */}
        <div className="lg:col-span-5 rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-slate-800 shadow-xl">
          <div className="rounded-[calc(1rem-2px)] p-5 bg-slate-900/95 backdrop-blur-xl h-full flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Edge Processing Pipeline
              </h3>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
                {gwPackets.length} pkts in buffer
              </span>
            </div>

            <div className="flex-1 space-y-1">
              {PIPELINE_STAGES.map((stage, i) => {
                const done = packetPipelineStage > i;
                const active = packetPipelineStage === i;
                const isStageSelected = selectedStage === i;

                return (
                  <React.Fragment key={stage.key}>
                    <div
                      className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-300 border ${
                        done
                          ? 'bg-emerald-950/20 border-emerald-500/20'
                          : active
                          ? 'border-indigo-500/40 bg-indigo-950/25'
                          : isStageSelected
                          ? 'border-slate-700 bg-slate-900/60'
                          : 'border-transparent hover:border-slate-800 hover:bg-slate-900/30'
                      }`}
                      onClick={() => setSelectedStage(isStageSelected ? null : i)}
                    >
                      {/* Icon Container */}
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                        done
                          ? 'bg-emerald-500/15 border border-emerald-500/30'
                          : active
                          ? 'bg-indigo-500/20 border border-indigo-500/40'
                          : 'bg-slate-900/60 border border-slate-800'
                      }`}>
                        {done
                          ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                          : active
                          ? <stage.icon className="w-3.5 h-3.5 animate-pulse" style={{ color: stage.color }} />
                          : <stage.icon className="w-3.5 h-3.5 text-slate-500" />
                        }
                      </div>

                      {/* Label */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-semibold truncate ${
                          done ? 'text-emerald-300' : active ? 'text-indigo-200' : 'text-slate-400'
                        }`}>
                          {stage.label}
                        </p>
                        {(isStageSelected || active) && (
                          <p className="text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-2">
                            {stage.desc}
                          </p>
                        )}
                      </div>

                      {done && <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                      {active && (
                        <div className="flex gap-0.5 flex-shrink-0">
                          {[0, 1, 2].map(dot => (
                            <div key={dot} className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce"
                              style={{ animationDelay: `${dot * 0.15}s` }} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Arrow connector */}
                    {i < PIPELINE_STAGES.length - 1 && (
                      <div className="flex justify-center my-0.5">
                        <ArrowDown className="w-3 h-3" style={{
                          color: done ? '#34D399' : active ? '#818CF8' : '#1E293B'
                        }} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Stats Funnel + Live Packet Stream — 7 cols */}
        <div className="lg:col-span-7 flex flex-col gap-4">

          {/* Edge Computing Reduction Banner */}
          <div className="rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-emerald-500/20 shadow-xl">
            <div className="rounded-[calc(1rem-2px)] p-4 bg-slate-900/95 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Edge Processing Funnel
                </h3>
                <div className="px-3 py-1 rounded-lg bg-emerald-950/30 border border-emerald-500/25 text-[10px] font-bold text-emerald-300">
                  {reductionPct}% Server Bandwidth Saved
                </div>
              </div>

              <div className="flex items-center gap-3">
                {[
                  { label: 'Raw Pkts', value: totalReceived, color: '#3B82F6', pct: 100 },
                  { label: 'Validated', value: totalValidated, color: '#10B981', pct: totalReceived > 0 ? Math.round(totalValidated / totalReceived * 100) : 0 },
                  { label: 'Unique',   value: totalUnique,    color: '#8B5CF6', pct: totalReceived > 0 ? Math.round(totalUnique / totalReceived * 100) : 0 },
                  { label: 'Sessions', value: totalSessions,  color: '#F59E0B', pct: totalReceived > 0 ? Math.round(totalSessions / totalReceived * 100) : 0 },
                ].map((item, i) => (
                  <React.Fragment key={item.label}>
                    <div className="flex-1 text-center p-2.5 rounded-xl border"
                      style={{ background: `${item.color}08`, borderColor: `${item.color}20` }}>
                      <p className="text-xl font-black font-mono" style={{ color: item.color }}>{item.value}</p>
                      <p className="text-[9px] font-semibold text-slate-500 mt-0.5">{item.label}</p>
                      <p className="text-[9px] font-mono mt-1" style={{ color: item.color }}>{item.pct}%</p>
                    </div>
                    {i < 3 && (
                      <ArrowDown className="w-3 h-3 -rotate-90 flex-shrink-0 text-slate-700" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Live BLE Packet Stream */}
          <div className="rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-slate-800 shadow-xl flex-1">
            <div className="rounded-[calc(1rem-2px)] p-4 sm:p-5 bg-slate-900/95 backdrop-blur-xl flex flex-col h-full">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-blue-400 animate-pulse" />
                  Live BLE Packet Stream — {activeGw?.name || ''}
                </h3>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[10px] font-mono text-slate-400">{gwPackets.length} pkts</span>
                </div>
              </div>

              {/* Packet Table Header */}
              <div className="grid grid-cols-12 gap-1 px-3 mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                <span className="col-span-1">SIG</span>
                <span className="col-span-2">TIME</span>
                <span className="col-span-2">SESSION</span>
                <span className="col-span-3">PERSON</span>
                <span className="col-span-2">RSSI</span>
                <span className="col-span-2">DIST</span>
              </div>

              <div className="space-y-0.5 max-h-[340px] overflow-y-auto pr-1 flex-1 font-mono">
                {gwPackets.map((pkt) => (
                  <div
                    key={pkt.id}
                    onClick={() => setInspectedPacket(pkt)}
                    className="grid grid-cols-12 gap-1 items-center px-3 py-2 rounded-lg cursor-pointer transition-all text-[11px] hover:bg-slate-800/50 border border-transparent hover:border-slate-800"
                    style={{
                      background: inspectedPacket?.id === pkt.id ? 'rgba(99, 102, 241, 0.1)' : undefined,
                      borderColor: inspectedPacket?.id === pkt.id ? 'rgba(99, 102, 241, 0.2)' : undefined,
                    }}
                  >
                    <span className="col-span-1 flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${pkt.isValid ? 'bg-emerald-400' : 'bg-red-500'}`} />
                    </span>
                    <span className="col-span-2 text-slate-500 text-[10px]">{formatTime(pkt.timestamp).split(':').slice(1).join(':')}</span>
                    <span className="col-span-2 text-indigo-400 font-bold text-[10px] truncate">{pkt.sessionId}</span>
                    <span className="col-span-3 text-slate-300 truncate">{pkt.personName}</span>
                    <span className="col-span-2 text-amber-400">{formatRSSI(pkt.rssi)}</span>
                    <span className="col-span-2 flex items-center justify-between">
                      <span className="text-slate-400">{formatDistance(pkt.estimatedDistance)}</span>
                      {pkt.isDuplicate && <span className="text-[8px] font-bold text-amber-500">DUP</span>}
                    </span>
                  </div>
                ))}
                {gwPackets.length === 0 && (
                  <div className="text-center py-12 text-slate-600">
                    <Radio className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                    <p className="text-xs">Start simulation to stream BLE packets</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ PACKET INSPECTOR MODAL ============ */}
      <AnimatePresence>
        {inspectedPacket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)' }}
            onClick={() => setInspectedPacket(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 18 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 18 }}
              transition={{ type: 'spring', damping: 26 }}
              className="w-full max-w-md rounded-2xl border overflow-hidden shadow-2xl"
              style={{
                background: 'linear-gradient(145deg, #111827, #0D1527)',
                borderColor: 'rgba(99, 102, 241, 0.3)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(79,70,229,0.1))' }}>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-300" />
                  <span className="text-sm font-bold text-white">BLE Packet Inspector</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-[9px] font-bold border ${
                    inspectedPacket.isValid
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/15 text-red-400 border-red-500/30'
                  }`}>
                    {inspectedPacket.isValid ? 'VALID' : 'INVALID'}
                  </span>
                </div>
                <button
                  onClick={() => setInspectedPacket(null)}
                  className="w-7 h-7 rounded-lg bg-slate-900/40 hover:bg-slate-900/70 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Session ID',     value: inspectedPacket.sessionId,           mono: true },
                    { label: 'BLE Device MAC', value: inspectedPacket.bleDeviceId,          mono: true },
                    { label: 'RSSI',           value: formatRSSI(inspectedPacket.rssi),     mono: true },
                    { label: 'Timestamp',      value: formatTime(inspectedPacket.timestamp), mono: true },
                    { label: 'Gateway ID',     value: inspectedPacket.gatewayId,            mono: true },
                    { label: 'Adv. Type',      value: inspectedPacket.advertisementType,    mono: true },
                    { label: 'Est. Distance',  value: formatDistance(inspectedPacket.estimatedDistance) },
                    { label: 'Duplicate',      value: inspectedPacket.isDuplicate ? 'Yes — Filtered' : 'No' },
                    { label: 'Person',         value: inspectedPacket.personName,           mono: false },
                    { label: 'Role',           value: inspectedPacket.personRole,           mono: false },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl p-2.5 bg-slate-950/50 border border-slate-800/60">
                      <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide">{item.label}</p>
                      <p className={`text-[11px] font-bold text-slate-200 mt-0.5 truncate ${item.mono ? 'font-mono' : ''}`}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Privacy note */}
                <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20">
                  <p className="text-[10px] font-bold text-indigo-300 mb-1">🔐 Privacy-Preserving BLE</p>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Session ID is an ephemeral rotating token — NOT the permanent BLE MAC address. Tokens rotate every ~25 seconds, preventing static tracking while maintaining short-range contact detection accuracy.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
