/**
 * Tests for compareService.
 *
 * 28 tests covering:
 * - getComparePrivacy: returns existing doc
 * - getComparePrivacy: creates with defaults when missing
 * - getComparePrivacy: unauthenticated error
 * - getComparePrivacy: Firestore failure returns ServiceResult error
 * - saveComparePrivacy: calls setDoc with merge and updatedAt
 * - saveComparePrivacy: unauthenticated error
 * - saveComparePrivacy: Firestore failure returns ServiceResult error
 * - blockUser: calls updateDoc with arrayUnion
 * - blockUser: prevents self-block
 * - blockUser: unauthenticated error
 * - blockUser: Firestore failure returns ServiceResult error
 * - unblockUser: calls updateDoc with arrayRemove
 * - unblockUser: unauthenticated error
 * - unblockUser: Firestore failure returns ServiceResult error
 * - isUserBlocked: returns true when uid in blockedUsers
 * - isUserBlocked: returns false when uid not in blockedUsers
 * - isUserBlocked: returns false for empty blockedUsers
 * - isUserBlocked: propagates getComparePrivacy error
 * - getMyCompareScores: returns scores when doc exists
 * - getMyCompareScores: returns null when doc missing
 * - getMyCompareScores: unauthenticated error
 * - getMyCompareScores: Firestore failure returns ServiceResult error
 * - getCompareScoresForUser: returns target's scores
 * - getCompareScoresForUser: returns null when target doc missing
 * - getCompareScoresForUser: returns error when target is blocked
 * - getCompareScoresForUser: unauthenticated error
 * - getCompareScoresForUser: Firestore failure returns ServiceResult error
 * - getCompareScoresForUser: returns ServiceResult error when privacy read fails
 */

// ── Mock Firebase modules ──────────────────────────────────────────────────────

jest.mock('../services/firebase/index', () => ({
  db: {},
  auth: { currentUser: { uid: 'my-uid' } },
}));

jest.mock('../services/errorReporting', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('../services/analytics', () => ({
  analytics: { track: jest.fn() },
  AnalyticsEvent: {
    COMPARE_PRIVACY_SAVED: 'compare_privacy_saved',
    COMPARE_USER_BLOCKED: 'compare_user_blocked',
    COMPARE_USER_UNBLOCKED: 'compare_user_unblocked',
  },
}));

// ── firebase/firestore mock ───────────────────────────────────────────────────

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn().mockResolvedValue(undefined);
const mockUpdateDoc = jest.fn().mockResolvedValue(undefined);
const mockServerTimestamp = jest.fn(() => 'SERVER_TS');
const mockArrayUnion = jest.fn((...args: unknown[]) => ({ type: 'arrayUnion', args }));
const mockArrayRemove = jest.fn((...args: unknown[]) => ({ type: 'arrayRemove', args }));
const mockDoc = jest.fn((_db: unknown, ...segments: string[]) => ({
  path: segments.join('/'),
  id: segments[segments.length - 1],
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db: unknown, ...args: string[]) => mockDoc(_db, ...args)),
  getDoc: jest.fn((...args: unknown[]) => mockGetDoc(...args)),
  setDoc: jest.fn((...args: unknown[]) => mockSetDoc(...args)),
  updateDoc: jest.fn((...args: unknown[]) => mockUpdateDoc(...args)),
  serverTimestamp: jest.fn(() => mockServerTimestamp()),
  arrayUnion: jest.fn((...args: unknown[]) => mockArrayUnion(...args)),
  arrayRemove: jest.fn((...args: unknown[]) => mockArrayRemove(...args)),
}));

// ── Import service after mocks ────────────────────────────────────────────────

import {
  getComparePrivacy,
  saveComparePrivacy,
  blockUser,
  unblockUser,
  isUserBlocked,
  getMyCompareScores,
  getCompareScoresForUser,
} from '../services/compareService';
import type { ComparePrivacy, CompareScores } from '../types/compare';

// ── Factory helpers ───────────────────────────────────────────────────────────

function makePrivacy(overrides: Partial<ComparePrivacy> = {}): ComparePrivacy {
  return {
    compareEnabled: true,
    showTraining: true,
    showCardio: true,
    showNutrition: true,
    showRecovery: true,
    showBodyComp: true,
    showPeptides: false,
    blockedUsers: [],
    createdAt: {} as any,
    updatedAt: {} as any,
    ...overrides,
  };
}

