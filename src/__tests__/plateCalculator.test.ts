import { computePlates } from '../utils/plateCalculator';

// ─── Invalid / guard inputs (Ray's item #4) ───────────────────────────────────

describe('computePlates — invalid inputs', () => {
  test('weight = 0 → empty platesPerSide', () => {
    const result = computePlates(0, 'lbs', 'Barbell');
    expect(result.platesPerSide).toHaveLength(0);
  });

  test('weight = -100 → empty platesPerSide', () => {
    const result = computePlates(-100, 'lbs', 'Barbell');
    expect(result.platesPerSide).toHaveLength(0);
  });

  test('weight = NaN → empty platesPerSide', () => {
    const result = computePlates(NaN, 'lbs', 'Barbell');
    expect(result.platesPerSide).toHaveLength(0);
  });

  test('weight = Infinity → empty platesPerSide', () => {
    const result = computePlates(Infinity, 'lbs', 'Barbell');
    expect(result.platesPerSide).toHaveLength(0);
  });
});

// ─── Weight at or below bar weight ────────────────────────────────────────────

describe('computePlates — weight <= barWeight', () => {
  test('weight = 45 (Barbell bar) → empty platesPerSide, isExact true', () => {
    const result = computePlates(45, 'lbs', 'Barbell');
    expect(result.platesPerSide).toHaveLength(0);
    expect(result.isExact).toBe(true);
    expect(result.totalAchievable).toBe(45);
  });

  test('weight = 30 (below Barbell bar 45) → empty', () => {
    const result = computePlates(30, 'lbs', 'Barbell');
    expect(result.platesPerSide).toHaveLength(0);
  });

  test('weight = 25 (EZ Bar bar) → empty, isExact true', () => {
    const result = computePlates(25, 'lbs', 'EZ Bar');
    expect(result.platesPerSide).toHaveLength(0);
    expect(result.isExact).toBe(true);
  });

  test('weight = 45 (Smith Machine bar) → empty', () => {
    const result = computePlates(45, 'lbs', 'Smith Machine');
    expect(result.platesPerSide).toHaveLength(0);
  });
});

// ─── Standard imperial breakdowns ─────────────────────────────────────────────

describe('computePlates — standard lbs breakdowns', () => {
  test('135 lbs (Barbell) = bar + 1x45 per side', () => {
    const { platesPerSide, isExact, totalAchievable } = computePlates(135, 'lbs', 'Barbell');
    expect(isExact).toBe(true);
    expect(totalAchievable).toBe(135);
    expect(platesPerSide).toEqual([{ weight: 45, count: 1 }]);
  });

  test('225 lbs = bar + 2x45 per side', () => {
    const { platesPerSide, isExact } = computePlates(225, 'lbs', 'Barbell');
    expect(isExact).toBe(true);
    expect(platesPerSide).toEqual([{ weight: 45, count: 2 }]);
  });

  test('315 lbs = bar + 3x45 per side', () => {
    const { platesPerSide, isExact } = computePlates(315, 'lbs', 'Barbell');
    expect(isExact).toBe(true);
    expect(platesPerSide).toEqual([{ weight: 45, count: 3 }]);
  });

  test('185 lbs = bar + 1x45 + 1x25 per side', () => {
    // bar=45, plate per side = (185-45)/2 = 70 → 45+25
    const { platesPerSide, isExact } = computePlates(185, 'lbs', 'Barbell');
    expect(isExact).toBe(true);
    expect(platesPerSide[0]).toEqual({ weight: 45, count: 1 });
    expect(platesPerSide[1]).toEqual({ weight: 25, count: 1 });
  });

  test('95 lbs = bar + 1x25 per side', () => {
    // (95-45)/2 = 25 per side
    const { platesPerSide, isExact } = computePlates(95, 'lbs', 'Barbell');
    expect(isExact).toBe(true);
    expect(platesPerSide).toEqual([{ weight: 25, count: 1 }]);
  });
});

// ─── Standard metric breakdowns ───────────────────────────────────────────────

