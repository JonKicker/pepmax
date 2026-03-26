/**
 * Body Hub Score Mapping — pure utility for mapping SVG region IDs to Body Model zone scores.
 *
 * Design decisions:
 * - REGION_TO_ZONES maps SVG region IDs directly to MusculoskeletalZone names, bypassing the
 *   lossy MuscleGroup intermediate where possible (Ray's note #1).
 * - Regions that span multiple zones (e.g. upperBack covers latsUpperBack + rearDeltsTraps)
 *   use MuscleGroup averaging via MUSCLE_GROUP_TO_ZONES as a fallback.
 * - scoreToRegionColor: green=80–100 (recovered), amber=50–79 (recovering), red/orange=0–49 (fatigued).
 *   Color semantics have CHANGED from recency mode — labels must make this explicit.
 * - buildScoreBasedRegionColors: replaces recency-based colors when a BodyModelSnapshot is available.
 */

import { FRONT_MUSCLE_PATHS, BACK_MUSCLE_PATHS } from '../constants/bodyHubPaths';
import { MUSCLE_GROUP_TO_ZONES } from '../constants/bodyModel';
import { getMuscleForRegion } from './muscleMapping';
import type { MusculoskeletalZone, MuscleZoneScores } from '../types/bodyModel';
import type { MuscleColorResult, BodyView } from '../types/bodyHub';

// ─── Direct region → zone mapping ────────────────────────────────────────────

/**
 * Maps SVG region IDs to one or more MusculoskeletalZone names.
 * Direct mapping bypasses the MuscleGroup intermediate for precision (Ray note #1).
 * Where a region clearly represents a single zone, map it directly.
 * Where ambiguous or multi-zone (e.g. lowerBack = lats + erectors), use the
 * MUSCLE_GROUP_TO_ZONES fallback via getZoneScoreForRegion.
 */
export const REGION_TO_ZONES: Partial<Record<string, MusculoskeletalZone[]>> = {
  // Front
  chest: ['chest'],
  leftShoulder: ['frontDelts'],
  rightShoulder: ['frontDelts'],
  leftBicep: ['biceps'],
  rightBicep: ['biceps'],
  core: ['coreAbs'],
  leftQuad: ['quads'],
  rightQuad: ['quads'],
  leftCalfFront: ['calves'],
  rightCalfFront: ['calves'],
  // Back
  upperBack: ['latsUpperBack'],
  lowerBack: ['lowerBackErectors'],
  leftRearDelt: ['rearDeltsTraps'],
  rightRearDelt: ['rearDeltsTraps'],
  leftTricep: ['triceps'],
  rightTricep: ['triceps'],
  leftGlute: ['glutes'],
  rightGlute: ['glutes'],
  leftHamstring: ['hamstrings'],
  rightHamstring: ['hamstrings'],
  leftCalfBack: ['calves'],
  rightCalfBack: ['calves'],
};

// ─── Zone name labels (for detail sheet display) ─────────────────────────────

const ZONE_DISPLAY_LABELS: Record<MusculoskeletalZone, string> = {
  chest: 'Chest',
  frontDelts: 'Front Delts',
  rearDeltsTraps: 'Rear Delts & Traps',
  latsUpperBack: 'Lats & Upper Back',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  coreAbs: 'Core & Abs',
  lowerBackErectors: 'Lower Back',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
};

// ─── Score → color ────────────────────────────────────────────────────────────

/** Score-based fill color. Green = recovered, amber = recovering, red/orange = fatigued. */
export function scoreToRegionColor(score: number): MuscleColorResult {
  if (score >= 80) {
    // Recovered — opacity scales with score (0.35 at 80, 0.65 at 100)
    const normalized = (score - 80) / 20;
    const opacity = 0.35 + normalized * 0.3;
    return { fill: '#22C55E', fillOpacity: opacity };
  }
  if (score >= 50) {
    // Recovering — flat amber
    return { fill: '#F59E0B', fillOpacity: 0.45 };
  }
  // Fatigued — red/orange, opacity scales with fatigue depth
  const normalized = score / 50;
  const opacity = 0.55 - normalized * 0.2; // more fatigued = more vivid
  return { fill: '#EF4444', fillOpacity: opacity };
}

// ─── Zone score lookup ────────────────────────────────────────────────────────

/**
 * Return the zone names for a region — for detail sheet sub-score bars.
 * Uses REGION_TO_ZONES direct mapping first, falls back to MUSCLE_GROUP_TO_ZONES weights.
 */
export function getZoneNamesForRegion(
  regionId: string,
): { zone: MusculoskeletalZone; label: string }[] {
  const direct = REGION_TO_ZONES[regionId];
  if (direct && direct.length > 0) {
    return direct.map((z) => ({ zone: z, label: ZONE_DISPLAY_LABELS[z] }));
  }

  // Fallback: derive from MuscleGroup
  const muscle = getMuscleForRegion(regionId);
  if (!muscle) return [];
  const contributions = MUSCLE_GROUP_TO_ZONES[muscle];
  if (!contributions) return [];
  return contributions.map((c) => ({ zone: c.zone, label: ZONE_DISPLAY_LABELS[c.zone] }));
}

/**
 * Compute the averaged score for a region from zone scores.
 * Direct-mapped regions average their zone(s) equally.
 * Fallback (MuscleGroup) uses the contribution weights from MUSCLE_GROUP_TO_ZONES.
 */
export function getZoneScoreForRegion(
  regionId: string,
  zoneScores: MuscleZoneScores,
): number | null {
  const direct = REGION_TO_ZONES[regionId];
  if (direct && direct.length > 0) {
    const sum = direct.reduce((acc, z) => acc + zoneScores[z], 0);
    return sum / direct.length;
  }

  // Fallback: weighted average via MuscleGroup contributions
  const muscle = getMuscleForRegion(regionId);
  if (!muscle) return null;
  const contributions = MUSCLE_GROUP_TO_ZONES[muscle];
  if (!contributions || contributions.length === 0) return null;

  let totalWeight = 0;
  let weightedSum = 0;
  for (const { zone, weight } of contributions) {
    weightedSum += zoneScores[zone] * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

// ─── Region color map builder ─────────────────────────────────────────────────

/**
 * Build a full region color map using score-based colors.
 * Called when a BodyModelSnapshot is available (score mode).
 */
export function buildScoreBasedRegionColors(
  view: BodyView,
  zoneScores: MuscleZoneScores,
): Record<string, MuscleColorResult> {
  const paths = view === 'front' ? FRONT_MUSCLE_PATHS : BACK_MUSCLE_PATHS;
  const result: Record<string, MuscleColorResult> = {};

  for (const regionId of Object.keys(paths)) {
    const score = getZoneScoreForRegion(regionId, zoneScores);
    if (score === null) {
      result[regionId] = { fill: '#9CA3AF', fillOpacity: 0.15 };
    } else {
      result[regionId] = scoreToRegionColor(score);
    }
  }

  return result;
}
