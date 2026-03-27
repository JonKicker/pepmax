/**
 * voiceFoodParser — parses free-form voice or text input into structured food items.
 *
 * Examples:
 *   "two eggs and a large banana"    → [{name:'eggs',quantity:2,...}, {name:'banana',...}]
 *   "100g chicken, half cup of rice" → [{name:'chicken',quantity:100,...}, {name:'rice',...}]
 *   "a protein shake"                → [{name:'protein shake',quantity:1,...}]
 *
 * All functions are pure — no I/O, safe to test directly.
 */

import type { ParsedFoodItem } from '../types/voiceLog';

// ─── Word-to-number map ───────────────────────────────────────────────────────

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  half: 0.5,
  'a half': 0.5,
  quarter: 0.25,
  'a quarter': 0.25,
};

// ─── Size modifier map ────────────────────────────────────────────────────────

/** Size modifiers adjust the quantity multiplier and unit string. */
const SIZE_MODIFIERS: Record<string, { multiplier: number; unit: string }> = {
  small: { multiplier: 0.75, unit: 'serving' },
  medium: { multiplier: 1.0, unit: 'serving' },
  large: { multiplier: 1.25, unit: 'serving' },
  big: { multiplier: 1.25, unit: 'serving' },
  tiny: { multiplier: 0.5, unit: 'serving' },
};

// ─── Unit normaliser ──────────────────────────────────────────────────────────

const UNIT_ALIASES: Record<string, string> = {
  gram: 'g',
  grams: 'g',
  g: 'g',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  cup: 'cup',
  cups: 'cup',
  tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  slice: 'slice',
  slices: 'slice',
  piece: 'piece',
  pieces: 'piece',
  serving: 'serving',
  servings: 'serving',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  scoop: 'scoop',
  scoops: 'scoop',
  handful: 'handful',
  handfuls: 'handful',
  bowl: 'bowl',
  bowls: 'bowl',
  plate: 'plate',
  plates: 'plate',
};

function normaliseUnit(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return UNIT_ALIASES[lower] ?? lower;
}

// ─── Splitter ─────────────────────────────────────────────────────────────────

/**
 * Splits an input string into individual food item segments.
 * Delimiters: " and ", " with ", " plus ", ", " (comma-space), " & ".
 */
function splitInput(text: string): string[] {
  return text
    .split(/\band\b|\bwith\b|\bplus\b|,|\s*&\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─── Token parser ─────────────────────────────────────────────────────────────

/**
 * Parses a single food segment into a ParsedFoodItem.
 * Handles:
 *   - Numeric quantities: "100g chicken", "2 eggs"
 *   - Word quantities: "two eggs", "half cup of rice"
 *   - Size modifiers: "a large banana"
 *   - No quantity: "protein shake"
 */
function parseSegment(segment: string): ParsedFoodItem {
  let remaining = segment.toLowerCase().trim();
  let quantity = 1;
  let unit = 'serving';
  let confidence = 0.3; // name-only default

  // 1. Try numeric quantity with optional unit: "100g", "2 cups", "1.5 oz"
  const numericMatch = remaining.match(
    /^(\d+(?:\.\d+)?)\s*(g|ml|grams?|cups?|tbsp|tablespoons?|tsps?|teaspoons?|slices?|pieces?|servings?|oz|ounces?|scoops?|handfuls?|bowls?|plates?|)\s*(?:of\s+)?(.*)/i,
  );
  if (numericMatch) {
    quantity = parseFloat(numericMatch[1]);
    const rawUnit = numericMatch[2].trim();
    unit = rawUnit ? normaliseUnit(rawUnit) : 'serving';
    remaining = numericMatch[3].trim();
    confidence = 1.0;
  } else {
    // 2. Try word-number: "two eggs", "half cup of rice"
    // Check LONGER compound words first ("a half", "a quarter") before single words.
    const sortedWordEntries = Object.entries(WORD_NUMBERS).sort(
      (a, b) => b[0].length - a[0].length,
    );
    let matched = false;
    for (const [word, value] of sortedWordEntries) {
      if (remaining.startsWith(word + ' ') || remaining === word) {
        quantity = value;
        remaining = remaining.slice(word.length).trim();
        confidence = 0.7;
        matched = true;

        // Check if followed by a unit
        const unitMatch = remaining.match(
          /^(cups?|tbsp|tablespoons?|tsps?|teaspoons?|slices?|pieces?|servings?|oz|ounces?|scoops?|handfuls?|bowls?|plates?|g|grams?|ml)\s*(?:of\s+)?(.*)/i,
        );
        if (unitMatch) {
          unit = normaliseUnit(unitMatch[1]);
          remaining = unitMatch[2].trim();
        }
        break;
      }
    }

    if (!matched) {
      // 3. Check for size modifier: "large banana"
      for (const [modifier, { multiplier, unit: modUnit }] of Object.entries(SIZE_MODIFIERS)) {
        if (remaining.startsWith(modifier + ' ')) {
          quantity = multiplier;
          unit = modUnit;
          remaining = remaining.slice(modifier.length).trim();
          confidence = 0.5;
          break;
        }
      }
    }
  }

  // Clean up "of" prefix in remaining name
  remaining = remaining.replace(/^of\s+/i, '').trim();

  // Remove trailing filler words
  remaining = remaining.replace(/\b(the|some|a|an)\s+/gi, '').trim();

  const name = remaining || 'unknown food';

  return { name, quantity, unit, confidence };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parses a voice or text input string into an array of ParsedFoodItem objects.
 *
 * @param text - Free-form input like "two eggs and a large banana".
 * @returns Array of ParsedFoodItem. Empty array when input is blank.
 *
 * @example
 * parseVoiceInput("two eggs and 100g chicken, half cup of rice")
 * // → [
 * //   { name: 'eggs', quantity: 2, unit: 'serving', confidence: 0.7 },
 * //   { name: 'chicken', quantity: 100, unit: 'g', confidence: 1.0 },
 * //   { name: 'rice', quantity: 0.5, unit: 'cup', confidence: 0.7 },
 * // ]
 */
export function parseVoiceInput(text: string): ParsedFoodItem[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const segments = splitInput(trimmed);
  return segments.map(parseSegment).filter((item) => item.name !== 'unknown food' || segments.length === 1);
}
