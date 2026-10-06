// ============================================================
// Seed Data Generators — Patients, Doctors, Nurses, Visitors
// ============================================================

import type { Patient, Doctor, Nurse, Visitor, Wearable, Gateway } from '../types';
import { generatePatientId, generateDoctorId, generateNurseId, generateVisitorId, generateWearableId, generateBLEDeviceId, generateSessionId } from '../utils/ids';
import { getRoomCenter, PATIENT_WORKFLOWS, DOCTOR_WORKFLOWS, NURSE_WORKFLOWS, VISITOR_WORKFLOWS, GATEWAY_CONFIGS } from './simulation';

// ---- Name Banks ----

const MALE_NAMES = [
  'Arjun Sharma', 'Rohan Patel', 'Vikram Singh', 'Aditya Kumar', 'Sanjay Gupta',
  'Rahul Verma', 'Amit Joshi', 'Karan Mehta', 'Pradeep Nair', 'Suresh Reddy',
  'Nikhil Das', 'Manish Iyer', 'Deepak Pillai', 'Rajesh Menon', 'Anand Rao',
];

const FEMALE_NAMES = [
  'Priya Sharma', 'Anjali Patel', 'Kavita Singh', 'Deepika Nair', 'Sunita Gupta',
  'Meera Verma', 'Pooja Joshi', 'Neha Mehta', 'Lakshmi Reddy', 'Divya Das',
  'Rekha Iyer', 'Shalini Menon', 'Anita Rao', 'Swati Pillai', 'Ritu Kumar',
];

const DOCTOR_NAMES = [
  'Dr. Rajesh Krishnan', 'Dr. Ananya Desai', 'Dr. Vikram Choudhury',
  'Dr. Meera Balachandran', 'Dr. Sanjay Kapoor', 'Dr. Priya Natarajan',
  'Dr. Arjun Malhotra', 'Dr. Kavita Sundaram',
];

const NURSE_NAMES = [
  'Sr. Mary Thomas', 'Sr. Fatima Khan', 'Sr. Grace David', 'Sr. Lakshmi Nair',
  'Sr. Asha Pillai', 'Sr. Rebecca John', 'Bro. Joseph Varghese', 'Sr. Deepa Menon',
  'Sr. Sunita Rao', 'Sr. Amala Kurian', 'Sr. Preethi Mathew', 'Sr. Diana George',
];

const VISITOR_NAMES = [
  'Ramesh Kumar', 'Savita Devi', 'Mohan Lal', 'Kamala Nair',
  'Sunil Sharma', 'Geeta Reddy',
];

const SPECIALIZATIONS = [
  'Pulmonology', 'Internal Medicine', 'Infectious Disease', 'Radiology',
  'Pathology', 'Critical Care', 'General Medicine', 'Pulmonology',
];

const SYMPTOMS_POOL = [
  'Persistent Cough', 'Fever', 'Night Sweats', 'Weight Loss',
  'Chest Pain', 'Fatigue', 'Shortness of Breath', 'Blood in Sputum',
  'Loss of Appetite', 'Body Ache',
];

const DEPARTMENTS_FOR_PATIENTS = ['MDR-TB Ward', 'General Ward', 'ICU', 'Outpatient'] as const;

