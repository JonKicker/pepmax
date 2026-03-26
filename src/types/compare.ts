/**
 * Compare feature types.
 *
 * ComparePrivacy — user-controlled privacy settings stored at
 *   users/{uid}/settings/comparePrivacy
 *
 * CompareScores — aggregated fitness metrics written by the
 *   computeCompareScores Cloud Function at
 *   userStats/{uid}/compareScores/current
 *
 * Client reads compareScores for the current user via getDocument().
 * Cross-user reads go through getCompareScoresForUser(targetUid) which
 * uses the raw Firestore SDK (not the user-scoped helper) to reach
 * userStats/{targetUid}/compareScores/current directly.
 */
import { Timestamp, FieldValue } from 'firebase/firestore';

// ─── Privacy settings ─────────────────────────────────────────────────────────

/**
 * Per-module visibility flags the user can toggle in the Compare Privacy screen.
 * true  = visible to friends who request a comparison
 * false = hidden (returns -1 sentinel in cross-user reads)
 */
export type ComparePrivacy = {
  /** Whether any comparison is enabled at all. Master toggle. */
  compareEnabled: boolean;

  /** Training module — estimated 1RM, weekly volume */
  showTraining: boolean;

  /** Cardio module — weekly distance, avg pace */
  showCardio: boolean;

  /** Nutrition module — avg daily calories */
  showNutrition: boolean;

  /** Recovery module — average recovery score */
  showRecovery: boolean;

  /** Body composition — body weight trend */
  showBodyComp: boolean;

  /**
   * Peptides module — active peptide/compound count.
   * Defaults to false because peptide data is sensitive health information.
   */
  showPeptides: boolean;

  /**
   * UIDs of users this user has blocked from comparing.
   * Block check is client-side only in v1 — a determined client can bypass
   * by reading Firestore directly. Acceptable for MVP since compareScores
   * contain aggregated fitness metrics, not raw sensitive data.
   */
  blockedUsers: string[];

  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
};

/**
 * Default privacy settings applied when a user first accesses Compare.
 * All modules visible, compare enabled, no blocked users.
 */
export const DEFAULT_COMPARE_PRIVACY: Omit<ComparePrivacy, 'createdAt' | 'updatedAt'> = {
  compareEnabled: true,
  showTraining: true,
  showCardio: true,
  showNutrition: true,
  showRecovery: true,
  showBodyComp: true,
  showPeptides: false,
  blockedUsers: [],
};

// ─── Aggregated scores ────────────────────────────────────────────────────────

/**
 * Aggregated compare scores written by the computeCompareScores Cloud Function.
 * Stored at userStats/{uid}/compareScores/current.
 *
 * SENTINEL: -1 means "data unavailable" (module hidden by privacy settings
 * OR no data exists for that module). UI should display "—" for -1 values.
 *
 * All numeric values use metric units:
 *   estimatedOneRepMax   — kg (Epley formula: weight × (1 + reps/30))
 *   weeklyVolume         — kg
 *   weeklyDistance       — km
 *   avgPace              — min/km (stored as decimal minutes)
 *   avgDailyCalories     — kcal
 *   avgRecoveryScore     — 0–100
 *   bodyWeightTrend      — kg (latest recorded body weight)
 *   activePeptideCount   — count of peptide entries in the user's peptides subcollection
 */
export type CompareScores = {
  // Training
  estimatedOneRepMax: number;  // kg, Epley; -1 if unavailable
  weeklyVolume: number;        // kg; -1 if unavailable

  // Cardio
  weeklyDistance: number;      // km; -1 if unavailable
  avgPace: number;             // min/km; -1 if unavailable

  // Nutrition
  avgDailyCalories: number;    // kcal; -1 if unavailable

  // Recovery
  avgRecoveryScore: number;    // 0–100; -1 if unavailable

  // Body composition
  bodyWeightTrend: number;     // kg; -1 if unavailable

  // Peptides
  activePeptideCount: number;  // count; -1 if hidden or unavailable

  // Normalized radar scores (0–100); -1 means unavailable
  strengthScore: number;         // 0–100 normalized strength index; -1 if unavailable
  cardioScore: number;           // 0–100 normalized cardio index; -1 if unavailable
  nutritionConsistency: number;  // 0–100 nutrition consistency score; -1 if unavailable
  overallConsistency: number;    // 0–100 overall consistency score; -1 if unavailable
  xpPercentile: number;          // 0–100 XP percentile among all users; -1 if unavailable

  /** UTC timestamp of the last Cloud Function run that produced this doc. */
  computedAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;

  // ─── v2 optional fields — CF may not compute these yet ────────────────────
  // All use -1 as sentinel for "unavailable". UI must display '--' for -1.
  top3Lifts?: TopLift[];
  strengthTrend30d?: number;       // % change; -1 if unavailable
  workoutConsistency?: number;     // 0-100; -1 if unavailable
  weeklyCardioSessions?: number;   // count; -1 if unavailable
  cardioTrend30d?: number;         // % change; -1 if unavailable
  avgDailyProtein?: number;        // grams; -1 if unavailable
  macroTargetHitRate?: number;     // 0-100; -1 if unavailable
  loggingConsistency?: number;     // 0-100; -1 if unavailable
  cycleAdherence?: number;         // 0-100; -1 if unavailable
  protocolConsistency?: number;    // 0-100; -1 if unavailable
  badgesEarned?: number;           // count; -1 if unavailable
};

// ─── Top lift entry for compare detail ──────────────────────────────────────

export type TopLift = {
  name: string;
  weight: number;       // kg
  reps: number;
  estimated1RM: number; // kg, Epley formula
};

// ─── Compare data envelope ──────────────────────────────────────────────────

export type CompareData = {
  myScores: CompareScores;
  opponentScores: CompareScores;
  myPrivacy: ComparePrivacy;
};

export type CompareState =
  | { status: 'loading' }
  | { status: 'ready'; data: CompareData }
  | { status: 'error'; error: string }
  | { status: 'blocked' }
  | { status: 'unavailable' }
  | { status: 'self' };
