import { computeWarmUpSets, getBarWeight } from '../utils/warmUpCalculator';

// ─── getBarWeight ─────────────────────────────────────────────────────────────

describe('getBarWeight', () => {
  test('Barbell lbs = 45', () => {
    expect(getBarWeight('Barbell', 'lbs')).toBe(45);
  });

  test('Barbell kg = 20', () => {
    expect(getBarWeight('Barbell', 'kg')).toBe(20);
  });

  test('EZ Bar lbs = 25', () => {
    expect(getBarWeight('EZ Bar', 'lbs')).toBe(25);
  });

  test('EZ Bar kg = 11', () => {
    expect(getBarWeight('EZ Bar', 'kg')).toBe(11);
  });

  test('Smith Machine lbs = 45', () => {
    expect(getBarWeight('Smith Machine', 'lbs')).toBe(45);
  });

  test('Smith Machine kg = 20', () => {
    expect(getBarWeight('Smith Machine', 'kg')).toBe(20);
  });
});

// ─── computeWarmUpSets — invalid inputs ───────────────────────────────────────

describe('computeWarmUpSets — invalid / edge inputs', () => {
  test('returns empty sets for weight = 0', () => {
    const result = computeWarmUpSets(0, 'lbs', 'Barbell');
    expect(result.sets).toHaveLength(0);
  });

  test('returns empty sets for negative weight', () => {
    const result = computeWarmUpSets(-100, 'lbs', 'Barbell');
    expect(result.sets).toHaveLength(0);
  });

  test('returns empty sets for NaN', () => {
    const result = computeWarmUpSets(NaN, 'lbs', 'Barbell');
    expect(result.sets).toHaveLength(0);
  });

  test('returns empty sets for Infinity', () => {
    // Infinity is finite=false → triggers guard
    const result = computeWarmUpSets(Infinity, 'lbs', 'Barbell');
    expect(result.sets).toHaveLength(0);
  });
});

// ─── weight at or below bar ────────────────────────────────────────────────────

describe('computeWarmUpSets — weight at or below bar weight', () => {
  test('Barbell lbs: weight = 45 (at bar) → empty', () => {
    const result = computeWarmUpSets(45, 'lbs', 'Barbell');
    expect(result.sets).toHaveLength(0);
  });

  test('Barbell lbs: weight = 40 (below bar) → empty', () => {
    const result = computeWarmUpSets(40, 'lbs', 'Barbell');
    expect(result.sets).toHaveLength(0);
  });

  test('EZ Bar lbs: weight = 25 (at bar) → empty', () => {
    const result = computeWarmUpSets(25, 'lbs', 'EZ Bar');
    expect(result.sets).toHaveLength(0);
  });

  test('EZ Bar lbs: weight = 20 (below bar) → empty', () => {
    const result = computeWarmUpSets(20, 'lbs', 'EZ Bar');
    expect(result.sets).toHaveLength(0);
  });
});

// ─── standard barbell warm-up (lbs) ──────────────────────────────────────────

describe('computeWarmUpSets — Barbell lbs 225', () => {
  let sets: ReturnType<typeof computeWarmUpSets>['sets'];

  beforeAll(() => {
    sets = computeWarmUpSets(225, 'lbs', 'Barbell').sets;
  });

  test('produces 5 sets', () => {
    expect(sets).toHaveLength(5);
  });

  test('set numbers are 1–5', () => {
    sets.forEach((s, i) => expect(s.setNumber).toBe(i + 1));
  });

  test('set 1: 40% × 10 reps → ~90 lbs', () => {
    // 40% of 225 = 90 — already a multiple of 2.5
    expect(sets[0].percent).toBe(40);
    expect(sets[0].reps).toBe(10);
    expect(sets[0].weight).toBe(90);
  });

  test('set 2: 55% × 6 reps → ~125 lbs (rounded to 5)', () => {
    // 55% of 225 = 123.75 → rounds to 125 (nearest 5: 123.75/5=24.75 → 25 → 125)
    expect(sets[1].percent).toBe(55);
    expect(sets[1].reps).toBe(6);
    expect(sets[1].weight).toBe(125);
  });

  test('set 3: 70% × 4 reps → 160 lbs (rounded to nearest 5)', () => {
    // 70% of 225 = 157.5 → 157.5/5=31.5 → rounds to 32 × 5 = 160
    expect(sets[2].percent).toBe(70);
    expect(sets[2].reps).toBe(4);
    expect(sets[2].weight).toBe(160);
  });

  test('set 5: 90% × 1 rep → 205 lbs (rounded to nearest 5)', () => {
    // 90% of 225 = 202.5 → 202.5/5=40.5 → rounds to 41 × 5 = 205
    expect(sets[4].percent).toBe(90);
    expect(sets[4].reps).toBe(1);
    expect(sets[4].weight).toBe(205);
  });

  test('all weights are multiples of 5', () => {
    sets.forEach((s) => {
      expect(s.weight % 5).toBeCloseTo(0);
    });
  });

  test('all weights are >= bar weight (45)', () => {
    sets.forEach((s) => {
      expect(s.weight).toBeGreaterThanOrEqual(45);
    });
  });
});

