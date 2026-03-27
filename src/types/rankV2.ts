/**
 * Rank V2 types — RP-based rank system (Phase 1B PVP Overhaul).
 *
 * RP is SERVER-AUTHORITATIVE. The client only reads RP from Firestore.
 * No client function modifies RP — all changes go through Cloud Functions.
 */

export type RankTierV2 =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'legendary';

export type RankTierV2Info = {
  tier: RankTierV2;
  label: string;
  /** RP threshold to enter this tier */
  minRP: number;
  /** Hex color for badge/glow */
  color: string;
  /** Hex color for glow effects */
  glowColor: string;
  /** Ionicons icon name */
  icon: string;
  /** Particle count for rank-up celebration (8–40) */
  particleCount: number;
};

export type RPSource =
  | 'workout_complete'    // +10
  | 'duel_won'           // +25
  | 'duel_lost'          // -10
  | 'challenge_complete' // +50
  | 'season_decay'       // -5/day
  | 'admin_adjustment';

export type MatchResult = {
  type: RPSource;
  rpDelta: number;
  timestamp: number; // Date.now()
  metadata?: Record<string, string>;
};
