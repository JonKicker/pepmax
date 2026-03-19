/**
 * Recovery utilities — presentation helpers for effort score display.
 */

/**
 * Returns a color hex string for a given effort score.
 * Green ≥70, Yellow 50–69, Red <50.
 */
export function effortColor(score: number): string {
  if (score >= 70) return '#4CAF50';
  if (score >= 50) return '#FF9800';
  return '#F44336';
}
