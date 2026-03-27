/**
 * useGlp1Nutrition — orchestrates GLP-1 cycle detection and nutrition guardrails.
 *
 * Fetches active cycles + their compound metadata, runs the detection logic,
 * computes adjusted targets, and returns a stable state object the UI can
 * consume directly. Fire-and-forget for non-critical reads; errors are logged
 * but do not surface to the user (the feature degrades gracefully to "inactive").
 */
import { useState, useEffect } from 'react';
import { getActiveCycles } from '../services/cycleService';
import { COMPOUND_DATABASE } from '../data/compoundDatabase';
import {
  isGlp1CycleActive,
  calculateProteinFloorG,
  applyGlp1Adjustments,
  getDailyGlp1Tip,
  shouldSendProteinReminder,
  GLP1_CALORIE_FLOOR_MALE,
  GLP1_CALORIE_FLOOR_FEMALE,
} from '../utils/glp1Nutrition';
import type { UserProfile } from '../types/profile';
import type { Glp1NutritionState } from '../types/glp1Nutrition';

// ─── Return shape ─────────────────────────────────────────────────────────────

export type UseGlp1NutritionResult = {
  /** Whether GLP-1 detection has completed (initial load) */
  loaded: boolean;

  /** Current GLP-1 nutrition state — inactive defaults when no active cycle */
  state: Glp1NutritionState;
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

// Separate type for the base state stored in React state (without live-derived values)
type Glp1BaseState = Omit<Glp1NutritionState, 'shouldSendProteinReminder'>;

const DEFAULT_BASE_STATE: Glp1BaseState = {
  isActive: false,
  proteinFloorG: 0,
  calorieFloorKcal: 0,
  tipOfDay: '',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param userProfile  The authenticated user's profile (from AuthContext)
 * @param currentProteinG  Protein logged today in grams (for reminder logic)
 * @param currentHour  Current hour 0–23 in local time (for reminder window)
 */
export function useGlp1Nutrition(
  userProfile: UserProfile | null | undefined,
  currentProteinG: number,
  currentHour: number = new Date().getHours(),
): UseGlp1NutritionResult {
  const [loaded, setLoaded] = useState(false);
  const [baseState, setBaseState] = useState<Glp1BaseState>(DEFAULT_BASE_STATE);

  useEffect(() => {
    if (!userProfile) {
      setLoaded(true);
      setBaseState(DEFAULT_BASE_STATE);
      return;
    }

    let cancelled = false;

    (async () => {
      const cyclesResult = await getActiveCycles();

      // Errors degrade gracefully — GLP-1 feature simply stays inactive
      if (cyclesResult.error || cancelled) {
        setLoaded(true);
        return;
      }

      const activeCycles = cyclesResult.data ?? [];

      const glp1Active = isGlp1CycleActive(activeCycles, COMPOUND_DATABASE);

      if (!glp1Active) {
        if (!cancelled) {
          setBaseState(DEFAULT_BASE_STATE);
          setLoaded(true);
        }
        return;
      }

      // GLP-1 is active — compute floors and tip
      const proteinFloorG = calculateProteinFloorG(
        userProfile.weightKg,
        userProfile.activityLevel,
      );

      // Fix 3: use exported constants instead of magic numbers
      const calorieFloorKcal =
        userProfile.sex === 'male' ? GLP1_CALORIE_FLOOR_MALE : GLP1_CALORIE_FLOOR_FEMALE;

      const tip = getDailyGlp1Tip();

      if (!cancelled) {
        setBaseState({
          isActive: true,
          proteinFloorG,
          calorieFloorKcal,
          tipOfDay: tip,
        });
        setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userProfile]);

  // Fix 2: derive shouldSendProteinReminder live in render body using current
  // props — not inside a stale useEffect closure. This ensures the value
  // always reflects the latest protein logged and the current hour.
  const liveShouldSendReminder = baseState.isActive
    ? shouldSendProteinReminder(currentProteinG, baseState.proteinFloorG, currentHour)
    : false;

  const state: Glp1NutritionState = {
    ...baseState,
    shouldSendProteinReminder: liveShouldSendReminder,
  };

  return { loaded, state };
}
