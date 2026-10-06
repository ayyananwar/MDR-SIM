// ============================================================
// Hospital Store — Master State for all hospital entities
// ============================================================

import { create } from 'zustand';
import type {
  Patient, Doctor, Nurse, Visitor, Wearable, Gateway,
  ActivityEvent, Alert, Person, RoomId, BLEPacket,
} from '../types';
import { generatePatients, generateDoctors, generateNurses, generateVisitors, generateWearablesFromPeople, generateGateways } from '../data/generators';
import { generatePatientId, generateWearableId, generateBLEDeviceId, generateSessionId, generateAlertId, generateEventId, generatePacketId } from '../utils/ids';
import { getRoomCenter, PATIENT_WORKFLOWS } from '../data/simulation';
import { useContactStore } from './useContactStore';
import { useRiskStore } from './useRiskStore';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface HospitalState {
  // ---- Entities ----
  patients: Patient[];
  doctors: Doctor[];
  nurses: Nurse[];
  visitors: Visitor[];
  wearables: Wearable[];
  gateways: Gateway[];

  // ---- Events ----
  activityFeed: ActivityEvent[];
  alerts: Alert[];
  packets: BLEPacket[];

  // ---- Computed ----
  allPeople: () => Person[];
  getPersonById: (id: string) => Person | undefined;

  // ---- Actions ----
  initialize: () => void;
  registerPatient: (data: {
    name: string;
    age: number;
    gender: 'Male' | 'Female' | 'Other';
    department: string;
    symptoms: string[];
    visitType: string;
  }) => Patient;
  addDoctor: (name?: string) => Doctor;
  addNurse: (name?: string) => Nurse;
  addVisitor: (name?: string) => Visitor;
  markMDRTBPositive: (patientId: string) => void;
  updatePersonPosition: (personId: string, position: { x: number; y: number }, room: RoomId) => void;
  updatePersonWorkflowStep: (personId: string) => void;
  addActivity: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => void;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>) => void;
  acknowledgeAlert: (alertId: string) => void;
  addPacket: (packet: BLEPacket) => void;
  updateGateway: (gatewayId: string, updates: Partial<Gateway>) => void;
  rotateSessionIds: () => void;
  updateWearableBattery: (wearableId: string, battery: number) => void;
}

