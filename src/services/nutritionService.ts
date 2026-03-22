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
  updateDocument,
  COLLECTIONS,
} from './firebase/firestore';
import { writeNutrition } from './healthKitService';
import { computeAndSaveBodyModel } from './bodyModelService';
import { toLocalDateKey, sanitizeOFFProduct } from '../utils/nutrition';
import { searchUSDA, getUSDAFoodByBarcode } from './usdaService';
import type {
  FoodLogEntry,
  FavoriteFood,
  DailyTotals,
  FoodSearchResult,
  MealSlot,
  Micronutrients,
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
  micronutrients?: Micronutrients;
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
  const result = await addDocument(COLLECTIONS.FOOD_LOG, data as any);
  if (result.data) {
    const docId = result.data;
    computeAndSaveBodyModel(data.date).catch(() => {});
    writeNutrition({
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      date: data.date,
    }).then((uuid) => {
      if (uuid) {
        updateDocument(COLLECTIONS.FOOD_LOG, docId, { healthKitUUID: uuid }).catch(() => {});
      }
    }).catch(() => {});
  }
  return result;
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
  'https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=30&lc=en';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const searchCache = new Map<string, { data: FoodSearchResult[]; ts: number }>();

function relevanceScore(name: string, query: string): number {
  const n = name.toLowerCase();
  const q = query.toLowerCase().trim();
  const qEscaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (n === q) return 100;
  if (n.startsWith(q)) return 80;
  if (new RegExp(`\\b${qEscaped}`).test(n)) return 60;
  if (n.includes(q)) return 40;
  return 0;
}

async function searchOFF(
  query: string,
  signal?: AbortSignal,
): Promise<ServiceResult<FoodSearchResult[]>> {
  let timedOut = false;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => { timedOut = true; controller.abort(); }, 10_000);
  signal?.addEventListener('abort', () => controller.abort(), { once: true });
  try {
    const url = `${OFF_BASE}&search_terms=${encodeURIComponent(query.trim())}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { data: null, error: new Error(`OFF API returned ${response.status}`) };
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
          foodSource: 'off' as const,
        } satisfies FoodSearchResult;
      })
      .filter((r: FoodSearchResult) => r.name !== 'Unknown Food')
      .filter(
        (r: FoodSearchResult) =>
          !(r.calories100g === 0 && r.protein100g === 0 && r.carbs100g === 0 && r.fat100g === 0),
      )
      .sort(
        (a: FoodSearchResult, b: FoodSearchResult) =>
          relevanceScore(b.name, query) - relevanceScore(a.name, query),
      );

    return { data: products, error: null };
  } catch (e) {
    clearTimeout(timeoutId);
    const err = e as Error;
    if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
      if (timedOut) {
        return { data: null, error: new Error('Request timed out') };
      }
      // Debounce cancellation — not an error
      return { data: [], error: null };
    }
    return { data: null, error: err };
  }
}

/**
 * Search USDA + Open Food Facts in parallel. USDA results appear first.
 * If one source fails, the other is still returned. Only errors if both fail.
 *
 * @param signal — optional AbortSignal from the caller.
 */
export async function searchFood(
  query: string,
  signal?: AbortSignal,
): Promise<ServiceResult<FoodSearchResult[]>> {
  if (!query.trim()) return { data: [], error: null };

  const cacheKey = query.trim().toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { data: cached.data, error: null };
  }

  const [usdaResult, offResult] = await Promise.allSettled([
    searchUSDA(query, signal),
    searchOFF(query, signal),
  ]);

  const usdaData =
    usdaResult.status === 'fulfilled' && !usdaResult.value.error
      ? usdaResult.value.data ?? []
      : [];

  const offData =
    offResult.status === 'fulfilled' && !offResult.value.error
      ? offResult.value.data ?? []
      : [];

  // Both failed
  const usdaErr =
    usdaResult.status === 'rejected'
      ? usdaResult.reason
      : usdaResult.value.error;
  const offErr =
    offResult.status === 'rejected'
      ? offResult.reason
      : offResult.value.error;

  if (usdaErr && offErr) {
    // Return the OFF error as it's more likely to be meaningful to the user
    return { data: null, error: offErr as Error };
  }

  // Check for abort — if signal was aborted, propagate it
  if (signal?.aborted) {
    const abortErr = new Error('Aborted');
    abortErr.name = 'AbortError';
    return { data: null, error: abortErr };
  }

  const DATA_TYPE_PRIORITY: Record<string, number> = {
    'Foundation': 1,
    'SR Legacy': 2,
  };

  const sortedUSDA = [...usdaData].sort((a, b) => {
    const at = DATA_TYPE_PRIORITY[a.usdaDataType ?? ''] ?? 99;
    const bt = DATA_TYPE_PRIORITY[b.usdaDataType ?? ''] ?? 99;
    if (at !== bt) return at - bt;
    return relevanceScore(b.name, query) - relevanceScore(a.name, query);
  });

  const merged = [...sortedUSDA, ...offData];

  // Only cache when neither source errored. If either source failed (e.g. USDA
  // temporarily down), the merged result is incomplete. Caching it would serve
  // stale partial data for up to CACHE_TTL_MS after the source recovers.
  // Note: USDA returning [] because no API key is not an error (usdaErr is null).
  if (!usdaErr && !offErr) {
    if (searchCache.size >= 100) {
      searchCache.delete(searchCache.keys().next().value!);
    }
    searchCache.set(cacheKey, { data: merged, ts: Date.now() });
  }

  return { data: merged, error: null };
}

const BARCODE_RE = /^[a-zA-Z0-9]+$/;

/**
 * Look up a single product by barcode. Tries USDA first, falls back to OFF.
 * Returns { data: null, error: null } for invalid barcodes or not-found products.
 */
export async function getFoodByBarcode(
  barcode: string,
  signal?: AbortSignal,
): Promise<ServiceResult<FoodSearchResult | null>> {
  if (!BARCODE_RE.test(barcode)) return { data: null, error: null };

  // Try USDA first
  const usdaResult = await getUSDAFoodByBarcode(barcode, signal);
  if (!usdaResult.error && usdaResult.data) {
    return usdaResult;
  }

  // Fall back to OFF
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  signal?.addEventListener('abort', () => controller.abort(), { once: true });

  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    const json = await response.json();
    if (json.status !== 1 || !json.product) return { data: null, error: null };

    const s = sanitizeOFFProduct(json.product);
    return {
      data: {
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
        foodSource: 'off' as const,
      } satisfies FoodSearchResult,
      error: null,
    };
  } catch (e) {
    clearTimeout(timeoutId);
    const err = e as Error;
    // Aborts are intentional (user typed new query or timeout) — not errors
    if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
      return { data: null, error: null };
    }
    return { data: null, error: err };
  }
}
