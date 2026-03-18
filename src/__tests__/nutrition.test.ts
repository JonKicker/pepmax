import { toLocalDateKey, sanitizeOFFProduct, recalculateMacros } from '../utils/nutrition';

// ─── toLocalDateKey ───────────────────────────────────────────────────────────

describe('toLocalDateKey', () => {
  it('returns a string matching YYYY-MM-DD', () => {
    expect(toLocalDateKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formats a specific date correctly', () => {
    expect(toLocalDateKey(new Date(2024, 0, 5))).toBe('2024-01-05');
  });
});

// ─── sanitizeOFFProduct ───────────────────────────────────────────────────────

describe('sanitizeOFFProduct', () => {
  const validProduct = {
    product_name_en: 'Oat Flakes',
    brands: 'Quaker, Other',
    code: '1234567890',
    serving_size: '30g',
    nutriments: {
      'energy-kcal_100g': 380,
      'proteins_100g': 13.5,
      'carbohydrates_100g': 67.2,
      'fat_100g': 7.1,
      'fiber_100g': 9.8,
      'sugars_100g': 1.1,
      'sodium_100g': 0.002,
    },
  };

  it('maps valid product fields correctly', () => {
    const result = sanitizeOFFProduct(validProduct);
    expect(result.name).toBe('Oat Flakes');
    expect(result.brand).toBe('Quaker');
    expect(result.barcode).toBe('1234567890');
    expect(result.servingSizeG).toBe(30);
    expect(result.per100g.calories).toBe(380);
    expect(result.per100g.protein).toBe(13.5);
    expect(result.per100g.carbs).toBe(67.2);
    expect(result.per100g.fat).toBe(7.1);
    expect(result.per100g.fiber).toBeCloseTo(9.8, 1);
    expect(result.per100g.sugar).toBeCloseTo(1.1, 1);
  });

  it('converts kJ-only energy field via ÷4.184', () => {
    const product = {
      product_name: 'Energy Bar',
      nutriments: { 'energy-kj_100g': 1674 },
    };
    const result = sanitizeOFFProduct(product);
    expect(result.per100g.calories).toBe(Math.round(1674 / 4.184));
  });

  it('converts energy_100g assumed kJ when value > 900', () => {
    const product = {
      product_name: 'Dense Bar',
      nutriments: { 'energy_100g': 2000 },
    };
    const result = sanitizeOFFProduct(product);
    expect(result.per100g.calories).toBe(Math.round(2000 / 4.184));
  });

  it('clamps negative nutrient values to 0', () => {
    const product = {
      product_name: 'Bad Data',
      nutriments: {
        'energy-kcal_100g': -50,
        'proteins_100g': -5,
        'carbohydrates_100g': -10,
        'fat_100g': -3,
      },
    };
    const result = sanitizeOFFProduct(product);
    expect(result.per100g.calories).toBe(0);
    expect(result.per100g.protein).toBe(0);
    expect(result.per100g.carbs).toBe(0);
    expect(result.per100g.fat).toBe(0);
  });

  it('returns all zeros when nutriments is null', () => {
    const result = sanitizeOFFProduct({ product_name: 'Empty', nutriments: null });
    expect(result.per100g.calories).toBe(0);
    expect(result.per100g.protein).toBe(0);
    expect(result.per100g.carbs).toBe(0);
    expect(result.per100g.fat).toBe(0);
    expect(result.per100g.fiber).toBeNull();
    expect(result.per100g.sugar).toBeNull();
    expect(result.per100g.sodium).toBeNull();
  });

  it('falls back to Unknown Food when product name is missing', () => {
    const result = sanitizeOFFProduct({ nutriments: {} });
    expect(result.name).toBe('Unknown Food');
  });

  it('parses serving_size "30g" → 30', () => {
    expect(sanitizeOFFProduct({ ...validProduct, serving_size: '30g' }).servingSizeG).toBe(30);
  });

  it('parses serving_size "1 cup (240g)" → 240', () => {
    expect(sanitizeOFFProduct({ ...validProduct, serving_size: '1 cup (240g)' }).servingSizeG).toBe(240);
  });

  it('defaults serving_size "abc" → 100', () => {
    expect(sanitizeOFFProduct({ ...validProduct, serving_size: 'abc' }).servingSizeG).toBe(100);
  });

  it('defaults serving_size undefined → 100', () => {
    const { serving_size: _, ...noServing } = validProduct;
    expect(sanitizeOFFProduct(noServing).servingSizeG).toBe(100);
  });
});

// ─── recalculateMacros ────────────────────────────────────────────────────────

describe('recalculateMacros', () => {
  const base = { calories: 200, protein: 10, carbs: 30, fat: 5 };

  it('scales proportionally', () => {
    const result = recalculateMacros(base, 100, 150);
    expect(result.calories).toBe(300);
    expect(result.protein).toBeCloseTo(15, 1);
    expect(result.carbs).toBeCloseTo(45, 1);
    expect(result.fat).toBeCloseTo(7.5, 1);
  });

  it('returns all zeros when targetG === 0', () => {
    const result = recalculateMacros(base, 100, 0);
    expect(result).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it('returns all zeros when baseG <= 0', () => {
    const result = recalculateMacros(base, 0, 100);
    expect(result).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });
});
