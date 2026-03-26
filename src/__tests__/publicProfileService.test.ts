// Mock Firebase modules before any imports
jest.mock('../services/firebase/index', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-uid-123' } },
}));

jest.mock('../services/errorReporting', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('../utils/rankTier', () => ({
  getTierForXP: jest.fn((xp: number) => ({ tier: xp >= 1000 ? 'gold' : 'bronze' })),
}));

// ── communityFirestore mock ────────────────────────────────────────────────────

const mockGetGlobalDocument = jest.fn();
const mockQueryGlobalDocuments = jest.fn();
const mockUpdateGlobalDocument = jest.fn();

jest.mock('../services/firebase/communityFirestore', () => ({
  getGlobalDocument: jest.fn((...args: unknown[]) => mockGetGlobalDocument(...args)),
  queryGlobalDocuments: jest.fn((...args: unknown[]) => mockQueryGlobalDocuments(...args)),
  updateGlobalDocument: jest.fn((...args: unknown[]) => mockUpdateGlobalDocument(...args)),
}));

// ── firebase/firestore mock ────────────────────────────────────────────────────

const mockSetDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockDoc = jest.fn(() => ({ path: 'mock/doc/path' }));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ path: 'mock/doc/path' })),
  setDoc: jest.fn((...args: unknown[]) => mockSetDoc(...args)),
  getDoc: jest.fn((...args: unknown[]) => mockGetDoc(...args)),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
  where: jest.fn((...args: unknown[]) => ({ type: 'where', args })),
  orderBy: jest.fn((...args: unknown[]) => ({ type: 'orderBy', args })),
  startAt: jest.fn((...args: unknown[]) => ({ type: 'startAt', args })),
  endAt: jest.fn((...args: unknown[]) => ({ type: 'endAt', args })),
  limit: jest.fn((n: number) => ({ type: 'limit', n })),
}));

import {
  upsertPublicProfile,
  updatePublicProfile,
  searchByUsername,
} from '../services/publicProfileService';
import type { PublicProfile } from '../types/social';

// ─── Factory helpers ──────────────────────────────────────────────────────────

function makeProfile(overrides: Partial<Omit<PublicProfile, 'createdAt' | 'updatedAt'>> = {}): Omit<PublicProfile, 'createdAt' | 'updatedAt'> {
  return {
    uid: 'test-uid-123',
    username: 'iron_athlete',
    displayHandle: 'iron_athlete',
    totalXP: 500,
    level: 5,
    tier: 'bronze',
    featuredStat: 'totalXP',
    topAchievementIds: [],
    leaderboardOptOut: false,
    ...overrides,
  };
}

// ─── upsertPublicProfile ──────────────────────────────────────────────────────

describe('upsertPublicProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Happy path — new doc (createdAt included) ─────────────────────────────

  it('sets createdAt when the document does not exist yet', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    mockSetDoc.mockResolvedValueOnce(undefined);

    const result = await upsertPublicProfile(makeProfile());

    expect(result.error).toBeNull();
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, payload] = mockSetDoc.mock.calls[0];
    expect(payload.createdAt).toBe('SERVER_TS');
    expect(payload.updatedAt).toBe('SERVER_TS');
  });

  // ── Happy path — existing doc (createdAt NOT overwritten) ─────────────────

  it('omits createdAt when the document already exists', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => true });
    mockSetDoc.mockResolvedValueOnce(undefined);

    const result = await upsertPublicProfile(makeProfile());

    expect(result.error).toBeNull();
    const [, payload] = mockSetDoc.mock.calls[0];
    expect(payload.createdAt).toBeUndefined();
    expect(payload.updatedAt).toBe('SERVER_TS');
  });

  // ── PII guard ─────────────────────────────────────────────────────────────

  it('does not include PII fields (email, firstName, lastName) in the payload', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    mockSetDoc.mockResolvedValueOnce(undefined);

    await upsertPublicProfile(makeProfile());

    const [, payload] = mockSetDoc.mock.calls[0];
    expect(payload.email).toBeUndefined();
    expect(payload.firstName).toBeUndefined();
    expect(payload.lastName).toBeUndefined();
    expect(payload.phone).toBeUndefined();
  });

  // ── UID mismatch guard ────────────────────────────────────────────────────

  it('returns error when uid does not match the authenticated user', async () => {
    const result = await upsertPublicProfile(makeProfile({ uid: 'different-uid' }));
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/uid mismatch/i);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  // ── Not authenticated ─────────────────────────────────────────────────────

  it('returns error when user is not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await upsertPublicProfile(makeProfile());
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not authenticated/i);

    auth.currentUser = original;
  });

  // ── Firestore error propagation ───────────────────────────────────────────

  it('returns error when setDoc throws', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    mockSetDoc.mockRejectedValueOnce(new Error('Firestore write failed'));

    const result = await upsertPublicProfile(makeProfile());
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/firestore write failed/i);
  });
});

// ─── updatePublicProfile ──────────────────────────────────────────────────────

