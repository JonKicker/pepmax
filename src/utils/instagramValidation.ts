/**
 * Instagram handle validation utilities.
 *
 * Instagram rules (as of 2024):
 *   - Allowed characters: letters, numbers, underscores, periods
 *   - Length: 1–30 characters
 *   - Cannot start or end with a period
 *   - No consecutive periods
 *
 * We enforce a safe subset: alphanumeric + underscore + period, 1–30 chars.
 * The "no consecutive periods / no leading or trailing period" rules are
 * enforced here to prevent obviously invalid handles slipping through.
 */

/** Max handle length as enforced by Instagram */
export const INSTAGRAM_MAX_LENGTH = 30;

/**
 * Strips a leading "@" symbol, trims whitespace, and lowercases the handle.
 * Safe to call on any user input — never throws.
 *
 * @example
 *   sanitizeInstagramHandle('@JohnDoe ') → 'johndoe'
 *   sanitizeInstagramHandle('jane.doe')  → 'jane.doe'
 */
export function sanitizeInstagramHandle(input: string): string {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/^@/, '').toLowerCase();
}

/**
 * Returns true when `handle` is a syntactically valid Instagram handle.
 *
 * Rules enforced:
 *   1. Only alphanumeric characters, underscores, and periods
 *   2. Length 1–30 characters
 *   3. Must not start with a period
 *   4. Must not end with a period
 *   5. Must not contain consecutive periods (..)
 *
 * Does NOT guarantee the account exists on Instagram.
 *
 * @example
 *   isValidInstagramHandle('john_doe')   → true
 *   isValidInstagramHandle('john.doe')   → true
 *   isValidInstagramHandle('.johndoe')   → false  (starts with period)
 *   isValidInstagramHandle('john..doe')  → false  (consecutive periods)
 *   isValidInstagramHandle('')           → false
 *   isValidInstagramHandle('a'.repeat(31)) → false  (too long)
 */
export function isValidInstagramHandle(handle: string): boolean {
  if (typeof handle !== 'string') return false;
  if (handle.length < 1 || handle.length > INSTAGRAM_MAX_LENGTH) return false;

  // Only allowed characters
  if (!/^[a-z0-9_.]+$/.test(handle)) return false;

  // Must not start with a period
  if (handle.startsWith('.')) return false;

  // Must not end with a period
  if (handle.endsWith('.')) return false;

  // Must not contain consecutive periods
  if (handle.includes('..')) return false;

  return true;
}
