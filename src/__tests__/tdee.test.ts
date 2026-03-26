import {
  calculateBMR,
  calculateTDEE,
  calculateMacros,
  lbsToKg,
  kgToLbs,
  feetInchesToCm,
  cmToFeetInches,
} from '../utils/tdee';

// ─── calculateBMR ─────────────────────────────────────────────────────────────

describe('calculateBMR', () => {
  it('computes male BMR correctly', () => {
    const expected = 10 * 80 + 6.25 * 180 - 5 * 30 + 5;
    expect(calculateBMR(80, 180, 30, 'male')).toBe(expected);
  });

  it('computes female BMR correctly', () => {
    const expected = 10 * 60 + 6.25 * 165 - 5 * 25 - 161;
    expect(calculateBMR(60, 165, 25, 'female')).toBe(expected);
  });
});

// ─── calculateTDEE ────────────────────────────────────────────────────────────

describe('calculateTDEE', () => {
  it('uses explicit multiplier', () => {
    const bmr = calculateBMR(70, 175, 28, 'male');
    expect(calculateTDEE(70, 175, 28, 'male', 1.725)).toBe(Math.round(bmr * 1.725));
  });

  it('defaults to multiplier 1.55 and returns rounded integer', () => {
    const bmr = calculateBMR(70, 175, 28, 'male');
    const result = calculateTDEE(70, 175, 28, 'male');
    expect(result).toBe(Math.round(bmr * 1.55));
    expect(Number.isInteger(result)).toBe(true);
  });
});

// ─── calculateMacros ─────────────────────────────────────────────────────────

describe('calculateMacros', () => {
  it('produces correct macro split for 2000 kcal', () => {
    const macros = calculateMacros(2000);
    expect(macros.proteinG).toBe(150);
    expect(macros.carbsG).toBe(200);
    expect(macros.fatG).toBe(67);
  });
});

// ─── lbsToKg ─────────────────────────────────────────────────────────────────

describe('lbsToKg', () => {
  it('converts 100 lbs to ~45.4 kg', () => {
    expect(lbsToKg(100)).toBeCloseTo(45.4, 1);
  });

  it('returns 0 for 0 lbs', () => {
    expect(lbsToKg(0)).toBe(0);
  });
});

// ─── kgToLbs ─────────────────────────────────────────────────────────────────

describe('kgToLbs', () => {
  it('converts 45.4 kg to ~100 lbs', () => {
    expect(kgToLbs(45.359)).toBeCloseTo(100, 1);
  });

  it('round-trips within tolerance', () => {
    const original = 75;
    expect(kgToLbs(lbsToKg(original))).toBeCloseTo(original, 0);
  });
});

// ─── feetInchesToCm ──────────────────────────────────────────────────────────

describe('feetInchesToCm', () => {
  it('converts 6ft 0in → 182.9 cm', () => {
    expect(feetInchesToCm(6, 0)).toBeCloseTo(182.9, 1);
  });

  it('converts 5ft 10in → 177.8 cm', () => {
    expect(feetInchesToCm(5, 10)).toBeCloseTo(177.8, 1);
  });
});

// ─── cmToFeetInches ──────────────────────────────────────────────────────────

describe('cmToFeetInches', () => {
  it('converts 182.88 cm → { feet: 6, inches: 0 }', () => {
    expect(cmToFeetInches(182.88)).toEqual({ feet: 6, inches: 0 });
  });

  it('converts 177.8 cm → { feet: 5, inches: 10 }', () => {
    expect(cmToFeetInches(177.8)).toEqual({ feet: 5, inches: 10 });
  });

  it('converts 0 cm → { feet: 0, inches: 0 }', () => {
    expect(cmToFeetInches(0)).toEqual({ feet: 0, inches: 0 });
  });
});
