import { orderBy } from 'firebase/firestore';
import type { WithFieldValue } from 'firebase/firestore';
import {
  addDocument,
  updateDocument,
  deleteDocument,
  getDocument,
  queryDocuments,
  COLLECTIONS,
} from './firebase/firestore';
import { logFood } from './nutritionService';
import { toLocalDateKey } from '../utils/nutrition';
import type { Recipe, RecipeInput } from '../types/recipe';
import type { MealSlot } from '../types/nutrition';
import type { ServiceResult } from '../types/service';

export async function saveRecipe(data: RecipeInput): Promise<ServiceResult<string>> {
  return addDocument<RecipeInput>(COLLECTIONS.RECIPES, data as WithFieldValue<RecipeInput>);
}

export async function updateRecipe(id: string, data: RecipeInput): Promise<ServiceResult<void>> {
  return updateDocument(COLLECTIONS.RECIPES, id, { ...data } as WithFieldValue<RecipeInput>);
}

export async function deleteRecipe(id: string): Promise<ServiceResult<void>> {
  return deleteDocument(COLLECTIONS.RECIPES, id);
}

export async function getRecipes(): Promise<ServiceResult<Recipe[]>> {
  return queryDocuments<Recipe>(COLLECTIONS.RECIPES, [orderBy('updatedAt', 'desc')]);
}

export async function getRecipe(id: string): Promise<ServiceResult<Recipe | null>> {
  return getDocument<Recipe>(COLLECTIONS.RECIPES, id);
}

/**
 * Log a recipe as a single food entry.
 * fraction = portion of one serving (1 = full, 0.5 = half, etc.)
 */
export async function logRecipeAsFood(
  recipe: Recipe,
  mealSlot: MealSlot,
  fraction: number = 1
): Promise<ServiceResult<string>> {
  const ps = recipe.perServingNutrition;
  const f = fraction > 0 ? fraction : 1;
  return logFood({
    date: toLocalDateKey(),
    mealSlot,
    foodName: recipe.name,
    calories: Math.round(ps.calories * f),
    protein: Math.round(ps.protein * f * 10) / 10,
    carbs: Math.round(ps.carbs * f * 10) / 10,
    fat: Math.round(ps.fat * f * 10) / 10,
    servingSize: f === 1 ? 1 : parseFloat(f.toFixed(3)),
    servingUnit: 'serving',
  });
}
