import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { AppSidebar } from '../components/layout/AppSidebar';
import { Topbar } from '../components/layout/Topbar';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ForecastPage } from '../features/forecasting/ForecastPage';
import { InventoryPage } from '../features/inventory/InventoryPage';
import { ReplenishmentPage } from '../features/inventory/ReplenishmentPage';
import { ProductsPage } from '../features/products/ProductsPage';
import { ModelPerformancePage } from '../features/model-performance/ModelPerformancePage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { UploadPage } from '../features/upload/UploadPage';
import { AppProviders } from './providers';

const routeTitles: Record<string, string> = {
  '/': 'Overview Dashboard',
  '/dashboard': 'Overview Dashboard',
  '/upload': 'Upload Your Data',
  '/forecast': 'Demand Forecasting',
  '/inventory': 'Inventory Management',
  '/inventory/replenishment': 'Replenishment Actions',
  '/products': 'Products Catalog',
  '/model-performance': 'Model Performance & Benchmarks',
  '/settings': 'System Settings',
};

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState('ALL');
  const location = useLocation();

  const currentTitle = routeTitles[location.pathname] || 'Inventory Compass';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-slate-800 antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* Sidebar */}
      <AppSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          onOpenMobileSidebar={() => setMobileOpen(true)}
          selectedStore={selectedStore}
          onSelectStore={setSelectedStore}
          title={currentTitle}
          isDemoMode={true}
        />

        <main className="flex-1 pb-16">
          <Routes>
            <Route path="/" element={<DashboardPage selectedStore={selectedStore} />} />
            <Route path="/dashboard" element={<DashboardPage selectedStore={selectedStore} />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/forecast" element={<ForecastPage />} />
            <Route path="/inventory" element={<InventoryPage selectedStore={selectedStore} />} />
            <Route
              path="/inventory/replenishment"
              element={<ReplenishmentPage selectedStore={selectedStore} />}
            />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/model-performance" element={<ModelPerformancePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AppProviders>
  );
};

export default App;
