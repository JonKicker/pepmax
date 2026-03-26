// Warm-up calculator types

import type { Equipment } from './exercise';

export type WeightUnit = 'lbs' | 'kg';

export interface WarmUpSet {
  setNumber: number;
  percent: number;       // e.g. 50 means 50% of working weight
  weight: number;        // rounded weight for this set
  reps: number;
}

export interface WarmUpResult {
  sets: WarmUpSet[];
  workingWeight: number;
  unit: WeightUnit;
}

export interface PlateSet {
  weight: number;   // plate weight value
  count: number;    // plates per side (pair count)
}

export interface PlateResult {
  platesPerSide: PlateSet[];
  barWeight: number;
  totalAchievable: number;   // bar + all plates
  requested: number;         // original requested weight
  unit: WeightUnit;
  isExact: boolean;          // true when totalAchievable === requested
}

export type BarType = Extract<Equipment, 'Barbell' | 'EZ Bar' | 'Smith Machine'>;

export interface GymSettings {
  showWarmUp: boolean;
  showPlateCalc: boolean;
}