export const useHospitalStore = create<HospitalState>((set, get) => ({
  patients: [],
  doctors: [],
  nurses: [],
  visitors: [],
  wearables: [],
  gateways: [],
  activityFeed: [],
  alerts: [],
  packets: [],

  allPeople: () => {
    const s = get();
    return [...s.patients, ...s.doctors, ...s.nurses, ...s.visitors];
  },

  getPersonById: (id: string) => {
    return get().allPeople().find((p) => p.id === id);
  },

  initialize: () => {
    const patients = generatePatients(15);
    const doctors = generateDoctors(6);
    const nurses = generateNurses(8);
    const visitors = generateVisitors(4);
    const allPeople = [...patients, ...doctors, ...nurses, ...visitors];
    const wearables = generateWearablesFromPeople(allPeople);
    const gateways = generateGateways();

    // Link visitor names
    visitors.forEach((v) => {
      const pat = patients.find((p) => p.id === v.visitingPatientId);
      if (pat) v.visitingPatientName = pat.name;
    });

    // Seed initial BLE packets across gateways
    const initialPackets: BLEPacket[] = [];
    gateways.forEach((gw) => {
      allPeople.slice(0, 6).forEach((p) => {
        initialPackets.push({
          id: generatePacketId(),
          sessionId: p.sessionId,
          bleDeviceId: p.bleDeviceId,
          rssi: -40 - Math.floor(Math.random() * 30),
          timestamp: Date.now() - Math.floor(Math.random() * 10000),
          gatewayId: gw.id,
          advertisementType: 'ADV_NONCONN_IND',
          isValid: true,
          isDuplicate: Math.random() < 0.1,
          estimatedDistance: Math.round((0.5 + Math.random() * 2) * 10) / 10,
          personId: p.id,
          personName: p.name,
          personRole: p.role,
          pipelineStage: 'received',
        });
      });
    });

    set({
      patients,
      doctors,
      nurses,
      visitors,
      wearables,
      gateways,
      packets: initialPackets,
      activityFeed: [
        {
          id: generateEventId(),
          type: 'system',
          message: 'MedTrace Hospital System initialized',
          timestamp: Date.now(),
          severity: 'info',
        },
        {
          id: generateEventId(),
          type: 'system',
          message: `${patients.length} patients, ${doctors.length} doctors, ${nurses.length} nurses loaded`,
          timestamp: Date.now() - 1000,
          severity: 'info',
        },
        {
          id: generateEventId(),
          type: 'gateway',
          message: 'All gateways online and scanning',
          timestamp: Date.now() - 2000,
          severity: 'info',
        },
      ],
      alerts: [],
    });
  },

  registerPatient: (data) => {
    const wId = generateWearableId();
    const bleId = generateBLEDeviceId();
    const sessId = generateSessionId();
    const hId = generatePatientId();
    const workflow = pickRandom(PATIENT_WORKFLOWS);
    const startPos = getRoomCenter('reception', hId);

    const newPatient: Patient = {
      id: `person-pat-${Date.now()}`,
      name: data.name,
      role: 'patient',
      hospitalId: hId,
      wearableId: wId,
      bleDeviceId: bleId,
      sessionId: sessId,
      position: startPos,
      targetPosition: startPos,
      currentRoom: 'reception',
      targetRoom: 'reception',
      battery: 100,
      status: 'active',
      isMDRTBPositive: false,
      riskLevel: 'Low',
      riskScore: 5,
      avatar: data.gender === 'Male' ? '👨' : '👩',
      age: data.age,
      gender: data.gender,
      department: data.department as Patient['department'],
      symptoms: data.symptoms,
      visitType: data.visitType as Patient['visitType'],
      admissionTime: Date.now(),
      workflowStep: 0,
      workflow,
    };

    const newWearable: Wearable = {
      id: wId,
      bleDeviceId: bleId,
      assignedTo: newPatient.id,
      assignedToName: data.name,
      assignedToRole: 'patient',
      battery: 100,
      status: 'Active',
      sessionId: sessId,
      lastRotation: Date.now(),
      activeSince: Date.now(),
    };

    set((state) => ({
      patients: [...state.patients, newPatient],
      wearables: [...state.wearables, newWearable],
    }));

    // Fire activity events
    get().addActivity({ type: 'registration', message: `${data.name} registered (${hId})`, severity: 'info', personId: newPatient.id });
    get().addActivity({ type: 'wearable', message: `Wearable ${wId} assigned to ${data.name}`, severity: 'info', personId: newPatient.id });
    get().addActivity({ type: 'ble', message: `BLE Broadcasting started for ${bleId}`, severity: 'info', personId: newPatient.id });

    return newPatient;
  },

  addDoctor: (name?: string) => {
    const docName = name || `Dr. New Doctor ${Math.floor(Math.random() * 100)}`;
    const wId = generateWearableId();
    const bleId = generateBLEDeviceId();
    const sessId = generateSessionId();
    const workflow = pickRandom([
      ['doctor-room-1', 'ward-a', 'icu', 'doctor-room-1'] as RoomId[],
      ['doctor-room-2', 'ward-b', 'laboratory', 'doctor-room-2'] as RoomId[],
    ]);
    const startPos = getRoomCenter(workflow[0], bleId);

    const doc: Doctor = {
      id: `person-doc-${Date.now()}`,
      name: docName,
      role: 'doctor',
      hospitalId: `DOC-${Math.floor(Math.random() * 900) + 100}`,
      wearableId: wId,
      bleDeviceId: bleId,
      sessionId: sessId,
      position: startPos,
      targetPosition: startPos,
      currentRoom: workflow[0],
      targetRoom: workflow[0],
      battery: 95,
      status: 'active',
      isMDRTBPositive: false,
      riskLevel: 'Low',
      riskScore: 3,
      avatar: '👨‍⚕️',
      specialization: 'General Medicine',
      department: 'General Ward',
      workflowStep: 0,
      workflow,
    };

    set((s) => ({
      doctors: [...s.doctors, doc],
      wearables: [...s.wearables, {
        id: wId, bleDeviceId: bleId, assignedTo: doc.id, assignedToName: docName,
        assignedToRole: 'doctor' as const, battery: 95, status: 'Active' as const,
        sessionId: sessId, lastRotation: Date.now(), activeSince: Date.now(),
      }],
    }));
    get().addActivity({ type: 'system', message: `${docName} added to staff`, severity: 'info' });
    return doc;
  },

  addNurse: (name?: string) => {
    const nrsName = name || `Sr. New Nurse ${Math.floor(Math.random() * 100)}`;
    const wId = generateWearableId();
    const bleId = generateBLEDeviceId();
    const sessId = generateSessionId();
    const workflow = pickRandom([
      ['nurse-station', 'ward-a', 'pharmacy', 'ward-a', 'nurse-station'] as RoomId[],
      ['nurse-station', 'ward-b', 'icu', 'nurse-station'] as RoomId[],
    ]);
    const startPos = getRoomCenter(workflow[0], bleId);

    const nrs: Nurse = {
      id: `person-nrs-${Date.now()}`,
      name: nrsName,
      role: 'nurse',
      hospitalId: `NRS-${Math.floor(Math.random() * 900) + 100}`,
      wearableId: wId,
      bleDeviceId: bleId,
      sessionId: sessId,
      position: startPos,
      targetPosition: startPos,
      currentRoom: workflow[0],
      targetRoom: workflow[0],
      battery: 90,
      status: 'active',
      isMDRTBPositive: false,
      riskLevel: 'Low',
      riskScore: 2,
      avatar: '👩‍⚕️',
      shift: 'Morning',
      department: 'General Ward',
      workflowStep: 0,
      workflow,
    };

    set((s) => ({
      nurses: [...s.nurses, nrs],
      wearables: [...s.wearables, {
        id: wId, bleDeviceId: bleId, assignedTo: nrs.id, assignedToName: nrsName,
        assignedToRole: 'nurse' as const, battery: 90, status: 'Active' as const,
        sessionId: sessId, lastRotation: Date.now(), activeSince: Date.now(),
      }],
    }));
    get().addActivity({ type: 'system', message: `${nrsName} added to staff`, severity: 'info' });
    return nrs;
  },

  addVisitor: (name?: string) => {
    const visName = name || `Visitor ${Math.floor(Math.random() * 100)}`;
    const wId = generateWearableId();
    const bleId = generateBLEDeviceId();
    const sessId = generateSessionId();
    const workflow = pickRandom([
      ['reception', 'waiting-area', 'ward-a', 'exit'] as RoomId[],
      ['reception', 'waiting-area', 'ward-b', 'exit'] as RoomId[],
    ]);
    const startPos = getRoomCenter(workflow[0], bleId);

    const vis: Visitor = {
      id: `person-vis-${Date.now()}`,
      name: visName,
      role: 'visitor',
      hospitalId: `VIS-${Math.floor(Math.random() * 900) + 100}`,
      wearableId: wId,
      bleDeviceId: bleId,
      sessionId: sessId,
      position: startPos,
      targetPosition: startPos,
      currentRoom: workflow[0],
      targetRoom: workflow[0],
      battery: 85,
      status: 'active',
      isMDRTBPositive: false,
      riskLevel: 'Low',
      riskScore: 1,
      avatar: '👨',
      visitingPatientId: '',
      visitingPatientName: '',
      workflowStep: 0,
      workflow,
    };

    set((s) => ({
      visitors: [...s.visitors, vis],
      wearables: [...s.wearables, {
        id: wId, bleDeviceId: bleId, assignedTo: vis.id, assignedToName: visName,
        assignedToRole: 'visitor' as const, battery: 85, status: 'Active' as const,
        sessionId: sessId, lastRotation: Date.now(), activeSince: Date.now(),
      }],
    }));
    get().addActivity({ type: 'system', message: `${visName} entered hospital`, severity: 'info' });
    return vis;
  },

  markMDRTBPositive: (patientId: string) => {
    set((state) => ({
      patients: state.patients.map((p) =>
        p.id === patientId ? { ...p, isMDRTBPositive: true, riskLevel: 'Critical' as const, riskScore: 95 } : p
      ),
    }));

    const patient = get().patients.find((p) => p.id === patientId);
    if (patient) {
      const contactSessions = useContactStore.getState().getContactsFor(patientId);

      // Re-evaluate risk for all contacts who met this now-confirmed positive patient
      contactSessions.forEach((sess: any) => {
        const contactPersonId = sess.person1Id === patientId ? sess.person2Id : sess.person1Id;
        const durationMin = Math.max(0.1, (sess.duration || 10) / 60);

        useRiskStore.getState().updateRisk(
          contactPersonId,
          durationMin,
          sess.avgRssi || -55,
          1,
          true, // isMDRTBConfirmed = true!
          `Exposed to confirmed MDR-TB positive ${patient.name} (${Math.round(sess.duration || 10)}s contact)`
        );
      });

      get().addActivity({
        type: 'exposure',
        message: `⚠️ ${patient.name} (${patient.hospitalId}) confirmed MDR-TB POSITIVE. ${contactSessions.length} contacts traced.`,
        severity: 'critical',
        personId: patientId,
      });
      get().addAlert({
        type: 'mdr-tb-positive',
        title: 'MDR-TB Positive Confirmed',
        message: `${patient.name} (${patient.hospitalId}) has been confirmed MDR-TB positive. Immediate exposure investigation required.`,
        severity: 'critical',
        personId: patientId,
      });
    }
  },

  updatePersonPosition: (personId, position, room) => {
    const updateList = <T extends Person>(list: T[]): T[] =>
      list.map((p) => (p.id === personId ? { ...p, position, currentRoom: room } : p));

    set((s) => ({
      patients: updateList(s.patients),
      doctors: updateList(s.doctors),
      nurses: updateList(s.nurses),
      visitors: updateList(s.visitors),
    }));
  },

  updatePersonWorkflowStep: (personId: string) => {
    const advanceStep = <T extends Person & { workflowStep: number; workflow: RoomId[] }>(list: T[]): T[] =>
      list.map((p) => {
        if (p.id !== personId) return p;
        const nextStep = (p.workflowStep + 1) % p.workflow.length;
        const nextRoom = p.workflow[nextStep];
        const targetPos = getRoomCenter(nextRoom, `${p.id}-${nextStep}`);
        return { ...p, workflowStep: nextStep, targetRoom: nextRoom, targetPosition: targetPos, status: 'moving' as const };
      });

    set((s) => ({
      patients: advanceStep(s.patients),
      doctors: advanceStep(s.doctors),
      nurses: advanceStep(s.nurses),
      visitors: advanceStep(s.visitors),
    }));
  },

  addActivity: (event) => {
    const newEvent: ActivityEvent = {
      ...event,
      id: generateEventId(),
      timestamp: Date.now(),
    };
    set((s) => ({
      activityFeed: [newEvent, ...s.activityFeed].slice(0, 100),
    }));
  },

  addAlert: (alert) => {
    const newAlert: Alert = {
      ...alert,
      id: generateAlertId(),
      timestamp: Date.now(),
      acknowledged: false,
    };
    set((s) => ({
      alerts: [newAlert, ...s.alerts].slice(0, 50),
    }));
  },

  acknowledgeAlert: (alertId) => {
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)),
    }));
  },

  addPacket: (packet) => {
    set((s) => ({
      packets: [packet, ...s.packets].slice(0, 200),
    }));
  },

  updateGateway: (gatewayId, updates) => {
    set((s) => ({
      gateways: s.gateways.map((g) => (g.id === gatewayId ? { ...g, ...updates } : g)),
    }));
  },

  rotateSessionIds: () => {
    const now = Date.now();
    set((s) => {
      const updateSessions = <T extends Person>(list: T[]): T[] =>
        list.map((p) => ({ ...p, sessionId: generateSessionId() }));

      return {
        patients: updateSessions(s.patients),
        doctors: updateSessions(s.doctors),
        nurses: updateSessions(s.nurses),
        visitors: updateSessions(s.visitors),
        wearables: s.wearables.map((w) => ({
          ...w,
          sessionId: generateSessionId(),
          lastRotation: now,
        })),
      };
    });
    get().addActivity({ type: 'ble', message: 'Session IDs rotated across all wearables', severity: 'info' });
  },

  updateWearableBattery: (wearableId, battery) => {
    set((s) => ({
      wearables: s.wearables.map((w) => (w.id === wearableId ? { ...w, battery } : w)),
    }));
  },
}));
