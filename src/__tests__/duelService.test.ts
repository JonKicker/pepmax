/**
 * duelService.test.ts
 *
 * Tests for src/services/duelService.ts
 *
 * Mock strategy mirrors friendService.test.ts:
 *   - firebase/index mocked for db/auth
 *   - firebase/firestore mocked for all SDK calls
 *   - errorReporting + @sentry/react-native mocked to no-ops
 */

// ── Module mocks (must come before imports) ────────────────────────────────────

jest.mock('../services/firebase/index', () => ({
  db: {},
  auth: { currentUser: { uid: 'my-uid' } },
}));

jest.mock('../services/errorReporting', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

// ── firebase/firestore mock ────────────────────────────────────────────────────

const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockAddDoc = jest.fn();
const mockQuery = jest.fn((...args: unknown[]) => ({ _type: 'query', args }));
const mockCollection = jest.fn((_db: unknown, ...segments: string[]) => ({
  _type: 'collection',
  path: segments.join('/'),
}));
const mockWhere = jest.fn((...args: unknown[]) => ({ _type: 'where', args }));
const mockOrderBy = jest.fn((...args: unknown[]) => ({ _type: 'orderBy', args }));
const mockServerTimestamp = jest.fn(() => 'SERVER_TS');
const mockIncrement = jest.fn((n: number) => ({ _type: 'increment', n }));

const mockDoc = jest.fn((_db: unknown, ...segments: string[]) => ({
  path: segments.join('/'),
  _segments: segments,
}));

// runTransaction mock: runs the callback synchronously with a fake transaction
const mockTxGet = jest.fn();
const mockTxUpdate = jest.fn();

const mockRunTransaction = jest.fn(
  async (_db: unknown, fn: (tx: unknown) => Promise<void>) => {
    const tx = {
      get: mockTxGet,
      update: mockTxUpdate,
    };
    await fn(tx);
  },
);

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db: unknown, ...segments: string[]) => mockDoc(_db, ...segments)),
  getDoc: jest.fn((...args: unknown[]) => mockGetDoc(...args)),
  getDocs: jest.fn((...args: unknown[]) => mockGetDocs(...args)),
  addDoc: jest.fn((...args: unknown[]) => mockAddDoc(...args)),
  collection: jest.fn((_db: unknown, ...segments: string[]) => mockCollection(_db, ...segments)),
  query: jest.fn((...args: unknown[]) => mockQuery(...args)),
  where: jest.fn((...args: unknown[]) => mockWhere(...args)),
  orderBy: jest.fn((...args: unknown[]) => mockOrderBy(...args)),
  serverTimestamp: jest.fn(() => mockServerTimestamp()),
  increment: jest.fn((n: number) => mockIncrement(n)),
  runTransaction: jest.fn(
    async (db: unknown, fn: (tx: unknown) => Promise<void>) => mockRunTransaction(db, fn),
  ),
  Timestamp: {
    now: jest.fn(() => ({ toMillis: () => Date.now(), _type: 'Timestamp' })),
    fromMillis: jest.fn((ms: number) => ({ toMillis: () => ms, _type: 'Timestamp' })),
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import {
  createDuel,
  acceptDuel,
  declineDuel,
  getMyDuels,
  getDuelDetail,
  updateMyDuelProgress,
  getActiveDuelIds,
} from '../services/duelService';
import type { DuelDoc } from '../types/challenges';

// ── Factory helpers ───────────────────────────────────────────────────────────

function makeDuelDoc(overrides: Partial<DuelDoc> = {}): DuelDoc {
  return {
    id: 'duel-123',
    challengerUid: 'my-uid',
    opponentUid: 'opponent-uid',
    challengerUsername: 'challenger_user',
    opponentUsername: 'opponent_user',
    metric: 'volume_lifted',
    durationWeeks: 1,
    status: 'pending',
    challengerProgress: 0,
    opponentProgress: 0,
    winnerId: undefined,
    startDate: undefined,
    endDate: undefined,
    createdAt: {} as any,
    updatedAt: {} as any,
    ...overrides,
  };
}

// ── createDuel ────────────────────────────────────────────────────────────────

describe('createDuel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a duel doc with correct fields', async () => {
    // publicProfiles for challenger + opponent
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ username: 'challenger_user' }) })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ username: 'opponent_user' }) });

    mockAddDoc.mockResolvedValueOnce({ id: 'new-duel-id' });

    const result = await createDuel('opponent-uid', 'volume_lifted', 1);

    expect(result.error).toBeNull();
    expect(result.data).toBe('new-duel-id');

    const addCall = mockAddDoc.mock.calls[0];
    const duelData = addCall[1];
    expect(duelData.challengerUid).toBe('my-uid');
    expect(duelData.opponentUid).toBe('opponent-uid');
    expect(duelData.metric).toBe('volume_lifted');
    expect(duelData.durationWeeks).toBe(1);
    expect(duelData.status).toBe('pending');
    expect(duelData.challengerProgress).toBe(0);
    expect(duelData.opponentProgress).toBe(0);
    expect(duelData.winnerId).toBeNull();
  });

  it('sets correct usernames from publicProfiles', async () => {
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ username: 'my_handle' }) })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ username: 'their_handle' }) });

    mockAddDoc.mockResolvedValueOnce({ id: 'duel-abc' });

    const result = await createDuel('opponent-uid', 'xp_earned', 2);

    expect(result.error).toBeNull();
    const addCall = mockAddDoc.mock.calls[0];
    const duelData = addCall[1];
    expect(duelData.challengerUsername).toBe('my_handle');
    expect(duelData.opponentUsername).toBe('their_handle');
    expect(duelData.durationWeeks).toBe(2);
  });

  it('prevents self-duel', async () => {
    const result = await createDuel('my-uid', 'volume_lifted', 1);
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/yourself/i);
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await createDuel('opponent-uid', 'volume_lifted', 1);
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not authenticated/i);

    auth.currentUser = original;
  });

  it('falls back to empty string username when publicProfile does not exist', async () => {
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false })
      .mockResolvedValueOnce({ exists: () => false });
    mockAddDoc.mockResolvedValueOnce({ id: 'duel-empty' });

    const result = await createDuel('opponent-uid', 'distance_run', 1);
    expect(result.error).toBeNull();
    const duelData = mockAddDoc.mock.calls[0][1];
    expect(duelData.challengerUsername).toBe('');
    expect(duelData.opponentUsername).toBe('');
  });

  it('returns error when addDoc throws', async () => {
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false })
      .mockResolvedValueOnce({ exists: () => false });
    mockAddDoc.mockRejectedValueOnce(new Error('Firestore write failed'));

    const result = await createDuel('opponent-uid', 'volume_lifted', 1);
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/write failed/i);
  });
});

