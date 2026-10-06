// ============================================================
// Contact Session Store — Tracks all contact sessions
// ============================================================

import { create } from 'zustand';
import type { ContactSession, RoomId } from '../types';
import { generateContactSessionId } from '../utils/ids';

interface ContactState {
  sessions: ContactSession[];
  exposureMap: Record<string, string[]>; // personId -> sessionIds[]

  // Actions
  createSession: (data: {
    person1Id: string;
    person1Name: string;
    person1Role: 'patient' | 'doctor' | 'nurse' | 'visitor';
    person2Id: string;
    person2Name: string;
    person2Role: 'patient' | 'doctor' | 'nurse' | 'visitor';
    rssi: number;
    distance: number;
    gatewayId: string;
    location: RoomId;
  }) => ContactSession;
  updateSession: (sessionId: string, duration: number) => void;
  endSession: (sessionId: string) => void;
  getContactsFor: (personId: string) => ContactSession[];
  getActiveSessionBetween: (person1Id: string, person2Id: string) => ContactSession | undefined;
  reset: () => void;
}

export const useContactStore = create<ContactState>((set, get) => ({
  sessions: [],
  exposureMap: {},

  createSession: (data) => {
    const session: ContactSession = {
      id: generateContactSessionId(),
      person1Id: data.person1Id,
      person1Name: data.person1Name,
      person1Role: data.person1Role,
      person2Id: data.person2Id,
      person2Name: data.person2Name,
      person2Role: data.person2Role,
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      avgRssi: data.rssi,
      avgDistance: data.distance,
      gatewayId: data.gatewayId,
      location: data.location,
      isActive: true,
    };

    set((s) => {
      const newMap = { ...s.exposureMap };
      if (!newMap[data.person1Id]) newMap[data.person1Id] = [];
      if (!newMap[data.person2Id]) newMap[data.person2Id] = [];
      newMap[data.person1Id].push(session.id);
      newMap[data.person2Id].push(session.id);

      return {
        sessions: [...s.sessions, session],
        exposureMap: newMap,
      };
    });

    return session;
  },

  updateSession: (sessionId, duration) => {
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.id === sessionId ? { ...sess, duration } : sess
      ),
    }));
  },

  endSession: (sessionId) => {
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.id === sessionId ? { ...sess, isActive: false, endTime: Date.now() } : sess
      ),
    }));
  },

  getContactsFor: (personId) => {
    return get().sessions.filter(
      (s) => s.person1Id === personId || s.person2Id === personId
    );
  },

  getActiveSessionBetween: (person1Id, person2Id) => {
    return get().sessions.find(
      (s) =>
        s.isActive &&
        ((s.person1Id === person1Id && s.person2Id === person2Id) ||
          (s.person1Id === person2Id && s.person2Id === person1Id))
    );
  },

  reset: () => set({ sessions: [], exposureMap: {} }),
}));
