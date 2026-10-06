import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './modules/dashboard/DashboardPage';
import SimulationPage from './modules/simulation/SimulationPage';
import RegistrationPage from './modules/registration/RegistrationPage';
import GatewayPage from './modules/gateway/GatewayPage';
import RiskEnginePage from './modules/risk-engine/RiskEnginePage';
import ExposurePage from './modules/exposure/ExposurePage';
import DatasetGeneratorPage from './modules/dataset-generator/DatasetGeneratorPage';
import { useHospitalStore } from './stores/useHospitalStore';
import { useSimulationEngine } from './hooks/useSimulationEngine';

function SimulationRunner() {
  useSimulationEngine();
  return null;
}

function AppInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useHospitalStore((s) => s.initialize);
  const patients = useHospitalStore((s) => s.patients);

  useEffect(() => {
    if (patients.length === 0) {
      initialize();
    }
  }, [initialize, patients.length]);

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInitializer>
        <SimulationRunner />
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/simulation" element={<SimulationPage />} />
            <Route path="/registration" element={<RegistrationPage />} />
            <Route path="/gateway" element={<GatewayPage />} />
            <Route path="/risk-engine" element={<RiskEnginePage />} />
            <Route path="/exposure" element={<ExposurePage />} />
            <Route path="/dataset-generator" element={<DatasetGeneratorPage />} />
          </Route>
        </Routes>
      </AppInitializer>
    </BrowserRouter>
  );
}
