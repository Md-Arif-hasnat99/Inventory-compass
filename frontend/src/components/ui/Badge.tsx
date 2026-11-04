import React from 'react';
import { Icon } from './icons';

interface BadgeProps {
  status?: 'CRITICAL' | 'LOW' | 'HEALTHY' | 'EXCESS' | 'HIGH' | 'MEDIUM';
  variant?: 'critical' | 'low' | 'healthy' | 'excess' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ status, variant, size = 'md', className = '', children }) => {
  const v = variant ?? (status === 'CRITICAL' || status === 'HIGH' ? 'critical'
    : status === 'LOW' || status === 'MEDIUM' ? 'low'
    : status === 'HEALTHY' ? 'healthy'
    : status === 'EXCESS' ? 'excess'
    : 'neutral');

  const styles: Record<string, string> = {
    critical: 'bg-[#fbf3f3] border-[#e8c7c7] text-[#b54747]',
    low: 'bg-[#fbf3e8] border-[#e8d4b7] text-[#a86b16]',
    healthy: 'bg-[#eef4f1] border-[#cfddcf] text-[#287a50]',
    excess: 'bg-[#eef2f9] border-[#d0dce8] text-[#426b8c]',
    neutral: 'bg-[#f1f3f0] border-[#e1e6e1] text-[#68716b]',
  };

  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';
  const displayText = children ?? status ?? v;

  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 h-8 rounded-full border text-xs font-medium ${styles[v]} ${sizeStyles} ${className}`}
    >
      {displayText}
    </span>
  );
};

interface RiskBadgeProps {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, className }) => {
  const variants: Record<'HIGH' | 'MEDIUM' | 'LOW', string> = {
    HIGH: 'bg-[#fbf3f3] border-[#e8c7c7] text-[#b54747]',
    MEDIUM: 'bg:#fbf3e8] border-[#e8d4b7] text-[#a86b16]',
    LOW: 'bg:#eef4f1] border-[#cfddcf] text-[#287a50]',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 h-8 px-2.5 py-0.5 rounded-full border text-xs font-medium ${variants[level]} ${className ?? ''}`}>
      <Icon name="warning" size={10} className="shrink-0" />
      {level}
    </span>
  );
};