function makeScores(overrides: Partial<CompareScores> = {}): CompareScores {
  return {
    estimatedOneRepMax: 120.5,
    weeklyVolume: 4500,
    weeklyDistance: 25.3,
    avgPace: 5.42,
    avgDailyCalories: 2200,
    avgRecoveryScore: 78,
    bodyWeightTrend: 82.5,
    activePeptideCount: -1,
    strengthScore: 80,
    cardioScore: 70,
    nutritionConsistency: 65,
    overallConsistency: 72,
    xpPercentile: 55,
    computedAt: {} as any,
    updatedAt: {} as any,
    ...overrides,
  };
}

// ── Shared setup ──────────────────────────────────────────────────────────────

// Helper: reset auth to authenticated
function setAuth(uid: string | null) {
  const firebase = require('../services/firebase/index');
  firebase.auth.currentUser = uid ? { uid } : null;
}

beforeEach(() => {
  jest.clearAllMocks();
  setAuth('my-uid');
});

// ─── getComparePrivacy ────────────────────────────────────────────────────────

describe('getComparePrivacy', () => {
  it('returns existing privacy doc when it exists', async () => {
    const privacy = makePrivacy();
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => privacy });

    const result = await getComparePrivacy();

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ compareEnabled: true });
  });

  it('creates doc with defaults when missing and returns defaults', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    mockSetDoc.mockResolvedValueOnce(undefined);

    const result = await getComparePrivacy();

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.data!.compareEnabled).toBe(true);
    expect(result.data!.blockedUsers).toEqual([]);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });

  it('returns error when not authenticated', async () => {
    setAuth(null);

    const result = await getComparePrivacy();

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(result.error!.message).toMatch(/not authenticated/i);
  });

  it('returns ServiceResult error on Firestore failure', async () => {
    mockGetDoc.mockRejectedValueOnce(new Error('network error'));

    const result = await getComparePrivacy();

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(result.error!.message).toBe('network error');
  });
});

// ─── saveComparePrivacy ───────────────────────────────────────────────────────

describe('saveComparePrivacy', () => {
  it('calls setDoc with merge:true and updatedAt', async () => {
    const privacy = makePrivacy();
    const { createdAt, updatedAt, ...rest } = privacy;

    const result = await saveComparePrivacy(rest);

    expect(result.error).toBeNull();
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, writeData, options] = mockSetDoc.mock.calls[0];
    expect(writeData).toHaveProperty('updatedAt');
    expect(options).toEqual({ merge: true });
  });

  it('returns error when not authenticated', async () => {
    setAuth(null);

    const result = await saveComparePrivacy(makePrivacy());

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('returns ServiceResult error on Firestore failure', async () => {
    mockSetDoc.mockRejectedValueOnce(new Error('write failed'));

    const result = await saveComparePrivacy(makePrivacy());

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('write failed');
  });
});

// ─── blockUser ────────────────────────────────────────────────────────────────

describe('blockUser', () => {
  it('calls updateDoc with arrayUnion for targetUid', async () => {
    const result = await blockUser('target-uid');

    expect(result.error).toBeNull();
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, updateData] = mockUpdateDoc.mock.calls[0];
    expect(mockArrayUnion).toHaveBeenCalledWith('target-uid');
    expect(updateData).toHaveProperty('blockedUsers');
    expect(updateData).toHaveProperty('updatedAt');
  });

  it('returns error when trying to block yourself', async () => {
    const result = await blockUser('my-uid');

    expect(result.data).toBeNull();
    expect(result.error!.message).toMatch(/cannot block yourself/i);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('returns error when not authenticated', async () => {
    setAuth(null);

    const result = await blockUser('target-uid');

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('returns ServiceResult error on Firestore failure', async () => {
    mockUpdateDoc.mockRejectedValueOnce(new Error('update failed'));

    const result = await blockUser('target-uid');

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('update failed');
  });
});

// ─── unblockUser ──────────────────────────────────────────────────────────────

describe('unblockUser', () => {
  it('calls updateDoc with arrayRemove for targetUid', async () => {
    const result = await unblockUser('target-uid');

    expect(result.error).toBeNull();
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, updateData] = mockUpdateDoc.mock.calls[0];
    expect(mockArrayRemove).toHaveBeenCalledWith('target-uid');
    expect(updateData).toHaveProperty('blockedUsers');
  });

  it('returns error when not authenticated', async () => {
    setAuth(null);

    const result = await unblockUser('target-uid');

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('returns ServiceResult error on Firestore failure', async () => {
    mockUpdateDoc.mockRejectedValueOnce(new Error('update failed'));

    const result = await unblockUser('target-uid');

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('update failed');
  });
});

// ─── isUserBlocked ────────────────────────────────────────────────────────────

describe('isUserBlocked', () => {
  it('returns true when targetUid is in blockedUsers', async () => {
    const privacy = makePrivacy({ blockedUsers: ['blocked-uid', 'other-uid'] });
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => privacy });

    const result = await isUserBlocked('blocked-uid');

    expect(result.error).toBeNull();
    expect(result.data).toBe(true);
  });

  it('returns false when targetUid is not in blockedUsers', async () => {
    const privacy = makePrivacy({ blockedUsers: ['other-uid'] });
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => privacy });

    const result = await isUserBlocked('not-blocked-uid');

    expect(result.error).toBeNull();
    expect(result.data).toBe(false);
  });

  it('returns false for empty blockedUsers', async () => {
    const privacy = makePrivacy({ blockedUsers: [] });
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => privacy });

    const result = await isUserBlocked('any-uid');

    expect(result.error).toBeNull();
    expect(result.data).toBe(false);
  });

  it('propagates error from getComparePrivacy', async () => {
    mockGetDoc.mockRejectedValueOnce(new Error('read failed'));

    const result = await isUserBlocked('some-uid');

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });
});

