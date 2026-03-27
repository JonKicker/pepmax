/**
 * shareCardUtils — pure helper functions for PVP share card generation.
 *
 * NO Firestore, NO hooks. All functions are pure and deterministic.
 */
import type { RankTierV2 } from '../types/rankV2';

// ─── Share Card Types ─────────────────────────────────────────────────────────

export type ShareCardType = 'rank_up' | 'duel_victory' | 'season_summary' | 'league_standing';

export type ShareCardData = {
  username: string;
  tier: RankTierV2;
  // rank_up specific
  oldTier?: RankTierV2;
  newTier?: RankTierV2;
  // duel_victory specific
  opponentName?: string;
  metric?: string;
  myValue?: number;
  theirValue?: number;
  winStreak?: number;
  // season_summary specific
  seasonName?: string;
  totalRP?: number;
  peakTier?: RankTierV2;
  rewardTier?: string;
  // league_standing specific
  leagueRank?: number;
  leagueSize?: number;
  weeklyDelta?: number;
};

// ─── Titles ───────────────────────────────────────────────────────────────────

/**
 * Returns the headline title for a share card type.
 */
export function getShareCardTitle(type: ShareCardType): string {
  switch (type) {
    case 'rank_up':
      return 'Rank Up!';
    case 'duel_victory':
      return 'Victory!';
    case 'season_summary':
      return 'Season Complete';
    case 'league_standing':
      return 'League Standing';
  }
}

// ─── Subtitles ────────────────────────────────────────────────────────────────

/**
 * Returns a contextual subtitle based on the share card type and data.
 * Gracefully handles missing optional data with sensible fallbacks.
 */
export function getShareCardSubtitle(type: ShareCardType, data: ShareCardData): string {
  switch (type) {
    case 'rank_up': {
      const from = data.oldTier ?? 'previous tier';
      const to = data.newTier ?? data.tier;
      return `Promoted from ${capitalise(from)} to ${capitalise(to)}`;
    }
    case 'duel_victory': {
      if (data.opponentName && data.metric) {
        return `Beat ${data.opponentName} in ${data.metric}`;
      }
      if (data.opponentName) {
        return `Defeated ${data.opponentName}`;
      }
      return 'Won a duel';
    }
    case 'season_summary': {
      const name = data.seasonName ?? 'this season';
      const rp = data.totalRP !== undefined ? ` · ${data.totalRP} RP earned` : '';
      return `Finished ${name}${rp}`;
    }
    case 'league_standing': {
      if (data.leagueRank !== undefined && data.leagueSize !== undefined) {
        return `Ranked #${data.leagueRank} of ${data.leagueSize}`;
      }
      if (data.leagueRank !== undefined) {
        return `Ranked #${data.leagueRank}`;
      }
      return 'Check my league rank';
    }
  }
}

// ─── Format Values ────────────────────────────────────────────────────────────

/**
 * Formats a numeric value with unit for display on a share card.
 *
 * Examples:
 *   formatShareValue(1234, 'lbs') → '1,234 lbs'
 *   formatShareValue(5.25, 'mi')  → '5.25 mi'
 *   formatShareValue(0, 'km')     → '0 km'
 */
export function formatShareValue(value: number, unit: string): string {
  const isInteger = Number.isInteger(value);
  const formatted = isInteger
    ? value.toLocaleString('en-US')
    : value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  return `${formatted} ${unit}`;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function capitalise(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
