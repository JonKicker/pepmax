import { Dose, InjectionSite, INJECTION_SITE_LABELS } from '../types/peptide';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SiteStatus = 'ready' | 'recent' | 'needsRest';

export type SiteStats = {
  site: InjectionSite;
  label: string;
  lastUsed: Date | null;
  daysSinceUse: number | null;
  useCount: number;
  status: SiteStatus;
};

export type BodyMapZone = {
  id: string;
  injectionSite: InjectionSite;
  view: 'front' | 'back';
  label: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_REST_DAYS = 7;
const NEEDS_REST_THRESHOLD = 2; // red: used 0-2 days ago
const RECENT_THRESHOLD = 6;     // yellow: used 3-6 days ago

/** Status colors — kept here so both SVG and detail sheet stay in sync */
export const SITE_STATUS_COLORS: Record<SiteStatus | 'never', string> = {
  ready: '#22C55E',
  recent: '#EAB308',
  needsRest: '#EF4444',
  never: '#D1D5DB',
};

/**
 * 10 visual zones on the SVG body map.
 * Front thighs map to leftQuad/rightQuad — same as back thighs — so rotation
 * stats are shared between the two views for the same site.
 */
export const BODY_MAP_ZONES: BodyMapZone[] = [
  // Front view
  { id: 'frontLeftDelt',    injectionSite: 'leftDelt',     view: 'front', label: 'Left Delt' },
  { id: 'frontRightDelt',   injectionSite: 'rightDelt',    view: 'front', label: 'Right Delt' },
  { id: 'frontLeftAbs',     injectionSite: 'abdomenLeft',  view: 'front', label: 'Left Abdomen' },
  { id: 'frontRightAbs',    injectionSite: 'abdomenRight', view: 'front', label: 'Right Abdomen' },
  { id: 'frontLeftThigh',   injectionSite: 'leftQuad',     view: 'front', label: 'Left Quad' },
  { id: 'frontRightThigh',  injectionSite: 'rightQuad',    view: 'front', label: 'Right Quad' },
  // Back view
  { id: 'backLeftGlute',    injectionSite: 'leftGlute',    view: 'back',  label: 'Left Glute' },
  { id: 'backRightGlute',   injectionSite: 'rightGlute',   view: 'back',  label: 'Right Glute' },
  { id: 'backLeftThigh',    injectionSite: 'leftQuad',     view: 'back',  label: 'Left Hamstring' },
  { id: 'backRightThigh',   injectionSite: 'rightQuad',    view: 'back',  label: 'Right Hamstring' },
];

// Sites shown on the body map (excludes 'other')
const MAPPED_SITES: InjectionSite[] = [
  'leftDelt', 'rightDelt',
  'abdomenLeft', 'abdomenRight',
  'leftQuad', 'rightQuad',
  'leftGlute', 'rightGlute',
];

// ─── Pure functions ───────────────────────────────────────────────────────────

/**
 * Returns the number of whole days between `date` and now.
 * Returns null if date is null (never used).
 */
export function daysSince(date: Date | null): number | null {
  if (!date) return null;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Categorizes a site based on how many days ago it was last used.
 */
export function getSiteStatus(lastUsed: Date | null, restDays = DEFAULT_REST_DAYS): SiteStatus {
  if (!lastUsed) return 'ready'; // never used — treat as ready
  const days = daysSince(lastUsed) ?? 0;
  if (days <= NEEDS_REST_THRESHOLD) return 'needsRest';
  if (days <= RECENT_THRESHOLD) return 'recent';
  return 'ready';
}

/**
 * Returns the correct status color for a site, including the 'never' case.
 */
export function getSiteColor(lastUsed: Date | null, status: SiteStatus): string {
  if (!lastUsed) return SITE_STATUS_COLORS.never;
  return SITE_STATUS_COLORS[status];
}

/**
 * Builds SiteStats for all 8 mapped injection sites from a flat list of doses.
 * Groups by site field, finds most recent timestamp, counts total uses.
 */
export function computeSiteStats(doses: Dose[], restDays = DEFAULT_REST_DAYS): SiteStats[] {
  const lastUsedMap = new Map<InjectionSite, Date>();
  const countMap = new Map<InjectionSite, number>();

  for (const dose of doses) {
    if (dose.site === 'other') continue;
    const existing = lastUsedMap.get(dose.site);
    const doseDate = dose.timestamp.toDate();
    if (!existing || doseDate > existing) {
      lastUsedMap.set(dose.site, doseDate);
    }
    countMap.set(dose.site, (countMap.get(dose.site) ?? 0) + 1);
  }

  return MAPPED_SITES.map((site) => {
    const lastUsed = lastUsedMap.get(site) ?? null;
    const useCount = countMap.get(site) ?? 0;
    const status = getSiteStatus(lastUsed, restDays);
    return {
      site,
      label: INJECTION_SITE_LABELS[site],
      lastUsed,
      daysSinceUse: daysSince(lastUsed),
      useCount,
      status,
    };
  });
}

/**
 * Returns the best next injection site:
 * 1. Never-used sites get top priority (sorted by label alphabetically)
 * 2. Then longest rested (highest daysSinceUse)
 * 3. Tiebreak by lowest useCount
 */
export function suggestNextSite(stats: SiteStats[]): SiteStats {
  const sorted = [...stats].sort((a, b) => {
    // Never-used first
    const aNever = a.lastUsed === null ? 0 : 1;
    const bNever = b.lastUsed === null ? 0 : 1;
    if (aNever !== bNever) return aNever - bNever;

    // Both never-used: sort by label
    if (a.lastUsed === null && b.lastUsed === null) {
      return a.label.localeCompare(b.label);
    }

    // Both used: sort by days since use descending
    const aDays = a.daysSinceUse ?? 0;
    const bDays = b.daysSinceUse ?? 0;
    if (bDays !== aDays) return bDays - aDays;

    // Tiebreak: lower useCount wins
    return a.useCount - b.useCount;
  });

  return sorted[0];
}

/**
 * Returns stats for a specific InjectionSite from a stats array.
 */
export function getStatsForSite(
  stats: SiteStats[],
  site: InjectionSite,
): SiteStats | undefined {
  return stats.find((s) => s.site === site);
}
