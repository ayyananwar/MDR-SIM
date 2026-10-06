// ============================================================
// Hospital Room / Floor Layout Definitions
// ============================================================

import type { Room, RoomId } from '../types';

export interface HospitalZone {
  id: string;
  name: string;
  category: 'critical' | 'clinical' | 'inpatient' | 'support' | 'public';
  accentColor: string;
}

export const HOSPITAL_ROOMS: (Room & { category: 'critical' | 'clinical' | 'inpatient' | 'support' | 'public'; code: string; capacity: number })[] = [
  { id: 'ward-a', name: 'Ward A (MDR-TB Isolation)', code: 'ISO-01', category: 'critical', position: { x: 40, y: 30 }, width: 250, height: 110, color: 'rgba(239, 68, 68, 0.12)', icon: '☣️', capacity: 4 },
  { id: 'ward-b', name: 'Ward B (General Care)', code: 'GEN-02', category: 'inpatient', position: { x: 310, y: 30 }, width: 250, height: 110, color: 'rgba(59, 130, 246, 0.10)', icon: '🛏️', capacity: 6 },
  { id: 'icu', name: 'Intensive Care Unit (ICU)', code: 'ICU-03', category: 'critical', position: { x: 580, y: 30 }, width: 280, height: 110, color: 'rgba(245, 158, 11, 0.12)', icon: '🚨', capacity: 5 },
  
  { id: 'doctor-room-1', name: 'Consultation Suite 1', code: 'DR-01', category: 'clinical', position: { x: 40, y: 170 }, width: 160, height: 130, color: 'rgba(16, 185, 129, 0.10)', icon: '👨‍⚕️', capacity: 3 },
  { id: 'doctor-room-2', name: 'Consultation Suite 2', code: 'DR-02', category: 'clinical', position: { x: 220, y: 170 }, width: 160, height: 130, color: 'rgba(16, 185, 129, 0.10)', icon: '🩺', capacity: 3 },
  { id: 'nurse-station', name: 'Central Nurse Station', code: 'NRS-01', category: 'clinical', position: { x: 400, y: 170 }, width: 160, height: 130, color: 'rgba(167, 139, 250, 0.12)', icon: '📋', capacity: 5 },
  { id: 'laboratory', name: 'Bio-Pathology Lab', code: 'LAB-01', category: 'support', position: { x: 580, y: 170 }, width: 135, height: 130, color: 'rgba(99, 102, 241, 0.12)', icon: '🔬', capacity: 4 },
  { id: 'radiology', name: 'Radiology / Imaging', code: 'RAD-01', category: 'support', position: { x: 735, y: 170 }, width: 125, height: 130, color: 'rgba(236, 72, 153, 0.10)', icon: '📡', capacity: 3 },

  { id: 'corridor-main', name: 'Central Transit Concourse', code: 'COR-01', category: 'public', position: { x: 40, y: 325 }, width: 820, height: 75, color: 'rgba(255, 255, 255, 0.02)', icon: '🚶', capacity: 15 },

  { id: 'reception', name: 'Main Triage & Check-in', code: 'REC-01', category: 'public', position: { x: 40, y: 425 }, width: 175, height: 110, color: 'rgba(59, 130, 246, 0.10)', icon: '🏥', capacity: 6 },
  { id: 'waiting-area', name: 'Patient Waiting Lounge', code: 'WNG-01', category: 'public', position: { x: 235, y: 425 }, width: 180, height: 110, color: 'rgba(245, 158, 11, 0.10)', icon: '🪑', capacity: 8 },
  { id: 'pharmacy', name: 'Dispensary & Pharmacy', code: 'PHM-01', category: 'support', position: { x: 435, y: 425 }, width: 155, height: 110, color: 'rgba(16, 185, 129, 0.10)', icon: '💊', capacity: 4 },
  { id: 'cafeteria', name: 'Staff & Visitor Cafeteria', code: 'CAF-01', category: 'public', position: { x: 610, y: 425 }, width: 165, height: 110, color: 'rgba(249, 115, 22, 0.10)', icon: '☕', capacity: 8 },
  { id: 'exit', name: 'Exit Gate', code: 'EXT-01', category: 'public', position: { x: 795, y: 425 }, width: 65, height: 110, color: 'rgba(148, 163, 184, 0.08)', icon: '🚪', capacity: 4 },
];

