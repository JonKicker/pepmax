/**
 * ShareCard types — discriminated union covering all 5 shareable card types.
 *
 * IMPORTANT: No personal health data (no calories, weight, peptide dosage info).
 * Cards only contain achievement / performance / gamification data.
 */
import type { AchievementCategory } from './gamification';
import type { CompareScores } from './compare';
import type { Units } from './profile';

// ─── Card-specific data payloads ──────────────────────────────────────────────

export type AchievementCardData = {
  type: 'achievement';
  achievementId: string;
  title: string;
  description: string;
  /** Ionicons icon name */
  icon: string;
  category: AchievementCategory;
  unlockedDate: string; // ISO string
};

export type WorkoutCardData = {
  type: 'workout';
  templateName: string;
  exerciseCount: number;
  totalVolume: number;
  volumeUnit: string;
  /** Duration in seconds */
  duration: number;
  setCount: number;
  prCount: number;
};

export type PRCardData = {
  type: 'pr';
  exerciseName: string;
  /** Human-readable e.g. "195 lbs x 5" */
  newValue: string;
  /** null when no previous record exists */
  oldValue: string | null;
  date: string; // ISO string
};

export type ChallengeCardData = {
  type: 'challenge';
  challengeTitle: string;
  challengeType: string;
  finalResult: string;
  rank: number;
  participantCount: number;
  xpEarned: number;
};

export type LevelUpCardData = {
  type: 'levelUp';
  newLevel: number;
  totalXP: number;
  rankTier: string;
  rankColor: string;
  rankIcon: string;
};

export type CompareCardData = {
  type: 'compare';
  myName: string;
  opponentName: string;
  myAvatar?: string;
  opponentAvatar?: string;
  myScores: CompareScores;
  opponentScores: CompareScores;
  /** Module keys the user has toggled ON in the preview screen */
  visibleModules: string[];
  /** Unit system for formatted values (weight, distance, pace). Defaults to 'metric'. */
  units: Units;
};

// ─── Union ────────────────────────────────────────────────────────────────────

export type ShareCardData =
  | AchievementCardData
  | WorkoutCardData
  | PRCardData
  | ChallengeCardData
  | LevelUpCardData
  | CompareCardData;
