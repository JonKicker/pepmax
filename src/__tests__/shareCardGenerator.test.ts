/**
 * shareCardGenerator.test.ts
 *
 * Tests for the pure `buildVisibleStats` helper from ShareCardGenerator.
 * Covers bilateral visibility, visibleModules filter, winner color logic,
 * and edge cases.
 */
import { buildVisibleStats, STAT_DEFINITIONS } from '../utils/shareCardStats';
import type { CompareScores } from '../types/compare';

// ─── Minimal score factory ────────────────────────────────────────────────────

function makeScores(overrides: Partial<Record<keyof CompareScores, number>> = {}): CompareScores {
  // Default: all numeric fields are -1 (unavailable).
  // The Timestamp / FieldValue fields aren't numeric so we stub them.
  const base: Record<string, unknown> = {
    estimatedOneRepMax: -1,
    weeklyVolume: -1,
    weeklyDistance: -1,
    avgPace: -1,
    avgDailyCalories: -1,
    avgRecoveryScore: -1,
    bodyWeightTrend: -1,
    activePeptideCount: -1,
    strengthScore: -1,
    cardioScore: -1,
    nutritionConsistency: -1,
    overallConsistency: -1,
    xpPercentile: -1,
    computedAt: null,
    updatedAt: null,
  };
  return { ...base, ...overrides } as unknown as CompareScores;
}

// ─── All modules list (matches STAT_DEFINITIONS) ─────────────────────────────

const ALL_MODULES = ['gym', 'cardio', 'nutrition', 'recovery', 'body', 'peptides', 'crossModule'];

// ─── Test 1: bilateral visibility — stat hidden when either user has -1 ─────

describe('buildVisibleStats — bilateral visibility', () => {
  test('hides stat when myScores field is -1', () => {
    const myScores = makeScores({ estimatedOneRepMax: -1, weeklyVolume: -1 });
    const opponentScores = makeScores({ estimatedOneRepMax: 100, weeklyVolume: 80 });

    const result = buildVisibleStats(myScores, opponentScores, ALL_MODULES);
    const gymStats = result.filter((d) => d.module === 'gym');
    expect(gymStats).toHaveLength(0);
  });

  test('hides stat when opponentScores field is -1', () => {
    const myScores = makeScores({ estimatedOneRepMax: 120, weeklyVolume: 90 });
    const opponentScores = makeScores({ estimatedOneRepMax: -1, weeklyVolume: -1 });

    const result = buildVisibleStats(myScores, opponentScores, ALL_MODULES);
    const gymStats = result.filter((d) => d.module === 'gym');
    expect(gymStats).toHaveLength(0);
  });

  test('shows stat when both users have non-sentinel values', () => {
    const myScores = makeScores({ estimatedOneRepMax: 120, weeklyVolume: 90 });
    const opponentScores = makeScores({ estimatedOneRepMax: 100, weeklyVolume: 80 });

    const result = buildVisibleStats(myScores, opponentScores, ALL_MODULES);
    const gymStats = result.filter((d) => d.module === 'gym');
    expect(gymStats).toHaveLength(2); // estimatedOneRepMax + weeklyVolume
  });

  test('shows only stats where BOTH values are non-sentinel (partial)', () => {
    // Only estimatedOneRepMax available; weeklyVolume is -1 for opponent
    const myScores = makeScores({ estimatedOneRepMax: 120, weeklyVolume: 90 });
    const opponentScores = makeScores({ estimatedOneRepMax: 100, weeklyVolume: -1 });

    const result = buildVisibleStats(myScores, opponentScores, ALL_MODULES);
    const gymStats = result.filter((d) => d.module === 'gym');
    expect(gymStats).toHaveLength(1);
    expect(gymStats[0].field).toBe('estimatedOneRepMax');
  });
});

// ─── Test 2: visibleModules filter — stat hidden when module not in array ─────

describe('buildVisibleStats — visibleModules filter', () => {
  test('excludes module not in visibleModules', () => {
    const myScores = makeScores({ estimatedOneRepMax: 120, weeklyVolume: 90 });
    const opponentScores = makeScores({ estimatedOneRepMax: 100, weeklyVolume: 80 });

    // gym NOT in visible list
    const result = buildVisibleStats(myScores, opponentScores, ['cardio', 'nutrition']);
    const gymStats = result.filter((d) => d.module === 'gym');
    expect(gymStats).toHaveLength(0);
  });

  test('includes module when it is in visibleModules', () => {
    const myScores = makeScores({ estimatedOneRepMax: 120, weeklyVolume: 90 });
    const opponentScores = makeScores({ estimatedOneRepMax: 100, weeklyVolume: 80 });

    const result = buildVisibleStats(myScores, opponentScores, ['gym']);
    const gymStats = result.filter((d) => d.module === 'gym');
    expect(gymStats.length).toBeGreaterThan(0);
  });
});

// ─── Test 3: all modules hidden — only empty stats array ──────────────────────