// ─── getMyCompareScores ───────────────────────────────────────────────────────

describe('getMyCompareScores', () => {
  it('returns scores when doc exists', async () => {
    const scores = makeScores();
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => scores });

    const result = await getMyCompareScores();

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ estimatedOneRepMax: 120.5 });
  });

  it('returns null data when doc does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    const result = await getMyCompareScores();

    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });

  it('returns error when not authenticated', async () => {
    setAuth(null);

    const result = await getMyCompareScores();

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('returns ServiceResult error on Firestore failure', async () => {
    mockGetDoc.mockRejectedValueOnce(new Error('read failed'));

    const result = await getMyCompareScores();

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('read failed');
  });
});

// ─── getCompareScoresForUser ──────────────────────────────────────────────────

describe('getCompareScoresForUser', () => {
  it('returns target user scores when not blocked and doc exists', async () => {
    const myPrivacy = makePrivacy({ blockedUsers: [] });
    const targetScores = makeScores({ estimatedOneRepMax: 150 });

    // First getDoc: my privacy settings; second: target scores
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => myPrivacy })
      .mockResolvedValueOnce({ exists: () => true, data: () => targetScores });

    const result = await getCompareScoresForUser('target-uid');

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ estimatedOneRepMax: 150 });
  });

  it('returns null when target scores doc does not exist', async () => {
    const myPrivacy = makePrivacy({ blockedUsers: [] });

    mockGetDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => myPrivacy })
      .mockResolvedValueOnce({ exists: () => false });

    const result = await getCompareScoresForUser('target-uid');

    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });

  it('returns error when targetUid is in blockedUsers', async () => {
    const myPrivacy = makePrivacy({ blockedUsers: ['target-uid'] });
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => myPrivacy });

    const result = await getCompareScoresForUser('target-uid');

    expect(result.data).toBeNull();
    expect(result.error!.message).toMatch(/blocked/i);
    // Should NOT have fetched target's scores
    expect(mockGetDoc).toHaveBeenCalledTimes(1);
  });

  it('returns error when not authenticated', async () => {
    setAuth(null);

    const result = await getCompareScoresForUser('target-uid');

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('returns ServiceResult error on Firestore failure during scores read', async () => {
    const myPrivacy = makePrivacy({ blockedUsers: [] });
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => myPrivacy })
      .mockRejectedValueOnce(new Error('scores read failed'));

    const result = await getCompareScoresForUser('target-uid');

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('scores read failed');
  });

  it('returns ServiceResult error when privacy read fails', async () => {
    mockGetDoc.mockRejectedValueOnce(new Error('privacy read failed'));

    const result = await getCompareScoresForUser('target-uid');

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });
});
