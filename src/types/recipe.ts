export type RecipeIngredient = {
  id: string;
  foodName: string;
  brand?: string;
  amountG: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  calories100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
};

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Recipe = {
  id: string;
  name: string;
  servings: number;
  isBatchCook: boolean;
  ingredients: RecipeIngredient[];
  totalNutrition: MacroTotals;
  perServingNutrition: MacroTotals;
  createdAt: unknown;
  updatedAt: unknown;
};

export type RecipeInput = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>;

export const SERVING_FRACTIONS = [
  { label: 'Full serving', value: 1 },
  { label: 'Half serving', value: 0.5 },
  { label: '1/3 serving', value: 1 / 3 },
  { label: '2/3 serving', value: 2 / 3 },
] as const;
