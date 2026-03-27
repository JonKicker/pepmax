/**
 * Rank tier utilities — pure functions, no Firestore dependency.
 *
 * Tier thresholds are based on totalXP. Thresholds are designed so that:
 * - Bronze   is immediately accessible (0+ XP)
 * - Silver   requires consistent engagement (~1 week of daily cap)
 * - Gold     requires dedicated long-term use (~1 month)
 * - Platinum requires sustained elite usage (~3 months)
 * - Elite    top 1% — requires exceptional dedication
 */
import type { RankTier, RankTierInfo } from '../types/social';

// ─── Tier definitions ────────────────────────────────────────────────────────

export const RANK_TIERS: RankTierInfo[] = [
  {
    tier: 'bronze',
    label: 'Bronze',
    minXP: 0,
    color: '#CD7F32',
    icon: 'shield-outline',
  },
  {
    tier: 'silver',
    label: 'Silver',
    minXP: 1_000,
    color: '#C0C0C0',
    icon: 'shield-half-outline',
  },
  {
    tier: 'gold',
    label: 'Gold',
    minXP: 5_000,
    color: '#FFD700',
    icon: 'shield',
  },
  {
    tier: 'platinum',
    label: 'Platinum',
    minXP: 15_000,
    color: '#A8D8EA',
    icon: 'star-half-outline',
  },
  {
    tier: 'elite',
    label: 'Elite',
    minXP: 40_000,
    color: '#FF6B35',
    icon: 'star',
  },
];

// ─── Pure utilities ──────────────────────────────────────────────────────────

/**
 * Returns the RankTierInfo for a given totalXP value.
 * Always returns at least Bronze (minXP: 0).
 */
export function getTierForXP(totalXP: number): RankTierInfo {
  // Walk in reverse to find the highest qualifying tier
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (totalXP >= RANK_TIERS[i].minXP) {
      return RANK_TIERS[i];
    }
  }
  // Fallback — should never reach here since bronze has minXP 0
  return RANK_TIERS[0];
}

/**
 * Returns the RankTierInfo for a given tier name.
 * Returns bronze as the safe fallback if the tier is not found.
 */
export function getTierInfo(tier: RankTier): RankTierInfo {
  return RANK_TIERS.find((t) => t.tier === tier) ?? RANK_TIERS[0];
}

/**
 * Returns the XP required to advance to the next tier,
 * or null if already at the max tier.
 */
export function getXPToNextTier(totalXP: number): number | null {
  const current = getTierForXP(totalXP);
  const currentIndex = RANK_TIERS.findIndex((t) => t.tier === current.tier);
  const next = RANK_TIERS[currentIndex + 1];
  if (!next) return null;
  return next.minXP - totalXP;
}

/**
 * Returns progress (0–1) through the current tier toward the next tier.
 * Returns 1 at the max tier.
 */
export function getTierProgress(totalXP: number): number {
  const current = getTierForXP(totalXP);
  const currentIndex = RANK_TIERS.findIndex((t) => t.tier === current.tier);
  const next = RANK_TIERS[currentIndex + 1];
  if (!next) return 1;

  const rangeStart = current.minXP;
  const rangeEnd = next.minXP;
  const progress = (totalXP - rangeStart) / (rangeEnd - rangeStart);
  return Math.min(1, Math.max(0, progress));
}

// ─── V2 rank system adapters ──────────────────────────────────────────────────

/**
 * Re-exports of the V2 rank system mapping helpers.
 * Imported here for convenience — callers can import from a single location.
 */
import type { RankTierV2 } from '../types/rankV2';
import { mapV2ToLegacy, mapLegacyToV2 } from './rankTierV2';
export { mapV2ToLegacy, mapLegacyToV2 };
export type { RankTierV2 };
