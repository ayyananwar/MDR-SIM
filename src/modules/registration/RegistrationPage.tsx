import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Check, ArrowDown, Shield, Eye, EyeOff, RefreshCw, Database,
  Radio, Watch, Fingerprint, Activity, BatteryCharging, Wifi, Lock,
  Sparkles, CheckCircle2, ChevronRight, Cpu, KeyRound
} from 'lucide-react';
import { useHospitalStore } from '../../stores/useHospitalStore';
import { useSimulationStore } from '../../stores/useSimulationStore';

const DEPARTMENTS = ['MDR-TB Ward', 'General Ward', 'ICU', 'Outpatient', 'Emergency'];
const SYMPTOMS = ['Persistent Cough', 'Fever', 'Night Sweats', 'Weight Loss', 'Chest Pain', 'Fatigue', 'Shortness of Breath', 'Blood in Sputum'];
const VISIT_TYPES = ['Inpatient', 'Outpatient', 'Emergency'] as const;

export default function RegistrationPage() {
  const { registerPatient, patients, wearables } = useHospitalStore();
  const { setCurrentLayer } = useSimulationStore();
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    department: DEPARTMENTS[0],
    symptoms: [] as string[],
    visitType: 'Inpatient' as typeof VISIT_TYPES[number],
  });

  const [registered, setRegistered] = useState<null | {
    hospitalId: string;
    wearableId: string;
    bleDeviceId: string;
    sessionId: string;
    name: string;
  }>(null);

  const [pipelineStep, setPipelineStep] = useState(-1);
  const [sessionHistory, setSessionHistory] = useState<string[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [rotationCountdown, setRotationCountdown] = useState(25);

  useEffect(() => { setCurrentLayer('Wearable Layer'); }, [setCurrentLayer]);

  // Session ID rotation demo
  useEffect(() => {
    if (!registered) return;
    setCurrentSessionId(registered.sessionId);
    setSessionHistory([registered.sessionId]);

    const timer = setInterval(() => {
      setRotationCountdown((prev) => {
        if (prev <= 1) {
          const newId = Math.random().toString(16).substring(2, 6).toUpperCase();
          setCurrentSessionId(newId);
          setSessionHistory((h) => [...h.slice(-4), newId]);
          return 25;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [registered]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.age) return;

    const patient = registerPatient({
      name: form.name,
      age: parseInt(form.age),
      gender: form.gender,
      department: form.department,
      symptoms: form.symptoms,
      visitType: form.visitType,
    });

    setRegistered({
      hospitalId: patient.hospitalId,
      wearableId: patient.wearableId,
      bleDeviceId: patient.bleDeviceId,
      sessionId: patient.sessionId,
      name: patient.name,
    });

    // Animate 5-stage provisioning pipeline
    setPipelineStep(0);
    [1, 2, 3, 4].forEach((step) => {
      setTimeout(() => setPipelineStep(step), step * 650);
    });
  };

  const toggleSymptom = (s: string) => {
    setForm((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(s)
        ? prev.symptoms.filter((x) => x !== s)
        : [...prev.symptoms, s],
    }));
  };

  const resetForm = () => {
    setForm({
      name: '',
      age: '',
      gender: 'Male',
      department: DEPARTMENTS[0],
      symptoms: [],
      visitType: 'Inpatient',
    });
    setRegistered(null);
    setPipelineStep(-1);
    setSessionHistory([]);
    setRotationCountdown(25);
  };

  const activeWearablesCount = useMemo(() => wearables.filter((w) => w.status === 'Active').length, [wearables]);

  return (
    <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-w-[1700px] mx-auto" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ============ HEADER HUD ============ */}
      <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-indigo-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="absolute -left-6 -bottom-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shadow-inner">
              <UserPlus className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Patient Intake & Wearable Provisioning
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  AES Ephemeral Token Rotation
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Onboards patients, assigns BLE wristbands, and binds cryptographic rotating session keys (HIPAA/GDPR privacy)
              </p>
            </div>
          </div>

          {/* Census stats */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex flex-col items-center px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-lg font-black font-mono text-indigo-400">{patients.length}</span>
              <span className="text-[9px] text-slate-500 uppercase tracking-wide">Patients</span>
            </div>
            <div className="flex flex-col items-center px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-lg font-black font-mono text-emerald-400">{activeWearablesCount}</span>
              <span className="text-[9px] text-slate-500 uppercase tracking-wide">Active Bands</span>
            </div>
            <div className="flex flex-col items-center px-3.5 py-1.5 rounded-xl bg-indigo-950/30 border border-indigo-500/25">
              <span className="text-lg font-black text-indigo-300 font-mono">25s</span>
              <span className="text-[9px] text-indigo-400 uppercase tracking-wide">Token Rotation</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============ MAIN TWO-COLUMN LAYOUT ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Left: Patient Intake Form — 7 cols */}
        <div className="lg:col-span-7 rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-slate-800 shadow-xl">
          <div className="rounded-[calc(1rem-2px)] p-5 sm:p-6 bg-slate-900/95 backdrop-blur-xl h-full">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Clinical Intake Form</h3>
                  <p className="text-[10px] text-slate-400">Complete clinical details to issue wristband</p>
                </div>
              </div>
              {registered && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  New Registration
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Full Name <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-950/70 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white placeholder-slate-500 transition-all font-medium"
                  placeholder="e.g. Ramesh Chandra"
                />
              </div>

              {/* Age + Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Age <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={120}
                    value={form.age}
                    onChange={(e) => setForm((prev) => ({ ...prev, age: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-950/70 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white placeholder-slate-500 transition-all font-mono"
                    placeholder="e.g. 45"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Gender
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-950/70 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white transition-all font-medium"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Assigned Clinical Department
                </label>
                <select
                  value={form.department}
                  onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-950/70 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white transition-all font-medium"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Symptoms Selector */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Reported Symptoms / Clinical Indicators
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SYMPTOMS.map((s) => {
                    const isSelected = form.symptoms.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSymptom(s)}
                        className={`px-3 py-1.5 text-xs rounded-xl font-medium border transition-all ${
                          isSelected
                            ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-200 shadow-sm shadow-indigo-500/20'
                            : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {isSelected && <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 mr-1.5" />}
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visit Type */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Encounter Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {VISIT_TYPES.map((v) => {
                    const isSelected = form.visitType === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, visitType: v }))}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!form.name || !form.age}
                  className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                    form.name && form.age
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-indigo-300" />
                  Provision Smart Wristband & Register Patient
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Telemetry & Pipeline — 5 cols */}
        <div className="lg:col-span-5 flex flex-col gap-5">

          {/* Provisioning Pipeline */}
          <div className="rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-slate-800 shadow-xl">
            <div className="rounded-[calc(1rem-2px)] p-5 bg-slate-900/95 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  Hardware Provisioning Pipeline
                </h3>
                {pipelineStep >= 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    Step {Math.min(pipelineStep + 1, 5)}/5
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {[
                  { icon: Database, label: 'Central Database Ingestion', desc: 'Patient Record Created', id: registered?.hospitalId },
                  { icon: Watch, label: 'Smart Wristband Allocated', desc: registered?.wearableId || 'Waiting...', id: null },
                  { icon: Radio, label: 'BLE Hardware Beacon Activated', desc: registered?.bleDeviceId || 'Waiting...', id: null },
                  { icon: KeyRound, label: 'Rotating Token Seed Generated', desc: registered?.sessionId || 'Waiting...', id: null },
                  { icon: CheckCircle2, label: 'Provisioning Verified & Deployed', desc: 'Ready for real-time contact tracing', id: null },
                ].map((step, i) => {
                  const done = pipelineStep > i;
                  const active = pipelineStep === i;

                  return (
                    <React.Fragment key={step.label}>
                      <div
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all duration-300 ${
                          done
                            ? 'bg-emerald-950/20 border-emerald-500/25'
                            : active
                            ? 'bg-indigo-950/30 border-indigo-500/40'
                            : 'bg-slate-950/30 border-slate-800/60'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                            done
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : active
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse'
                              : 'bg-slate-900 text-slate-600 border border-slate-800'
                          }`}
                        >
                          {done ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <step.icon className="w-3.5 h-3.5" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] font-bold leading-tight ${done ? 'text-emerald-300' : active ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {step.label}
                          </p>
                          <p className={`text-[10px] font-mono mt-0.5 truncate ${done ? 'text-emerald-400' : active ? 'text-indigo-300' : 'text-slate-600'}`}>
                            {pipelineStep >= i ? step.desc : 'Pending Intake...'}
                          </p>
                        </div>

                        {done && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                      </div>

                      {i < 4 && (
                        <div className="flex justify-center my-0.5">
                          <ArrowDown className="w-2.5 h-2.5 text-slate-700" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Provisioned Tag Telemetry Card */}
          {registered && pipelineStep >= 4 && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-2xl p-1 bg-gradient-to-b from-indigo-500/30 to-transparent border border-indigo-500/40 shadow-2xl"
            >
              <div className="rounded-[calc(1rem-2px)] p-5 bg-slate-900/95 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Active Wristband Telemetry</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ONLINE · BROADCASTING
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { l: 'Patient ID', v: registered.hospitalId, mono: true },
                    { l: 'Wristband Hardware', v: registered.wearableId, mono: true },
                    { l: 'BLE Device MAC', v: registered.bleDeviceId, mono: true },
                    { l: 'Active Ephemeral Token', v: currentSessionId, mono: true, highlight: true },
                  ].map((m) => (
                    <div key={m.l} className={`p-2.5 rounded-xl border ${m.highlight ? 'bg-indigo-950/40 border-indigo-500/30' : 'bg-slate-950/50 border-slate-800/80'}`}>
                      <p className="text-[9px] text-slate-500 uppercase tracking-wide font-semibold">{m.l}</p>
                      <p className={`text-xs font-bold mt-0.5 ${m.highlight ? 'text-indigo-300 font-mono' : 'text-slate-200'} ${m.mono ? 'font-mono' : ''}`}>
                        {m.v}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Token Rotation Countdown Ring */}
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: '4s' }} />
                    <span className="text-slate-400 text-[11px]">Next Ephemeral Rotation:</span>
                  </div>
                  <span className="font-mono font-bold text-indigo-300">{rotationCountdown}s</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Privacy Architecture Explainer */}
          <div className="rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-slate-800 shadow-xl">
            <div className="rounded-[calc(1rem-2px)] p-4 sm:p-5 bg-slate-900/95 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Cryptographic Privacy Architecture
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/25 flex items-start gap-2.5">
                  <Eye className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-bold text-emerald-300">Central Secure Authority Knows</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Patient ↔ Wearable ID ↔ Real MAC ↔ Ephemeral Key
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/25 flex items-start gap-2.5">
                  <EyeOff className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-bold text-red-300">RF Eavesdroppers & Sniffers See</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Only rotating pseudo-random hashes. Zero PII transmitted over airwaves (HIPAA/GDPR compliant).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
