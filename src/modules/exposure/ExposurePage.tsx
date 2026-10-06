import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SearchCheck, AlertTriangle, ArrowDown, Check, Users, Clock,
  MapPin, Shield, X, User, Watch, Activity, Bell, ChevronRight,
  Biohazard, Network, Fingerprint, Timer, TrendingUp, Radio,
  Eye, ZapOff, ShieldAlert, Microscope, Stethoscope,
} from 'lucide-react';
import { useHospitalStore } from '../../stores/useHospitalStore';
import { useContactStore } from '../../stores/useContactStore';
import { useRiskStore } from '../../stores/useRiskStore';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { formatTime, formatDuration, getRoomName, getRoleColor, formatRSSI } from '../../utils/formatters';
import { getRiskColor, getRiskCategory } from '../../utils/bayesian';
import type { Patient, ContactSession } from '../../types';

const INVESTIGATION_STEPS = [
  { label: 'Retrieve Contact Sessions', icon: Radio, color: '#3B82F6' },
  { label: 'Find All Contacts', icon: Users, color: '#8B5CF6' },
  { label: 'Calculate Bayesian Risk', icon: Activity, color: '#06B6D4' },
  { label: 'Generate Exposure Timeline', icon: Clock, color: '#10B981' },
  { label: 'Display Network Graph', icon: Network, color: '#6366F1' },
  { label: 'Highlight High Risk Contacts', icon: ShieldAlert, color: '#F59E0B' },
  { label: 'Update Dashboard', icon: TrendingUp, color: '#EC4899' },
  { label: 'Notify Infection Control', icon: Bell, color: '#EF4444' },
];

const riskAccent = (cat: string) => {
  switch (cat) {
    case 'Critical': return { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)', text: '#FCA5A5', badge: 'bg-red-500/20 text-red-300 border-red-500/30' };
    case 'High': return { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.30)', text: '#FCD34D', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    case 'Medium': return { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.30)', text: '#93C5FD', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    default: return { bg: 'rgba(16, 185, 129, 0.10)', border: 'rgba(16, 185, 129, 0.25)', text: '#6EE7B7', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
  }
};