describe('computePlates — standard kg breakdowns', () => {
  test('60 kg (Barbell) = bar + 1x20 per side', () => {
    // (60-20)/2 = 20 per side
    const { platesPerSide, isExact, totalAchievable } = computePlates(60, 'kg', 'Barbell');
    expect(isExact).toBe(true);
    expect(totalAchievable).toBe(60);
    expect(platesPerSide).toEqual([{ weight: 20, count: 1 }]);
  });

  test('100 kg = bar + 2x20 + 1x10 per side... computed correctly', () => {
    // (100-20)/2 = 40 per side → 2x20
    const { platesPerSide, isExact } = computePlates(100, 'kg', 'Barbell');
    expect(isExact).toBe(true);
    expect(platesPerSide[0]).toEqual({ weight: 20, count: 2 });
  });

  test('140 kg = bar + 3x20 + 1x10 per side... or correct greedy breakdown', () => {
    // (140-20)/2 = 60 per side → 3x20
    const { platesPerSide, isExact } = computePlates(140, 'kg', 'Barbell');
    expect(isExact).toBe(true);
    expect(platesPerSide[0]).toEqual({ weight: 20, count: 3 });
  });
});

// ─── Non-exact weight → isExact false, note closest ─────────────────────────

describe('computePlates — non-achievable weights', () => {
  test('46 lbs (1 lb above bar) → isExact false, closest is 45', () => {
    // (46-45)/2 = 0.5 per side — no 0.5 lb plate
    const { platesPerSide, isExact, totalAchievable, requested } = computePlates(46, 'lbs', 'Barbell');
    expect(isExact).toBe(false);
    expect(platesPerSide).toHaveLength(0); // no standard plate for 0.5
    expect(totalAchievable).toBe(45);
    expect(requested).toBe(46);
  });

  test('136 lbs → isExact false, closest ≤ 136', () => {
    // (136-45)/2 = 45.5 per side → 1x45 + remainder 0.5 (no plate)
    const { isExact, totalAchievable } = computePlates(136, 'lbs', 'Barbell');
    expect(isExact).toBe(false);
    expect(totalAchievable).toBeLessThanOrEqual(136);
  });
});

// ─── EZ Bar path ──────────────────────────────────────────────────────────────

describe('computePlates — EZ Bar', () => {
  test('75 lbs EZ Bar = bar(25) + 1x25 per side', () => {
    // (75-25)/2 = 25 per side → 1x25
    const { platesPerSide, isExact, barWeight } = computePlates(75, 'lbs', 'EZ Bar');
    expect(barWeight).toBe(25);
    expect(isExact).toBe(true);
    expect(platesPerSide).toEqual([{ weight: 25, count: 1 }]);
  });

  test('55 lbs EZ Bar: (55-25)/2 = 15 per side → 1x10 + 1x5', () => {
    const { platesPerSide, isExact } = computePlates(55, 'lbs', 'EZ Bar');
    expect(isExact).toBe(true);
    const total = platesPerSide.reduce((s, p) => s + p.weight * p.count, 0);
    expect(total).toBe(15);
  });
});

// ─── Smith Machine path ───────────────────────────────────────────────────────

describe('computePlates — Smith Machine', () => {
  test('Smith Machine bar weight is 45 lbs', () => {
    const { barWeight } = computePlates(135, 'lbs', 'Smith Machine');
    expect(barWeight).toBe(45);
  });

  test('135 lbs Smith Machine = 1x45 per side', () => {
    const { platesPerSide, isExact } = computePlates(135, 'lbs', 'Smith Machine');
    expect(isExact).toBe(true);
    expect(platesPerSide).toEqual([{ weight: 45, count: 1 }]);
  });
});

// ─── totalAchievable consistency ─────────────────────────────────────────────

describe('computePlates — totalAchievable consistency', () => {
  const cases: Array<[number, 'lbs' | 'kg', 'Barbell' | 'EZ Bar' | 'Smith Machine']> = [
    [135,  'lbs', 'Barbell'],
    [225,  'lbs', 'Barbell'],
    [315,  'lbs', 'Barbell'],
    [100,  'kg',  'Barbell'],
    [75,   'lbs', 'EZ Bar'],
    [135,  'lbs', 'Smith Machine'],
  ];

  cases.forEach(([weight, unit, barType]) => {
    test(`${weight} ${unit} ${barType}: totalAchievable = barWeight + 2×(sum of per-side plates)`, () => {
      const { platesPerSide, barWeight, totalAchievable } = computePlates(weight, unit, barType);
      const perSideSum = platesPerSide.reduce((s, p) => s + p.weight * p.count, 0);
      expect(totalAchievable).toBeCloseTo(barWeight + perSideSum * 2, 4);
    });
  });
});

// ─── Result metadata ──────────────────────────────────────────────────────────

describe('computePlates — result metadata', () => {
  test('requested echoes input', () => {
    const result = computePlates(225, 'lbs', 'Barbell');
    expect(result.requested).toBe(225);
  });

  test('unit echoes input', () => {
    const result = computePlates(100, 'kg', 'Barbell');
    expect(result.unit).toBe('kg');
  });
});
