import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNavigation } from './MobileNavigation';
import { UploadProvider, useUploadContext } from '../../context/UploadContext';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { activeSession, clearActiveUpload } = useUploadContext();

  const selectedDataset = activeSession
    ? {
        id: activeSession.upload_id,
        name: activeSession.display_filename,
        status: activeSession.status,
      }
    : undefined;

  return (
    <UploadProvider>
      <div className="min-h-screen bg-[#f7f8f6] text-[#202522] antialiased selection:bg-[#e8f1eb] selection:text-[#2f6b4f] flex flex-col lg:flex-row">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0 lg:pl-0">
          <Topbar
            onOpenMobileSidebar={() => setMobileOpen(true)}
            title="Inventory Compass"
            selectedDataset={selectedDataset}
            onClearDataset={clearActiveUpload}
          />

          <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 pb-8 max-w-[1400px] mx-auto w-full" role="main">
            {children}
          </main>
        </div>

        <MobileNavigation
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
      </div>
    </UploadProvider>
  );
};