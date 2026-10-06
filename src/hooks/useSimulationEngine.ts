// ============================================================
// Simulation Engine Hook — Drives all hospital simulation
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import { useHospitalStore } from '../stores/useHospitalStore';
import { useSimulationStore } from '../stores/useSimulationStore';
import { useContactStore } from '../stores/useContactStore';
import { useRiskStore } from '../stores/useRiskStore';
import { isInBLERange, pixelDistance, distanceToRSSI, simulateBatteryDrain, simulateCPU, simulateMemory, randomAdvertType } from '../utils/ble';
import { generateHexId, generatePacketId } from '../utils/ids';
import { getRoomCenter, GATEWAY_CONFIGS } from '../data/simulation';
import type { Person, BLEPacket, RoomId } from '../types';

export function useSimulationEngine() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRotationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickCountRef = useRef(0);

  const { isRunning, speed, tick } = useSimulationStore();
  const hospital = useHospitalStore();
  const contacts = useContactStore();
  const risk = useRiskStore();

  // ---- Movement Logic ----
  const moveAllPeople = useCallback(() => {
    const allPeople = hospital.allPeople();

    allPeople.forEach((person) => {
      const p = person as Person & { workflowStep: number; workflow: RoomId[] };
      if (!p.workflow || p.workflow.length === 0) return;

      // Check if person has reached target
      const dist = pixelDistance(p.position, p.targetPosition);
      if (dist < 15) {
        // Arrived — stay for a bit, then advance workflow
        if (Math.random() < 0.08 * speed) {
          hospital.updatePersonWorkflowStep(p.id);
        }
      } else {
        // Move toward target
        const dx = p.targetPosition.x - p.position.x;
        const dy = p.targetPosition.y - p.position.y;
        const moveSpeed = 3 * speed;
        const angle = Math.atan2(dy, dx);
        const newX = p.position.x + Math.cos(angle) * moveSpeed;
        const newY = p.position.y + Math.sin(angle) * moveSpeed;

        hospital.updatePersonPosition(p.id, { x: newX, y: newY }, p.targetRoom);
      }
    });
  }, [hospital, speed]);

  // ---- BLE Scanning & Contact Detection ----
  const runBLEScan = useCallback(() => {
    const allPeople = hospital.allPeople();
    if (allPeople.length === 0) return;

    // Each gateway scans for nearby devices
    hospital.gateways.forEach((gateway) => {
      const nearbyPeople = allPeople.filter((p) =>
        isInBLERange(p.position, gateway.position, gateway.scanRadius)
      );

      const nearbyIds = nearbyPeople.map((p) => p.bleDeviceId);

      // Generate packets for nearby devices
      nearbyPeople.forEach((person) => {
        const dist = pixelDistance(person.position, gateway.position);
        const rssi = distanceToRSSI(dist);
        const isDuplicate = Math.random() < 0.15;
        const isValid = Math.random() > 0.05;

        const packet: BLEPacket = {
          id: generatePacketId(),
          sessionId: person.sessionId,
          bleDeviceId: person.bleDeviceId,
          rssi,
          timestamp: Date.now(),
          gatewayId: gateway.id,
          advertisementType: randomAdvertType(),
          isValid,
          isDuplicate,
          estimatedDistance: Math.round(dist * 0.02 * 100) / 100,
          personId: person.id,
          personName: person.name,
          personRole: person.role,
          pipelineStage: 'received',
        };

        hospital.addPacket(packet);
      });

      // Update gateway stats
      hospital.updateGateway(gateway.id, {
        nearbyDevices: nearbyIds,
        packetsReceived: gateway.packetsReceived + nearbyPeople.length,
        packetsProcessed: gateway.packetsProcessed + Math.floor(nearbyPeople.length * 0.95),
        packetsValidated: gateway.packetsValidated + Math.floor(nearbyPeople.length * 0.9),
        packetsUnique: gateway.packetsUnique + Math.floor(nearbyPeople.length * 0.6),
        cpu: simulateCPU(15 + nearbyPeople.length * 3),
        memory: simulateMemory(40 + nearbyPeople.length * 2),
        syncStatus: Math.random() > 0.1 ? 'Synced' : 'Syncing',
      });
    });

    // ---- Contact Detection ----
    for (let i = 0; i < allPeople.length; i++) {
      for (let j = i + 1; j < allPeople.length; j++) {
        const p1 = allPeople[i];
        const p2 = allPeople[j];

        if (isInBLERange(p1.position, p2.position, 80)) {
          const dist = pixelDistance(p1.position, p2.position);
          const rssi = distanceToRSSI(dist);

          // Check if there's already an active session
          const existing = contacts.getActiveSessionBetween(p1.id, p2.id);
          if (existing) {
            const duration = (Date.now() - existing.startTime) / 1000;
            contacts.updateSession(existing.id, duration);
          } else {
            // Find nearest gateway
            const nearestGw = GATEWAY_CONFIGS.reduce((closest, gw) => {
              const d1 = pixelDistance(p1.position, gw.position);
              const d2 = closest ? pixelDistance(p1.position, closest.position) : Infinity;
              return d1 < d2 ? gw : closest;
            }, GATEWAY_CONFIGS[0]);

            contacts.createSession({
              person1Id: p1.id,
              person1Name: p1.name,
              person1Role: p1.role,
              person2Id: p2.id,
              person2Name: p2.name,
              person2Role: p2.role,
              rssi,
              distance: Math.round(dist * 0.02 * 100) / 100,
              gatewayId: nearestGw.id,
              location: p1.currentRoom,
            });

            // Update risk for both people based on actual contact session duration
            const p1Sessions = contacts.getContactsFor(p1.id).length;
            const p2Sessions = contacts.getContactsFor(p2.id).length;
            const sessionDurationSeconds = 10;
            const durationMin = 0.16;

            if (p2.isMDRTBPositive) {
              risk.updateRisk(
                p1.id,
                durationMin,
                rssi,
                p1Sessions,
                true,
                `Contact with MDR-TB+ ${p2.name} (${Math.round(sessionDurationSeconds)}s)`
              );
            }
            if (p1.isMDRTBPositive) {
              risk.updateRisk(
                p2.id,
                durationMin,
                rssi,
                p2Sessions,
                true,
                `Contact with MDR-TB+ ${p1.name} (${Math.round(sessionDurationSeconds)}s)`
              );
            }
          }
        } else {
          // End active sessions if people moved apart
          const existing = contacts.getActiveSessionBetween(p1.id, p2.id);
          if (existing) {
            contacts.endSession(existing.id);
          }
        }
      }
    }

    // ---- Battery drain ----
    if (tickCountRef.current % 10 === 0) {
      hospital.wearables.forEach((w) => {
        if (w.status === 'Active') {
          hospital.updateWearableBattery(w.id, simulateBatteryDrain(w.battery));
        }
      });
    }
  }, [hospital, contacts, risk]);

  // ---- Initialize Risk Assessments ----
  const initRiskAssessments = useCallback(() => {
    const allPeople = hospital.allPeople();
    allPeople.forEach((p) => {
      if (!risk.getRiskFor(p.id)) {
        risk.initializeRisk(p.id, p.name, p.role);
      }
    });
  }, [hospital, risk]);

  // ---- Main Tick ----
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        tickCountRef.current++;
        tick();
        moveAllPeople();
        if (tickCountRef.current % 3 === 0) {
          runBLEScan();
        }
      }, 1000 / speed);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, speed, tick, moveAllPeople, runBLEScan]);

  // ---- Session ID Rotation (every 25 seconds) ----
  useEffect(() => {
    sessionRotationRef.current = setInterval(() => {
      if (isRunning) {
        hospital.rotateSessionIds();
      }
    }, 25000);

    return () => {
      if (sessionRotationRef.current) clearInterval(sessionRotationRef.current);
    };
  }, [isRunning, hospital]);

  // ---- Initialize ----
  useEffect(() => {
    if (hospital.patients.length > 0) {
      initRiskAssessments();
    }
  }, [hospital.patients.length, initRiskAssessments]);

  return { tickCount: tickCountRef.current };
}
