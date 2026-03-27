/**
 * PVP types — Seasons, Weekly Leagues, and Season Progress (Phase 1C).
 *
 * All writes to these collections are CF-only via Admin SDK.
 * Clients are read-only for all PVP data.
 * RP is SERVER-AUTHORITATIVE — never written by the client.
 */
import type { RankTierV2 } from './rankV2';

// ─── Seasons ──────────────────────────────────────────────────────────────────

export type SeasonStatus = 'upcoming' | 'active' | 'completed';

export type SeasonRewardTier = 'legendary' | 'epic' | 'rare' | 'participation';

export type SeasonReward = {
  tier: SeasonRewardTier;
  label: string;        // "Legendary Frame", "Epic Frame", etc.
  description: string;
  icon: string;         // Ionicons name
  bonusRP: number;      // RP bonus for claiming
};

export type SeasonDoc = {
  id: string;
  seasonNumber: number;
  name: string;              // "Season 1: Ignition"
  startDate: number;         // timestamp ms
  endDate: number;           // timestamp ms
  status: SeasonStatus;
  rewards: SeasonReward[];   // ordered by tier (legendary first)
};

// ─── User Season Progress ─────────────────────────────────────────────────────

export type UserSeasonProgress = {
  seasonId: string;
  totalRP: number;             // RP earned this season
  peakRP: number;              // highest RP reached
  peakTier: RankTierV2;        // highest tier reached
  matchHistory: SeasonMatchEntry[]; // last 20
  claimedAt?: number;          // timestamp if reward claimed
  rewardTier?: SeasonRewardTier;
};

export type SeasonMatchEntry = {
  type: 'workout' | 'duel_won' | 'duel_lost' | 'challenge_complete';
  rpDelta: number;
  timestamp: number;
};

// ─── Weekly Leagues ───────────────────────────────────────────────────────────

export type LeagueBracket = 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze';

export type LeagueMember = {
  uid: string;
  username: string;
  startRP: number;       // RP at week start (for computing weekly delta)
  currentRP: number;     // latest RP (updated by CF)
  weeklyDelta: number;   // currentRP - startRP
};

export type WeeklyLeagueDoc = {
  id: string;
  seasonId: string;
  weekKey: string;           // "2026-W13"
  bracket: LeagueBracket;
  members: LeagueMember[];   // 5-20 users
  promotionSlots: number;    // top N promote
  relegationSlots: number;   // bottom N relegate
  createdAt: number;
  resolvedAt?: number;       // set when week ends
};

// ─── Client display helpers ───────────────────────────────────────────────────

export type LeagueStanding = {
  rank: number;
  member: LeagueMember;
  status: 'promote' | 'safe' | 'relegate';
};
