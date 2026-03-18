/**
 * Nutrition utilities — pure functions, no side effects.
 *
 * toLocalDateKey   — Ray-required: local-timezone YYYY-MM-DD date string.
 *                    Never use toISOString() for date keys (returns UTC date).
 *
 * sanitizeOFFProduct — parses a raw Open Food Facts API product into a clean
 *                      NutrientsPer100g object. Single source of truth for all
 *                      failure modes: missing fields, null, kJ-only energy,
 *                      negative values. Called before any navigation or Firestore write.
 *
 * recalculateMacros  — proportional macro scaling when serving size changes.
 *                      Pure function — no component state, fully testable.
 */

import type { Micronutrients } from '../types/nutrition';
import { RDA_VALUES } from '../constants/nutrition';

// ─── Date key ─────────────────────────────────────────────────────────────────

/**
 * Returns a YYYY-MM-DD string in the device's LOCAL timezone.
 *
 * Why not toISOString().split('T')[0]?
 *   toISOString() returns UTC. A user in New York at 11pm on March 17th would
 *   get "2026-03-18" — their dinner logged under tomorrow's date. Every date key
 *   in the app must go through this function.
 */
export function toLocalDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Open Food Facts sanitizer ────────────────────────────────────────────────

export type NutrientsPer100g = {
  calories: number;    // kcal per 100g (never NaN, never negative)
  protein: number;     // grams per 100g
  carbs: number;       // grams per 100g
  fat: number;         // grams per 100g
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
};

export type SanitizedOFFProduct = {
  name: string;
  brand: string;
  per100g: NutrientsPer100g;
  servingSizeG: number;  // defaults to 100 if not parseable
  barcode: string;
};

/**
 * Clamp a number to [0, Infinity). Handles NaN, negative, Infinity.
 */
function clampNutrient(raw: unknown): number {
  const n = parseFloat(String(raw));
  if (!isFinite(n) || isNaN(n) || n < 0) return 0;
  return n;
}

/**
 * Same as clampNutrient but returns null instead of 0 for missing/invalid values.
 * Used for optional nutrients (fiber, sugar, sodium) where 0 ≠ "not reported".
 */
function clampOptional(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = parseFloat(String(raw));
  if (!isFinite(n) || isNaN(n)) return null;
  return Math.max(0, n);
}

/**
 * Parse the serving_size string (e.g. "100g", "1 cup (240g)", "30 g") into grams.
 * Returns 100 if unparseable.
 */
function parseServingSizeG(raw: unknown): number {
  if (!raw) return 100;
  const str = String(raw);
  // Extract the last number followed by 'g' (handles "1 cup (240g)")
  const match = str.match(/(\d+(?:\.\d+)?)\s*g/i);
  if (match) {
    const g = parseFloat(match[1]);
    return isFinite(g) && g > 0 ? g : 100;
  }
  // Fallback: first number in string
  const numMatch = str.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    const g = parseFloat(numMatch[1]);
    return isFinite(g) && g > 0 ? g : 100;
  }
  return 100;
}

/**
 * Single source of truth for parsing a raw Open Food Facts product object.
 *
 * Handles:
 *   - Missing or null nutriment fields → 0 (required) or null (optional)
 *   - kJ-only energy → converted via kJ / 4.184
 *   - Negative values → clamped to 0
 *   - Unparseable serving size → defaults to 100g
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeOFFProduct(raw: any): SanitizedOFFProduct {
  const n = raw?.nutriments ?? {};

  // Energy — prefer kcal, fall back to kJ conversion
  let calories: number;
  if (raw?.nutriments?.['energy-kcal_100g'] != null) {
    calories = clampNutrient(n['energy-kcal_100g']);
  } else if (raw?.nutriments?.['energy-kj_100g'] != null) {
    calories = clampNutrient(n['energy-kj_100g'] / 4.184);
  } else if (raw?.nutriments?.['energy_100g'] != null) {
    // Some products use 'energy_100g' — assume kJ if > 900 (kcal max realistic ~900/100g)
    const e = clampNutrient(n['energy_100g']);
    calories = e > 900 ? clampNutrient(e / 4.184) : e;
  } else {
    calories = 0;
  }

  return {
    name: String(raw?.product_name_en ?? raw?.product_name ?? '').trim() || 'Unknown Food',
    brand: String(raw?.brands ?? '').split(',')[0].trim(),
    barcode: String(raw?.code ?? raw?._id ?? ''),
    servingSizeG: parseServingSizeG(raw?.serving_size),
    per100g: {
      calories: Math.round(calories),
      protein: Math.round(clampNutrient(n['proteins_100g'] ?? n['protein_100g']) * 10) / 10,
      carbs: Math.round(clampNutrient(n['carbohydrates_100g'] ?? n['carbs_100g']) * 10) / 10,
      fat: Math.round(clampNutrient(n['fat_100g']) * 10) / 10,
      fiber: clampOptional(n['fiber_100g'] ?? n['fibers_100g']),
      sugar: clampOptional(n['sugars_100g'] ?? n['sugar_100g']),
      sodium: clampOptional(n['sodium_100g']),
    },
  };
}

// ─── Micronutrient utilities ──────────────────────────────────────────────────

/**
 * Proportionally scale micronutrients when serving size changes.
 * Preserves null for nutrients that were not reported.
 */
export function recalculateMicronutrients(
  base: Micronutrients,
  baseG: number,
  targetG: number,
): Micronutrients {
  if (baseG <= 0 || targetG < 0) {
    return Object.fromEntries(
      Object.keys(base).map((k) => [k, null]),
    ) as Micronutrients;
  }
  const ratio = targetG / baseG;
  return Object.fromEntries(
    Object.entries(base).map(([k, v]) => [
      k,
      v === null ? null : Math.round(v * ratio * 100) / 100,
    ]),
  ) as Micronutrients;
}

/**
 * Returns the percentage of RDA for the given nutrient key.
 * Returns null if the RDA is unknown for this nutrient.
 */
export function getRDAPercent(nutrientKey: string, amountPerServing: number): number | null {
  const rda = RDA_VALUES[nutrientKey];
  if (rda == null || rda <= 0) return null;
  return (amountPerServing / rda) * 100;
}

/**
 * Traffic light color tier based on % RDA.
 * >=20% → green, >=5% → yellow, <5% → dim
 */
export function getTrafficLight(rdaPercent: number): 'green' | 'yellow' | 'dim' {
  if (rdaPercent >= 20) return 'green';
  if (rdaPercent >= 5) return 'yellow';
  return 'dim';
}

// ─── Macro recalculator ───────────────────────────────────────────────────────

export type MacroSet = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

/**
 * Proportionally recalculate macros when serving size changes.
 *
 * @param base      — macros at the reference serving size (e.g. per 100g or per 1 serving)
 * @param baseG     — the reference serving size in grams
 * @param targetG   — the new serving size in grams
 *
 * All values clamped to 0. Rounded to 1 decimal place.
 */
export function recalculateMacros(base: MacroSet, baseG: number, targetG: number): MacroSet {
  if (baseG <= 0 || targetG < 0) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const ratio = targetG / baseG;
  return {
    calories: Math.round(base.calories * ratio),
    protein: Math.round(base.protein * ratio * 10) / 10,
    carbs: Math.round(base.carbs * ratio * 10) / 10,
    fat: Math.round(base.fat * ratio * 10) / 10,
  };
}
