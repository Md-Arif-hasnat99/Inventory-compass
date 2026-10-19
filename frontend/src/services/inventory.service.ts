import {
  DEMO_INVENTORY_ITEMS,
  DEMO_REPLENISHMENT_RECOMMENDATIONS,
} from '../mocks/demo-data';
import { InventoryItem, ReplenishmentRecommendation, StockStatus } from '../types';
import { API_BASE_URL, ApiResponse } from './api-client';

export const inventoryService = {
  async getInventory(filters?: {
    storeId?: string;
    category?: string;
    status?: StockStatus | 'ALL';
    search?: string;
  }): Promise<ApiResponse<InventoryItem[]>> {
    await new Promise((r) => setTimeout(r, 60));
    let items = [...DEMO_INVENTORY_ITEMS];

    if (filters?.storeId && filters.storeId !== 'ALL') {
      items = items.filter((i) => i.storeId === filters.storeId);
    }
    if (filters?.category && filters.category !== 'All Categories') {
      items = items.filter((i) => i.category === filters.category);
    }
    if (filters?.status && filters.status !== 'ALL') {
      items = items.filter((i) => i.status === filters.status);
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (i) => i.productName.toLowerCase().includes(q) || i.productId.toLowerCase().includes(q)
      );
    }

    return {
      data: items,
      isDemo: true,
      status: 'success',
    };
  },

  async getReplenishmentRecommendations(storeId?: string): Promise<ApiResponse<ReplenishmentRecommendation[]>> {
    await new Promise((r) => setTimeout(r, 60));
    let recs = [...DEMO_REPLENISHMENT_RECOMMENDATIONS];
    if (storeId && storeId !== 'ALL') {
      recs = recs.filter((r) => r.storeId === storeId);
    }
    return {
      data: recs,
      isDemo: true,
      status: 'success',
    };
  },

  async getProductById(productId: string): Promise<ApiResponse<InventoryItem | null>> {
    await new Promise((r) => setTimeout(r, 40));
    const item = DEMO_INVENTORY_ITEMS.find((i) => i.productId === productId) || null;
    return {
      data: item,
      isDemo: true,
      status: 'success',
    };
  },

  /**
   * Request inventory replenishment recommendations for an uploaded dataset.
   * Directly calls FastAPI POST /api/replenishment/{upload_id}.
   */
  async getSellerReplenishment(
    uploadId: string,
    leadTimeDays: number = 3.0,
    safetyStockDays: number = 2.0,
    horizonDays: 7 | 14 | 30 = 7,
    inventoryOverrides?: Record<string, number>
  ): Promise<import('../types').SellerReplenishmentResponse> {
    const res = await fetch(`${API_BASE_URL}/api/replenishment/${uploadId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_time_days: leadTimeDays,
        safety_stock_days: safetyStockDays,
        horizon_days: horizonDays,
        inventory_overrides: inventoryOverrides || undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Replenishment request failed (${res.status})`);
    }

    return res.json();
  },

  /**
   * Fetch cached replenishment recommendations for an upload session.
   */
  async getCachedSellerReplenishment(uploadId: string): Promise<import('../types').SellerReplenishmentResponse | null> {
    const res = await fetch(`${API_BASE_URL}/api/replenishment/${uploadId}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Failed to fetch cached replenishment (${res.status})`);
    }
    return res.json();
  },
};
