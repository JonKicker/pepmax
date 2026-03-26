import type { LevelInfo } from '../types/gamification';

// ─── Level bracket config ──────────────────────────────────────────────────
// Each entry: [maxLevel (inclusive), XP per level in this bracket]

const LEVEL_BRACKETS: Array<[number, number]> = [
  [5,  100],   // Levels 1–5:   100 XP each
  [10, 250],   // Levels 6–10:  250 XP each
  [20, 500],   // Levels 11–20: 500 XP each
  [30, 750],   // Levels 21–30: 750 XP each
  [50, 1000],  // Levels 31–50: 1000 XP each
  // Levels 51+: 1500 XP each (handled in getXPPerLevel)
];

export const DAILY_XP_CAP = 200;

// Returns how many XP a single level costs (i.e., cost to go from level→level+1)
export function getXPPerLevel(level: number): number {
  for (const [maxLevel, xpPerLevel] of LEVEL_BRACKETS) {
    if (level <= maxLevel) return xpPerLevel;
  }
  return 1500; // Level 51+
}

// Returns the CUMULATIVE XP required to reach `level` from 0
// (i.e., total XP a user must have to be exactly at the start of `level`)
export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += getXPPerLevel(l);
  }
  return total;
}

// Given a total XP value, returns level + progress info
export function getLevelForXP(totalXP: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, totalXP);

  while (true) {
    const xpThisLevel = getXPPerLevel(level);
    if (remaining < xpThisLevel) {
      return {
        level,
        currentLevelXP: remaining,
        xpToNextLevel: xpThisLevel,
        progress: remaining / xpThisLevel,
      };
    }
    remaining -= xpThisLevel;
    level++;
  }
}

// Returns how many non-exempt XP the user can still earn today
export function computeRemainingDailyCap(todayXP: number): number {
  return Math.max(0, DAILY_XP_CAP - todayXP);
}