// ---- Generators ----

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomSymptoms(): string[] {
  const count = 2 + Math.floor(Math.random() * 3);
  const shuffled = [...SYMPTOMS_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function generatePatients(count: number = 15): Patient[] {
  const patients: Patient[] = [];
  for (let i = 0; i < count; i++) {
    const gender = Math.random() > 0.45 ? 'Male' : 'Female';
    const names = gender === 'Male' ? MALE_NAMES : FEMALE_NAMES;
    const name = names[i % names.length];
    const wId = generateWearableId();
    const bleId = generateBLEDeviceId();
    const workflow = pickRandom(PATIENT_WORKFLOWS);
    const startRoom = workflow[0];
    const startPos = getRoomCenter(startRoom, i + 1);

    patients.push({
      id: `person-pat-${i}`,
      name,
      role: 'patient',
      hospitalId: generatePatientId(),
      wearableId: wId,
      bleDeviceId: bleId,
      sessionId: generateSessionId(),
      position: startPos,
      targetPosition: startPos,
      currentRoom: startRoom,
      targetRoom: startRoom,
      battery: 70 + Math.floor(Math.random() * 30),
      status: 'active',
      isMDRTBPositive: false,
      riskLevel: 'Low',
      riskScore: 2 + Math.floor(Math.random() * 3),
      avatar: gender === 'Male' ? '👨' : '👩',
      age: 20 + Math.floor(Math.random() * 55),
      gender,
      department: pickRandom([...DEPARTMENTS_FOR_PATIENTS]),
      symptoms: pickRandomSymptoms(),
      visitType: pickRandom(['Inpatient', 'Outpatient', 'Emergency'] as const),
      admissionTime: Date.now() - Math.floor(Math.random() * 86400000),
      workflowStep: 0,
      workflow,
    });
  }
  return patients;
}

export function generateDoctors(count: number = 6): Doctor[] {
  const doctors: Doctor[] = [];
  for (let i = 0; i < count; i++) {
    const wId = generateWearableId();
    const bleId = generateBLEDeviceId();
    const workflow = DOCTOR_WORKFLOWS[i % DOCTOR_WORKFLOWS.length];
    const startRoom = workflow[0];
    const startPos = getRoomCenter(startRoom, i + 50);

    doctors.push({
      id: `person-doc-${i}`,
      name: DOCTOR_NAMES[i % DOCTOR_NAMES.length],
      role: 'doctor',
      hospitalId: generateDoctorId(),
      wearableId: wId,
      bleDeviceId: bleId,
      sessionId: generateSessionId(),
      position: startPos,
      targetPosition: startPos,
      currentRoom: startRoom,
      targetRoom: startRoom,
      battery: 80 + Math.floor(Math.random() * 20),
      status: 'active',
      isMDRTBPositive: false,
      riskLevel: 'Low',
      riskScore: 3 + Math.floor(Math.random() * 5),
      avatar: i % 2 === 0 ? '👨‍⚕️' : '👩‍⚕️',
      specialization: SPECIALIZATIONS[i % SPECIALIZATIONS.length],
      department: pickRandom([...DEPARTMENTS_FOR_PATIENTS]),
      workflowStep: 0,
      workflow,
    });
  }
  return doctors;
}

export function generateNurses(count: number = 8): Nurse[] {
  const nurses: Nurse[] = [];
  const shifts = ['Morning', 'Evening', 'Night'] as const;
  for (let i = 0; i < count; i++) {
    const wId = generateWearableId();
    const bleId = generateBLEDeviceId();
    const workflow = NURSE_WORKFLOWS[i % NURSE_WORKFLOWS.length];
    const startRoom = workflow[0];
    const startPos = getRoomCenter(startRoom, i + 100);

    nurses.push({
      id: `person-nrs-${i}`,
      name: NURSE_NAMES[i % NURSE_NAMES.length],
      role: 'nurse',
      hospitalId: generateNurseId(),
      wearableId: wId,
      bleDeviceId: bleId,
      sessionId: generateSessionId(),
      position: startPos,
      targetPosition: startPos,
      currentRoom: startRoom,
      targetRoom: startRoom,
      battery: 75 + Math.floor(Math.random() * 25),
      status: 'active',
      isMDRTBPositive: false,
      riskLevel: 'Low',
      riskScore: 2 + Math.floor(Math.random() * 5),
      avatar: '👩‍⚕️',
      shift: shifts[i % shifts.length],
      department: pickRandom([...DEPARTMENTS_FOR_PATIENTS]),
      workflowStep: 0,
      workflow,
    });
  }
  return nurses;
}

export function generateVisitors(count: number = 4): Visitor[] {
  const visitors: Visitor[] = [];
  for (let i = 0; i < count; i++) {
    const wId = generateWearableId();
    const bleId = generateBLEDeviceId();
    const workflow = VISITOR_WORKFLOWS[i % VISITOR_WORKFLOWS.length];
    const startRoom = workflow[0];
    const startPos = getRoomCenter(startRoom, i + 200);

    visitors.push({
      id: `person-vis-${i}`,
      name: VISITOR_NAMES[i % VISITOR_NAMES.length],
      role: 'visitor',
      hospitalId: generateVisitorId(),
      wearableId: wId,
      bleDeviceId: bleId,
      sessionId: generateSessionId(),
      position: startPos,
      targetPosition: startPos,
      currentRoom: startRoom,
      targetRoom: startRoom,
      battery: 60 + Math.floor(Math.random() * 35),
      status: 'active',
      isMDRTBPositive: false,
      riskLevel: 'Low',
      riskScore: 1 + Math.floor(Math.random() * 3),
      avatar: i % 2 === 0 ? '👨' : '👩',
      visitingPatientId: `person-pat-${i % 5}`,
      visitingPatientName: '',
      workflowStep: 0,
      workflow,
    });
  }
  return visitors;
}

export function generateWearablesFromPeople(people: Array<{ id: string; name: string; role: string; wearableId: string; bleDeviceId: string; sessionId: string; battery: number }>): Wearable[] {
  return people.map((p) => ({
    id: p.wearableId,
    bleDeviceId: p.bleDeviceId,
    assignedTo: p.id,
    assignedToName: p.name,
    assignedToRole: p.role as 'patient' | 'doctor' | 'nurse' | 'visitor',
    battery: p.battery,
    status: 'Active' as const,
    sessionId: p.sessionId,
    lastRotation: Date.now(),
    activeSince: Date.now() - Math.floor(Math.random() * 3600000),
  }));
}

export function generateGateways(): Gateway[] {
  return GATEWAY_CONFIGS.map((cfg) => ({
    id: cfg.id,
    name: cfg.name,
    location: cfg.location,
    position: cfg.position,
    nearbyDevices: [],
    packetsReceived: 800 + Math.floor(Math.random() * 600),
    packetsProcessed: 700 + Math.floor(Math.random() * 400),
    packetsValidated: 600 + Math.floor(Math.random() * 400),
    packetsUnique: 150 + Math.floor(Math.random() * 100),
    contactSessionsGenerated: 20 + Math.floor(Math.random() * 25),
    cpu: 15 + Math.floor(Math.random() * 20),
    memory: 40 + Math.floor(Math.random() * 15),
    rssiRange: { min: -85, max: -35 },
    syncStatus: 'Synced' as const,
    scanRadius: cfg.scanRadius,
    isOnline: true,
  }));
}