describe('updatePublicProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('calls updateGlobalDocument with the provided fields', async () => {
    mockUpdateGlobalDocument.mockResolvedValueOnce({ data: undefined, error: null });

    const result = await updatePublicProfile({ leaderboardOptOut: true, totalXP: 1200 });

    expect(result.error).toBeNull();
    expect(mockUpdateGlobalDocument).toHaveBeenCalledTimes(1);
    const [collection, uid, update] = mockUpdateGlobalDocument.mock.calls[0];
    expect(collection).toBe('publicProfiles');
    expect(uid).toBe('test-uid-123');
    expect(update.leaderboardOptOut).toBe(true);
    expect(update.totalXP).toBe(1200);
  });

  // ── Partial update (only leaderboardOptOut) ───────────────────────────────

  it('passes only the fields provided — does not include unspecified fields', async () => {
    mockUpdateGlobalDocument.mockResolvedValueOnce({ data: undefined, error: null });

    await updatePublicProfile({ leaderboardOptOut: false });

    const [, , update] = mockUpdateGlobalDocument.mock.calls[0];
    expect(Object.keys(update)).toEqual(['leaderboardOptOut']);
  });

  // ── Not authenticated ─────────────────────────────────────────────────────

  it('returns error when user is not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await updatePublicProfile({ leaderboardOptOut: true });
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not authenticated/i);

    auth.currentUser = original;
  });

  // ── Firestore error propagation ───────────────────────────────────────────

  it('surfaces errors from updateGlobalDocument', async () => {
    mockUpdateGlobalDocument.mockResolvedValueOnce({
      data: null,
      error: new Error('Firestore update failed'),
    });

    const result = await updatePublicProfile({ totalXP: 100 });
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/firestore update failed/i);
  });
});

// ─── searchByUsername ─────────────────────────────────────────────────────────

describe('searchByUsername', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns matching leaderboard entries for a valid prefix', async () => {
    mockQueryGlobalDocuments.mockResolvedValueOnce({
      data: {
        data: [
          {
            uid: 'uid-1',
            username: 'iron_athlete',
            displayHandle: 'iron_athlete',
            totalXP: 800,
            level: 8,
            tier: 'silver',
          },
        ],
      },
      error: null,
    });

    const result = await searchByUsername('iron');

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data![0].username).toBe('iron_athlete');
    expect(mockQueryGlobalDocuments).toHaveBeenCalledTimes(1);
  });

  // ── Limit cap verification ─────────────────────────────────────────────────
  // The hard cap is 20. We verify the limit() constraint is applied.

  it('passes a limit(20) constraint to prevent bulk enumeration', async () => {
    mockQueryGlobalDocuments.mockResolvedValueOnce({ data: { data: [] }, error: null });

    await searchByUsername('test');

    const [, constraints] = mockQueryGlobalDocuments.mock.calls[0];
    const limitConstraint = constraints.find((c: any) => c.type === 'limit');
    expect(limitConstraint).toBeDefined();
    expect(limitConstraint.n).toBe(20);
  });

  // ── Empty / whitespace prefix ─────────────────────────────────────────────

  it('returns empty array for empty prefix without hitting Firestore', async () => {
    const result = await searchByUsername('');
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
    expect(mockQueryGlobalDocuments).not.toHaveBeenCalled();
  });

  it('returns empty array for whitespace-only prefix without hitting Firestore', async () => {
    const result = await searchByUsername('   ');
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
    expect(mockQueryGlobalDocuments).not.toHaveBeenCalled();
  });

  // ── Firestore error propagation ───────────────────────────────────────────

  it('returns error when Firestore query fails', async () => {
    mockQueryGlobalDocuments.mockResolvedValueOnce({
      data: null,
      error: new Error('Index not found'),
    });

    const result = await searchByUsername('iron');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/index not found/i);
  });

  // ── LeaderboardEntry shape ─────────────────────────────────────────────────

  it('maps PublicProfile to LeaderboardEntry shape (omits PII / extra fields)', async () => {
    mockQueryGlobalDocuments.mockResolvedValueOnce({
      data: {
        data: [
          {
            uid: 'uid-2',
            username: 'gainz_king',
            displayHandle: 'gainz_king',
            totalXP: 2500,
            level: 15,
            tier: 'gold',
            // These extra fields should NOT appear in LeaderboardEntry
            featuredStat: 'workouts',
            topAchievementIds: ['ach1', 'ach2'],
            leaderboardOptOut: false,
          },
        ],
      },
      error: null,
    });

    const result = await searchByUsername('gainz');

    expect(result.error).toBeNull();
    const entry = result.data![0];
    expect(entry.uid).toBe('uid-2');
    expect(entry.username).toBe('gainz_king');
    expect(entry.totalXP).toBe(2500);
    expect(entry.level).toBe(15);
    expect(entry.tier).toBe('gold');
    // These should not be present on a LeaderboardEntry
    expect((entry as any).featuredStat).toBeUndefined();
    expect((entry as any).topAchievementIds).toBeUndefined();
    expect((entry as any).leaderboardOptOut).toBeUndefined();
  });
});
