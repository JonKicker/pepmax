/**
 * Tests for challengeService.
 *
 * 18 tests covering:
 * - getActiveChallenges: filtered results
 * - getUpcomingChallenges: filtered results
 * - getCompletedChallenges: filtered + limit
 * - joinChallenge: creates participant doc + increments count
 * - joinChallenge: prevents double-join
 * - joinChallenge: unauthenticated error
 * - leaveChallenge: removes participant + decrements count
 * - leaveChallenge: unauthenticated error
 * - getChallengeDetail: found
 * - getChallengeDetail: not found
 * - getChallengeParticipants: orders by progress desc
 * - getMyProgress: returns user's participant doc
 * - getMyProgress: returns null when not joined
 * - updateChallengeProgress: increments progress
 * - updateChallengeProgress: unauthenticated error
 * - getMyActiveChallengeIds: returns joined challenge IDs
 * - getMyActiveChallengeIds: returns empty array when none
 * - Error handling: Firestore failure returns ServiceResult error
 */

// ── Mock Firebase modules ──────────────────────────────────────────────────────

jest.mock('../services/firebase/index', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-uid', displayName: 'test_user' } },
}));

jest.mock('../services/errorReporting', () => ({
  addBreadcrumb: jest.fn(),
}));

// ── firebase/firestore mock ───────────────────────────────────────────────────

const mockRunTransaction = jest.fn();
const mockWriteBatch = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockUpdateDoc = jest.fn();

const mockDoc = jest.fn((_db: unknown, ...segments: string[]) => ({
  path: segments.join('/'),
  id: segments.length > 0 ? segments[segments.length - 1] : 'auto-id',
  _segments: segments,
}));

const mockCollection = jest.fn((_db: unknown, ...segments: string[]) => ({
  path: segments.join('/'),
}));

const mockQuery = jest.fn((...args: unknown[]) => ({ type: 'query', args }));
const mockWhere = jest.fn((...args: unknown[]) => ({ type: 'where', args }));
const mockOrderBy = jest.fn((...args: unknown[]) => ({ type: 'orderBy', args }));
const mockLimit = jest.fn((n: number) => ({ type: 'limit', n }));
const mockIncrement = jest.fn((n: number) => ({ type: 'increment', n }));
const mockServerTimestamp = jest.fn(() => 'SERVER_TS');

const mockBatchDelete = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

function makeBatch() {
  return {
    delete: mockBatchDelete,
    update: mockBatchUpdate,
    commit: mockBatchCommit,
  };
}

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db: unknown, ...args: string[]) => mockDoc(_db, ...args)),
  getDoc: jest.fn((...args: unknown[]) => mockGetDoc(...args)),
  getDocs: jest.fn((...args: unknown[]) => mockGetDocs(...args)),
  setDoc: jest.fn().mockResolvedValue(undefined),
  updateDoc: jest.fn((...args: unknown[]) => mockUpdateDoc(...args)),
  runTransaction: jest.fn((_db: unknown, fn: (tx: unknown) => Promise<unknown>) =>
    mockRunTransaction(fn),
  ),
  writeBatch: jest.fn(() => mockWriteBatch()),
  collection: jest.fn((_db: unknown, ...args: string[]) => mockCollection(_db, ...args)),
  query: jest.fn((...args: unknown[]) => mockQuery(...args)),
  where: jest.fn((...args: unknown[]) => mockWhere(...args)),
  orderBy: jest.fn((...args: unknown[]) => mockOrderBy(...args)),
  limit: jest.fn((n: number) => mockLimit(n)),
  increment: jest.fn((n: number) => mockIncrement(n)),
  serverTimestamp: jest.fn(() => mockServerTimestamp()),
  Timestamp: {},
  deleteDoc: jest.fn().mockResolvedValue(undefined),
}));

// ── Import service after mocks ────────────────────────────────────────────────

import {
  getActiveChallenges,
  getUpcomingChallenges,
  getCompletedChallenges,
  joinChallenge,
  leaveChallenge,
  getChallengeDetail,
  getChallengeParticipants,
  getMyProgress,
  updateChallengeProgress,
  getMyActiveChallengeIds,
} from '../services/challengeService';
import type { ChallengeDoc, ChallengeParticipantDoc } from '../types/challenges';

// ── Factory helpers ───────────────────────────────────────────────────────────

function makeChallengeDoc(overrides: Partial<ChallengeDoc> = {}): ChallengeDoc {
  return {
    id: 'challenge-1',
    title: 'Summer Volume Blitz',
    description: 'Lift the most in 30 days',
    type: 'volume',
    status: 'active',
    targetValue: 10000,
    targetUnit: 'kg',
    xpReward: 150,
    startDate: { toDate: () => new Date('2026-06-01') } as any,
    endDate: { toDate: () => new Date('2026-06-30') } as any,
    participantCount: 42,
    category: 'Volume',
    createdAt: {} as any,
    updatedAt: {} as any,
    ...overrides,
  };
}

