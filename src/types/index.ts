// ============================================================
// MedTrace Smart Hospital — Shared Type Definitions
// ============================================================

// ---- Enums ----

export type Role = 'patient' | 'doctor' | 'nurse' | 'visitor';

export type Department =
  | 'MDR-TB Ward'
  | 'General Ward'
  | 'ICU'
  | 'Outpatient'
  | 'Emergency'
  | 'Radiology'
  | 'Laboratory'
  | 'Pediatrics';

export type VisitType = 'Inpatient' | 'Outpatient' | 'Emergency';

export type RiskCategory = 'Low' | 'Medium' | 'High' | 'Critical';

export type AlertSeverity = 'info' | 'warning' | 'danger' | 'critical';

export type GatewaySyncStatus = 'Synced' | 'Syncing' | 'Pending' | 'Offline';

export type WearableStatus = 'Active' | 'Inactive' | 'Charging' | 'Unassigned';

export type RoomId =
  | 'reception'
  | 'waiting-area'
  | 'ward-a'
  | 'ward-b'
  | 'icu'
  | 'laboratory'
  | 'radiology'
  | 'doctor-room-1'
  | 'doctor-room-2'
  | 'doctor-room-3'
  | 'doctor-room-4'
  | 'corridor-main'
  | 'corridor-upper'
  | 'nurse-station'
  | 'cafeteria'
  | 'pharmacy'
  | 'exit';

// ---- Positions ----

export interface Position {
  x: number;
  y: number;
}

// ---- Room ----

export interface Room {
  id: RoomId;
  name: string;
  position: Position;
  width: number;
  height: number;
  color: string;
  icon: string;
}

// ---- Person (base) ----

export interface Person {
  id: string;
  name: string;
  role: Role;
  hospitalId: string;
  wearableId: string;
  bleDeviceId: string;
  sessionId: string;
  position: Position;
  targetPosition: Position;
  currentRoom: RoomId;
  targetRoom: RoomId;
  battery: number;
  status: 'active' | 'idle' | 'moving' | 'discharged';
  isMDRTBPositive: boolean;
  riskLevel: RiskCategory;
  riskScore: number;
  avatar: string;
}

// ---- Patient ----

export interface Patient extends Person {
  role: 'patient';
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  department: Department;
  symptoms: string[];
  visitType: VisitType;
  admissionTime: number;
  workflowStep: number;
  workflow: RoomId[];
}

// ---- Staff ----

export interface Doctor extends Person {
  role: 'doctor';
  specialization: string;
  department: Department;
  workflowStep: number;
  workflow: RoomId[];
}

export interface Nurse extends Person {
  role: 'nurse';
  shift: 'Morning' | 'Evening' | 'Night';
  department: Department;
  workflowStep: number;
  workflow: RoomId[];
}

// ---- Visitor ----

export interface Visitor extends Person {
  role: 'visitor';
  visitingPatientId: string;
  visitingPatientName: string;
  workflowStep: number;
  workflow: RoomId[];
}

// ---- Wearable ----

export interface Wearable {
  id: string;
  bleDeviceId: string;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedToRole: Role | null;
  battery: number;
  status: WearableStatus;
  sessionId: string;
  lastRotation: number;
  activeSince: number | null;
}

// ---- Gateway ----

export interface Gateway {
  id: string;
  name: string;
  location: RoomId;
  position: Position;
  nearbyDevices: string[];
  packetsReceived: number;
  packetsProcessed: number;
  packetsValidated: number;
  packetsUnique: number;
  contactSessionsGenerated: number;
  cpu: number;
  memory: number;
  rssiRange: { min: number; max: number };
  syncStatus: GatewaySyncStatus;
  scanRadius: number;
  isOnline: boolean;
}

// ---- BLE Packet ----

export interface BLEPacket {
  id: string;
  sessionId: string;
  bleDeviceId: string;
  rssi: number;
  timestamp: number;
  gatewayId: string;
  advertisementType: 'ADV_NONCONN_IND' | 'ADV_IND' | 'ADV_SCAN_IND';
  isValid: boolean;
  isDuplicate: boolean;
  estimatedDistance: number;
  personId: string;
  personName: string;
  personRole: Role;
  pipelineStage:
    | 'received'
    | 'validated'
    | 'deduplication'
    | 'rssi-filtered'
    | 'distance-estimated'
    | 'session-generated'
    | 'stored'
    | 'synced';
}

// ---- Contact Session ----

export interface ContactSession {
  id: string;
  person1Id: string;
  person1Name: string;
  person1Role: Role;
  person2Id: string;
  person2Name: string;
  person2Role: Role;
  startTime: number;
  endTime: number | null;
  duration: number;
  avgRssi: number;
  avgDistance: number;
  gatewayId: string;
  location: RoomId;
  isActive: boolean;
}

// ---- Risk Assessment ----

export interface RiskAssessment {
  personId: string;
  personName: string;
  personRole: Role;
  prior: number;
  likelihood: number;
  posterior: number;
  riskPercent: number;
  category: RiskCategory;
  history: RiskHistoryEntry[];
  lastUpdated: number;
}

export interface RiskHistoryEntry {
  timestamp: number;
  event: string;
  prior: number;
  posterior: number;
  riskPercent: number;
}

// ---- Activity Event ----

export interface ActivityEvent {
  id: string;
  type:
    | 'registration'
    | 'wearable'
    | 'ble'
    | 'gateway'
    | 'packet'
    | 'contact'
    | 'risk'
    | 'exposure'
    | 'alert'
    | 'system';
  message: string;
  timestamp: number;
  severity: AlertSeverity;
  icon?: string;
  personId?: string;
  metadata?: Record<string, string | number>;
}

// ---- Alert ----

export interface Alert {
  id: string;
  type: 'high-risk' | 'exposure' | 'gateway-offline' | 'low-battery' | 'mdr-tb-positive' | 'system';
  title: string;
  message: string;
  severity: AlertSeverity;
  timestamp: number;
  personId?: string;
  acknowledged: boolean;
}

// ---- Guided Workflow ----

export interface GuidedWorkflowStep {
  id: number;
  title: string;
  description: string;
  module: string;
  route: string;
  highlight?: string;
  duration: number;
}

// ---- Architecture Layer ----

export type ArchitectureLayer =
  | 'Wearable Layer'
  | 'BLE Communication'
  | 'Gateway Layer'
  | 'Edge Processing'
  | 'Central Server'
  | 'Bayesian Risk Engine'
  | 'Hospital Dashboard';

// ---- Simulation Controls ----

export interface SimulationControls {
  isRunning: boolean;
  speed: 1 | 2 | 5;
  showBLESignals: boolean;
  showPacketFlow: boolean;
  showRSSIView: boolean;
  showGatewayCoverage: boolean;
  showBayesianOverlay: boolean;
}