export function getRoomById(id: RoomId): Room {
  return HOSPITAL_ROOMS.find((r) => r.id === id) || HOSPITAL_ROOMS[0];
}

/**
 * Get natural scatter position of a room so occupants space out naturally inside room boundaries
 */
export function getRoomCenter(id: RoomId, seed?: number | string): { x: number; y: number } {
  const room = getRoomById(id);
  const paddingX = Math.min(room.width * 0.22, 28);
  const paddingY = Math.min(room.height * 0.22, 22);
  const usableWidth = room.width - paddingX * 2;
  const usableHeight = room.height - paddingY * 2;

  let numSeed: number | undefined;
  if (typeof seed === 'number') {
    numSeed = seed;
  } else if (typeof seed === 'string') {
    numSeed = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  }

  const randX = numSeed !== undefined ? ((Math.sin(numSeed * 9999) + 1) / 2) : Math.random();
  const randY = numSeed !== undefined ? ((Math.cos(numSeed * 7777) + 1) / 2) : Math.random();

  return {
    x: room.position.x + paddingX + randX * usableWidth,
    y: room.position.y + paddingY + randY * usableHeight,
  };
}

// ---- Realistic Workflows ----

export const PATIENT_WORKFLOWS: RoomId[][] = [
  ['reception', 'waiting-area', 'doctor-room-1', 'laboratory', 'ward-a', 'cafeteria', 'ward-a'],
  ['reception', 'waiting-area', 'doctor-room-2', 'radiology', 'ward-b', 'cafeteria', 'ward-b'],
  ['reception', 'waiting-area', 'doctor-room-1', 'laboratory', 'radiology', 'icu'],
  ['reception', 'waiting-area', 'doctor-room-2', 'laboratory', 'ward-a'],
  ['reception', 'waiting-area', 'doctor-room-1', 'ward-b', 'cafeteria', 'ward-b'],
  ['reception', 'waiting-area', 'doctor-room-2', 'laboratory', 'ward-a', 'ward-a'],
];

export const DOCTOR_WORKFLOWS: RoomId[][] = [
  ['doctor-room-1', 'ward-a', 'icu', 'doctor-room-1', 'ward-b', 'doctor-room-1'],
  ['doctor-room-2', 'ward-b', 'laboratory', 'ward-a', 'doctor-room-2'],
  ['doctor-room-1', 'icu', 'ward-a', 'nurse-station', 'doctor-room-1'],
  ['doctor-room-2', 'ward-b', 'icu', 'doctor-room-2', 'ward-a', 'doctor-room-2'],
];

export const NURSE_WORKFLOWS: RoomId[][] = [
  ['nurse-station', 'ward-a', 'pharmacy', 'ward-a', 'nurse-station'],
  ['nurse-station', 'ward-b', 'pharmacy', 'ward-b', 'icu', 'nurse-station'],
  ['nurse-station', 'icu', 'pharmacy', 'icu', 'nurse-station'],
  ['nurse-station', 'ward-a', 'ward-b', 'pharmacy', 'nurse-station'],
];

export const VISITOR_WORKFLOWS: RoomId[][] = [
  ['reception', 'waiting-area', 'ward-a', 'cafeteria', 'ward-a', 'exit'],
  ['reception', 'waiting-area', 'ward-b', 'cafeteria', 'exit'],
  ['reception', 'waiting-area', 'icu', 'waiting-area', 'exit'],
  ['reception', 'waiting-area', 'ward-a', 'exit'],
];

// ---- Gateway Positions ----

export interface GatewayConfig {
  id: string;
  name: string;
  location: RoomId;
  position: { x: number; y: number };
  scanRadius: number;
}

export const GATEWAY_CONFIGS: GatewayConfig[] = [
  { id: 'GW-RCP-01', name: 'Reception Gateway', location: 'reception', position: { x: 125, y: 480 }, scanRadius: 160 },
  { id: 'GW-WARD-01', name: 'Ward Gateway', location: 'ward-a', position: { x: 165, y: 85 }, scanRadius: 180 },
  { id: 'GW-ICU-01', name: 'ICU Gateway', location: 'icu', position: { x: 720, y: 85 }, scanRadius: 170 },
  { id: 'GW-LAB-01', name: 'Lab Gateway', location: 'laboratory', position: { x: 645, y: 235 }, scanRadius: 140 },
];
