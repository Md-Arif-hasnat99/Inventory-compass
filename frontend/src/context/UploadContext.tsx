import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  UploadSession,
  SellerForecastResponse,
  SellerReplenishmentResponse,
} from '../types';
import { uploadService } from '../services/upload.service';
import { forecastService } from '../services/forecast.service';
import { inventoryService } from '../services/inventory.service';

const STORAGE_KEY = 'ic_active_upload_id';

interface UploadContextValue {
  activeUploadId: string | null;
  activeSession: UploadSession | null;
  activeForecast: SellerForecastResponse | null;
  activeReplenishment: SellerReplenishmentResponse | null;
  sessionLoading: boolean;
  forecastLoading: boolean;
  replenishmentLoading: boolean;
  forecastError: string | null;
  replenishmentError: string | null;
  isRealData: boolean;
  setActiveUploadId: (id: string | null) => void;
  loadForecast: (
    horizonDays?: 7 | 14 | 30,
    modelPreference?: string,
    storeId?: string,
    productId?: string
  ) => Promise<SellerForecastResponse | null>;
  loadReplenishment: (
    leadTimeDays?: number,
    safetyStockDays?: number,
    horizonDays?: 7 | 14 | 30,
    overrides?: Record<string, number>
  ) => Promise<SellerReplenishmentResponse | null>;
  clearActiveUpload: () => void;
}

const UploadContext = createContext<UploadContextValue | undefined>(undefined);

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeUploadId, setActiveUploadIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });

  const [activeSession, setActiveSession] = useState<UploadSession | null>(null);
  const [activeForecast, setActiveForecast] = useState<SellerForecastResponse | null>(null);
  const [activeReplenishment, setActiveReplenishment] = useState<SellerReplenishmentResponse | null>(null);

  const [sessionLoading, setSessionLoading] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [replenishmentLoading, setReplenishmentLoading] = useState(false);

  const [forecastError, setForecastError] = useState<string | null>(null);
  const [replenishmentError, setReplenishmentError] = useState<string | null>(null);

  const setActiveUploadId = useCallback((id: string | null) => {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setActiveUploadIdState(id);
    setActiveForecast(null);
    setActiveReplenishment(null);
    setForecastError(null);
    setReplenishmentError(null);
  }, []);

  const clearActiveUpload = useCallback(() => {
    setActiveUploadId(null);
    setActiveSession(null);
  }, [setActiveUploadId]);

  // When activeUploadId changes, fetch the session details
  useEffect(() => {
    if (!activeUploadId) {
      setActiveSession(null);
      return;
    }

    let isMounted = true;
    setSessionLoading(true);

    uploadService
      .getSession(activeUploadId)
      .then((session) => {
        if (isMounted) {
          setActiveSession(session);
        }
      })
      .catch((err) => {
        console.warn('Active upload session not found or expired:', err);
        if (isMounted) {
          // If expired, clear it
          clearActiveUpload();
        }
      })
      .finally(() => {
        if (isMounted) setSessionLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeUploadId, clearActiveUpload]);

  const loadForecast = useCallback(
    async (
      horizonDays: 7 | 14 | 30 = 7,
      modelPreference: string = 'auto',
      storeId?: string,
      productId?: string
    ): Promise<SellerForecastResponse | null> => {
      if (!activeUploadId) return null;

      setForecastLoading(true);
      setForecastError(null);
      try {
        const res = await forecastService.getSellerForecast(
          activeUploadId,
          horizonDays,
          modelPreference,
          storeId,
          productId
        );
        setActiveForecast(res);
        return res;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Forecast generation failed';
        setForecastError(msg);
        return null;
      } finally {
        setForecastLoading(false);
      }
    },
    [activeUploadId]
  );

  const loadReplenishment = useCallback(
    async (
      leadTimeDays: number = 3.0,
      safetyStockDays: number = 2.0,
      horizonDays: 7 | 14 | 30 = 7,
      overrides?: Record<string, number>
    ): Promise<SellerReplenishmentResponse | null> => {
      if (!activeUploadId) return null;

      setReplenishmentLoading(true);
      setReplenishmentError(null);
      try {
        const res = await inventoryService.getSellerReplenishment(
          activeUploadId,
          leadTimeDays,
          safetyStockDays,
          horizonDays,
          overrides
        );
        setActiveReplenishment(res);
        return res;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Replenishment calculation failed';
        setReplenishmentError(msg);
        return null;
      } finally {
        setReplenishmentLoading(false);
      }
    },
    [activeUploadId]
  );

  const isRealData = Boolean(activeUploadId && activeSession && activeSession.status === 'valid');

  return (
    <UploadContext.Provider
      value={{
        activeUploadId,
        activeSession,
        activeForecast,
        activeReplenishment,
        sessionLoading,
        forecastLoading,
        replenishmentLoading,
        forecastError,
        replenishmentError,
        isRealData,
        setActiveUploadId,
        loadForecast,
        loadReplenishment,
        clearActiveUpload,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
};

export function useUploadContext(): UploadContextValue {
  const ctx = useContext(UploadContext);
  if (!ctx) {
    throw new Error('useUploadContext must be used within an UploadProvider');
  }
  return ctx;
}
