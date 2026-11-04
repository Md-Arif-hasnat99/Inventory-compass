import React from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onClose, title, children }) => {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-2xl rounded-lg border border-[#e1e6e1] bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e1e6e1]">
              <h3 className="text-lg font-semibold text-[#202522]">{title}</h3>
              <button onClick={onClose} className="p-1 text-[#68716b] hover:text-[#202522]">
                <span className="sr-only">Close</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
          <div className="px-6 py-4">{children}</div>
        </div>
      </div>
    </>
  );
};

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action, className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full border border-[#e1e6e1] bg-[#f1f3f0] flex items-center justify-center mb-4 text-[#68716b]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[#202522] mb-1">{title}</h3>
      {description && <p className="text-[#68716b] mb-6 max-w-xs">{description}</p>}
      {action}
    </div>
  );
};

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading...', className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 ${className}`}>
      <div className="w-8 h-8 border-4 border-[#e1e6e1] border-t-[#2f6b4f] rounded-full animate-spin mb-4" />
      <p className="text-sm text-[#68716b]">{message}</p>
    </div>
  );
};

interface ErrorStateProps {
  title: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ title, message, onRetry, className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full border border-[#e8c7c7] bg-[#fbf3f3] flex items-center justify-center mb-4 text-[#b54747]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[#202522] mb-1">{title}</h3>
      {message && <p className="text-[#68716b] mb-6 max-w-xs">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#2f6b4f] border-[#2f6b4f] rounded-md hover:bg-[#24563e] hover:border-[#24563e]"
        >
          Try again
        </button>
      )}
    </div>
  );
};