// ── acceptDuel ────────────────────────────────────────────────────────────────

describe('acceptDuel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts a pending duel when caller is the opponent', async () => {
    const duel = makeDuelDoc({ status: 'pending', opponentUid: 'my-uid' });
    mockTxGet.mockResolvedValueOnce({ exists: () => true, data: () => duel });

    const result = await acceptDuel('duel-123');

    expect(result.error).toBeNull();
    expect(mockTxUpdate).toHaveBeenCalledTimes(1);

    const updateCall = mockTxUpdate.mock.calls[0];
    const updateData = updateCall[1];
    expect(updateData.status).toBe('active');
    expect(updateData.startDate).toBeDefined();
    expect(updateData.endDate).toBeDefined();
  });

  it('sets endDate to startDate + durationWeeks * 7 days', async () => {
    const duel = makeDuelDoc({ status: 'pending', opponentUid: 'my-uid', durationWeeks: 2 });
    mockTxGet.mockResolvedValueOnce({ exists: () => true, data: () => duel });

    await acceptDuel('duel-123');

    // startDate + 14 days
    const updateData = mockTxUpdate.mock.calls[0][1];
    const startMs = updateData.startDate.toMillis();
    const endMs = updateData.endDate.toMillis();
    const diffDays = (endMs - startMs) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(14, 0);
  });

  it('requires caller to be the opponent', async () => {
    // duel's opponentUid is someone else
    const duel = makeDuelDoc({ status: 'pending', opponentUid: 'other-uid' });
    mockTxGet.mockResolvedValueOnce({ exists: () => true, data: () => duel });

    const result = await acceptDuel('duel-123');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/opponent/i);
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('requires pending status', async () => {
    const duel = makeDuelDoc({ status: 'active', opponentUid: 'my-uid' });
    mockTxGet.mockResolvedValueOnce({ exists: () => true, data: () => duel });

    const result = await acceptDuel('duel-123');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/active/i);
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('returns error when duel not found', async () => {
    mockTxGet.mockResolvedValueOnce({ exists: () => false });

    const result = await acceptDuel('nonexistent-duel');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not found/i);
  });

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await acceptDuel('duel-123');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not authenticated/i);

    auth.currentUser = original;
  });
});