// ─── EZ Bar path (lbs) ────────────────────────────────────────────────────────

describe('computeWarmUpSets — EZ Bar lbs 100', () => {
  test('produces 5 warm-up sets', () => {
    const { sets } = computeWarmUpSets(100, 'lbs', 'EZ Bar');
    expect(sets).toHaveLength(5);
  });

  test('set 1 weight >= EZ bar weight (25)', () => {
    const { sets } = computeWarmUpSets(100, 'lbs', 'EZ Bar');
    expect(sets[0].weight).toBeGreaterThanOrEqual(25);
  });
});

// ─── Smith Machine path ───────────────────────────────────────────────────────

describe('computeWarmUpSets — Smith Machine lbs 200', () => {
  test('produces 5 warm-up sets', () => {
    const { sets } = computeWarmUpSets(200, 'lbs', 'Smith Machine');
    expect(sets).toHaveLength(5);
  });

  test('bar weight is 45 lbs (same as Barbell assumption)', () => {
    const { sets } = computeWarmUpSets(200, 'lbs', 'Smith Machine');
    sets.forEach((s) => {
      expect(s.weight).toBeGreaterThanOrEqual(45);
    });
  });
});

// ─── Metric (kg) path ─────────────────────────────────────────────────────────

describe('computeWarmUpSets — Barbell kg 100', () => {
  let sets: ReturnType<typeof computeWarmUpSets>['sets'];

  beforeAll(() => {
    sets = computeWarmUpSets(100, 'kg', 'Barbell').sets;
  });

  test('produces 5 sets', () => {
    expect(sets).toHaveLength(5);
  });

  test('all weights are multiples of 2.5 kg', () => {
    sets.forEach((s) => {
      expect(s.weight % 2.5).toBeCloseTo(0);
    });
  });

  test('all weights >= bar weight in kg (20)', () => {
    sets.forEach((s) => {
      expect(s.weight).toBeGreaterThanOrEqual(20);
    });
  });

  test('set 1: 40% × 10 reps → 40 kg', () => {
    // 40% of 100 = 40 — exact
    expect(sets[0].weight).toBe(40);
    expect(sets[0].reps).toBe(10);
  });
});

// ─── Low working weight — warm-up rounds down to bar ─────────────────────────

describe('computeWarmUpSets — low working weight (lbs 55)', () => {
  test('set 1 weight is at least bar weight (45)', () => {
    const { sets } = computeWarmUpSets(55, 'lbs', 'Barbell');
    expect(sets[0].weight).toBeGreaterThanOrEqual(45);
  });
});

// ─── workingWeight and unit are echoed in result ──────────────────────────────

describe('computeWarmUpSets — result metadata', () => {
  test('echoes workingWeight', () => {
    const result = computeWarmUpSets(315, 'lbs', 'Barbell');
    expect(result.workingWeight).toBe(315);
  });

  test('echoes unit', () => {
    const result = computeWarmUpSets(140, 'kg', 'Barbell');
    expect(result.unit).toBe('kg');
  });
});
