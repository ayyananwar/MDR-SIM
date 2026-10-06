import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import SimulationControlPanel from '../simulation/SimulationControlPanel';
import ArchitectureOverlay from '../overlays/ArchitectureOverlay';
import GuidedWorkflow from '../overlays/GuidedWorkflow';
import { useSimulationStore } from '../../stores/useSimulationStore';

export default function AppLayout() {
  const { architectureOverlayOpen } = useSimulationStore();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0B0F1A' }}>
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto" style={{ background: '#0B0F1A' }}>
          <Outlet />
        </main>
      </div>

      {/* Floating Controls */}
      <SimulationControlPanel />
      <GuidedWorkflow />
      {architectureOverlayOpen && <ArchitectureOverlay />}
    </div>
  );
}