// ── declineDuel ───────────────────────────────────────────────────────────────

describe('declineDuel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('declines a pending duel when caller is the opponent', async () => {
    const duel = makeDuelDoc({ status: 'pending', opponentUid: 'my-uid' });
    mockTxGet.mockResolvedValueOnce({ exists: () => true, data: () => duel });

    const result = await declineDuel('duel-123');

    expect(result.error).toBeNull();
    expect(mockTxUpdate).toHaveBeenCalledTimes(1);
    expect(mockTxUpdate.mock.calls[0][1].status).toBe('declined');
  });

  it('requires caller to be the opponent', async () => {
    const duel = makeDuelDoc({ status: 'pending', opponentUid: 'other-uid' });
    mockTxGet.mockResolvedValueOnce({ exists: () => true, data: () => duel });

    const result = await declineDuel('duel-123');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/opponent/i);
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('requires pending status', async () => {
    const duel = makeDuelDoc({ status: 'active', opponentUid: 'my-uid' });
    mockTxGet.mockResolvedValueOnce({ exists: () => true, data: () => duel });

    const result = await declineDuel('duel-123');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/active/i);
  });

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await declineDuel('duel-123');
    expect(result.error).toBeTruthy();

    auth.currentUser = original;
  });
});

// ── getMyDuels ────────────────────────────────────────────────────────────────

describe('getMyDuels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns duels for both challenger and opponent roles merged', async () => {
    const challengerDuel = makeDuelDoc({ id: 'duel-a', challengerUid: 'my-uid' });
    const opponentDuel = makeDuelDoc({ id: 'duel-b', opponentUid: 'my-uid' });

    // First getDocs call: challenger query; second: opponent query
    mockGetDocs
      .mockResolvedValueOnce({ docs: [{ id: 'duel-a', data: () => challengerDuel }] })
      .mockResolvedValueOnce({ docs: [{ id: 'duel-b', data: () => opponentDuel }] });

    const result = await getMyDuels();

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    const ids = result.data!.map((d) => d.id);
    expect(ids).toContain('duel-a');
    expect(ids).toContain('duel-b');
  });

  it('deduplicates docs that appear in both queries', async () => {
    const duel = makeDuelDoc({ id: 'duel-dup', challengerUid: 'my-uid', opponentUid: 'my-uid' });

    mockGetDocs
      .mockResolvedValueOnce({ docs: [{ id: 'duel-dup', data: () => duel }] })
      .mockResolvedValueOnce({ docs: [{ id: 'duel-dup', data: () => duel }] });

    const result = await getMyDuels();

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
  });

  it('applies status filter when provided', async () => {
    mockGetDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] });

    const result = await getMyDuels('active');

    expect(result.error).toBeNull();
    // where('status', '==', 'active') should have been called
    const whereCalls = mockWhere.mock.calls;
    expect(whereCalls.some((c) => c[0] === 'status' && c[2] === 'active')).toBe(true);
  });

  it('returns empty array when no duels found', async () => {
    mockGetDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] });

    const result = await getMyDuels();

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await getMyDuels();
    expect(result.error).toBeTruthy();

    auth.currentUser = original;
  });

  it('returns error when getDocs throws', async () => {
    mockGetDocs.mockRejectedValueOnce(new Error('Index missing'));

    const result = await getMyDuels();
    expect(result.error).toBeTruthy();
  });
});

// ── getDuelDetail ─────────────────────────────────────────────────────────────

describe('getDuelDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns correct DuelDoc when it exists', async () => {
    const duel = makeDuelDoc({ status: 'active', challengerProgress: 500 });
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, id: 'duel-123', data: () => duel });

    const result = await getDuelDetail('duel-123');

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.data!.status).toBe('active');
    expect(result.data!.challengerProgress).toBe(500);
  });

  it('returns error when duel does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    const result = await getDuelDetail('nonexistent');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not found/i);
  });

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await getDuelDetail('duel-123');
    expect(result.error).toBeTruthy();

    auth.currentUser = original;
  });
});

// ── updateMyDuelProgress ──────────────────────────────────────────────────────

