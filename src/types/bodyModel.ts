import type { Timestamp } from 'firebase/firestore';

// ─── Zone identifiers ─────────────────────────────────────────────────────────

export type MusculoskeletalZone =
  | 'chest'
  | 'frontDelts'
  | 'rearDeltsTraps'
  | 'latsUpperBack'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'coreAbs'
  | 'lowerBackErectors'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves';

export type SystemZone =
  | 'cardiovascular'
  | 'gastrointestinal'
  | 'nervousSystem'
  | 'immune'
  | 'metabolic';

export type BodyModelZone = MusculoskeletalZone | SystemZone;

// ─── Zone score maps ──────────────────────────────────────────────────────────

export type MuscleZoneScores = Record<MusculoskeletalZone, number>;
export type SystemZoneScores = Record<SystemZone, number>;

// ─── Synergy Score bonus/penalty modifiers (spec §4.4) ───────────────────────

export type BodyModelBonuses = {
  consistency: number;   // +5 if 5+ of last 7 days have logged data, else 0
  balance: number;       // +3 if no system below 30 while others above 70, else 0
  bottleneck: number;    // −5 if any system below 20, else 0
  overtraining: number;  // −3 if acute:chronic ratio > 1.5x, else 0
};

// ─── Daily body model snapshot (stored to Firestore keyed by YYYY-MM-DD) ─────

export type BodyModelSnapshot = {
  date: string;            // YYYY-MM-DD
  synergyScore: number;    // 0–100 composite
  muscles: MuscleZoneScores;
  systems: SystemZoneScores;
  bonuses: BodyModelBonuses;
  computedAt: Timestamp;
};
