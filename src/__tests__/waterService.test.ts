/**
 * waterService.test.ts
 *
 * Tests for the hydration service business logic:
 *   - logWater: input validation, daily cap, XP threshold crossing
 *   - undoLastWater: entry removal, negative-total guard, empty entries guard
 *   - setWaterGoal: validation bounds
 *   - Pure helper: progress calculation from totalOz / goalOz
 *
 * Firestore and auth are mocked — no real Firebase calls.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../services/firebase/index', () => ({
  auth: { currentUser: { uid: 'test-user-123' } },
  db: {},
}));

// Mock the Firestore module — we test service logic not Firestore itself
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ id: 'mock-doc-ref' })),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  increment: jest.fn((n: number) => ({ _increment: n })),
  arrayUnion: jest.fn((v: unknown) => ({ _arrayUnion: v })),
  arrayRemove: jest.fn((v: unknown) => ({ _arrayRemove: v })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1700000000, nanoseconds: 0 })),
    fromMillis: jest.fn((ms: number) => ({ seconds: Math.floor(ms / 1000), nanoseconds: 0 })),
  },
}));

jest.mock('../services/firebase/firestore', () => ({
  COLLECTIONS: {
    WATER_LOG: 'waterLog',
  },
}));

jest.mock('../services/errorReporting', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('../services/analytics', () => ({
  analytics: { track: jest.fn() },
  AnalyticsEvent: {
    WATER_LOGGED: 'water_logged',
    WATER_GOAL_REACHED: 'water_goal_reached',
    WATER_UNDO: 'water_undo',
    WATER_GOAL_SET: 'water_goal_set',
  },
}));

jest.mock('../services/gamificationService', () => ({
  awardXP: jest.fn().mockResolvedValue({ xpAwarded: 10, newTotal: 110, leveledUp: false, newLevel: 1 }),
}));

jest.mock('../utils/nutrition', () => ({
  toLocalDateKey: jest.fn(() => '2026-03-25'),
}));

// ─── Imports (after mocks) ─────────────────────────────────────────────────────

import { getDoc, setDoc, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { logWater, undoLastWater, setWaterGoal, getTodayWaterLog } from '../services/waterService';
import { analytics } from '../services/analytics';
import { awardXP } from '../services/gamificationService';
import type { WaterEntry } from '../types/water';
import { DEFAULT_WATER_GOAL_OZ, MAX_SINGLE_LOG_OZ, MAX_DAILY_OZ } from '../types/water';

const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockSetDoc = setDoc as jest.MockedFunction<typeof setDoc>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockIncrement = increment as jest.MockedFunction<typeof increment>;
const mockArrayUnion = arrayUnion as jest.MockedFunction<typeof arrayUnion>;
const mockArrayRemove = arrayRemove as jest.MockedFunction<typeof arrayRemove>;
const mockTrack = (analytics.track as jest.MockedFunction<typeof analytics.track>);
const mockAwardXP = awardXP as jest.MockedFunction<typeof awardXP>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEntry(oz: number): WaterEntry {
  return {
    oz,
    loggedAt: { seconds: 1700000000, nanoseconds: 0 } as any,
    source: 'phone',
  };
}

function makeExistingDoc(totalOz: number, goalOz = DEFAULT_WATER_GOAL_OZ, entries: WaterEntry[] = []) {
  return {
    exists: () => true,
    data: () => ({ totalOz, goalOz, entries, source: 'phone' }),
  } as any;
}

function makeEmptyDoc() {
  return { exists: () => false } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSetDoc.mockResolvedValue(undefined);
  mockUpdateDoc.mockResolvedValue(undefined);
});

// ─── logWater ─────────────────────────────────────────────────────────────────

describe('logWater', () => {
  it('returns error when oz is zero', async () => {
    const result = await logWater(0, 0);
    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
  });

  it('returns error when oz exceeds MAX_SINGLE_LOG_OZ', async () => {
    const result = await logWater(MAX_SINGLE_LOG_OZ + 1, 0);
    expect(result.error).toBeTruthy();
  });

  it('returns error when oz is negative', async () => {
    const result = await logWater(-5, 0);
    expect(result.error).toBeTruthy();
  });

  it('returns error when daily cap is already reached', async () => {
    const result = await logWater(8, MAX_DAILY_OZ);
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toContain('cap');
  });

  it('clamps oz to not exceed daily cap', async () => {
    mockGetDoc.mockResolvedValue(makeExistingDoc(295));
    await logWater(16, 295); // would push to 311 — should be clamped to 5
    const updateCall = mockUpdateDoc.mock.calls[0];
    const updateData = updateCall[1] as Record<string, any>;
    expect(updateData.totalOz._increment).toBe(5); // clamped to MAX_DAILY_OZ - 295
  });

  it('creates a new doc on first log of the day', async () => {
    mockGetDoc.mockResolvedValue(makeEmptyDoc());
    const result = await logWater(8, 0);
    expect(result.error).toBeNull();
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const setData = mockSetDoc.mock.calls[0][1] as Record<string, any>;
    expect(setData.totalOz).toBe(8);
  });

  it('uses increment() on existing doc', async () => {
    mockGetDoc.mockResolvedValue(makeExistingDoc(20));
    await logWater(16, 20);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updateData = mockUpdateDoc.mock.calls[0][1] as Record<string, any>;
    expect(updateData.totalOz._increment).toBe(16);
  });

  it('uses arrayUnion() to append the entry', async () => {
    mockGetDoc.mockResolvedValue(makeExistingDoc(20));
    await logWater(8, 20);
    const updateData = mockUpdateDoc.mock.calls[0][1] as Record<string, any>;
    expect(updateData.entries._arrayUnion).toBeDefined();
    expect(updateData.entries._arrayUnion.oz).toBe(8);
  });

  it('tracks WATER_LOGGED analytics event', async () => {
    mockGetDoc.mockResolvedValue(makeExistingDoc(10));
    await logWater(8, 10);
    expect(mockTrack).toHaveBeenCalledWith('water_logged', expect.objectContaining({ oz: 8 }));
  });

  it('awards XP when log crosses goal threshold (was below, now at/above)', async () => {
    mockGetDoc.mockResolvedValue(makeExistingDoc(56));
    await logWater(8, 56, 64); // 56+8 = 64 = goal
    expect(mockAwardXP).toHaveBeenCalledWith(10, 'water_goal_reached', 'nutrition');
  });

  it('does NOT award XP when already above goal before log', async () => {
    mockGetDoc.mockResolvedValue(makeExistingDoc(70));
    await logWater(8, 70, 64); // already above goal
    expect(mockAwardXP).not.toHaveBeenCalled();
  });

  it('does NOT award XP when log does not reach goal', async () => {
    mockGetDoc.mockResolvedValue(makeExistingDoc(20));
    await logWater(8, 20, 64); // 20+8=28, still below 64
    expect(mockAwardXP).not.toHaveBeenCalled();
  });

  it('returns success on valid log', async () => {
    mockGetDoc.mockResolvedValue(makeExistingDoc(0));
    const result = await logWater(16, 0);
    expect(result.error).toBeNull();
    expect(result.data).toBeUndefined();
  });

  it('uses MAX_SINGLE_LOG_OZ boundary exactly (128 oz is valid)', async () => {
    mockGetDoc.mockResolvedValue(makeExistingDoc(0));
    const result = await logWater(MAX_SINGLE_LOG_OZ, 0);
    expect(result.error).toBeNull();
  });
});

// ─── undoLastWater ────────────────────────────────────────────────────────────

describe('undoLastWater', () => {
  it('returns error when entries is empty', async () => {
    const result = await undoLastWater([], 0);
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toContain('No entries');
  });

  it('returns error when undo would make totalOz negative', async () => {
    const entries = [makeEntry(16)];
    const result = await undoLastWater(entries, 10); // 10 - 16 < 0
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toContain('negative');
  });

  it('calls updateDoc with increment(-oz) and arrayRemove(entry)', async () => {
    const entry = makeEntry(8);
    const result = await undoLastWater([entry], 40);
    expect(result.error).toBeNull();
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updateData = mockUpdateDoc.mock.calls[0][1] as Record<string, any>;
    expect(updateData.totalOz._increment).toBe(-8);
    expect(updateData.entries._arrayRemove).toEqual(entry);
  });

  it('removes the LAST entry (not the first) when multiple entries exist', async () => {
    const first = makeEntry(8);
    const last = makeEntry(16);
    await undoLastWater([first, last], 24);
    const updateData = mockUpdateDoc.mock.calls[0][1] as Record<string, any>;
    expect(updateData.entries._arrayRemove).toEqual(last);
    expect(updateData.totalOz._increment).toBe(-16);
  });

  it('tracks WATER_UNDO analytics event', async () => {
    const entry = makeEntry(8);
    await undoLastWater([entry], 8);
    expect(mockTrack).toHaveBeenCalledWith('water_undo', expect.objectContaining({ oz: 8 }));
  });

  it('allows undo that brings totalOz exactly to 0', async () => {
    const entry = makeEntry(8);
    const result = await undoLastWater([entry], 8); // 8 - 8 = 0
    expect(result.error).toBeNull();
  });
});

// ─── setWaterGoal ─────────────────────────────────────────────────────────────

describe('setWaterGoal', () => {
  it('returns error when goalOz is zero', async () => {
    const result = await setWaterGoal(0);
    expect(result.error).toBeTruthy();
  });

  it('returns error when goalOz is negative', async () => {
    const result = await setWaterGoal(-10);
    expect(result.error).toBeTruthy();
  });

  it('returns error when goalOz exceeds MAX_DAILY_OZ', async () => {
    const result = await setWaterGoal(MAX_DAILY_OZ + 1);
    expect(result.error).toBeTruthy();
  });

  it('accepts MAX_DAILY_OZ exactly', async () => {
    mockGetDoc.mockResolvedValue(makeExistingDoc(0));
    const result = await setWaterGoal(MAX_DAILY_OZ);
    expect(result.error).toBeNull();
  });

  it('creates doc when none exists for today', async () => {
    mockGetDoc.mockResolvedValue(makeEmptyDoc());
    await setWaterGoal(80);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const setData = mockSetDoc.mock.calls[0][1] as Record<string, any>;
    expect(setData.goalOz).toBe(80);
    expect(setData.totalOz).toBe(0);
  });

  it('updates goalOz on existing doc', async () => {
    mockGetDoc.mockResolvedValue(makeExistingDoc(32));
    await setWaterGoal(80);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updateData = mockUpdateDoc.mock.calls[0][1] as Record<string, any>;
    expect(updateData.goalOz).toBe(80);
  });

  it('tracks WATER_GOAL_SET analytics event', async () => {
    mockGetDoc.mockResolvedValue(makeExistingDoc(0));
    await setWaterGoal(80);
    expect(mockTrack).toHaveBeenCalledWith('water_goal_set', { goal_oz: 80 });
  });
});

// ─── getTodayWaterLog ─────────────────────────────────────────────────────────

describe('getTodayWaterLog', () => {
  it('returns zeroed doc when no Firestore doc exists yet', async () => {
    mockGetDoc.mockResolvedValue(makeEmptyDoc());
    const result = await getTodayWaterLog();
    expect(result.error).toBeNull();
    expect(result.data?.totalOz).toBe(0);
    expect(result.data?.goalOz).toBe(DEFAULT_WATER_GOAL_OZ);
    expect(result.data?.entries).toEqual([]);
  });

  it('returns data from Firestore when doc exists', async () => {
    const entries = [makeEntry(8), makeEntry(16)];
    mockGetDoc.mockResolvedValue(makeExistingDoc(24, 64, entries));
    const result = await getTodayWaterLog();
    expect(result.error).toBeNull();
    expect(result.data?.totalOz).toBe(24);
    expect(result.data?.goalOz).toBe(64);
    expect(result.data?.entries).toEqual(entries);
  });

  it('returns error when Firestore throws', async () => {
    mockGetDoc.mockRejectedValue(new Error('Firestore unavailable'));
    const result = await getTodayWaterLog();
    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
  });
});

// ─── Progress calculation (pure logic) ────────────────────────────────────────

describe('progress calculation (derived from totalOz / goalOz)', () => {
  it('0oz / 64oz = 0% progress', () => {
    const progress = Math.min(0 / 64, 1);
    expect(progress).toBe(0);
  });

  it('32oz / 64oz = 50% progress', () => {
    const progress = Math.min(32 / 64, 1);
    expect(progress).toBeCloseTo(0.5);
  });

  it('64oz / 64oz = 100% progress', () => {
    const progress = Math.min(64 / 64, 1);
    expect(progress).toBe(1);
  });

  it('progress is capped at 1 when over goal', () => {
    const progress = Math.min(128 / 64, 1);
    expect(progress).toBe(1);
  });

  it('goalReached is true when totalOz >= goalOz', () => {
    expect(64 >= 64).toBe(true);
    expect(65 >= 64).toBe(true);
    expect(63 >= 64).toBe(false);
  });

  it('DEFAULT_WATER_GOAL_OZ is 64', () => {
    expect(DEFAULT_WATER_GOAL_OZ).toBe(64);
  });

  it('MAX_SINGLE_LOG_OZ is 128', () => {
    expect(MAX_SINGLE_LOG_OZ).toBe(128);
  });

  it('MAX_DAILY_OZ is 300', () => {
    expect(MAX_DAILY_OZ).toBe(300);
  });
});
