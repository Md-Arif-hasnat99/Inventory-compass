import React from 'react';

type IconName =
  | 'brand'
  | 'overview'
  | 'chart'
  | 'inventory'
  | 'upload'
  | 'settings'
  | 'search'
  | 'chevron-down'
  | 'chevron-right'
  | 'chevron-left'
  | 'menu'
  | 'close'
  | 'download'
  | 'warning'
  | 'check'
  | 'external-link'
  | 'calendar'
  | 'clock'
  | 'refresh'
  | 'trash'
  | 'edit'
  | 'plus'
  | 'filter'
  | 'document';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  title?: string;
}

const ICONS: Record<IconName, React.ComponentProps<'svg'> & { children?: React.ReactNode }> = {
  brand: {
    viewBox: '0 0 24 24',
    children: (
      <>
        <path d="M12 2L3 7v10l9 5 9-5V7z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
        <path d="M12 12v4M12 7V5M7 7h10M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  overview: {
    viewBox: '0 0 24 24',
    children: (
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M8 21h8M12 17l4 4M6 11l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  chart: {
    viewBox: '0 0 24 24',
    children: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="17 21 17 14 7 14 7 21" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="22 21 15 11 11 19 4 21" fill="none" stroke="currentColor" strokeWidth="2" />
      </>
    ),
  },
  inventory: {
    viewBox: '0 0 24 24',
    children: (
      <>
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
        <path d="M3 6h18M7 10l5 5M7 15l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  upload: {
    viewBox: '0 0 24 24',
    children: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  settings: {
    viewBox: '0 0 24 24',
    children: (
      <>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-1a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h1a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0 1-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H12a1.65 1.65 0 0 0 1.51 1h1a1.65 1.65 0 0 0 1-1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v1a1.65 1.65 0 0 0 1.51 1h1a1.65 1.65 0 0 0 1-1a1.65 1.65 0 0 0 .33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0-.33 1.82" stroke="currentColor" strokeWidth="2" fill="none" />
      </>
    ),
  },
  search: {
    viewBox: '0 0 24 24',
    children: (
      <>
        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="m21 21-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  'chevron-down': {
    viewBox: '0 0 24 24',
    children: (
      <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  'chevron-right': {
    viewBox: '0 0 24 24',
    children: (
      <polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  'chevron-left': {
    viewBox: '0 0 24 24',
    children: (
      <polyline points="15 18 9 12 15 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  menu: {
    viewBox: '0 0 24 24',
    children: (
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    ),
  },
  close: {
    viewBox: '0 0 24 24',
    children: (
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  download: {
    viewBox: '0 0 24 24',
    children: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  warning: {
    viewBox: '0 0 24 24',
    children: (
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
        <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  check: {
    viewBox: '0 0 24 24',
    children: (
      <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  'external-link': {
    viewBox: '0 0 24 24',
    children: (
      <>
        <path d="M18 13v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  calendar: {
    viewBox: '0 0 24 24',
    children: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none" />
        <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  clock: {
    viewBox: '0 0 24 24',
    children: (
      <>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
        <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  refresh: {
    viewBox: '0 0 24 24',
    children: (
      <path d="M23 4v3.6c0 .56-.47 1-.99 1H17.8c-.46 0-.88-.37-.99-.84l-.5-2.34A4.91 4.91 0 0 0 13 2c-2.61 0-5 2.1-5 4.7v1.23c0 .61.4 1.16.91 1.43l-1.17 1.17A4 4 0 0 0 5.67 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h2.41a4 4 0 0 0 1.27-.22l1.6-1.59a1 1 0 0 1 1.41 0l2.58 2.58a6 6 0 0 1 7.07 0l2.58-2.58a1 1 0 0 1 1.41 0l1.6 1.59A4 4 0 0 0 22 16.59V15a1 1 0 0 0-1-1h-3.6c-.52 0-.99-.44-.99-.97V4a1 1 0 0 0 1-1h3c.54 0 1 .46 1 1z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  trash: {
    viewBox: '0 0 24 24',
    children: (
      <>
        <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  edit: {
    viewBox: '0 0 24 24',
    children: (
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  plus: {
    viewBox: '0 0 24 24',
    children: (
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    ),
  },
  filter: {
    viewBox: '0 0 24 24',
    children: (
      <polygon points="22 3 2 3 10 12.46 10 19 14 19 14 12.46 22 3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
    ),
  },
  document: {
    viewBox: '0 0 24 24',
    children: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
        <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    ),
  },
};

export function Icon({ name, size = 20, className = '', title }: IconProps) {
  const spec = ICONS[name];
  if (!spec) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox={spec.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      className={className}
      aria-hidden={title ? 'false' : 'true'}
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      {spec.children}
    </svg>
  );
}