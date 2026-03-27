import { Timestamp } from 'firebase/firestore';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

/**
 * Represents a single meal slot — either a default or user-created custom slot.
 * The id is the string value stored in FoodLogEntry.mealSlot.
 */
export type MealSlotConfig = {
  id: string;
  label: string;
  isDefault: boolean;
};

export const DEFAULT_MEAL_SLOTS: MealSlotConfig[] = [
  { id: 'breakfast', label: 'Breakfast', isDefault: true },
  { id: 'lunch', label: 'Lunch', isDefault: true },
  { id: 'dinner', label: 'Dinner', isDefault: true },
  { id: 'snacks', label: 'Snacks', isDefault: true },
];

export function getSlotLabel(slotId: string, slots: MealSlotConfig[]): string {
  return slots.find((s) => s.id === slotId)?.label ?? slotId;
}

export type NutritionTargets = {
  calorieTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type FoodLogEntry = {
  id: string;
  date: string;           // YYYY-MM-DD in local timezone (see toLocalDateKey)
  mealSlot: string;
  foodName: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;    // the amount the user actually ate
  servingUnit: string;    // e.g. "g", "serving", "cup"
  barcode?: string;
  micronutrients?: Micronutrients;
  healthKitUUID?: string;
  createdAt: Timestamp;
  /** Dietary fiber in grams for the logged serving. Optional — null when not reported. */
  fiber?: number | null;
  /**
   * NOVA food processing group (1-4). 1 = unprocessed, 4 = ultra-processed.
   * Sourced from Open Food Facts. Null when unavailable.
   */
  novaGroup?: number | null;
  /**
   * Meal nutrition score (0-100) computed by scoreMealV2 after logging.
   * Persisted as a fire-and-forget update — may be absent on older entries.
   */
  nutritionScore?: number;
};

export type FavoriteFood = {
  id: string;
  foodName: string;
  brand?: string;
  calories: number;       // per servingSize below
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
  createdAt: Timestamp;
};

export type DailyTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

/**
 * Stripped-down food object passed through route params to Food Detail.
 * Never pass the full OFF API object — it can be large (ingredients, allergens, images).
 */
export type FoodNavPayload = {
  name: string;
  brand: string;
  calories100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
  fiber100g: number | null;
  sugar100g: number | null;
  /** grams per 100g — same contract as FoodSearchResult.sodium100g. */
  sodium100g: number | null;
  servingSizeG: number;
  barcode: string;
  source: 'search' | 'recent' | 'favorites' | 'manual';
  // For favorites/recent: also carry the logged servingUnit so it pre-fills correctly
  servingUnit?: string;
  foodSource?: FoodSource;
  micronutrients100g?: Micronutrients;
  portions?: FoodPortion[];
  /**
   * NOVA food processing group sourced from Open Food Facts (1-4).
   * Null when unavailable or not an OFF product.
   */
  novaGroup?: number | null;
};

export type FoodSource = 'usda' | 'off';

export type Micronutrients = {
  vitaminA: number | null;   // mcg per 100g
  vitaminC: number | null;   // mg per 100g
  vitaminD: number | null;   // mcg per 100g
  calcium: number | null;    // mg per 100g
  iron: number | null;       // mg per 100g
  potassium: number | null;  // mg per 100g
  /** mg per 100g — raw USDA value, NOT normalized to grams. Different unit than FoodSearchResult.sodium100g. */
  sodium: number | null;
  magnesium: number | null;  // mg per 100g
  zinc: number | null;       // mg per 100g
  vitaminB1: number | null;  // mg per 100g (Thiamin)
  vitaminB2: number | null;  // mg per 100g (Riboflavin)
  vitaminB3: number | null;  // mg per 100g (Niacin)
  vitaminB6: number | null;  // mg per 100g
  vitaminB12: number | null; // mcg per 100g
  vitaminE: number | null;   // mg per 100g
  vitaminK: number | null;   // mcg per 100g
  folate: number | null;     // mcg per 100g
  phosphorus: number | null; // mg per 100g
};

export type FoodPortion = {
  description: string;
  gramWeight: number;
};

/**
 * What the Open Food Facts search result list shows per item.
 * Derived from sanitizeOFFProduct() before navigation.
 */
export type FoodSearchResult = {
  name: string;
  brand: string;
  calories100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
  fiber100g: number | null;
  sugar100g: number | null;
  /** grams per 100g — USDA values are divided by 1000 at parse time to match this contract. */
  sodium100g: number | null;
  servingSizeG: number;
  barcode: string;
  foodSource?: FoodSource;
  micronutrients100g?: Micronutrients;
  portions?: FoodPortion[];
  usdaFullDescription?: string;  // original USDA verbose string (for subtitle)
  usdaDataType?: string;         // 'Foundation' | 'SR Legacy' | etc.
  /**
   * NOVA food processing group (1-4). 1 = unprocessed, 4 = ultra-processed.
   * Sourced from Open Food Facts. Null when unavailable or not an OFF product.
   */
  novaGroup?: number | null;
};
