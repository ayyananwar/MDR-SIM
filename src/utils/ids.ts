// ============================================================
// ID Generation Utilities
// ============================================================

let patientCounter = 1000;
let doctorCounter = 100;
let nurseCounter = 200;
let visitorCounter = 300;
let wearableCounter = 0;
let gatewayCounter = 0;
let sessionCounter = 0;
let packetCounter = 0;
let contactCounter = 0;
let alertCounter = 0;
let eventCounter = 0;

export function generatePatientId(): string {
  return `PAT-${++patientCounter}`;
}

export function generateDoctorId(): string {
  return `DOC-${++doctorCounter}`;
}

export function generateNurseId(): string {
  return `NRS-${++nurseCounter}`;
}

export function generateVisitorId(): string {
  return `VIS-${++visitorCounter}`;
}

export function generateWearableId(): string {
  return `WB-${String(++wearableCounter).padStart(3, '0')}`;
}

export function generateBLEDeviceId(): string {
  return `BLE-${String(wearableCounter).padStart(3, '0')}`;
}

export function generateGatewayId(location: string): string {
  return `GW-${location.toUpperCase().replace(/\s+/g, '-')}-${String(++gatewayCounter).padStart(2, '0')}`;
}

export function generateSessionId(): string {
  sessionCounter++;
  return generateHexId();
}

export function generateHexId(): string {
  return Math.random().toString(16).substr(2, 4).toUpperCase();
}

export function generatePacketId(): string {
  return `PKT-${String(++packetCounter).padStart(6, '0')}`;
}

export function generateContactSessionId(): string {
  return `CS-${String(++contactCounter).padStart(4, '0')}`;
}

export function generateAlertId(): string {
  return `ALT-${String(++alertCounter).padStart(4, '0')}`;
}

export function generateEventId(): string {
  return `EVT-${String(++eventCounter).padStart(5, '0')}`;
}

export function resetCounters(): void {
  patientCounter = 1000;
  doctorCounter = 100;
  nurseCounter = 200;
  visitorCounter = 300;
  wearableCounter = 0;
  gatewayCounter = 0;
  sessionCounter = 0;
  packetCounter = 0;
  contactCounter = 0;
  alertCounter = 0;
  eventCounter = 0;
}
