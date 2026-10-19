import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UploadProvider } from '../context/UploadContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <UploadProvider>{children}</UploadProvider>
    </QueryClientProvider>
  );
};
