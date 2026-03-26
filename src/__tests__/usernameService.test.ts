// Mock Firebase and Firestore before any imports
jest.mock('../services/firebase/index', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-uid-123' } },
}));

jest.mock('../services/firebase/firestore', () => ({
  COLLECTIONS: { PROFILE: 'profile' },
  mergeDocument: jest.fn(),
}));

jest.mock('../services/errorReporting', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

// Mock firebase/firestore transaction primitives
const mockRunTransaction = jest.fn();
const mockDoc = jest.fn(() => ({ path: 'mock/path' }));
const mockGetDoc = jest.fn();
const mockDeleteField = jest.fn(() => 'DELETE_SENTINEL');

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ path: 'mock/path' })),
  runTransaction: jest.fn((...args: unknown[]) => mockRunTransaction(...args)),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
  Timestamp: {
    now: jest.fn(() => ({ toMillis: () => Date.now(), seconds: 0, nanoseconds: 0 })),
    fromMillis: jest.fn((ms: number) => ({ toMillis: () => ms })),
  },
  getDoc: jest.fn((...args: unknown[]) => mockGetDoc(...args)),
  deleteField: jest.fn(() => mockDeleteField()),
}));

import {
  validateUsername,
  normaliseUsername,
  claimUsername,
  releaseUsername,
} from '../services/usernameService';

// ─── validateUsername ─────────────────────────────────────────────────────────

describe('validateUsername', () => {
  // ── Happy paths ──────────────────────────────────────────────────────────────

  it('accepts a valid simple username', () => {
    // pepmax is reserved — use a generic fitness handle instead
    expect(validateUsername('iron_athlete')).toEqual({ valid: true });
  });

  it('accepts a username with numbers', () => {
    expect(validateUsername('user123')).toEqual({ valid: true });
  });

  it('accepts a username exactly 3 characters', () => {
    expect(validateUsername('abc')).toEqual({ valid: true });
  });

  it('accepts a username exactly 20 characters', () => {
    expect(validateUsername('a'.repeat(20))).toEqual({ valid: true });
  });

  it('accepts mixed case (format only — normalisation is separate)', () => {
    // PepMax is reserved — use a different mixed-case handle
    expect(validateUsername('IronMax2024')).toEqual({ valid: true });
  });

  // ── Length boundary ───────────────────────────────────────────────────────────

  it('rejects username shorter than 3 characters', () => {
    const result = validateUsername('ab');
    expect(result.valid).toBe(false);
    expect((result as any).reason).toMatch(/at least 3/i);
  });

  it('rejects empty string', () => {
    const result = validateUsername('');
    expect(result.valid).toBe(false);
  });

  it('rejects username of 21 characters', () => {
    const result = validateUsername('a'.repeat(21));
    expect(result.valid).toBe(false);
    expect((result as any).reason).toMatch(/20 characters/i);
  });

  // ── Character rules ───────────────────────────────────────────────────────────

  it('rejects username with spaces', () => {
    const result = validateUsername('pep max');
    expect(result.valid).toBe(false);
  });

  it('rejects username with dashes', () => {
    const result = validateUsername('pep-max');
    expect(result.valid).toBe(false);
  });

  it('rejects username with @ symbol', () => {
    const result = validateUsername('@pepmax');
    expect(result.valid).toBe(false);
  });

  it('rejects username starting with underscore', () => {
    const result = validateUsername('_pepmax');
    expect(result.valid).toBe(false);
    expect((result as any).reason).toMatch(/start or end/i);
  });

  it('rejects username ending with underscore', () => {
    const result = validateUsername('pepmax_');
    expect(result.valid).toBe(false);
    expect((result as any).reason).toMatch(/start or end/i);
  });

  it('rejects username with consecutive underscores', () => {
    const result = validateUsername('pep__max');
    expect(result.valid).toBe(false);
    expect((result as any).reason).toMatch(/consecutive underscores/i);
  });

  // ── Blocklist ─────────────────────────────────────────────────────────────────

  it('rejects username containing "admin" (reserved)', () => {
    const result = validateUsername('superadmin');
    expect(result.valid).toBe(false);
    expect((result as any).reason).toMatch(/not available/i);
  });

  it('rejects username containing "pepmax" (reserved brand)', () => {
    const result = validateUsername('pepmax_official');
    expect(result.valid).toBe(false);
  });

  it('rejects offensive username (case-insensitive)', () => {
    const result = validateUsername('BigCUNT99');
    expect(result.valid).toBe(false);
    expect((result as any).reason).toMatch(/not available/i);
  });

  it('does not reject a clean username that merely sounds similar', () => {
    // "fan" does not contain any blocklist term
    expect(validateUsername('fitness_fan')).toEqual({ valid: true });
  });
});

