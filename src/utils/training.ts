/**
 * Training utilities — pure functions for PR calculations, formatting, and suggestions.
 */

/**
 * Convert weight to kilograms for unit-safe comparisons.
 */
export function toKg(weight: number, unit: 'lbs' | 'kg'): number {
  return unit === 'kg' ? weight : weight * 0.453592;
}

/**
 * Epley formula: estimated one-rep max.
 * Returns the weight itself if reps === 1 (actual 1RM).
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/**
 * Format volume with commas and unit: "12,450 lbs"
 */
export function formatVolume(volume: number, unit: 'lbs' | 'kg' = 'lbs'): string {
  return `${Math.round(volume).toLocaleString()} ${unit}`;
}

/**
 * Format workout duration from seconds: "45m" or "1h 12m"
 */
export function formatWorkoutDuration(seconds: number): string {
  if (seconds < 60) return '<1m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Relative time label: "2h ago", "Yesterday", "3 days ago"
 */
export function getRelativeTimeLabel(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Suggest the next workout template based on recent session history.
 *
 * Heuristic: find the most-used template that was NOT the last workout's template.
 * If the user follows a rotation (A, B, C, A, B, C), this suggests the next in line.
 */
export function suggestNextTemplate(
  sessions: { templateId: string | null; templateName: string }[],
): { templateId: string; templateName: string } | null {
  // Only consider sessions that used a template
  const templated = sessions.filter(
    (s): s is { templateId: string; templateName: string } => s.templateId != null,
  );
  if (templated.length === 0) return null;

  const lastTemplateId = templated[0].templateId;

  // Count usage per template
  const counts = new Map<string, { count: number; name: string }>();
  for (const s of templated) {
    const existing = counts.get(s.templateId);
    if (existing) {
      existing.count++;
    } else {
      counts.set(s.templateId, { count: 1, name: s.templateName });
    }
  }

  // Find distinct templates used in order (for rotation detection)
  const uniqueOrder: string[] = [];
  for (const s of templated) {
    if (!uniqueOrder.includes(s.templateId)) {
      uniqueOrder.push(s.templateId);
    }
  }

  // If rotation pattern detected (>= 2 unique templates), suggest the next in rotation
  if (uniqueOrder.length >= 2) {
    const lastIdx = uniqueOrder.indexOf(lastTemplateId);
    const nextIdx = (lastIdx + 1) % uniqueOrder.length;
    const nextId = uniqueOrder[nextIdx];
    return { templateId: nextId, templateName: counts.get(nextId)!.name };
  }

  // Fallback: only 1 template used, suggest it
  return { templateId: lastTemplateId, templateName: counts.get(lastTemplateId)!.name };
}
