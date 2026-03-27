/**
 * pvpEventUtils — pure utility functions for PVP Seasonal Events & Crew PVP.
 *
 * NO Firestore dependency. NO hooks. All functions are pure and deterministic.
 */
import type { ChallengeDifficulty, CrewChallengeEntry } from '../types/pvpEvents';

// ─── Difficulty Config ────────────────────────────────────────────────────────

type DifficultyConfig = {
  label: string;
  xpMultiplier: number;  // normal=1, hard=2, extreme=4
  rpMultiplier: number;  // normal=1, hard=2.5, extreme=5
};

/**
 * Returns display config for a given challenge difficulty.
 */
export function getDifficultyConfig(difficulty: ChallengeDifficulty): DifficultyConfig {
  switch (difficulty) {
    case 'normal':
      return { label: 'Normal', xpMultiplier: 1, rpMultiplier: 1 };
    case 'hard':
      return { label: 'Hard', xpMultiplier: 2, rpMultiplier: 2.5 };
    case 'extreme':
      return { label: 'Extreme', xpMultiplier: 4, rpMultiplier: 5 };
  }
}

// ─── Challenge Progress ───────────────────────────────────────────────────────

/**
 * Returns the challenge progress as a ratio (0–1), clamped.
 * Guard: if target is 0, returns 0 to avoid division by zero.
 */
export function getChallengeProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(1, Math.max(0, current / target));
}

// ─── Urgency ─────────────────────────────────────────────────────────────────

/**
 * Returns true if the event is within the urgency window (< 24h remaining).
 * Also returns true if the event has already ended (negative time remaining).
 */
export function isUrgent(endDate: number, now: number): boolean {
  const MS_IN_24H = 24 * 60 * 60 * 1000;
  return endDate - now < MS_IN_24H;
}

// ─── Crew Helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the per-member average progress.
 * Guard: if memberCount is 0, returns 0 to avoid division by zero.
 */
export function getPerMemberAverage(totalProgress: number, memberCount: number): number {
  if (memberCount <= 0) return 0;
  return totalProgress / memberCount;
}

/**
 * Sorts CrewChallengeEntry[] by totalProgress descending and assigns a rank.
 * Ties are broken alphabetically by crewName (stable).
 * Returns a new array — does not mutate input.
 */
export function rankCrewEntries(
  entries: CrewChallengeEntry[],
): Array<CrewChallengeEntry & { rank: number }> {
  if (entries.length === 0) return [];

  const sorted = [...entries].sort((a, b) => {
    if (b.totalProgress !== a.totalProgress) return b.totalProgress - a.totalProgress;
    return a.crewName.localeCompare(b.crewName);
  });

  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}
