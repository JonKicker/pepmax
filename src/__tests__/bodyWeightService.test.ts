/**
 * Unit tests for bodyWeightService — pure/computation functions only.
 * Firestore CRUD functions require integration tests (real Firebase).
 */
import { computeWeightStats } from '../utils/bodyTracking';
import type { BodyWeightEntry } from '../types/bodyTracking';

function makeEntry(date: string, weight: number): BodyWeightEntry {
  return {
    id: date,
    date,
    weight,
    displayUnit: 'kg',
    // Timestamps are Firebase types; cast to any for unit tests
    createdAt: {} as any,
    updatedAt: {} as any,
  };
}

describe('computeWeightStats', () => {
  it('returns null for empty entries', () => {
    expect(computeWeightStats([])).toBeNull();
  });

  it('computes correct stats for a single entry', () => {
    const entries = [makeEntry('2026-01-01', 80)];
    const stats = computeWeightStats(entries)!;
    expect(stats.starting).toBe(80);
    expect(stats.current).toBe(80);
    expect(stats.change).toBe(0);
    expect(stats.average).toBe(80);
    expect(stats.lowest).toBe(80);
    expect(stats.highest).toBe(80);
  });

  it('computes correct stats for multiple entries', () => {
    const entries = [
      makeEntry('2026-01-01', 90),
      makeEntry('2026-01-15', 88),
      makeEntry('2026-02-01', 85),
    ];
    const stats = computeWeightStats(entries)!;
    expect(stats.starting).toBe(90);
    expect(stats.current).toBe(85);
    expect(stats.change).toBeCloseTo(-5);
    expect(stats.average).toBeCloseTo(87.67, 1);
    expect(stats.lowest).toBe(85);
    expect(stats.highest).toBe(90);
  });

  it('handles weight gain correctly', () => {
    const entries = [
      makeEntry('2026-01-01', 70),
      makeEntry('2026-02-01', 75),
    ];
    const stats = computeWeightStats(entries)!;
    expect(stats.change).toBeCloseTo(5);
    expect(stats.lowest).toBe(70);
    expect(stats.highest).toBe(75);
  });
});
