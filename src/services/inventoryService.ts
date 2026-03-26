/**
 * Inventory service — CRUD + auto-decrement for the inventory collection.
 *
 * Path layout (handled by firestore helpers):
 *   users/{uid}/inventory/{id}
 */
import { orderBy } from 'firebase/firestore';
import {
  addDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  COLLECTIONS,
} from './firebase/firestore';
import type { InventoryItem, SupplyCategory } from '../types/inventory';
import { AUTO_DECREMENT_SUPPLY_TYPES } from '../types/inventory';
import type { ServiceResult } from '../types/service';

// ─── Input type (strips server-managed fields) ───────────────────────────────

type InventoryItemInput = Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>;

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function addInventoryItem(
  data: InventoryItemInput,
): Promise<ServiceResult<string>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return addDocument(COLLECTIONS.INVENTORY, data as any);
}

export async function updateInventoryItem(
  id: string,
  data: Partial<InventoryItemInput>,
): Promise<ServiceResult<void>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return updateDocument(COLLECTIONS.INVENTORY, id, data as any);
}

export async function deleteInventoryItem(id: string): Promise<ServiceResult<void>> {
  return deleteDocument(COLLECTIONS.INVENTORY, id);
}

export async function getInventoryItems(): Promise<ServiceResult<InventoryItem[]>> {
  return queryDocuments<InventoryItem>(COLLECTIONS.INVENTORY, [orderBy('createdAt', 'desc')]);
}

// ─── Auto-decrement helpers ───────────────────────────────────────────────────

type CompoundDecrementResult = {
  itemName: string;
  remaining: number;
};

/**
 * Normalize dose amount to mg for comparison with vial inventory.
 * Returns null if units are incompatible (e.g. IU vs mg — skip decrement).
 */
function normalizeTomg(amount: number, unit: string): number | null {
  if (unit === 'mg') return amount;
  if (unit === 'mcg') return amount / 1000;
  // IU and other units cannot be reliably converted without concentration info
  return null;
}

/**
 * Decrement compound inventory for a given compoundId.
 * Uses FIFO: nearly-empty vials/pens first.
 * Returns { itemName, remaining } for toast, or null if no inventory tracked.
 */
export async function decrementCompoundInventory(
  compoundId: string,
  amountUsed: number,
  unit: string,
): Promise<CompoundDecrementResult | null> {
  const result = await getInventoryItems();
  if (result.error || !result.data) return null;

  // Filter to compound items linked to this compoundId
  const items = result.data
    .filter((item) => item.type === 'compound' && item.linkedCompoundId === compoundId)
    .sort((a, b) => a.remainingAmount - b.remainingAmount); // FIFO: use nearly-empty first

  if (items.length === 0) return null;

  // Normalize amount to mg for vials; for pens use clicks as-is (unit: 'clicks')
  const firstItem = items[0];
  let amountMg: number;
  if (firstItem.unit === 'clicks') {
    // Pen: treat as click count, don't convert
    amountMg = amountUsed;
  } else {
    const normalized = normalizeTomg(amountUsed, unit);
    if (normalized === null) return null; // IU mismatch — skip
    amountMg = normalized;
  }

  let remainingToSubtract = amountMg;

  // Track final state for every item (updated or untouched) for accurate total calculation
  type ItemFinalState = { remainingAmount: number; quantity: number; totalAmount: number; name: string };
  const finalStates: ItemFinalState[] = [];
  let processedCount = 0;

  for (const item of items) {
    if (remainingToSubtract <= 0) {
      // This item was not touched — record its original state for the total
      finalStates.push({ remainingAmount: item.remainingAmount, quantity: item.quantity, totalAmount: item.totalAmount, name: item.name });
      continue;
    }

    let newRemaining = item.remainingAmount - remainingToSubtract;
    let newQuantity = item.quantity;

    if (newRemaining < 0) {
      // Absorb overflow into this item's sealed quantity first
      let overflow = Math.abs(newRemaining);
      while (overflow > 0 && newQuantity > 0) {
        newQuantity -= 1;
        newRemaining = item.totalAmount - overflow;
        if (newRemaining < 0) {
          overflow = Math.abs(newRemaining);
        } else {
          overflow = 0;
        }
      }
      if (newRemaining < 0) {
        // Item fully exhausted — carry leftover overflow to the next item in the array
        remainingToSubtract = Math.abs(newRemaining);
        newRemaining = 0;
        newQuantity = 0;
      } else {
        remainingToSubtract = 0;
      }
    } else {
      remainingToSubtract = 0;
    }

    const finalRemaining = Math.max(0, newRemaining);
    const finalQuantity = Math.max(0, newQuantity);

    await updateInventoryItem(item.id, {
      remainingAmount: finalRemaining,
      quantity: finalQuantity,
    });

    finalStates.push({ remainingAmount: finalRemaining, quantity: finalQuantity, totalAmount: item.totalAmount, name: item.name });
    processedCount += 1;
  }

  if (processedCount === 0) return null;

  // Sum remaining across ALL items for this compound (updated + untouched)
  const totalRemaining = finalStates.reduce(
    (sum, s) => sum + s.remainingAmount + s.quantity * s.totalAmount,
    0,
  );

  return {
    itemName: finalStates[0].name, // name of the first (most-depleted) item
    remaining: Math.round(totalRemaining * 100) / 100,
  };
}

/**
 * Decrement supply items (insulinSyringes, alcoholSwabs) by 1 each.
 * Fire-and-forget — never throws, never blocks dose logging.
 */
export async function decrementSupplyItems(types: SupplyCategory[]): Promise<void> {
  const result = await getInventoryItems();
  if (result.error || !result.data) return;

  const supplyItems = result.data.filter(
    (item) => item.type === 'supply' && types.includes(item.subType as SupplyCategory),
  );

  await Promise.all(
    supplyItems.map(async (item) => {
      let newRemaining = item.remainingAmount - 1;
      let newQuantity = item.quantity;

      if (newRemaining < 0 && newQuantity > 0) {
        newQuantity -= 1;
        newRemaining = item.totalAmount - 1;
      } else if (newRemaining < 0) {
        newRemaining = 0;
      }

      await updateInventoryItem(item.id, {
        remainingAmount: Math.max(0, newRemaining),
        quantity: Math.max(0, newQuantity),
      });
    }),
  );
}

/**
 * Orchestrator: decrement compound + supply inventory on dose log.
 * Returns compound result for toast display.
 */
export async function decrementInventoryOnDose(
  compoundId: string,
  amountUsed: number,
  unit: string,
): Promise<{ compoundResult: CompoundDecrementResult | null }> {
  const [compoundResult] = await Promise.all([
    decrementCompoundInventory(compoundId, amountUsed, unit),
    decrementSupplyItems(AUTO_DECREMENT_SUPPLY_TYPES),
  ]);

  return { compoundResult };
}
