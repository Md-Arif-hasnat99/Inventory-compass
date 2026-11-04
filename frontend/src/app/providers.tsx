import React from 'react';
import { UploadProvider } from '../context/UploadContext';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <UploadProvider>{children}</UploadProvider>
  );
};