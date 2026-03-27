/**
 * rankTierV2 — pure utility functions for the RP-based rank system (V2).
 *
 * NO Firestore dependency. NO hooks. All functions are pure and deterministic.
 * RP is server-authoritative — these helpers only compute display state.
 */
import type { RankTierV2, RankTierV2Info } from '../types/rankV2';
import type { RankTier } from '../types/social';

// ─── Tier definitions ────────────────────────────────────────────────────────

export const RANK_TIERS_V2: RankTierV2Info[] = [
  {
    tier: 'bronze',
    label: 'Bronze',
    minRP: 0,
    color: '#CD7F32',
    glowColor: '#CD7F3244',
    icon: 'shield-outline',
    particleCount: 8,
  },
  {
    tier: 'silver',
    label: 'Silver',
    minRP: 200,
    color: '#C0C0C0',
    glowColor: '#C0C0C044',
    icon: 'shield-half-outline',
    particleCount: 12,
  },
  {
    tier: 'gold',
    label: 'Gold',
    minRP: 500,
    color: '#FFD700',
    glowColor: '#FFD70044',
    icon: 'shield',
    particleCount: 16,
  },
  {
    tier: 'platinum',
    label: 'Platinum',
    minRP: 1000,
    color: '#E5E4E2',
    glowColor: '#E5E4E244',
    icon: 'diamond-outline',
    particleCount: 24,
  },
  {
    tier: 'diamond',
    label: 'Diamond',
    minRP: 2000,
    color: '#B9F2FF',
    glowColor: '#B9F2FF44',
    icon: 'diamond',
    particleCount: 32,
  },
  {
    tier: 'legendary',
    label: 'Legendary',
    minRP: 5000,
    color: '#FF6B6B',
    glowColor: '#FF6B6B44',
    icon: 'flame',
    particleCount: 40,
  },
];

// ─── Pure utilities ──────────────────────────────────────────────────────────

/**
 * Returns the highest tier whose minRP <= rp.
 * Negative RP clamps to bronze (the default).
 */
export function getTierForRP(rp: number): RankTierV2Info {
  const clampedRP = Math.max(0, rp);
  for (let i = RANK_TIERS_V2.length - 1; i >= 0; i--) {
    if (clampedRP >= RANK_TIERS_V2[i].minRP) {
      return RANK_TIERS_V2[i];
    }
  }
  // Fallback — never reached since bronze has minRP 0
  return RANK_TIERS_V2[0];
}

/**
 * Returns progress within the current tier toward the next tier (0–1).
 * At legendary (max tier): progress is 1 and next is null.
 */
export function getRPProgress(rp: number): {
  current: number;
  next: number | null;
  progress: number;
} {
  const clampedRP = Math.max(0, rp);
  const currentTier = getTierForRP(clampedRP);
  const currentIndex = RANK_TIERS_V2.findIndex((t) => t.tier === currentTier.tier);
  const nextTier = RANK_TIERS_V2[currentIndex + 1];

  if (!nextTier) {
    return { current: clampedRP, next: null, progress: 1 };
  }

  const rangeStart = currentTier.minRP;
  const rangeEnd = nextTier.minRP;
  const progress = (clampedRP - rangeStart) / (rangeEnd - rangeStart);

  return {
    current: clampedRP,
    next: nextTier.minRP,
    progress: Math.min(1, Math.max(0, progress)),
  };
}

/**
 * Returns the RP needed to reach the next tier.
 * Returns null if already at legendary (max tier).
 */
export function getRPToNextTier(rp: number): number | null {
  const clampedRP = Math.max(0, rp);
  const currentTier = getTierForRP(clampedRP);
  const currentIndex = RANK_TIERS_V2.findIndex((t) => t.tier === currentTier.tier);
  const nextTier = RANK_TIERS_V2[currentIndex + 1];
  if (!nextTier) return null;
  return Math.max(0, nextTier.minRP - clampedRP);
}

/**
 * Compares old vs new RP to detect tier changes.
 * Returns direction: 'up' | 'down' | null (null when tier unchanged).
 */
export function didTierChange(
  oldRP: number,
  newRP: number,
): {
  changed: boolean;
  direction: 'up' | 'down' | null;
  oldTier: RankTierV2Info;
  newTier: RankTierV2Info;
} {
  const oldTier = getTierForRP(oldRP);
  const newTier = getTierForRP(newRP);

  if (oldTier.tier === newTier.tier) {
    return { changed: false, direction: null, oldTier, newTier };
  }

  const oldIndex = RANK_TIERS_V2.findIndex((t) => t.tier === oldTier.tier);
  const newIndex = RANK_TIERS_V2.findIndex((t) => t.tier === newTier.tier);
  const direction = newIndex > oldIndex ? 'up' : 'down';

  return { changed: true, direction, oldTier, newTier };
}

/**
 * Maps a V2 tier to the closest legacy RankTier.
 * diamond/legendary → 'elite'
 * platinum → 'platinum'
 * gold → 'gold'
 * silver → 'silver'
 * bronze → 'bronze'
 */
export function mapV2ToLegacy(tier: RankTierV2): RankTier {
  switch (tier) {
    case 'legendary':
    case 'diamond':
      return 'elite';
    case 'platinum':
      return 'platinum';
    case 'gold':
      return 'gold';
    case 'silver':
      return 'silver';
    case 'bronze':
    default:
      return 'bronze';
  }
}

/**
 * Maps a legacy RankTier to the closest V2 tier.
 * Used for display fallback when rankTierV2 is not yet set.
 * elite → 'diamond' (not legendary — legendary requires explicit RP)
 * platinum → 'platinum'
 * gold → 'gold'
 * silver → 'silver'
 * bronze → 'bronze'
 */
export function mapLegacyToV2(tier: RankTier): RankTierV2 {
  switch (tier) {
    case 'elite':
      return 'diamond';
    case 'platinum':
      return 'platinum';
    case 'gold':
      return 'gold';
    case 'silver':
      return 'silver';
    case 'bronze':
    default:
      return 'bronze';
  }
}

/**
 * Fallback chain for display tier resolution:
 * rankTierV2 → mapLegacyToV2(legacyTier) → bronze
 */
export function getDisplayTier(
  rankTierV2: RankTierV2 | undefined,
  legacyTier: RankTier | undefined,
): RankTierV2Info {
  if (rankTierV2 !== undefined) {
    const found = RANK_TIERS_V2.find((t) => t.tier === rankTierV2);
    if (found) return found;
  }
  if (legacyTier !== undefined) {
    const mapped = mapLegacyToV2(legacyTier);
    const found = RANK_TIERS_V2.find((t) => t.tier === mapped);
    if (found) return found;
  }
  // Final fallback: bronze
  return RANK_TIERS_V2[0];
}
