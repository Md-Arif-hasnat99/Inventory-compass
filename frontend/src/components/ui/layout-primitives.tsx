import React from 'react';

export function PageHeader(props: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
      <div>
        <h2 className="text-lg font-semibold text-[#202522]">{props.title}</h2>
        {props.subtitle && <p className="text-xs text-[#68716b] mt-0.5">{props.subtitle}</p>}
      </div>
      {props.actions && <div className="flex items-center gap-2">{props.actions}</div>}
    </div>
  );
}

export function SectionHeader(props: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-sm font-semibold text-[#202522]">{props.title}</h3>
        {props.subtitle && <p className="text-xs text-[#68716b] mt-0.5">{props.subtitle}</p>}
      </div>
    </div>
  );
}

export function Surface({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div className={`border border-[#e1e6e1] rounded-lg bg-white p-4 ${compact ? 'p-3' : ''}`}>
      {children}
    </div>
  );
}