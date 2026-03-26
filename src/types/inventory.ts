import type { Timestamp } from 'firebase/firestore';

export type InventoryItemType = 'compound' | 'supply';
export type CompoundSubType = 'vial' | 'pen';
export type SupplyCategory =
  | 'insulinSyringes'
  | 'bacWater'
  | 'alcoholSwabs'
  | 'mixingSyringes'
  | 'sharpsContainer'
  | 'other';
export type StockStatus = 'ok' | 'warning' | 'low';

export type InventoryItem = {
  id: string;
  type: InventoryItemType;
  subType: CompoundSubType | SupplyCategory;
  name: string;
  linkedCompoundId?: string;
  linkedCompoundName?: string;
  totalAmount: number;       // mg per vial, clicks per pen, count for supplies
  remainingAmount: number;   // current remaining in active unit
  unit: string;              // 'mg', 'clicks', 'count'
  quantity: number;          // full unopened units on hand
  lotNumber?: string;
  expirationDate?: string | null; // ISO date string, nullable
  lowStockThresholdDays: number;  // default 7
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export const SUPPLY_CATEGORIES: SupplyCategory[] = [
  'insulinSyringes',
  'bacWater',
  'alcoholSwabs',
  'mixingSyringes',
  'sharpsContainer',
  'other',
];

export const SUPPLY_CATEGORY_LABELS: Record<SupplyCategory, string> = {
  insulinSyringes: 'Insulin Syringes',
  bacWater: 'Bacteriostatic Water',
  alcoholSwabs: 'Alcohol Swabs',
  mixingSyringes: 'Mixing Syringes',
  sharpsContainer: 'Sharps Container',
  other: 'Other',
};

// Only these supply types auto-decrement on every dose log
export const AUTO_DECREMENT_SUPPLY_TYPES: SupplyCategory[] = [
  'insulinSyringes',
  'alcoholSwabs',
];
