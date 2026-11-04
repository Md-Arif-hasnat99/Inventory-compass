import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { LandingPage } from '../pages/LandingPage';
import { AppShell } from '../components/layout/AppShell';
import { OverviewPage } from '../pages/OverviewPage';
import { UploadPage } from '../pages/UploadPage';
import { ForecastPage } from '../pages/ForecastPage';
import { ReplenishmentPage } from '../pages/ReplenishmentPage';
import { ModelEvaluationPage } from '../pages/ModelEvaluationPage';
import { SettingsPage, NotFoundPage } from '../pages/SettingsPage';
import { AppProviders } from './providers';

const WorkspaceRoutes = () => (
  <Routes>
    <Route path="overview" element={<OverviewPage />} />
    <Route path="upload" element={<UploadPage />} />
    <Route path="forecasts" element={<ForecastPage />} />
    <Route path="inventory" element={<ReplenishmentPage />} />
    <Route path="replenishment" element={<ReplenishmentPage />} />
    <Route path="evaluation" element={<ModelEvaluationPage />} />
    <Route path="settings" element={<SettingsPage />} />
    <Route path="*" element={<Navigate to="overview" replace />} />
  </Routes>
);

export const App: React.FC = () => {
  const [selectedStore, setSelectedStore] = useState('ALL');

  return (
    <AppProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/workspace/*">
            <AppShell>
              <WorkspaceRoutes />
            </AppShell>
          </Route>
          <Route path="/inventory" element={<Navigate to="/workspace/inventory" replace />} />
          <Route path="/forecast" element={<Navigate to="/workspace/forecasts" replace />} />
          <Route path="/upload" element={<Navigate to="/workspace/upload" replace />} />
          <Route path="/settings" element={<Navigate to="/workspace/settings" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
};

export default App;