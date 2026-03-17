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

export type NutritionTargets = {
  calorieTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type FoodLogEntry = {
  id: string;
  date: string;           // YYYY-MM-DD in local timezone (see toLocalDateKey)
  mealSlot: MealSlot;
  foodName: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;    // the amount the user actually ate
  servingUnit: string;    // e.g. "g", "serving", "cup"
  barcode?: string;
  createdAt: Timestamp;
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
  sodium100g: number | null;
  servingSizeG: number;
  barcode: string;
  source: 'search' | 'recent' | 'favorites' | 'manual';
  // For favorites/recent: also carry the logged servingUnit so it pre-fills correctly
  servingUnit?: string;
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
  sodium100g: number | null;
  servingSizeG: number;
  barcode: string;
};