export default function ExposurePage() {
  const { patients, markMDRTBPositive, addActivity, addAlert, getPersonById } = useHospitalStore();
  const { sessions, getContactsFor } = useContactStore();
  const { assessments, propagateRisk, updateRisk } = useRiskStore();
  const { setCurrentLayer } = useSimulationStore();

  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [investigationActive, setInvestigationActive] = useState(false);
  const [investigationStep, setInvestigationStep] = useState(-1);
  const [exposureData, setExposureData] = useState<{
    contacts: ContactSession[];
    affectedPeople: string[];
  } | null>(null);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const runInvestigation = useCallback((patientId: string) => {
    setInvestigationActive(true);
    setInvestigationStep(0);

    const contactSessions = getContactsFor(patientId);
    const affectedPeopleSet = new Set<string>();
    contactSessions.forEach(s => {
      if (s.person1Id !== patientId) affectedPeopleSet.add(s.person1Id);
      if (s.person2Id !== patientId) affectedPeopleSet.add(s.person2Id);
    });
    const affectedPeople = Array.from(affectedPeopleSet);

    INVESTIGATION_STEPS.forEach((_, i) => {
      setTimeout(() => {
        setInvestigationStep(i);

        if (i === 2) {
          affectedPeople.forEach(pid => {
            const sess = contactSessions.find(s => s.person1Id === pid || s.person2Id === pid);
            const durationSec = sess ? sess.duration : 15;
            const durationMin = Math.max(0.1, durationSec / 60);
            const rssi = sess ? sess.avgRssi : -60;
            updateRisk(pid, durationMin, rssi, 1, true, `Exposed to confirmed MDR-TB positive patient (${Math.round(durationSec)}s contact)`);
          });
        }

        if (i === 6) {
          addActivity({ type: 'exposure', message: `Exposure investigation completed: ${affectedPeople.length} contacts traced`, severity: 'warning' });
        }

        if (i === 7) {
          affectedPeople.forEach(pid => {
            const assessment = assessments[pid];
            if (assessment && assessment.riskPercent >= 40) {
              addAlert({
                type: 'exposure', title: 'High Risk Exposure',
                message: `${assessment.personName} has ${assessment.riskPercent}% infection risk. Immediate screening recommended.`,
                severity: 'critical', personId: pid,
              });
            }
          });
        }
      }, (i + 1) * 320);
    });

    setExposureData({ contacts: contactSessions, affectedPeople });
  }, [getContactsFor, addActivity, addAlert, assessments, updateRisk]);

  useEffect(() => { setCurrentLayer('Central Server'); }, [setCurrentLayer]);

  useEffect(() => {
    if (!selectedPatientId && patients.length > 0) {
      const target = patients.find(p => p.isMDRTBPositive) || patients[0];
      setSelectedPatientId(target.id);
      runInvestigation(target.id);
    }
  }, [patients, selectedPatientId, runInvestigation]);

  const handleMarkPositive = (patientId: string) => {
    markMDRTBPositive(patientId);
    setSelectedPatientId(patientId);
    setTimeout(() => runInvestigation(patientId), 300);
  };

  const networkContacts = useMemo(() => {
    if (!exposureData || !selectedPatientId) return [];
    return exposureData.affectedPeople.map(pid => {
      const personObj = getPersonById(pid);
      const assessment = assessments[pid];
      const session = exposureData.contacts.find(s => s.person1Id === pid || s.person2Id === pid);
      const name = personObj?.name || assessment?.personName || (session ? (session.person1Id === pid ? session.person1Name : session.person2Name) : 'Unknown');
      const role = personObj?.role || assessment?.personRole || 'patient';
      return {
        personId: pid, name, role,
        risk: assessment?.riskPercent || 0,
        category: assessment?.category || 'Low',
        duration: session?.duration || 0,
        location: session?.location || 'unknown',
        rssi: session?.avgRssi || -60,
        time: session?.startTime || Date.now(),
      };
    }).sort((a, b) => b.risk - a.risk);
  }, [exposureData, selectedPatientId, assessments, getPersonById]);

  const filteredPatients = useMemo(() =>
    patients.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.hospitalId.toLowerCase().includes(searchQuery.toLowerCase())),
    [patients, searchQuery]
  );

  const exposureNotifications = useMemo(() => {
    if (!networkContacts.length) return [];
    return networkContacts.filter(c => c.risk >= 20).map(c => ({
      person: c.name, risk: c.risk, category: c.category,
      action: c.risk >= 70 ? 'Immediate isolation & sputum culture' : c.risk >= 40 ? 'Urgent chest X-ray & screening' : 'Schedule routine monitoring',
    }));
  }, [networkContacts]);

  const overallRiskSummary = useMemo(() => {
    const total = networkContacts.length;
    const critical = networkContacts.filter(c => c.category === 'Critical').length;
    const high = networkContacts.filter(c => c.category === 'High').length;
    const medium = networkContacts.filter(c => c.category === 'Medium').length;
    return { total, critical, high, medium };
  }, [networkContacts]);

  return (
    <div className="p-4 sm:p-6 space-y-5 overflow-y-auto" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ============ PAGE HEADER STRIP ============ */}
      <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-red-950/20 to-slate-900 border border-red-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 w-72 h-full bg-gradient-to-l from-red-500/10 to-transparent pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shadow-inner">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                MDR-TB Exposure Tracing
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  Bayesian Contact Analysis
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                BLE proximity data → contact graph → Bayesian P(infection | contacts, duration, RSSI)
              </p>
            </div>
          </div>

          {/* Risk Triage Summary Pills */}
          {overallRiskSummary.total > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/30 border border-red-500/25 text-xs">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-bold text-red-300">{overallRiskSummary.critical} Critical</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/30 border border-amber-500/25 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-bold text-amber-300">{overallRiskSummary.high} High</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/30 border border-blue-500/25 text-xs">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="font-bold text-blue-300">{overallRiskSummary.medium} Medium</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs">
                <span className="font-semibold text-slate-300">{overallRiskSummary.total} Total Traced</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============ ROW 1: PATIENT SELECTOR + PIPELINE ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Patient Grid — 8 cols */}
        <div className="lg:col-span-8 rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-slate-800 shadow-xl">
          <div className="rounded-[calc(1rem-2px)] p-5 bg-slate-900/95 backdrop-blur-xl h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <SearchCheck className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Select Index Patient</h3>
                  <p className="text-[10px] text-slate-400">Choose a patient to initiate BLE contact graph investigation</p>
                </div>
              </div>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search patient…"
                className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all w-40"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
              {filteredPatients.map(p => {
                const isSelected = selectedPatientId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPatientId(p.id);
                      if (p.isMDRTBPositive) runInvestigation(p.id);
                    }}
                    className={`group flex flex-col gap-1.5 p-3 rounded-xl border text-left transition-all duration-200 ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500/50 shadow-md shadow-indigo-500/20'
                        : p.isMDRTBPositive
                        ? 'bg-red-950/20 border-red-500/25 hover:bg-red-950/30'
                        : 'bg-slate-950/40 border-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl leading-none">{p.avatar}</span>
                      {p.isMDRTBPositive && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                          MDR+
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-100 truncate leading-tight">{p.name}</p>
                      <p className="text-[9px] text-slate-500 font-mono">{p.hospitalId}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Mark Positive CTA */}
            {selectedPatient && !selectedPatient.isMDRTBPositive && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 rounded-xl bg-red-950/20 border border-red-500/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                    <div>
                      <p className="text-xs font-bold text-red-200">Confirm Lab Result: Positive for MDR-TB</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">This will immediately run BLE contact tracing for {selectedPatient.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleMarkPositive(selectedPatientId)}
                    className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-red-600/30 flex-shrink-0 ml-3"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Mark MDR-TB+
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Investigation Pipeline — 4 cols */}
        <div className="lg:col-span-4 rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-slate-800 shadow-xl">
          <div className="rounded-[calc(1rem-2px)] p-5 bg-slate-900/95 backdrop-blur-xl h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                Investigation Pipeline
              </h3>
              {investigationStep >= 0 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Step {Math.min(investigationStep + 1, INVESTIGATION_STEPS.length)}/{INVESTIGATION_STEPS.length}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              {INVESTIGATION_STEPS.map((step, i) => {
                const done = investigationStep > i;
                const active = investigationStep === i;

                return (
                  <div
                    key={step.label}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-300 ${
                      done
                        ? 'bg-emerald-950/25 border border-emerald-500/20'
                        : active
                        ? 'bg-indigo-950/30 border border-indigo-500/30'
                        : 'border border-transparent'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      done
                        ? 'bg-emerald-500/20 border border-emerald-500/40'
                        : active
                        ? 'bg-indigo-500/20 border border-indigo-500/40'
                        : 'bg-slate-900/60 border border-slate-800'
                    }`}>
                      {done
                        ? <Check className="w-3 h-3 text-emerald-400" />
                        : active
                        ? <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                        : <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      }
                    </div>
                    <span className={`text-[11px] font-medium ${
                      done ? 'text-emerald-300' : active ? 'text-indigo-200' : 'text-slate-500'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ============ ROW 2: CONTACT NETWORK GRAPH + TIMELINE + ALERTS ============ */}
      {exposureData && investigationStep >= 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Network Graph + Contact Table — 8 cols */}
          <div className="lg:col-span-8 rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-slate-800 shadow-xl">
            <div className="rounded-[calc(1rem-2px)] p-5 bg-slate-900/95 backdrop-blur-xl">

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Network className="w-4 h-4 text-blue-400" />
                  Proximity Contact Graph
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span>{exposureData.contacts.length} BLE sessions</span>
                  <span className="text-slate-700">·</span>
                  <span>{exposureData.affectedPeople.length} contacts</span>
                </div>
              </div>

              {/* Radial Network Canvas */}
              <div className="relative rounded-xl border border-slate-800 overflow-hidden mb-4" style={{ minHeight: 260, background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.06) 0%, rgba(15,23,42,0.95) 70%)' }}>
                {/* Index patient — center */}
                {selectedPatient && (
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-900/40 border-4 border-red-500 flex items-center justify-center text-3xl shadow-2xl shadow-red-500/40">
                      {selectedPatient.avatar}
                    </div>
                    <p className="text-[10px] font-bold text-red-300 mt-1">{selectedPatient.name}</p>
                    <p className="text-[9px] text-red-500">INDEX · MDR-TB+</p>
                  </div>
                )}

                {/* Contact Nodes orbiting */}
                {networkContacts.slice(0, 12).map((contact, i) => {
                  const total = Math.min(networkContacts.length, 12);
                  const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
                  const rx = 37, ry = 35;
                  const x = 50 + Math.cos(angle) * rx;
                  const y = 50 + Math.sin(angle) * ry;
                  const accent = riskAccent(contact.category);
                  const isContactSelected = selectedContact === contact.personId;

                  return (
                    <React.Fragment key={contact.personId}>
                      {/* Connecting line */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                        <line
                          x1="50%" y1="50%"
                          x2={`${x}%`} y2={`${y}%`}
                          stroke={getRiskColor(contact.category as any)}
                          strokeWidth={contact.risk >= 40 ? 2 : 1}
                          strokeDasharray={contact.risk >= 40 ? '0' : '5 4'}
                          opacity={isContactSelected ? 0.9 : 0.45}
                        />
                      </svg>

                      {/* Contact Node */}
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.06 }}
                        className="absolute z-10 cursor-pointer group"
                        style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                        onClick={() => setSelectedContact(contact.personId === selectedContact ? null : contact.personId)}
                      >
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center text-base transition-all duration-200 group-hover:scale-110 border-2 shadow-lg"
                          style={{ background: accent.bg, borderColor: isContactSelected ? '#38BDF8' : getRiskColor(contact.category as any), boxShadow: `0 0 14px ${getRiskColor(contact.category as any)}40` }}
                        >
                          {contact.role === 'doctor' ? '👨‍⚕️' : contact.role === 'nurse' ? '👩‍⚕️' : '🧑'}
                        </div>
                        <p className="text-[8px] font-bold text-slate-200 text-center mt-0.5 whitespace-nowrap">
                          {typeof contact.name === 'string' ? contact.name.split(' ')[0] : '?'}
                        </p>
                        <p className="text-[8px] font-bold text-center" style={{ color: getRiskColor(contact.category as any) }}>
                          {contact.risk}%
                        </p>
                      </motion.div>
                    </React.Fragment>
                  );
                })}

                {networkContacts.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-slate-600">
                      <Radio className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                      <p className="text-xs">No contacts detected yet</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Table List */}
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {networkContacts.map((contact) => {
                  const accent = riskAccent(contact.category);
                  return (
                    <div
                      key={contact.personId}
                      onClick={() => setSelectedContact(contact.personId === selectedContact ? null : contact.personId)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all border ${
                        selectedContact === contact.personId
                          ? 'border-cyan-500/30 bg-cyan-950/20'
                          : 'border-transparent hover:border-slate-800 hover:bg-slate-900/60'
                      }`}
                    >
                      {/* Risk Indicator */}
                      <div
                        className="w-2.5 h-10 rounded-full flex-shrink-0"
                        style={{ background: getRiskColor(contact.category as any) }}
                      />

                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                        style={{ background: `${getRoleColor(contact.role)}15` }}>
                        {contact.role === 'doctor' ? '👨‍⚕️' : contact.role === 'nurse' ? '👩‍⚕️' : '🧑'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-slate-100 truncate">{contact.name}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{contact.role} · {getRoomName(contact.location)}</p>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                        <span title="Contact Duration">{formatDuration(contact.duration)}</span>
                        <span title="Signal Strength">{formatRSSI(contact.rssi)}</span>
                      </div>

                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${accent.badge}`}>
                        {contact.risk}% {contact.category}
                      </span>

                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Panel: Timeline + Infection Alerts — 4 cols */}
          <div className="lg:col-span-4 flex flex-col gap-4">

            {/* Exposure Timeline */}
            <div className="rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-slate-800 shadow-xl">
              <div className="rounded-[calc(1rem-2px)] p-5 bg-slate-900/95 backdrop-blur-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Exposure Timeline
                </h3>

                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                  {exposureData.contacts.slice(0, 10).map((session, i) => (
                    <div key={session.id} className="flex gap-3 group">
                      <div className="flex flex-col items-center pt-1 flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-indigo-500/30" />
                        {i < Math.min(exposureData.contacts.length, 10) - 1 && (
                          <div className="w-px flex-1 bg-indigo-500/20 mt-1" />
                        )}
                      </div>
                      <div className="pb-3 min-w-0">
                        <p className="text-[10px] font-mono text-slate-500">{formatTime(session.startTime)}</p>
                        <p className="text-[11px] font-semibold text-slate-200 leading-tight mt-0.5">
                          {session.person1Name} ↔ {session.person2Name}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          {getRoomName(session.location)} · {formatDuration(session.duration)} · {formatRSSI(session.avgRssi)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Infection Control Notifications */}
            <div className="rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-amber-500/20 shadow-xl flex-1">
              <div className="rounded-[calc(1rem-2px)] p-5 bg-slate-900/95 backdrop-blur-xl h-full">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 mb-4">
                  <Bell className="w-4 h-4 text-amber-400 animate-pulse" />
                  Infection Control Actions
                </h3>

                <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                  {exposureNotifications.map((notif, i) => {
                    const accent = riskAccent(notif.category);
                    return (
                      <div
                        key={i}
                        className="p-3 rounded-xl border"
                        style={{ background: accent.bg, borderColor: accent.border }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-slate-100 truncate">{notif.person}</span>
                          <span className="text-[10px] font-bold ml-2" style={{ color: accent.text }}>
                            {notif.risk}%
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug">→ {notif.action}</p>
                      </div>
                    );
                  })}

                  {exposureNotifications.length === 0 && (
                    <div className="text-center py-6">
                      <Shield className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
                      <p className="text-xs text-slate-500">No alerts generated</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ CONTACT DETAIL MODAL ============ */}
      <AnimatePresence>
        {selectedContact && (() => {
          const contact = networkContacts.find(c => c.personId === selectedContact);
          const assessment = assessments[selectedContact];
          if (!contact) return null;
          const accent = riskAccent(contact.category);

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
              onClick={() => setSelectedContact(null)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 26 }}
                className="w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, #111827, #0D1527)',
                  borderColor: accent.border,
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between"
                  style={{ background: `${accent.bg}` }}>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" style={{ color: accent.text }} />
                    <span className="text-sm font-bold text-white">Exposure Contact Profile</span>
                  </div>
                  <button onClick={() => setSelectedContact(null)}
                    className="w-7 h-7 rounded-lg bg-slate-900/40 hover:bg-slate-900/60 flex items-center justify-center text-slate-300 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {/* Profile */}
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                      style={{ background: `${getRoleColor(contact.role)}15`, border: `1px solid ${getRoleColor(contact.role)}30` }}>
                      {contact.role === 'doctor' ? '👨‍⚕️' : contact.role === 'nurse' ? '👩‍⚕️' : '🧑'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{contact.name}</p>
                      <p className="text-xs capitalize mt-0.5" style={{ color: getRoleColor(contact.role) }}>{contact.role}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${accent.badge}`}>
                      {contact.risk}% {contact.category}
                    </span>
                  </div>

                  {/* Risk Bar */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-400 font-medium">Bayesian Infection Probability</span>
                      <span className="font-bold" style={{ color: accent.text }}>{contact.risk}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${contact.risk}%` }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="h-full rounded-full"
                        style={{ background: getRiskColor(contact.category as any) }}
                      />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { l: 'Exposure Location', v: getRoomName(contact.location) },
                      { l: 'Contact Duration', v: formatDuration(contact.duration) },
                      { l: 'Signal Strength (RSSI)', v: formatRSSI(contact.rssi) },
                      { l: 'Contact Time', v: formatTime(contact.time) },
                    ].map(item => (
                      <div key={item.l} className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800">
                        <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide">{item.l}</p>
                        <p className="text-xs font-bold text-slate-200 mt-0.5">{item.v}</p>
                      </div>
                    ))}
                  </div>

                  {/* Action Recommendation */}
                  <div className="p-3.5 rounded-xl border" style={{ background: accent.bg, borderColor: accent.border }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: accent.text }}>
                      Clinical Recommendation
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {contact.risk >= 70
                        ? '🚨 Immediate MDR-TB isolation protocol. Collect sputum sample for culture and DST within 2 hours. Notify Infection Control Officer.'
                        : contact.risk >= 40
                        ? '⚠️ Urgent sputum smear & chest X-ray within 24 hours. Consider prophylactic TB treatment after clinical review.'
                        : contact.risk >= 20
                        ? '📋 Schedule routine TB screening within 72 hours. Monitor for symptoms — cough, fever, night sweats.'
                        : '✅ Low transmission risk. Include in routine contact surveillance programme.'}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
