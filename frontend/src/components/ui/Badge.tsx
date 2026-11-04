import React from 'react';
import { StockStatus } from '../../types';

interface BadgeProps {
  status?: StockStatus | 'HIGH' | 'MEDIUM' | 'LOW';
  children?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  children,
  className = '',
  size = 'md',
}) => {
  let colorStyles = 'bg-slate-100 text-slate-700 border-slate-200';

  switch (status) {
    case 'CRITICAL':
    case 'HIGH':
      colorStyles = 'bg-red-50 text-red-700 border-red-200 font-medium';
      break;
    case 'LOW':
    case 'MEDIUM':
      colorStyles = 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
      break;
    case 'HEALTHY':
      colorStyles = 'bg-green-50 text-green-700 border-green-200 font-medium';
      break;
    case 'EXCESS':
      colorStyles = 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium';
      break;
  }

  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${sizeStyles} ${colorStyles} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {children || status}
    </span>
  );
};
