import { suggestEffort, contextualizePerformance } from '../utils/recoveryPaceCalc';

// ─── suggestEffort ────────────────────────────────────────────────────────────

describe('suggestEffort', () => {
  it('RAY #6: returns null when score is null', () => {
    expect(suggestEffort(null)).toBeNull();
  });

  it('returns "Push it" for score >= 80', () => {
    const result = suggestEffort(80);
    expect(result).not.toBeNull();
    expect(result?.label).toBe('Push it');
    expect(result?.zoneTarget).toBe(4);
    expect(result?.paceMultiplier).toBeCloseTo(1.0);
  });

  it('returns "Push it" for score 100', () => {
    const result = suggestEffort(100);
    expect(result?.label).toBe('Push it');
  });

  it('returns "Moderate effort" for score >= 60 and < 80', () => {
    const result = suggestEffort(60);
    expect(result?.label).toBe('Moderate effort');
    expect(result?.zoneTarget).toBe(3);
    expect(result?.paceMultiplier).toBeCloseTo(1.05);
  });

  it('returns "Moderate effort" for score 79', () => {
    expect(suggestEffort(79)?.label).toBe('Moderate effort');
  });

  it('returns "Easy day" for score >= 40 and < 60', () => {
    const result = suggestEffort(40);
    expect(result?.label).toBe('Easy day');
    expect(result?.zoneTarget).toBe(2);
    expect(result?.paceMultiplier).toBeCloseTo(1.15);
  });

  it('returns "Easy day" for score 59', () => {
    expect(suggestEffort(59)?.label).toBe('Easy day');
  });

  it('returns "Active recovery only" for score < 40', () => {
    const result = suggestEffort(39);
    expect(result?.label).toBe('Active recovery only');
    expect(result?.zoneTarget).toBe(1);
    expect(result?.paceMultiplier).toBeCloseTo(1.30);
  });

  it('returns "Active recovery only" for score 0', () => {
    expect(suggestEffort(0)?.label).toBe('Active recovery only');
  });

  it('RAY #6: >= boundaries are inclusive — 80 goes to Push it not Moderate', () => {
    expect(suggestEffort(80)?.label).toBe('Push it');
    expect(suggestEffort(79)?.label).toBe('Moderate effort');
  });

  it('RAY #6: boundary 60 is Moderate effort not Easy day', () => {
    expect(suggestEffort(60)?.label).toBe('Moderate effort');
    expect(suggestEffort(59)?.label).toBe('Easy day');
  });

  it('RAY #6: boundary 40 is Easy day not Active recovery', () => {
    expect(suggestEffort(40)?.label).toBe('Easy day');
    expect(suggestEffort(39)?.label).toBe('Active recovery only');
  });
});

// ─── contextualizePerformance ─────────────────────────────────────────────────

describe('contextualizePerformance', () => {
  it('RAY #6: returns null when recoveryScore is null', () => {
    const result = contextualizePerformance({
      pace: 300,
      recoveryScore: null,
      recentAvgPace: 300,
    });
    expect(result).toBeNull();
  });

  it('returns null when pace is 0', () => {
    const result = contextualizePerformance({
      pace: 0,
      recoveryScore: 80,
      recentAvgPace: 300,
    });
    expect(result).toBeNull();
  });

  it('computes adjusted pace correctly for score 80 (multiplier 1.0)', () => {
    const result = contextualizePerformance({
      pace: 300,
      recoveryScore: 80,
      recentAvgPace: 300,
    });
    expect(result).not.toBeNull();
    expect(result?.adjustedPace).toBeCloseTo(300 / 1.0, 2);
  });

  it('computes adjusted pace for score 60 (multiplier 1.05)', () => {
    const result = contextualizePerformance({
      pace: 315,
      recoveryScore: 60,
      recentAvgPace: 300,
    });
    expect(result?.adjustedPace).toBeCloseTo(315 / 1.05, 2);
  });

  it('computes adjusted pace for score 40 (multiplier 1.15)', () => {
    const result = contextualizePerformance({
      pace: 345,
      recoveryScore: 40,
      recentAvgPace: 300,
    });
    expect(result?.adjustedPace).toBeCloseTo(345 / 1.15, 2);
  });

  it('computes adjusted pace for score 20 (multiplier 1.30)', () => {
    const result = contextualizePerformance({
      pace: 390,
      recoveryScore: 20,
      recentAvgPace: 300,
    });
    expect(result?.adjustedPace).toBeCloseTo(390 / 1.30, 2);
  });

  it('includes a message string in the result', () => {
    const result = contextualizePerformance({
      pace: 300,
      recoveryScore: 75,
      recentAvgPace: 300,
    });
    expect(typeof result?.message).toBe('string');
    expect(result?.message.length).toBeGreaterThan(0);
  });

  it('generates faster-than-average message when adjusted pace is < recent avg', () => {
    // Score 60 → multiplier 1.05. pace=280, adjustedPace = 280/1.05 ≈ 266.7 < recentAvgPace 300
    const result = contextualizePerformance({
      pace: 280,
      recoveryScore: 60,
      recentAvgPace: 300,
    });
    expect(result?.message).toMatch(/faster/i);
  });

  it('generates slower-than-average message when adjusted pace is > recent avg', () => {
    // Score 40 → multiplier 1.15. pace=400, adjustedPace = 400/1.15 ≈ 347.8 > recentAvgPace 300
    const result = contextualizePerformance({
      pace: 400,
      recoveryScore: 40,
      recentAvgPace: 300,
    });
    expect(result?.message).toMatch(/slower/i);
  });

  it('works with recentAvgPace = 0 (no history)', () => {
    const result = contextualizePerformance({
      pace: 300,
      recoveryScore: 70,
      recentAvgPace: 0,
    });
    expect(result).not.toBeNull();
    expect(typeof result?.message).toBe('string');
  });
});
