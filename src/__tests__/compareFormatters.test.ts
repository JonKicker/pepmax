/**
 * Tests for compareFormatters.
 *
 * 22 tests covering all pure formatter functions:
 * - formatWeight: metric and imperial
 * - formatDistance: metric and imperial
 * - formatPace: metric and imperial, second rollover
 * - formatTrend: positive, negative, zero
 * - formatStat: -1 sentinel, undefined, normal value, zero
 * - KG_TO_LB and KM_TO_MI constant sanity checks
 */

import {
  formatWeight,
  formatDistance,
  formatPace,
  formatTrend,
  formatStat,
  KG_TO_LB,
  KM_TO_MI,
} from '../utils/compareFormatters';

// ─── formatWeight ─────────────────────────────────────────────────────────────

describe('formatWeight', () => {
  it('returns kilograms when units is metric', () => {
    expect(formatWeight(84, 'metric')).toBe('84 kg');
  });

  it('rounds kg to nearest integer for metric', () => {
    expect(formatWeight(84.6, 'metric')).toBe('85 kg');
  });

  it('converts to pounds for imperial', () => {
    // 84 kg × 2.20462 ≈ 185.19 → rounds to 185
    expect(formatWeight(84, 'imperial')).toBe('185 lb');
  });

  it('rounds lb to nearest integer for imperial', () => {
    // 100 kg × 2.20462 ≈ 220.46 → rounds to 220
    expect(formatWeight(100, 'imperial')).toBe('220 lb');
  });

  it('handles zero weight', () => {
    expect(formatWeight(0, 'metric')).toBe('0 kg');
    expect(formatWeight(0, 'imperial')).toBe('0 lb');
  });
});

// ─── formatDistance ───────────────────────────────────────────────────────────

describe('formatDistance', () => {
  it('returns km with one decimal for metric', () => {
    expect(formatDistance(5, 'metric')).toBe('5.0 km');
  });

  it('converts to miles for imperial', () => {
    // 5 km × 0.621371 ≈ 3.107 → "3.1 mi"
    expect(formatDistance(5, 'imperial')).toBe('3.1 mi');
  });

  it('formats 10km as 6.2 mi in imperial', () => {
    // 10 × 0.621371 = 6.21371 → "6.2 mi"
    expect(formatDistance(10, 'imperial')).toBe('6.2 mi');
  });

  it('preserves one decimal for metric', () => {
    expect(formatDistance(12.34, 'metric')).toBe('12.3 km');
  });
});

// ─── formatPace ───────────────────────────────────────────────────────────────

describe('formatPace', () => {
  it('formats min/km as MM:SS/km for metric', () => {
    // 5.25 min/km → 5 min 15 sec
    expect(formatPace(5.25, 'metric')).toBe('5:15/km');
  });

  it('converts min/km to min/mi for imperial', () => {
    // 5.25 min/km ÷ 0.621371 ≈ 8.449 min/mi → 8 min 27 sec
    expect(formatPace(5.25, 'imperial')).toBe('8:27/mi');
  });

  it('pads seconds with leading zero', () => {
    // 6.0 min/km → 6 min 0 sec
    expect(formatPace(6.0, 'metric')).toBe('6:00/km');
  });

  it('handles 5:15/km correctly for metric', () => {
    expect(formatPace(5.25, 'metric')).toBe('5:15/km');
  });

  it('handles rollover when seconds round to 60', () => {
    // 5.9999... min/km → would be 5:60 without guard → should be 6:00
    expect(formatPace(5.9999, 'metric')).toBe('6:00/km');
  });
});

// ─── formatTrend ─────────────────────────────────────────────────────────────

describe('formatTrend', () => {
  it('prefixes positive values with +', () => {
    expect(formatTrend(5.2)).toBe('+5.2%');
  });

  it('prefixes negative values with -', () => {
    expect(formatTrend(-3.1)).toBe('-3.1%');
  });

  it('treats zero as positive ("+0.0%")', () => {
    expect(formatTrend(0)).toBe('+0.0%');
  });

  it('formats one decimal place', () => {
    expect(formatTrend(10)).toBe('+10.0%');
    expect(formatTrend(-0.5)).toBe('-0.5%');
  });
});

// ─── formatStat ───────────────────────────────────────────────────────────────

describe('formatStat', () => {
  it('returns "--" for sentinel -1', () => {
    expect(formatStat(-1, (v) => `${v} kg`)).toBe('--');
  });

  it('returns "--" for undefined', () => {
    expect(formatStat(undefined, (v) => `${v} kg`)).toBe('--');
  });

  it('applies formatter to normal values', () => {
    expect(formatStat(84, (v) => `${v} kg`)).toBe('84 kg');
  });

  it('applies formatter to zero (zero is valid, not sentinel)', () => {
    expect(formatStat(0, (v) => `${v} kg`)).toBe('0 kg');
  });

  it('passes value correctly to complex formatters', () => {
    expect(formatStat(84, (v) => formatWeight(v, 'imperial'))).toBe('185 lb');
  });
});

// ─── Constants sanity checks ──────────────────────────────────────────────────

describe('unit conversion constants', () => {
  it('KG_TO_LB is approximately 2.205', () => {
    expect(KG_TO_LB).toBeCloseTo(2.20462, 4);
  });

  it('KM_TO_MI is approximately 0.621', () => {
    expect(KM_TO_MI).toBeCloseTo(0.621371, 4);
  });
});
