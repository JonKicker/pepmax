/**
 * Nutrition service — foodLog + favoriteFoods CRUD + Open Food Facts search.
 *
 * Date keys: ALL date comparisons use toLocalDateKey() from utils/nutrition.
 * Never use toISOString() here — it returns UTC and silently corrupts logs for
 * users in non-UTC timezones.
 *
 * Open Food Facts search: results are run through sanitizeOFFProduct() before
 * being returned to callers. Callers receive clean FoodSearchResult objects,
 * never raw API responses.
 */
import { orderBy, where, limit, Timestamp } from 'firebase/firestore';
import {
  addDocument,
  deleteDocument,
  queryDocuments,
  COLLECTIONS,
} from './firebase/firestore';
import { toLocalDateKey, sanitizeOFFProduct } from '../utils/nutrition';
import type {
  FoodLogEntry,
  FavoriteFood,
  DailyTotals,
  FoodSearchResult,
  MealSlot,
} from '../types/nutrition';
import type { ServiceResult } from '../types/service';

// ─── Input types ─────────────────────────────────────────────────────────────

type FoodLogInput = {
  date: string;
  mealSlot: MealSlot;
  foodName: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
  barcode?: string;
};

type FavoriteFoodInput = {
  foodName: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
};

// ─── Food Log ────────────────────────────────────────────────────────────────

export async function logFood(data: FoodLogInput): Promise<ServiceResult<string>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return addDocument(COLLECTIONS.FOOD_LOG, data as any);
}

export async function deleteFood(id: string): Promise<ServiceResult<void>> {
  return deleteDocument(COLLECTIONS.FOOD_LOG, id);
}

/**
 * All food log entries for today (local date), sorted by createdAt ascending.
 *
 * Sorting is done client-side to avoid requiring a composite Firestore index
 * on (date, createdAt). Null-safe: serverTimestamp() may be null briefly on
 * cache reads before the server value commits.
 */
export async function getTodaysLog(): Promise<ServiceResult<FoodLogEntry[]>> {
  const today = toLocalDateKey();
  const result = await queryDocuments<FoodLogEntry>(COLLECTIONS.FOOD_LOG, [
    where('date', '==', today),
  ]);
  if (result.error) return result;
  return {
    data: result.data!.slice().sort((a, b) => {
      const aMs = (a.createdAt as unknown as Timestamp)?.toMillis?.() ?? 0;
      const bMs = (b.createdAt as unknown as Timestamp)?.toMillis?.() ?? 0;
      return aMs - bMs;
    }),
    error: null,
  };
}

/**
 * All food log entries for a specific date string (YYYY-MM-DD local), sorted by createdAt ascending.
 *
 * Client-side sort — same reasoning as getTodaysLog (avoids composite index).
 */
export async function getLogForDate(date: string): Promise<ServiceResult<FoodLogEntry[]>> {
  const result = await queryDocuments<FoodLogEntry>(COLLECTIONS.FOOD_LOG, [
    where('date', '==', date),
  ]);
  if (result.error) return result;
  return {
    data: result.data!.slice().sort((a, b) => {
      const aMs = (a.createdAt as unknown as Timestamp)?.toMillis?.() ?? 0;
      const bMs = (b.createdAt as unknown as Timestamp)?.toMillis?.() ?? 0;
      return aMs - bMs;
    }),
    error: null,
  };
}

/**
 * Last N unique foods the user has logged (deduplicated client-side by foodName).
 * Pulls 3× limit entries to have enough after deduplication.
 */
export async function getRecentFoods(n: number = 20): Promise<ServiceResult<FoodLogEntry[]>> {
  const result = await queryDocuments<FoodLogEntry>(COLLECTIONS.FOOD_LOG, [
    orderBy('createdAt', 'desc'),
    limit(n * 3),
  ]);

  if (result.error) return result;

  const seen = new Set<string>();
  const unique: FoodLogEntry[] = [];
  for (const entry of result.data!) {
    const key = entry.foodName.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(entry);
      if (unique.length >= n) break;
    }
  }

  return { data: unique, error: null };
}

/**
 * All food log entries whose date falls within [startDate, endDate] inclusive.
 * Both params must be YYYY-MM-DD local date strings (use toLocalDateKey).
 *
 * Uses a single-field range query — no composite Firestore index required
 * because the inequality filter and orderBy are on the same 'date' field.
 */
export async function getLogsForDateRange(
  startDate: string,
  endDate: string,
): Promise<ServiceResult<FoodLogEntry[]>> {
  return queryDocuments<FoodLogEntry>(COLLECTIONS.FOOD_LOG, [
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'asc'),
  ]);
}

/**
 * Sum calories and macros for a given local date string.
 * Returns zeros when no entries exist (not an error).
 */
export async function getDailyTotals(date: string): Promise<ServiceResult<DailyTotals>> {
  const result = await getLogForDate(date);
  if (result.error) return { data: null, error: result.error };

  const totals = (result.data ?? []).reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return { data: totals, error: null };
}

// ─── Favorites ───────────────────────────────────────────────────────────────

export async function addFavorite(data: FavoriteFoodInput): Promise<ServiceResult<string>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return addDocument(COLLECTIONS.FAVORITE_FOODS, data as any);
}

export async function removeFavorite(id: string): Promise<ServiceResult<void>> {
  return deleteDocument(COLLECTIONS.FAVORITE_FOODS, id);
}

export async function getFavorites(): Promise<ServiceResult<FavoriteFood[]>> {
  return queryDocuments<FavoriteFood>(COLLECTIONS.FAVORITE_FOODS, [
    orderBy('createdAt', 'desc'),
  ]);
}

// ─── Open Food Facts search ──────────────────────────────────────────────────

const OFF_BASE =
  'https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=20';

/**
 * Search Open Food Facts. Returns sanitized results — callers never see raw API data.
 * Throws on network failure so the UI can distinguish "no results" from "API down".
 */
export async function searchFood(query: string): Promise<ServiceResult<FoodSearchResult[]>> {
  if (!query.trim()) return { data: [], error: null };

  try {
    const url = `${OFF_BASE}&search_terms=${encodeURIComponent(query.trim())}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });

    if (!response.ok) {
      return { data: null, error: new Error(`Search API returned ${response.status}`) };
    }

    const json = await response.json();
    const products: FoodSearchResult[] = (json?.products ?? [])
      .filter((p: unknown) => p && typeof p === 'object')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => {
        const s = sanitizeOFFProduct(p);
        return {
          name: s.name,
          brand: s.brand,
          calories100g: s.per100g.calories,
          protein100g: s.per100g.protein,
          carbs100g: s.per100g.carbs,
          fat100g: s.per100g.fat,
          fiber100g: s.per100g.fiber,
          sugar100g: s.per100g.sugar,
          sodium100g: s.per100g.sodium,
          servingSizeG: s.servingSizeG,
          barcode: s.barcode,
        } satisfies FoodSearchResult;
      })
      .filter((r: FoodSearchResult) => r.name !== 'Unknown Food');

    return { data: products, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