function makeParticipantDoc(overrides: Partial<ChallengeParticipantDoc> = {}): ChallengeParticipantDoc {
  return {
    uid: 'test-uid',
    username: 'test_user',
    displayHandle: '@test_user',
    progress: 500,
    joinedAt: {} as any,
    ...overrides,
  };
}

// ─── getActiveChallenges ──────────────────────────────────────────────────────

describe('getActiveChallenges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries for status == active and returns results', async () => {
    const challenge = makeChallengeDoc();
    mockGetDocs.mockResolvedValueOnce({
      docs: [{ id: 'challenge-1', data: () => challenge }],
    });

    const result = await getActiveChallenges();

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].id).toBe('challenge-1');
    expect(mockWhere).toHaveBeenCalledWith('status', '==', 'active');
    expect(mockOrderBy).toHaveBeenCalledWith('startDate', 'desc');
  });

  it('returns empty array when no active challenges', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    const result = await getActiveChallenges();
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await getActiveChallenges();
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not authenticated/i);

    auth.currentUser = original;
  });
});

// ─── getUpcomingChallenges ────────────────────────────────────────────────────

describe('getUpcomingChallenges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries for status == upcoming ordered by startDate asc', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        { id: 'c1', data: () => makeChallengeDoc({ id: 'c1', status: 'upcoming' }) },
        { id: 'c2', data: () => makeChallengeDoc({ id: 'c2', status: 'upcoming' }) },
      ],
    });

    const result = await getUpcomingChallenges();

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    expect(mockWhere).toHaveBeenCalledWith('status', '==', 'upcoming');
    expect(mockOrderBy).toHaveBeenCalledWith('startDate', 'asc');
  });
});

// ─── getCompletedChallenges ───────────────────────────────────────────────────

describe('getCompletedChallenges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries for status == completed with limit', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    await getCompletedChallenges(10);

    expect(mockWhere).toHaveBeenCalledWith('status', '==', 'completed');
    expect(mockOrderBy).toHaveBeenCalledWith('endDate', 'desc');
    expect(mockLimit).toHaveBeenCalledWith(10);
  });

  it('uses default limit of 20 when not specified', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    await getCompletedChallenges();

    expect(mockLimit).toHaveBeenCalledWith(20);
  });
});

// ─── joinChallenge ────────────────────────────────────────────────────────────

describe('joinChallenge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteBatch.mockReturnValue(makeBatch());
  });

  it('creates participant doc and increments count inside transaction', async () => {
    const txSet = jest.fn();
    const txUpdate = jest.fn();

    // publicProfile fetch (outside transaction)
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ username: 'test_user', displayHandle: '@test_user' }),
    });

    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        get: jest.fn().mockResolvedValueOnce({ exists: () => false }), // not yet joined
        set: txSet,
        update: txUpdate,
      };
      await fn(tx);
    });

    const result = await joinChallenge('challenge-1');

    expect(result.error).toBeNull();
    expect(txSet).toHaveBeenCalledTimes(1); // participant doc created
    expect(txUpdate).toHaveBeenCalledTimes(1); // participantCount incremented

    // Verify increment(-1) was NOT called (only +1 on join)
    const updateArg = txUpdate.mock.calls[0][1];
    expect(mockIncrement).toHaveBeenCalledWith(1);
  });

  it('prevents double-join when participant doc already exists', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ username: 'test_user', displayHandle: '@test_user' }),
    });

    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        get: jest.fn().mockResolvedValueOnce({ exists: () => true }), // already joined
        set: jest.fn(),
        update: jest.fn(),
      };
      await fn(tx);
    });

    const result = await joinChallenge('challenge-1');

    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/already joined/i);
  });

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await joinChallenge('challenge-1');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not authenticated/i);

    auth.currentUser = original;
  });

  it('sets username and displayHandle from public profile on participant doc', async () => {
    const txSet = jest.fn();

    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ username: 'powerlifter99', displayHandle: '@powerlifter99' }),
    });

    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        get: jest.fn().mockResolvedValueOnce({ exists: () => false }),
        set: txSet,
        update: jest.fn(),
      };
      await fn(tx);
    });

    await joinChallenge('challenge-1');

    const setArg = txSet.mock.calls[0][1];
    expect(setArg.username).toBe('powerlifter99');
    expect(setArg.displayHandle).toBe('@powerlifter99');
    expect(setArg.progress).toBe(0);
  });
});

// ─── leaveChallenge ───────────────────────────────────────────────────────────