describe('updateMyDuelProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates challengerProgress when caller is the challenger', async () => {
    const duel = makeDuelDoc({
      status: 'active',
      challengerUid: 'my-uid',
      opponentUid: 'opponent-uid',
    });
    mockTxGet.mockResolvedValueOnce({ exists: () => true, data: () => duel });

    const result = await updateMyDuelProgress('duel-123', 100);

    expect(result.error).toBeNull();
    expect(mockTxUpdate).toHaveBeenCalledTimes(1);
    const updateData = mockTxUpdate.mock.calls[0][1];
    expect(updateData).toHaveProperty('challengerProgress');
    expect(updateData).not.toHaveProperty('opponentProgress');
  });

  it('updates opponentProgress when caller is the opponent', async () => {
    // Set auth to opponent
    const { auth } = require('../services/firebase/index');
    auth.currentUser = { uid: 'opponent-uid' };

    const duel = makeDuelDoc({
      status: 'active',
      challengerUid: 'my-uid',
      opponentUid: 'opponent-uid',
    });
    mockTxGet.mockResolvedValueOnce({ exists: () => true, data: () => duel });

    const result = await updateMyDuelProgress('duel-123', 200);

    expect(result.error).toBeNull();
    const updateData = mockTxUpdate.mock.calls[0][1];
    expect(updateData).toHaveProperty('opponentProgress');
    expect(updateData).not.toHaveProperty('challengerProgress');

    // Restore original auth
    auth.currentUser = { uid: 'my-uid' };
  });

  it('prevents updating opponent progress when I am the challenger', async () => {
    // My UID is 'my-uid' (challenger), but duel's opponentUid is 'opponent-uid'
    // We verify only challengerProgress is in the update, NOT opponentProgress
    const duel = makeDuelDoc({
      status: 'active',
      challengerUid: 'my-uid',
      opponentUid: 'opponent-uid',
    });
    mockTxGet.mockResolvedValueOnce({ exists: () => true, data: () => duel });

    await updateMyDuelProgress('duel-123', 50);

    const updateData = mockTxUpdate.mock.calls[0][1];
    // Must NOT have opponentProgress
    expect(updateData).not.toHaveProperty('opponentProgress');
  });

  it('returns error when duel is not active', async () => {
    const duel = makeDuelDoc({ status: 'pending', challengerUid: 'my-uid' });
    mockTxGet.mockResolvedValueOnce({ exists: () => true, data: () => duel });

    const result = await updateMyDuelProgress('duel-123', 100);
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/pending/i);
  });

  it('returns error when caller is not a participant', async () => {
    const duel = makeDuelDoc({
      status: 'active',
      challengerUid: 'someone-else',
      opponentUid: 'another-person',
    });
    mockTxGet.mockResolvedValueOnce({ exists: () => true, data: () => duel });

    const result = await updateMyDuelProgress('duel-123', 100);
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/participant/i);
  });

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await updateMyDuelProgress('duel-123', 100);
    expect(result.error).toBeTruthy();

    auth.currentUser = original;
  });

  it('returns error when progressDelta is zero', async () => {
    const result = await updateMyDuelProgress('duel-123', 0);
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/positive/i);
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('returns error when progressDelta is negative', async () => {
    const result = await updateMyDuelProgress('duel-123', -10);
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/positive/i);
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });
});

// ── getActiveDuelIds ──────────────────────────────────────────────────────────

describe('getActiveDuelIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns IDs from both challenger and opponent active queries', async () => {
    mockGetDocs
      .mockResolvedValueOnce({ docs: [{ id: 'duel-a' }] })
      .mockResolvedValueOnce({ docs: [{ id: 'duel-b' }] });

    const result = await getActiveDuelIds();

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    expect(result.data).toContain('duel-a');
    expect(result.data).toContain('duel-b');
  });

  it('deduplicates IDs appearing in both queries', async () => {
    mockGetDocs
      .mockResolvedValueOnce({ docs: [{ id: 'duel-dup' }] })
      .mockResolvedValueOnce({ docs: [{ id: 'duel-dup' }] });

    const result = await getActiveDuelIds();
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
  });

  it('returns empty array when no active duels', async () => {
    mockGetDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] });

    const result = await getActiveDuelIds();
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it('filters by status == active', async () => {
    mockGetDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] });

    await getActiveDuelIds();

    const whereCalls = mockWhere.mock.calls;
    expect(whereCalls.some((c) => c[0] === 'status' && c[2] === 'active')).toBe(true);
  });

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await getActiveDuelIds();
    expect(result.error).toBeTruthy();

    auth.currentUser = original;
  });
});
