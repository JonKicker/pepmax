/**
 * Tests for src/utils/voiceFoodParser.ts
 *
 * Covers: parseVoiceInput
 * Tests: numeric quantities, word quantities, size modifiers, delimiters, edge cases
 */

import { parseVoiceInput } from '../utils/voiceFoodParser';

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('parseVoiceInput — happy path', () => {
  it('returns empty array for blank string', () => {
    expect(parseVoiceInput('')).toEqual([]);
    expect(parseVoiceInput('   ')).toEqual([]);
  });

  it('parses a single food with no quantity', () => {
    const result = parseVoiceInput('chicken breast');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('chicken breast');
    expect(result[0].quantity).toBe(1);
    expect(result[0].confidence).toBe(0.3);
  });

  it('parses numeric quantity with gram unit', () => {
    const result = parseVoiceInput('100g chicken');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('chicken');
    expect(result[0].quantity).toBe(100);
    expect(result[0].unit).toBe('g');
    expect(result[0].confidence).toBe(1.0);
  });

  it('parses decimal quantity', () => {
    const result = parseVoiceInput('1.5 cups oatmeal');
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(1.5);
    expect(result[0].unit).toBe('cup');
  });

  it('parses word number "two"', () => {
    const result = parseVoiceInput('two eggs');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('eggs');
    expect(result[0].quantity).toBe(2);
    expect(result[0].confidence).toBe(0.7);
  });

  it('parses word number "half"', () => {
    const result = parseVoiceInput('half cup of rice');
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(0.5);
    expect(result[0].unit).toBe('cup');
    expect(result[0].name).toBe('rice');
  });

  it('parses word "a" as quantity 1', () => {
    const result = parseVoiceInput('a banana');
    expect(result[0].quantity).toBe(1);
  });

  it('parses size modifier "large"', () => {
    const result = parseVoiceInput('large banana');
    expect(result[0].quantity).toBe(1.25);
    expect(result[0].unit).toBe('serving');
    expect(result[0].confidence).toBe(0.5);
  });

  it('parses size modifier "small"', () => {
    const result = parseVoiceInput('small apple');
    expect(result[0].quantity).toBe(0.75);
  });

  it('splits on "and"', () => {
    const result = parseVoiceInput('two eggs and 100g chicken');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('eggs');
    expect(result[1].name).toBe('chicken');
  });

  it('splits on comma', () => {
    const result = parseVoiceInput('eggs, toast, orange juice');
    expect(result).toHaveLength(3);
  });

  it('splits on "with"', () => {
    const result = parseVoiceInput('pasta with meatballs');
    expect(result).toHaveLength(2);
  });

  it('splits on "plus"', () => {
    const result = parseVoiceInput('salad plus bread');
    expect(result).toHaveLength(2);
  });

  it('handles "one" word number', () => {
    const result = parseVoiceInput('one scoop protein powder');
    expect(result[0].quantity).toBe(1);
    expect(result[0].unit).toBe('scoop');
    expect(result[0].name).toBe('protein powder');
  });

  it('handles "three" word number', () => {
    const result = parseVoiceInput('three slices bread');
    expect(result[0].quantity).toBe(3);
    expect(result[0].unit).toBe('slice');
  });

  it('parses "an apple"', () => {
    const result = parseVoiceInput('an apple');
    expect(result[0].quantity).toBe(1);
    expect(result[0].name).toBe('apple');
  });

  it('handles oz unit', () => {
    const result = parseVoiceInput('6oz salmon');
    expect(result[0].quantity).toBe(6);
    expect(result[0].unit).toBe('oz');
    expect(result[0].name).toBe('salmon');
  });

  it('handles tbsp unit', () => {
    const result = parseVoiceInput('2 tbsp peanut butter');
    expect(result[0].unit).toBe('tbsp');
  });

  it('confidence is 1.0 for numeric quantities', () => {
    const result = parseVoiceInput('200g rice');
    expect(result[0].confidence).toBe(1.0);
  });

  it('confidence is 0.7 for word number quantities', () => {
    const result = parseVoiceInput('five crackers');
    expect(result[0].confidence).toBe(0.7);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('parseVoiceInput — edge cases', () => {
  it('handles single word input', () => {
    const result = parseVoiceInput('apple');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('apple');
    expect(result[0].quantity).toBe(1);
  });

  it('handles mixed case input', () => {
    const result = parseVoiceInput('TWO EGGS AND 100G CHICKEN');
    expect(result).toHaveLength(2);
  });

  it('handles extra whitespace', () => {
    const result = parseVoiceInput('  two  eggs  ');
    expect(result[0].quantity).toBe(2);
    expect(result[0].name).toBe('eggs');
  });

  it('handles multi-word food names', () => {
    const result = parseVoiceInput('greek yogurt');
    expect(result[0].name).toBe('greek yogurt');
  });

  it('does not crash on very long input', () => {
    const input = Array(50).fill('an apple').join(' and ');
    expect(() => parseVoiceInput(input)).not.toThrow();
  });

  it('returns array with at least one item for any non-empty string', () => {
    const result = parseVoiceInput('xyz abc def');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles "a half" cup', () => {
    const result = parseVoiceInput('a half cup rice');
    expect(result[0].quantity).toBe(0.5);
  });

  it('handles grams spelled out', () => {
    const result = parseVoiceInput('150 grams chicken');
    expect(result[0].quantity).toBe(150);
    expect(result[0].unit).toBe('g');
  });
});
