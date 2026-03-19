import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getInventoryItems } from '../services/inventoryService';
import { getDoses } from '../services/peptideService';
import {
  scheduleLowStockNotification,
  cancelLowStockNotification,
} from '../services/notificationService';
import type { InventoryItem, StockStatus, SupplyCategory } from '../types/inventory';
import type { Dose } from '../types/peptide';

// ─── Enriched item type ───────────────────────────────────────────────────────

export type EnrichedInventoryItem = InventoryItem & {
  dailyConsumption: number;   // units/day based on last 30 days
  daysUntilEmpty: number | null; // null = cannot compute (no usage data or totalAmount=0)
  stockStatus: StockStatus;
};

// ─── Pure computation functions ───────────────────────────────────────────────

export function computeDailyConsumption(item: InventoryItem, doses: Dose[]): number {
  if (item.type === 'compound') {
    // Sum dose amounts for matching compoundId over last 30 days
    const matching = doses.filter((d) => d.peptideId === item.linkedCompoundId);
    if (matching.length === 0) return 0;
    const totalAmount = matching.reduce((sum, d) => {
      // Normalize to item unit (mg)
      if (item.unit === 'mg') {
        if (d.unit === 'mg') return sum + d.amount;
        if (d.unit === 'mcg') return sum + d.amount / 1000;
        return sum; // IU — skip
      }
      if (item.unit === 'clicks') {
        // 1 injection = 1 click (simplification)
        return sum + 1;
      }
      return sum;
    }, 0);
    return totalAmount / 30;
  } else {
    // Supply: count doses as usage events (each dose uses 1 of each auto-decrement supply)
    const autoDecrementTypes: SupplyCategory[] = ['insulinSyringes', 'alcoholSwabs'];
    if (!autoDecrementTypes.includes(item.subType as SupplyCategory)) return 0;
    return doses.length / 30;
  }
}

export function computeDaysUntilEmpty(
  item: InventoryItem,
  dailyConsumption: number,
): number | null {
  if (dailyConsumption === 0) return null;
  const totalRemaining = item.remainingAmount + item.quantity * item.totalAmount;
  return totalRemaining / dailyConsumption;
}

export function computeStockStatus(
  daysUntilEmpty: number | null,
  threshold: number,
): StockStatus {
  if (daysUntilEmpty === null) return 'ok';
  if (daysUntilEmpty < threshold) return 'low';
  if (daysUntilEmpty < threshold * 2) return 'warning';
  return 'ok';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInventory() {
  const [compounds, setCompounds] = useState<EnrichedInventoryItem[]>([]);
  const [supplies, setSupplies] = useState<EnrichedInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [inventoryResult, dosesResult] = await Promise.all([
      getInventoryItems(),
      getDoses({ startDate: thirtyDaysAgo }),
    ]);

    if (inventoryResult.error) {
      setError('Failed to load inventory.');
      setLoading(false);
      return;
    }

    const items = inventoryResult.data ?? [];
    const doses = dosesResult.data ?? [];

    const enriched: EnrichedInventoryItem[] = items.map((item) => {
      const dailyConsumption = computeDailyConsumption(item, doses);
      const daysUntilEmpty = computeDaysUntilEmpty(item, dailyConsumption);
      const stockStatus = computeStockStatus(daysUntilEmpty, item.lowStockThresholdDays);
      return { ...item, dailyConsumption, daysUntilEmpty, stockStatus };
    });

    // Schedule/cancel low-stock notifications based on computed status
    for (const item of enriched) {
      if (item.stockStatus === 'low' && item.daysUntilEmpty !== null) {
        scheduleLowStockNotification(item.id, item.name, item.daysUntilEmpty).catch(() => {});
      } else {
        cancelLowStockNotification(item.id).catch(() => {});
      }
    }

    setCompounds(enriched.filter((i) => i.type === 'compound'));
    setSupplies(enriched.filter((i) => i.type === 'supply'));
    setError(null);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { compounds, supplies, loading, error, refresh };
}