describe('leaveChallenge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes participant doc and decrements participantCount when participant exists', async () => {
    const txDelete = jest.fn();
    const txUpdate = jest.fn();

    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        get: jest.fn().mockResolvedValueOnce({ exists: () => true }), // participant exists
        delete: txDelete,
        update: txUpdate,
      };
      await fn(tx);
    });

    const result = await leaveChallenge('challenge-1');

    expect(result.error).toBeNull();
    expect(txDelete).toHaveBeenCalledTimes(1);
    expect(txUpdate).toHaveBeenCalledTimes(1);
    expect(mockIncrement).toHaveBeenCalledWith(-1);
  });

  it('returns early without decrementing when participant doc does not exist', async () => {
    const txDelete = jest.fn();
    const txUpdate = jest.fn();

    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        get: jest.fn().mockResolvedValueOnce({ exists: () => false }), // already left
        delete: txDelete,
        update: txUpdate,
      };
      await fn(tx);
    });

    const result = await leaveChallenge('challenge-1');

    expect(result.error).toBeNull();
    expect(txDelete).not.toHaveBeenCalled();
    expect(txUpdate).not.toHaveBeenCalled();
  });

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await leaveChallenge('challenge-1');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not authenticated/i);

    auth.currentUser = original;
  });
});

// ─── getChallengeDetail ───────────────────────────────────────────────────────

describe('getChallengeDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the challenge when it exists', async () => {
    const challenge = makeChallengeDoc();
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'challenge-1',
      data: () => challenge,
    });

    const result = await getChallengeDetail('challenge-1');
    expect(result.error).toBeNull();
    expect(result.data?.title).toBe('Summer Volume Blitz');
  });

  it('returns error when challenge does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    const result = await getChallengeDetail('nonexistent');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not found/i);
    expect(result.data).toBeNull();
  });
});

// ─── getChallengeParticipants ─────────────────────────────────────────────────

describe('getChallengeParticipants', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('orders participants by progress desc', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        { id: 'uid-1', data: () => makeParticipantDoc({ uid: 'uid-1', progress: 800 }) },
        { id: 'uid-2', data: () => makeParticipantDoc({ uid: 'uid-2', progress: 400 }) },
      ],
    });

    const result = await getChallengeParticipants('challenge-1');

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    expect(mockOrderBy).toHaveBeenCalledWith('progress', 'desc');
  });

  it('uses default limit of 50 when not specified', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    await getChallengeParticipants('challenge-1');

    expect(mockLimit).toHaveBeenCalledWith(50);
  });
});

// ─── getMyProgress ────────────────────────────────────────────────────────────

describe('getMyProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the participant doc when joined', async () => {
    const participant = makeParticipantDoc({ progress: 750 });
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => participant,
    });

    const result = await getMyProgress('challenge-1');
    expect(result.error).toBeNull();
    expect(result.data?.progress).toBe(750);
  });

  it('returns null data (not an error) when not joined', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    const result = await getMyProgress('challenge-1');
    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });
});

// ─── updateChallengeProgress ──────────────────────────────────────────────────

describe('updateChallengeProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateDoc.mockResolvedValue(undefined);
  });

  it('calls updateDoc with increment on progress field', async () => {
    const result = await updateChallengeProgress('challenge-1', 250);

    expect(result.error).toBeNull();
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockIncrement).toHaveBeenCalledWith(250);

    const updateArg = mockUpdateDoc.mock.calls[0][1];
    expect(updateArg.progress).toEqual({ type: 'increment', n: 250 });
  });

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await updateChallengeProgress('challenge-1', 100);
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not authenticated/i);

    auth.currentUser = original;
  });

  it('returns error when Firestore throws', async () => {
    mockUpdateDoc.mockRejectedValueOnce(new Error('Network error'));

    const result = await updateChallengeProgress('challenge-1', 100);
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toBe('Network error');
  });

  it('returns error when progressDelta is zero', async () => {
    const result = await updateChallengeProgress('challenge-1', 0);
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/positive/i);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('returns error when progressDelta is negative', async () => {
    const result = await updateChallengeProgress('challenge-1', -50);
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/positive/i);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

// ─── getMyActiveChallengeIds ──────────────────────────────────────────────────

describe('getMyActiveChallengeIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns IDs of active challenges the user has joined', async () => {
    // Active challenges query
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [
        { id: 'c1', data: () => ({}) },
        { id: 'c2', data: () => ({}) },
      ],
    });

    // User joined c1 but not c2
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => true })   // c1 participant exists
      .mockResolvedValueOnce({ exists: () => false });  // c2 participant missing

    const result = await getMyActiveChallengeIds();

    expect(result.error).toBeNull();
    expect(result.data).toContain('c1');
    expect(result.data).not.toContain('c2');
  });

  it('returns empty array when no active challenges exist', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });

    const result = await getMyActiveChallengeIds();
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await getMyActiveChallengeIds();
    expect(result.error).toBeTruthy();

    auth.currentUser = original;
  });
});
