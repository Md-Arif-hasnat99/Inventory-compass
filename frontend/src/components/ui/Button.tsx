import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'quiet' | 'danger';
  size?: 'sm' | 'md';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-8 font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1';
  const height = size === 'sm' ? 'h-10 px-3 text-xs' : 'h-12 px-6 text-sm';

  const styles: Record<string, string> = {
    primary: `bg-[#2f6b4f] text-white border-[#2f6b4f] hover:bg-[#24563e] hover:border-[#24563e] disabled:opacity-50 disabled:cursor-not-allowed`,
    quiet: `bg-transparent text-[#202522] border-[#e1e6e1] hover:bg-[#f1f3f0] hover:border-[#68716b] disabled:opacity-50 disabled:cursor-not-allowed`,
    danger: `bg-[#b54747] text-white border-[#b54747] hover:bg-[#9d3a3a] disabled:opacity-50 disabled:cursor-not-allowed`,
  };

  return (
    <button
      className={`${base} ${height} ${styles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};