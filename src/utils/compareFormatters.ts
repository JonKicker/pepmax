/**
 * compareFormatters — pure presentation-layer unit conversion utilities.
 *
 * All functions are stateless and side-effect free.
 * No Firestore, no auth, no imports from firebase.
 *
 * Sentinel: -1 means "unavailable". formatStat() handles the sentinel so
 * callers don't need to sprinkle null-checks everywhere.
 */

// ─── Unit conversion constants ────────────────────────────────────────────────

export const KG_TO_LB = 2.20462;
export const KM_TO_MI = 0.621371;

// ─── formatWeight ─────────────────────────────────────────────────────────────

/**
 * Converts a weight in kg to a localized string.
 *
 * @param kg     Weight in kilograms (metric source of truth)
 * @param units  'imperial' → pounds, 'metric' → kilograms
 * @returns e.g. "185 lb" or "84 kg"
 */
export function formatWeight(kg: number, units: 'imperial' | 'metric'): string {
  if (units === 'imperial') {
    return `${Math.round(kg * KG_TO_LB)} lb`;
  }
  return `${Math.round(kg)} kg`;
}

// ─── formatDistance ───────────────────────────────────────────────────────────

/**
 * Converts a distance in km to a localized string.
 *
 * @param km     Distance in kilometres (metric source of truth)
 * @param units  'imperial' → miles, 'metric' → kilometres
 * @returns e.g. "3.1 mi" or "5.0 km"
 */
export function formatDistance(km: number, units: 'imperial' | 'metric'): string {
  if (units === 'imperial') {
    return `${(km * KM_TO_MI).toFixed(1)} mi`;
  }
  return `${km.toFixed(1)} km`;
}

// ─── formatPace ───────────────────────────────────────────────────────────────

/**
 * Converts a pace in min/km to a localized MM:SS/unit string.
 *
 * @param minPerKm  Decimal minutes per kilometre (e.g. 5.25 = 5 min 15 sec)
 * @param units     'imperial' → min/mile, 'metric' → min/km
 * @returns e.g. "8:27/mi" or "5:15/km"
 */
export function formatPace(minPerKm: number, units: 'imperial' | 'metric'): string {
  const decimalMinutes =
    units === 'imperial' ? minPerKm / KM_TO_MI : minPerKm;

  const mins = Math.floor(decimalMinutes);
  const secs = Math.round((decimalMinutes - mins) * 60);

  // Guard against 60-second rollover (e.g. 5.9999... rounds to :60)
  const adjustedMins = secs === 60 ? mins + 1 : mins;
  const adjustedSecs = secs === 60 ? 0 : secs;

  const secsStr = String(adjustedSecs).padStart(2, '0');
  const unit = units === 'imperial' ? 'mi' : 'km';
  return `${adjustedMins}:${secsStr}/${unit}`;
}

// ─── formatTrend ──────────────────────────────────────────────────────────────

/**
 * Formats a percentage change with a sign prefix.
 *
 * @param percent  Percentage change (e.g. 5.2 → "+5.2%", -3.1 → "-3.1%")
 * @returns e.g. "+5.2%" or "-3.1%" or "+0.0%"
 */
export function formatTrend(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(1)}%`;
}

// ─── formatStat ───────────────────────────────────────────────────────────────

/**
 * Applies a formatter to a value, returning '--' for sentinel -1 or undefined.
 *
 * @param value      Numeric value or undefined
 * @param formatter  Pure function that converts the number to a display string
 * @returns Formatted string or '--' if value is -1 or undefined
 */
export function formatStat(
  value: number | undefined,
  formatter: (v: number) => string,
): string {
  if (value === undefined || value === -1) {
    return '--';
  }
  return formatter(value);
}
