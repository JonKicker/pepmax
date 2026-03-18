/**
 * USDA FoodData Central service.
 *
 * Returns empty/null gracefully when EXPO_PUBLIC_USDA_API_KEY is not set,
 * so the app degrades to OFF-only without crashing.
 */
import { USDA_NUTRIENT_IDS } from '../constants/nutrition';
import type { FoodSearchResult, FoodPortion, Micronutrients } from '../types/nutrition';
import type { ServiceResult } from '../types/service';

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildNutrientLookup(foodNutrients: any[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const n of foodNutrients ?? []) {
    const id = n?.nutrientId ?? n?.nutrient?.id;
    const value = n?.value ?? n?.amount;
    if (id != null && value != null) {
      map.set(Number(id), Number(value));
    }
  }
  return map;
}

function getNutrient(map: Map<number, number>, key: string): number {
  return map.get(USDA_NUTRIENT_IDS[key]) ?? 0;
}

function getOptionalNutrient(map: Map<number, number>, key: string): number | null {
  const val = map.get(USDA_NUTRIENT_IDS[key]);
  return val != null ? val : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePortions(foodPortions: any[]): FoodPortion[] {
  if (!Array.isArray(foodPortions)) return [];
  return foodPortions
    .filter((p) => p?.gramWeight > 0 && p?.modifier)
    .map((p) => ({
      description: String(p.modifier),
      gramWeight: Number(p.gramWeight),
    }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFoodItem(food: any): FoodSearchResult {
  const nutrients = buildNutrientLookup(food?.foodNutrients ?? []);

  const micronutrients100g: Micronutrients = {
    vitaminA: getOptionalNutrient(nutrients, 'vitaminA'),
    vitaminC: getOptionalNutrient(nutrients, 'vitaminC'),
    vitaminD: getOptionalNutrient(nutrients, 'vitaminD'),
    calcium: getOptionalNutrient(nutrients, 'calcium'),
    iron: getOptionalNutrient(nutrients, 'iron'),
    potassium: getOptionalNutrient(nutrients, 'potassium'),
    sodium: getOptionalNutrient(nutrients, 'sodium'),
    magnesium: getOptionalNutrient(nutrients, 'magnesium'),
    zinc: getOptionalNutrient(nutrients, 'zinc'),
  };

  const portions = parsePortions(food?.foodPortions ?? []);

  return {
    name: String(food?.description ?? 'Unknown Food').trim() || 'Unknown Food',
    brand: String(food?.brandOwner ?? food?.brandName ?? '').trim(),
    calories100g: Math.round(getNutrient(nutrients, 'calories')),
    protein100g: Math.round(getNutrient(nutrients, 'protein') * 10) / 10,
    carbs100g: Math.round(getNutrient(nutrients, 'carbs') * 10) / 10,
    fat100g: Math.round(getNutrient(nutrients, 'fat') * 10) / 10,
    fiber100g: getOptionalNutrient(nutrients, 'fiber'),
    sugar100g: getOptionalNutrient(nutrients, 'sugar'),
    sodium100g: getOptionalNutrient(nutrients, 'sodium') != null
      ? (getOptionalNutrient(nutrients, 'sodium')! / 1000) // mg → g for consistency with OFF
      : null,
    servingSizeG: portions[0]?.gramWeight ?? 100,
    barcode: String(food?.fdcId ?? ''),
    foodSource: 'usda',
    micronutrients100g,
    portions: portions.length > 0 ? portions : undefined,
  };
}

/**
 * Search USDA FoodData Central.
 * Returns empty array (not an error) if API key is not configured.
 */
export async function searchUSDA(
  query: string,
  signal?: AbortSignal,
): Promise<ServiceResult<FoodSearchResult[]>> {
  const apiKey = process.env.EXPO_PUBLIC_USDA_API_KEY;
  if (!apiKey) return { data: [], error: null };
  if (!query.trim()) return { data: [], error: null };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  signal?.addEventListener('abort', () => controller.abort(), { once: true });

  try {
    const url =
      `${USDA_BASE}/foods/search?api_key=${encodeURIComponent(apiKey)}` +
      `&query=${encodeURIComponent(query.trim())}` +
      `&pageSize=20&dataType=SR%20Legacy,Foundation`;

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { data: null, error: new Error(`USDA API returned ${response.status}`) };
    }

    const json = await response.json();
    const results: FoodSearchResult[] = (json?.foods ?? [])
      .filter((f: unknown) => f && typeof f === 'object')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((f: any) => parseFoodItem(f))
      .filter((r: FoodSearchResult) => r.name !== 'Unknown Food')
      .filter(
        (r: FoodSearchResult) =>
          !(r.calories100g === 0 && r.protein100g === 0 && r.carbs100g === 0 && r.fat100g === 0),
      );

    return { data: results, error: null };
  } catch (e) {
    clearTimeout(timeoutId);
    return { data: null, error: e as Error };
  }
}

/**
 * Look up a food by barcode in USDA Branded Foods.
 * Returns null (not an error) if not found.
 */
export async function getUSDAFoodByBarcode(
  barcode: string,
  signal?: AbortSignal,
): Promise<ServiceResult<FoodSearchResult | null>> {
  const apiKey = process.env.EXPO_PUBLIC_USDA_API_KEY;
  if (!apiKey) return { data: null, error: null };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  signal?.addEventListener('abort', () => controller.abort(), { once: true });

  try {
    const url =
      `${USDA_BASE}/foods/search?api_key=${encodeURIComponent(apiKey)}` +
      `&query=${encodeURIComponent(barcode)}&dataType=Branded&pageSize=1`;

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return { data: null, error: null };

    const json = await response.json();
    const foods = json?.foods ?? [];
    if (foods.length === 0) return { data: null, error: null };

    return { data: parseFoodItem(foods[0]), error: null };
  } catch (e) {
    clearTimeout(timeoutId);
    return { data: null, error: e as Error };
  }
}
