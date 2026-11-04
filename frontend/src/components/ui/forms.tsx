import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, helper, className = '', ...props }) => {
  return (
    <div className="mb-6">
      {label && (
        <label className="block text-xs font-medium uppercase tracking-wider text-[#68716b] mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`h-10 w-full rounded-md border border-[#e1e6e1] bg-white px-3 text-[#202522] focus:border-[#2f6b4f] focus:ring-1 focus:ring-[#e8f1eb] disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? 'border-[#b54747]' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-[#b54747]">{error}</p>}
      {helper && !error && <p className="mt-1 text-xs text-[#68716b]">{helper}</p>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Select: React.FC<SelectProps> = ({ label, error, helper, className = '', ...props }) => {
  return (
    <div className="mb-6">
      {label && (
        <label className="block text-xs font-medium uppercase tracking-wider text-[#68716b] mb-1.5">
          {label}
        </label>
      )}
      <select
        className={`h-10 w-full rounded-md border border-[#e1e6e1] bg-white pr-10 px-3 text-[#202522] focus:border-[#2f6b4f] focus:ring-1 focus:ring-[#e8f1eb] disabled:opacity-50 disabled:cursor-not-allowed appearance-none background-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22none%22%20stroke%3D%22%2368716b%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] background-no-repeat background-right-2.5 center background-[size:16px] disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-[#b54747]' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-[#b54747]">{error}</p>}
      {helper && !error && <p className="mt-1 text-xs text-[#68716b]">{helper}</p>}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, helper, className = '', ...props }) => {
  return (
    <div className="mb-6">
      {label && (
        <label className="block text-xs font-medium uppercase tracking-wider text-[#68716b] mb-1.5">
          {label}
        </label>
      )}
      <textarea
        className={`min-h-[100px] w-full rounded-md border border-[#e1e6e1] bg-white px-3 py-2 text-[#202522] focus:border-[#2f6b4f] focus:ring-1 focus:ring-[#e8f1eb] disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? 'border-[#b54747]' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-[#b54747]">{error}</p>}
      {helper && !error && <p className="mt-1 text-xs text-[#68716b]">{helper}</p>}
    </div>
  );
};