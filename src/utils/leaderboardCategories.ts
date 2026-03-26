/**
 * Leaderboard category configuration.
 *
 * Defines the 6 tracked leaderboard categories with display metadata and
 * the stat key that maps to the PublicProfileStats field for each category.
 *
 * Categories:
 *   weeklyVolume    — kg lifted in the current ISO week
 *   weeklyDistance  — km covered in the current ISO week
 *   weeklyXP        — XP earned in the current ISO week
 *   monthlyVolume   — kg lifted in the current calendar month
 *   monthlyDistance — km covered in the current calendar month
 *   allTimeXP       — total XP earned since account creation
 */
import type { LeaderboardCategory, PublicProfileStats } from '../types/social';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeaderboardCategoryConfig = {
  /** Firestore category identifier — must match LeaderboardCategory */
  category: LeaderboardCategory;
  /** Full display label (used in category pills) */
  label: string;
  /** Short label (used in compact UI like leaderboard rows) */
  shortLabel: string;
  /** Ionicons icon name */
  icon: string;
  /** Unit string (appended to formatted values) */
  unit: string;
  /**
   * Formats a raw numeric value for display.
   * e.g. 1523.5 → "1,524 kg"
   */
  formatValue: (value: number) => string;
  /**
   * The PublicProfileStats field key this category reads from.
   * Used by leaderboardService to extract stat values from profiles
   * for client-side friends/crew leaderboard computation.
   */
  statKey: keyof PublicProfileStats;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKg(value: number): string {
  const rounded = Math.round(value);
  return `${rounded.toLocaleString()} kg`;
}

function formatKm(value: number): string {
  if (value < 10) {
    return `${value.toFixed(1)} km`;
  }
  return `${Math.round(value).toLocaleString()} km`;
}

function formatXP(value: number): string {
  if (value >= 1_000) {
    return `${(value / 1000).toFixed(1)}k XP`;
  }
  return `${value.toLocaleString()} XP`;
}

// ─── Category definitions ─────────────────────────────────────────────────────

export const LEADERBOARD_CATEGORIES: LeaderboardCategoryConfig[] = [
  {
    category: 'weeklyVolume',
    label: 'Weekly Volume',
    shortLabel: 'Volume',
    icon: 'barbell-outline',
    unit: 'kg',
    formatValue: formatKg,
    statKey: 'weeklyVolume',
  },
  {
    category: 'weeklyDistance',
    label: 'Weekly Distance',
    shortLabel: 'Distance',
    icon: 'walk-outline',
    unit: 'km',
    formatValue: formatKm,
    statKey: 'weeklyDistance',
  },
  {
    category: 'weeklyXP',
    label: 'Weekly XP',
    shortLabel: 'XP',
    icon: 'flash-outline',
    unit: 'XP',
    formatValue: formatXP,
    statKey: 'weeklyXP',
  },
  {
    category: 'monthlyVolume',
    label: 'Monthly Volume',
    shortLabel: 'Volume',
    icon: 'barbell-outline',
    unit: 'kg',
    formatValue: formatKg,
    statKey: 'monthlyVolume',
  },
  {
    category: 'monthlyDistance',
    label: 'Monthly Distance',
    shortLabel: 'Distance',
    icon: 'bicycle-outline',
    unit: 'km',
    formatValue: formatKm,
    statKey: 'monthlyDistance',
  },
  {
    category: 'allTimeXP',
    label: 'All-Time XP',
    shortLabel: 'XP',
    icon: 'trophy-outline',
    unit: 'XP',
    formatValue: formatXP,
    statKey: 'allTimeXP',
  },
];

// ─── Lookup helper ────────────────────────────────────────────────────────────

/**
 * Returns the config for a given category.
 * Throws if an unknown category is requested (programming error guard).
 */
export function getCategoryConfig(category: LeaderboardCategory): LeaderboardCategoryConfig {
  const config = LEADERBOARD_CATEGORIES.find((c) => c.category === category);
  if (!config) {
    throw new Error(`[leaderboardCategories] Unknown category: ${category}`);
  }
  return config;
}
