/**
 * recoveryPaceCalc — pure functions for recovery-aware performance suggestions.
 * Zero side effects. All functions return null when score is null (RAY #6).
 */

export type EffortSuggestion = {
  label: string;
  zoneTarget: number;
  paceMultiplier: number;
};

/**
 * suggestEffort
 * Maps a recovery score (0–100) to an effort suggestion.
 * RAY #6: If score is null, returns null — never defaults to 1.0.
 * Boundaries are handled with >= (RAY #6).
 */
export function suggestEffort(score: number | null): EffortSuggestion | null {
  if (score === null) return null;

  if (score >= 80) {
    return { label: 'Push it', zoneTarget: 4, paceMultiplier: 1.0 };
  }
  if (score >= 60) {
    return { label: 'Moderate effort', zoneTarget: 3, paceMultiplier: 1.05 };
  }
  if (score >= 40) {
    return { label: 'Easy day', zoneTarget: 2, paceMultiplier: 1.15 };
  }
  return { label: 'Active recovery only', zoneTarget: 1, paceMultiplier: 1.30 };
}

export type ContextualizedPerformance = {
  adjustedPace: number;
  message: string;
};

/**
 * contextualizePerformance
 * Adjusts pace based on recovery score to give a "true effort" comparison.
 * RAY #6: If recoveryScore is null, returns null — never defaults to multiplier 1.0.
 */
export function contextualizePerformance(params: {
  pace: number;
  recoveryScore: number | null;
  recentAvgPace: number;
}): ContextualizedPerformance | null {
  const { pace, recoveryScore, recentAvgPace } = params;

  // RAY #6: do not default to 1.0 if score is null
  if (recoveryScore === null) return null;
  if (pace <= 0) return null;

  const effort = suggestEffort(recoveryScore);
  if (!effort) return null;

  // adjustedPace = what this pace would be at full recovery
  // pace was run at multiplier * 100% effort → adjusted = pace / multiplier
  const adjustedPace = pace / effort.paceMultiplier;

  let message: string;
  if (recentAvgPace > 0) {
    const pctDiff = ((recentAvgPace - adjustedPace) / recentAvgPace) * 100;
    const absPct = Math.round(Math.abs(pctDiff));
    if (adjustedPace < recentAvgPace * 0.98) {
      message = `Recovery-adjusted: ${absPct}% faster than your recent average — solid effort given ${recoveryScore} recovery score.`;
    } else if (adjustedPace > recentAvgPace * 1.02) {
      message = `Recovery-adjusted: ${absPct}% slower than your recent average. Recovery score was ${recoveryScore} — give yourself grace.`;
    } else {
      message = `Recovery-adjusted pace is on par with your recent average. Recovery score: ${recoveryScore}.`;
    }
  } else {
    message = `Recovery-adjusted pace reflects a ${recoveryScore} recovery score (${effort.label}).`;
  }

  return { adjustedPace, message };
}