// ─── normaliseUsername ────────────────────────────────────────────────────────

describe('normaliseUsername', () => {
  it('lowercases the input', () => {
    expect(normaliseUsername('PepMax')).toBe('pepmax');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normaliseUsername('  hello  ')).toBe('hello');
  });

  it('handles already-lowercase input', () => {
    expect(normaliseUsername('already_lower')).toBe('already_lower');
  });

  it('handles mixed case with underscores', () => {
    expect(normaliseUsername('Pep_Max_2024')).toBe('pep_max_2024');
  });
});

// ─── claimUsername ────────────────────────────────────────────────────────────

describe('claimUsername', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns error when username fails format validation', async () => {
    const result = await claimUsername('ab'); // too short
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/at least 3/i);
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('returns error when username contains offensive term', async () => {
    const result = await claimUsername('bigadmin');
    expect(result.error).toBeTruthy();
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('calls runTransaction for a valid username', async () => {
    mockRunTransaction.mockImplementationOnce(async (_db: unknown, fn: Function) => {
      const tx = {
        get: jest.fn().mockResolvedValue({ exists: () => false, data: () => ({}) }),
        set: jest.fn(),
      };
      await fn(tx);
    });

    const result = await claimUsername('valid_user');
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    expect(result.error).toBeNull();
  });

  it('returns error when username is already taken (reservation doc exists)', async () => {
    mockRunTransaction.mockImplementationOnce(async (_db: unknown, fn: Function) => {
      const tx = {
        get: jest.fn()
          .mockResolvedValueOnce({ exists: () => false, data: () => ({}) }) // profile read
          .mockResolvedValueOnce({ exists: () => true }),                    // username doc exists
        set: jest.fn(),
      };
      await fn(tx);
    });

    const result = await claimUsername('taken_name');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/already taken/i);
  });

  it('returns error when user is on cooldown', async () => {
    const recentChange = Date.now() - 1 * 24 * 60 * 60 * 1000; // 1 day ago
    mockRunTransaction.mockImplementationOnce(async (_db: unknown, fn: Function) => {
      const tx = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            lastUsernameChangeAt: { toMillis: () => recentChange },
          }),
        }),
        set: jest.fn(),
      };
      await fn(tx);
    });

    const result = await claimUsername('new_handle');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/day/i);
  });

  it('returns error when not authenticated', async () => {
    // Temporarily mock auth.currentUser as null
    const { auth } = require('../services/firebase/index');
    const originalUid = auth.currentUser;
    auth.currentUser = null;

    const result = await claimUsername('validname');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not authenticated/i);

    auth.currentUser = originalUid;
  });
});

// ─── releaseUsername ──────────────────────────────────────────────────────────

describe('releaseUsername', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls runTransaction to atomically release the username', async () => {
    mockRunTransaction.mockImplementationOnce(async (_db: unknown, fn: Function) => {
      const tx = {
        get: jest.fn()
          .mockResolvedValueOnce({
            exists: () => true,
            data: () => ({ username: 'my_handle' }),
          }) // profile read
          .mockResolvedValueOnce({
            exists: () => true,
            data: () => ({ uid: 'test-uid-123' }),
          }), // username doc read
        delete: jest.fn(),
        set: jest.fn(),
      };
      await fn(tx);
    });

    const result = await releaseUsername();
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    expect(result.error).toBeNull();
  });

  it('succeeds silently when profile has no username', async () => {
    mockRunTransaction.mockImplementationOnce(async (_db: unknown, fn: Function) => {
      const tx = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({}), // no username field
        }),
        delete: jest.fn(),
        set: jest.fn(),
      };
      await fn(tx);
    });

    const result = await releaseUsername();
    expect(result.error).toBeNull();
  });

  it('returns error on uid mismatch (reservation belongs to another user)', async () => {
    mockRunTransaction.mockImplementationOnce(async (_db: unknown, fn: Function) => {
      const tx = {
        get: jest.fn()
          .mockResolvedValueOnce({
            exists: () => true,
            data: () => ({ username: 'stolen_handle' }),
          })
          .mockResolvedValueOnce({
            exists: () => true,
            data: () => ({ uid: 'DIFFERENT_UID' }), // belongs to someone else
          }),
        delete: jest.fn(),
        set: jest.fn(),
      };
      await fn(tx);
    });

    const result = await releaseUsername();
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/mismatch/i);
  });

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await releaseUsername();
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not authenticated/i);

    auth.currentUser = original;
  });
});
