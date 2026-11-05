import React from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '../ui/icons';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const navItems = [
  { to: '/workspace', label: 'Overview', name: 'overview', exact: true },
  { to: '/workspace/upload', label: 'Data upload', name: 'upload' },
  { to: '/workspace/forecasts', label: 'Forecasts', name: 'chart' },
  { to: '/workspace/inventory', label: 'Inventory', name: 'inventory' },
  { to: '/workspace/replenishment', label: 'Replenishment', name: 'inventory' },
  { to: '/workspace/products', label: 'Products', name: 'inventory' },
  { to: '/workspace/guide', label: 'Guide', name: 'book-open' },
  { to: '/workspace/settings', label: 'Settings', name: 'settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:relative top-0 left-0 h-screen z-50 bg-white border-r border-[#e1e6e1] flex flex-col transition-all duration-200 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0 lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="h-14 px-4 flex items-center justify-between border-b border-[#e1e6e1]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-md bg-[#2f6b4f] flex items-center justify-center text-white shrink-0">
              <Icon name="brand" size={14} title="Inventory Compass brand mark" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="block text-sm font-semibold text-[#202522] truncate">
                  Inventory Compass
                </span>
                <span className="block text-[10px] text-[#68716b] uppercase tracking-wider font-medium truncate">
                  Retail inventory
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex w-7 h-7 rounded-md border border-[#e1e6e1] items-center justify-center text-[#68716b] hover:text-[#202522] hover:bg-[#f1f3f0] transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Icon
              name={collapsed ? 'chevron-right' : 'chevron-left'}
              size={12}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            />
          </button>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isExact = item.exact;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={isExact}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#e8f1eb] text-[#2f6b4f] font-semibold'
                      : 'text-[#68716b] hover:bg-[#f1f3f0] hover:text-[#202522]'
                  } ${collapsed ? 'justify-center px-0' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <Icon name={item.name as any} size={16} className="shrink-0" />
                {!collapsed && <span className="truncate flex-1">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom status — demo indicator only, no fake "System Online" pulse */}
        {!collapsed && (
          <div className="p-3 border-t border-[#e1e6e1]">
            <div className="px-2.5 py-2 rounded-md bg-[#f7f8f6] border border-[#e1e6e1]">
              <span className="block text-[11px] font-medium text-[#68716b]">Demo mode</span>
              <span className="block text-[10px] text-[#68716b] mt-0.5">Sample data loaded</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};