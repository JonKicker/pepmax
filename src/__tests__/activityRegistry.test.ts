import { ACTIVITY_REGISTRY, getActivityMeta } from '../constants/activityRegistry';
import type { ActivityType } from '../types/cardio';

// All valid ActivityType values (must match src/types/cardio.ts)
const ALL_ACTIVITY_TYPES: ActivityType[] = [
  'run',
  'cycle',
  'walk',
  'swim',
  'hike',
  'hiit',
  'rowing',
  'yoga',
  'elliptical',
  'stairclimber',
  'custom',
];

// ─── ACTIVITY_REGISTRY ────────────────────────────────────────────────────────

describe('ACTIVITY_REGISTRY', () => {
  it('covers all ActivityType values', () => {
    const registryTypes = ACTIVITY_REGISTRY.map((a) => a.type);
    for (const type of ALL_ACTIVITY_TYPES) {
      expect(registryTypes).toContain(type);
    }
  });

  it('has no duplicate activity types', () => {
    const types = ACTIVITY_REGISTRY.map((a) => a.type);
    const unique = new Set(types);
    expect(unique.size).toBe(types.length);
  });

  it('has valid positive MET values for all activities', () => {
    for (const meta of ACTIVITY_REGISTRY) {
      expect(meta.met).toBeGreaterThan(0);
      expect(Number.isFinite(meta.met)).toBe(true);
    }
  });

  it('has valid positive maxSpeedMs values for all activities', () => {
    for (const meta of ACTIVITY_REGISTRY) {
      expect(meta.maxSpeedMs).toBeGreaterThan(0);
      expect(Number.isFinite(meta.maxSpeedMs)).toBe(true);
    }
  });

  it('has non-empty labels for all activities', () => {
    for (const meta of ACTIVITY_REGISTRY) {
      expect(typeof meta.label).toBe('string');
      expect(meta.label.length).toBeGreaterThan(0);
    }
  });

  it('has non-empty icon names for all activities', () => {
    for (const meta of ACTIVITY_REGISTRY) {
      expect(typeof meta.icon).toBe('string');
      expect(meta.icon.length).toBeGreaterThan(0);
    }
  });

  it('gpsRelevant is boolean for all activities', () => {
    for (const meta of ACTIVITY_REGISTRY) {
      expect(typeof meta.gpsRelevant).toBe('boolean');
    }
  });

  it('paceRelevant is boolean for all activities', () => {
    for (const meta of ACTIVITY_REGISTRY) {
      expect(typeof meta.paceRelevant).toBe('boolean');
    }
  });

  it('indoorDefault is boolean for all activities', () => {
    for (const meta of ACTIVITY_REGISTRY) {
      expect(typeof meta.indoorDefault).toBe('boolean');
    }
  });

  it('swim has indoorDefault true (pool-based)', () => {
    const swim = ACTIVITY_REGISTRY.find((a) => a.type === 'swim');
    expect(swim?.indoorDefault).toBe(true);
  });

  it('run has gpsRelevant true', () => {
    const run = ACTIVITY_REGISTRY.find((a) => a.type === 'run');
    expect(run?.gpsRelevant).toBe(true);
  });

  it('yoga has indoorDefault true', () => {
    const yoga = ACTIVITY_REGISTRY.find((a) => a.type === 'yoga');
    expect(yoga?.indoorDefault).toBe(true);
  });

  it('run maxSpeedMs is reasonable (< 20 m/s)', () => {
    const run = ACTIVITY_REGISTRY.find((a) => a.type === 'run');
    expect(run?.maxSpeedMs).toBeLessThan(20);
  });

  it('cycle maxSpeedMs is greater than run maxSpeedMs', () => {
    const run = ACTIVITY_REGISTRY.find((a) => a.type === 'run');
    const cycle = ACTIVITY_REGISTRY.find((a) => a.type === 'cycle');
    expect(cycle!.maxSpeedMs).toBeGreaterThan(run!.maxSpeedMs);
  });
});

// ─── getActivityMeta ──────────────────────────────────────────────────────────

describe('getActivityMeta', () => {
  it('returns correct meta for run', () => {
    const meta = getActivityMeta('run');
    expect(meta.type).toBe('run');
    expect(meta.label).toBe('Run');
    expect(meta.met).toBe(9.8);
  });

  it('returns correct meta for swim', () => {
    const meta = getActivityMeta('swim');
    expect(meta.type).toBe('swim');
    expect(meta.indoorDefault).toBe(true);
  });

  it('returns all 11 registered types correctly', () => {
    for (const type of ALL_ACTIVITY_TYPES) {
      const meta = getActivityMeta(type);
      expect(meta.type).toBe(type);
    }
  });

  it('returns a fallback for unknown type without throwing', () => {
    // @ts-expect-error testing unknown type
    const meta = getActivityMeta('unknownActivity');
    expect(meta).toBeDefined();
    expect(meta.met).toBeGreaterThan(0);
  });
});
