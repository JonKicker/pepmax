/**
 * Tests for src/utils/instagramValidation.ts
 *
 * Covers: sanitizeInstagramHandle + isValidInstagramHandle
 * Tests: happy path, edge cases, error paths
 */

import {
  sanitizeInstagramHandle,
  isValidInstagramHandle,
  INSTAGRAM_MAX_LENGTH,
} from '../utils/instagramValidation';

// ─── sanitizeInstagramHandle ─────────────────────────────────────────────────

describe('sanitizeInstagramHandle', () => {
  // Happy path
  it('strips leading @ symbol', () => {
    expect(sanitizeInstagramHandle('@johndoe')).toBe('johndoe');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeInstagramHandle('  johndoe  ')).toBe('johndoe');
  });

  it('lowercases the handle', () => {
    expect(sanitizeInstagramHandle('JohnDoe')).toBe('johndoe');
  });

  it('handles @ plus whitespace and uppercase', () => {
    expect(sanitizeInstagramHandle('  @JohnDoe  ')).toBe('johndoe');
  });

  it('preserves underscores and periods', () => {
    expect(sanitizeInstagramHandle('@john.doe_99')).toBe('john.doe_99');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeInstagramHandle('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(sanitizeInstagramHandle('   ')).toBe('');
  });

  // Edge cases
  it('does not strip @ in the middle of the handle', () => {
    // Instagram handles cannot actually contain @, but sanitize should not
    // strip it from mid-string — validation will reject it anyway
    expect(sanitizeInstagramHandle('john@doe')).toBe('john@doe');
  });

  it('handles non-string input gracefully', () => {
    // @ts-expect-error — testing runtime safety
    expect(sanitizeInstagramHandle(null)).toBe('');
    // @ts-expect-error
    expect(sanitizeInstagramHandle(undefined)).toBe('');
    // @ts-expect-error
    expect(sanitizeInstagramHandle(42)).toBe('');
  });

  it('does not double-strip @ if already stripped', () => {
    expect(sanitizeInstagramHandle('johndoe')).toBe('johndoe');
  });
});

// ─── isValidInstagramHandle ───────────────────────────────────────────────────

describe('isValidInstagramHandle — happy path', () => {
  it('accepts a simple lowercase handle', () => {
    expect(isValidInstagramHandle('johndoe')).toBe(true);
  });

  it('accepts handle with underscore', () => {
    expect(isValidInstagramHandle('john_doe')).toBe(true);
  });

  it('accepts handle with period in the middle', () => {
    expect(isValidInstagramHandle('john.doe')).toBe(true);
  });

  it('accepts handle with numbers', () => {
    expect(isValidInstagramHandle('user123')).toBe(true);
  });

  it('accepts a single character handle', () => {
    expect(isValidInstagramHandle('a')).toBe(true);
  });

  it('accepts exactly 30 characters', () => {
    expect(isValidInstagramHandle('a'.repeat(INSTAGRAM_MAX_LENGTH))).toBe(true);
  });

  it('rejects unsanitized uppercase (caller must sanitize first)', () => {
    expect(isValidInstagramHandle('JohnDoe')).toBe(false);
  });

  it('accepts handle with period and underscore combined', () => {
    expect(isValidInstagramHandle('john.doe_99')).toBe(true);
  });
});

describe('isValidInstagramHandle — error paths', () => {
  it('rejects empty string', () => {
    expect(isValidInstagramHandle('')).toBe(false);
  });

  it('rejects handle longer than 30 characters', () => {
    expect(isValidInstagramHandle('a'.repeat(31))).toBe(false);
  });

  it('rejects handle starting with a period', () => {
    expect(isValidInstagramHandle('.johndoe')).toBe(false);
  });

  it('rejects handle ending with a period', () => {
    expect(isValidInstagramHandle('johndoe.')).toBe(false);
  });

  it('rejects handle with consecutive periods', () => {
    expect(isValidInstagramHandle('john..doe')).toBe(false);
  });

  it('rejects handle containing @', () => {
    expect(isValidInstagramHandle('@johndoe')).toBe(false);
  });

  it('rejects handle with spaces', () => {
    expect(isValidInstagramHandle('john doe')).toBe(false);
  });

  it('rejects handle with special characters', () => {
    expect(isValidInstagramHandle('john#doe')).toBe(false);
    expect(isValidInstagramHandle('john!doe')).toBe(false);
    expect(isValidInstagramHandle('john-doe')).toBe(false);
  });

  it('rejects handle with emoji', () => {
    expect(isValidInstagramHandle('john🔥')).toBe(false);
  });

  it('rejects non-string input', () => {
    // @ts-expect-error — testing runtime safety
    expect(isValidInstagramHandle(null)).toBe(false);
    // @ts-expect-error
    expect(isValidInstagramHandle(undefined)).toBe(false);
    // @ts-expect-error
    expect(isValidInstagramHandle(123)).toBe(false);
  });
});

// ─── sanitize → validate integration ─────────────────────────────────────────

describe('sanitize then validate — integration', () => {
  it('sanitized @JohnDoe passes validation', () => {
    const sanitized = sanitizeInstagramHandle('@JohnDoe');
    expect(isValidInstagramHandle(sanitized)).toBe(true);
  });

  it('sanitized empty string fails validation', () => {
    const sanitized = sanitizeInstagramHandle('   ');
    expect(isValidInstagramHandle(sanitized)).toBe(false);
  });

  it('sanitized handle with invalid chars still fails validation', () => {
    const sanitized = sanitizeInstagramHandle('@john#doe');
    expect(isValidInstagramHandle(sanitized)).toBe(false);
  });

  it('sanitized 31-char handle fails validation', () => {
    const sanitized = sanitizeInstagramHandle('@' + 'a'.repeat(31));
    expect(isValidInstagramHandle(sanitized)).toBe(false);
  });
});
