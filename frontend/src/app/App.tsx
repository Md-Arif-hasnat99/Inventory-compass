import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { LandingPage } from '../pages/LandingPage';
import { AppShell } from '../components/layout/AppShell';
import { OverviewPage } from '../pages/OverviewPage';
import { UploadPage } from '../pages/UploadPage';
import { ForecastPage } from '../pages/ForecastPage';
import { ReplenishmentPage } from '../pages/ReplenishmentPage';
import { ProductsPage } from '../features/products/ProductsPage';
import { InventoryGuidePage } from '../features/guide/InventoryGuidePage';
import { SettingsPage } from '../pages/SettingsPage';
import { TermsPage } from '../pages/TermsPage';
import { AppProviders } from './providers';
import { SeoSync } from './SeoSync';

export const App: React.FC = () => {
  return (
    <AppProviders>
      <BrowserRouter>
        <SeoSync />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/workspace/*"
            element={
              <AppShell>
                <Routes>
                  <Route path="overview" element={<OverviewPage />} />
                  <Route path="upload" element={<UploadPage />} />
                  <Route path="forecasts" element={<ForecastPage />} />
                  <Route path="inventory" element={<ReplenishmentPage />} />
                  <Route path="replenishment" element={<ReplenishmentPage />} />
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="guide" element={<InventoryGuidePage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="overview" replace />} />
                </Routes>
              </AppShell>
            }
          />
          <Route path="/inventory" element={<Navigate to="/workspace/inventory" replace />} />
          <Route path="/forecast" element={<Navigate to="/workspace/forecasts" replace />} />
          <Route path="/upload" element={<Navigate to="/workspace/upload" replace />} />
          <Route path="/settings" element={<Navigate to="/workspace/settings" replace />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
};

export default App;