/**
 * Recovery utilities — presentation helpers for recovery multiplier display.
 */

/**
 * Returns a color hex string for a given recovery multiplier (0.5–1.5).
 * Green ≥1.2, Yellow ≥0.8, Red <0.8.
 */
export function multiplierColor(m: number): string {
  if (m >= 1.2) return '#4CAF50';
  if (m >= 0.8) return '#FF9800';
  return '#F44336';
}

/**
 * Returns a human-readable label for a given recovery multiplier.
 */
export function multiplierLabel(m: number): string {
  if (m >= 1.4) return 'High';
  if (m >= 1.1) return 'Good';
  if (m >= 0.8) return 'Moderate';
  return 'Low';
}
