import {
  DEMO_INVENTORY_ITEMS,
  DEMO_REPLENISHMENT_RECOMMENDATIONS,
} from '../mocks/demo-data';
import { InventoryItem, ReplenishmentRecommendation, StockStatus } from '../types';
import { ApiResponse } from './api-client';

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
};