describe('buildVisibleStats — all modules hidden', () => {
  test('returns empty array when visibleModules is empty', () => {
    const myScores = makeScores({
      estimatedOneRepMax: 120,
      weeklyDistance: 10,
      avgDailyCalories: 2200,
    });
    const opponentScores = makeScores({
      estimatedOneRepMax: 100,
      weeklyDistance: 8,
      avgDailyCalories: 1900,
    });

    const result = buildVisibleStats(myScores, opponentScores, []);
    expect(result).toHaveLength(0);
  });

  test('returns empty array when all scores are -1 even with all modules visible', () => {
    const myScores = makeScores(); // all -1
    const opponentScores = makeScores(); // all -1

    const result = buildVisibleStats(myScores, opponentScores, ALL_MODULES);
    expect(result).toHaveLength(0);
  });
});

// ─── Test 3b: empty scores path — {} with all fields undefined ────────────────

describe('buildVisibleStats — empty scores object (all fields undefined)', () => {
  test('returns empty array when scores are {} (all fields undefined)', () => {
    // Simulates malformed JSON parse result or missing Firestore document fields
    const emptyScores = {} as CompareScores;

    const result = buildVisibleStats(emptyScores, emptyScores, ALL_MODULES);
    expect(result).toHaveLength(0);
  });

  test('returns empty array when my scores are empty and opponent scores are valid', () => {
    const emptyScores = {} as CompareScores;
    const validScores = makeScores({ estimatedOneRepMax: 100, weeklyVolume: 80 });

    const result = buildVisibleStats(emptyScores, validScores, ALL_MODULES);
    const gymStats = result.filter((d) => d.module === 'gym');
    expect(gymStats).toHaveLength(0);
  });
});

// ─── Test 4: winner color logic (higher is better) ───────────────────────────

describe('winner color logic — higher is better', () => {
  test('higher value wins for estimatedOneRepMax', () => {
    const def = STAT_DEFINITIONS.find((d) => d.field === 'estimatedOneRepMax')!;
    expect(def.winDir).toBe('higher');

    // Simulate color assignment inline (mirrors StatRow logic)
    const myVal = 150;
    const oppVal = 100;
    const myWins = def.winDir === 'higher' ? myVal > oppVal : myVal < oppVal;
    expect(myWins).toBe(true);
  });

  test('lower value loses for estimatedOneRepMax', () => {
    const def = STAT_DEFINITIONS.find((d) => d.field === 'estimatedOneRepMax')!;
    const myVal = 80;
    const oppVal = 120;
    const myWins = def.winDir === 'higher' ? myVal > oppVal : myVal < oppVal;
    expect(myWins).toBe(false);
  });
});

// ─── Test 5: winner color logic — lower is better (avgPace) ──────────────────

describe('winner color logic — lower is better (avgPace)', () => {
  test('lower pace wins', () => {
    const def = STAT_DEFINITIONS.find((d) => d.field === 'avgPace')!;
    expect(def.winDir).toBe('lower');

    const myVal = 4.5; // faster
    const oppVal = 5.2; // slower
    const myWins = def.winDir === 'higher' ? myVal > oppVal : myVal < oppVal;
    expect(myWins).toBe(true);
  });

  test('higher pace loses', () => {
    const def = STAT_DEFINITIONS.find((d) => d.field === 'avgPace')!;
    const myVal = 6.0;
    const oppVal = 4.8;
    const myWins = def.winDir === 'higher' ? myVal > oppVal : myVal < oppVal;
    expect(myWins).toBe(false);
  });
});

// ─── Test 6: edge — both values equal → tie (myWins === null) ─────────────────

describe('winner color logic — tie', () => {
  test('equal estimatedOneRepMax values produce a tie using STAT_DEFINITIONS winDir', () => {
    const def = STAT_DEFINITIONS.find((d) => d.field === 'estimatedOneRepMax')!;
    expect(def).toBeDefined();

    const myVal = 100;
    const oppVal = 100;

    // Apply the same winner logic used in StatRow / CompareStatRow
    const myWins: boolean | null = myVal !== oppVal
      ? (def.winDir === 'higher' ? myVal > oppVal : myVal < oppVal)
      : null;

    expect(myWins).toBeNull();
  });

  test('equal avgPace values produce a tie using STAT_DEFINITIONS winDir', () => {
    const def = STAT_DEFINITIONS.find((d) => d.field === 'avgPace')!;
    expect(def).toBeDefined();
    expect(def.winDir).toBe('lower');

    const myVal = 5.0;
    const oppVal = 5.0;

    const myWins: boolean | null = myVal !== oppVal
      ? (def.winDir === 'higher' ? myVal > oppVal : myVal < oppVal)
      : null;

    expect(myWins).toBeNull();
  });
});

// ─── Test 7: STAT_DEFINITIONS integrity ──────────────────────────────────────

describe('STAT_DEFINITIONS integrity', () => {
  test('every stat has a module, field, label, format function, and winDir', () => {
    for (const def of STAT_DEFINITIONS) {
      expect(def.module).toBeTruthy();
      expect(def.field).toBeTruthy();
      expect(def.label).toBeTruthy();
      expect(typeof def.format).toBe('function');
      expect(['higher', 'lower']).toContain(def.winDir);
    }
  });

  test('format functions do not throw for representative values', () => {
    for (const def of STAT_DEFINITIONS) {
      expect(() => def.format(50)).not.toThrow();
      expect(() => def.format(0)).not.toThrow();
    }
  });
});
