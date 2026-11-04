import React from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '../ui/icons';

interface MobileNavigationProps {
  open: boolean;
  onClose: () => void;
}

const mobileNavItems = [
  { to: '/workspace', label: 'Overview', name: 'overview' },
  { to: '/workspace/upload', label: 'Data upload', name: 'upload' },
  { to: '/workspace/forecasts', label: 'Forecasts', name: 'chart' },
  { to: '/workspace/inventory', label: 'Inventory', name: 'inventory' },
  { to: '/workspace/replenishment', label: 'Replenishment', name: 'inventory' },
  { to: '/workspace/evaluation', label: 'Model evaluation', name: 'chart' },
  { to: '/workspace/settings', label: 'Settings', name: 'settings' },
];

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm lg:hidden transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 left-0 z-50 w-full max-w-xs bg-white border-r border-[#e1e6e1] flex flex-col transform lg:hidden transition-transform duration-200 ease-in-out"
        style={{ transform: open ? 'translateX(0)' : 'translateX(-100%)' }}>
        <div className="h-14 px-4 flex items-center justify-between border-b border-[#e1e6e1]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#2f6b4f] flex items-center justify-center text-white shrink-0">
              <Icon name="brand" size={14} title="Inventory Compass" />
            </div>
            <span className="text-sm font-semibold text-[#202522]">Inventory Compass</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[#68716b] hover:text-[#202522] hover:bg-[#f1f3f0] transition-colors"
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/workspace'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 w-full px-3 py-3 rounded-md text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-[#e8f1eb] text-[#2f6b4f]'
                    : 'text-[#68716b] hover:text-[#202522] hover:bg-[#f1f3f0]'
                }`
              }
            >
              <Icon name={item.name as any} size={20} className="shrink-0" />
              <span className="flex-1">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
};