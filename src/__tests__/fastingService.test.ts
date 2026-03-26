/**
 * fastingService.test.ts — Firestore interaction tests for the fasting service.
 *
 * Mocks: firebase/firestore (raw SDK), firebase/index (auth+db),
 *        errorReporting (Sentry breadcrumbs), analytics.
 *
 * All tests use the mock Firestore helpers (getDocument, mergeDocument,
 * addDocument, queryDocuments) that wrap the raw SDK.
 */

// ── Firebase mocks (must be before imports) ────────────────────────────────────

jest.mock('../services/firebase/index', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-uid' } },
}));

jest.mock('../services/errorReporting', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('mixpanel-react-native', () => ({
  Mixpanel: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    track: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    timeEvent: jest.fn(),
    getPeople: jest.fn(() => ({ set: jest.fn() })),
  })),
}));

// ── Firestore SDK mocks ───────────────────────────────────────────────────────

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockAddDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockDoc = jest.fn((_db: unknown, ...segments: string[]) => ({
  path: segments.join('/'),
  id: segments[segments.length - 1],
}));
const mockCollection = jest.fn((_db: unknown, ...segments: string[]) => ({
  path: segments.join('/'),
}));
const mockServerTimestamp = jest.fn(() => 'SERVER_TS');

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((...args: unknown[]) => (mockDoc as (...a: unknown[]) => unknown)(...args)),
  getDoc: jest.fn((...args: unknown[]) => (mockGetDoc as (...a: unknown[]) => unknown)(...args)),
  setDoc: jest.fn((...args: unknown[]) => (mockSetDoc as (...a: unknown[]) => unknown)(...args)),
  addDoc: jest.fn((...args: unknown[]) => (mockAddDoc as (...a: unknown[]) => unknown)(...args)),
  collection: jest.fn((...args: unknown[]) => (mockCollection as (...a: unknown[]) => unknown)(...args)),
  getDocs: jest.fn((...args: unknown[]) => (mockGetDocs as (...a: unknown[]) => unknown)(...args)),
  query: jest.fn((...args: unknown[]) => (mockQuery as (...a: unknown[]) => unknown)(...args)),
  where: jest.fn((...args: unknown[]) => (mockWhere as (...a: unknown[]) => unknown)(...args)),
  orderBy: jest.fn((...args: unknown[]) => (mockOrderBy as (...a: unknown[]) => unknown)(...args)),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1700000000, nanoseconds: 0 })),
    fromDate: jest.fn((d: Date) => ({ seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 })),
  },
  serverTimestamp: jest.fn(() => mockServerTimestamp()),
  deleteDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────────

import {
  getFastingConfig,
  saveFastingConfig,
  logFastComplete,
  logBreakFast,
  getWeeklyCompletionCount,
  getRecentLogs,
} from '../services/fastingService';
import type { FastingConfig, FastingLogEntry } from '../types/fasting';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<FastingConfig> = {}): FastingConfig {
  return {
    protocol: '16:8',
    eatingWindowStart: '12:00',
    eatingWindowEnd: '20:00',
    remindersEnabled: false,
    createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1700000000, nanoseconds: 0 } as any,
    ...overrides,
  };
}

function makeLogEntry(overrides: Partial<FastingLogEntry & { id?: string }> = {}): FastingLogEntry & { id: string } {
  return {
    id: 'log-1',
    date: '2026-03-24',
    fastCompleted: true,
    breakTime: null,
    completedAt: { seconds: 1700010000, nanoseconds: 0 } as any,
    createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1700000000, nanoseconds: 0 } as any,
    ...overrides,
  };
}

function makeDocSnap(data: Record<string, unknown> | null) {
  return {
    exists: () => data !== null,
    data: () => data,
    id: 'doc-id',
  };
}

function makeQuerySnap(entries: Array<FastingLogEntry & { id: string }>) {
  return {
    docs: entries.map((e) => ({
      id: e.id,
      data: () => e,
    })),
  };
}

// ─── getFastingConfig ─────────────────────────────────────────────────────────

describe('getFastingConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns config data when doc exists', async () => {
    const config = makeConfig();
    mockGetDoc.mockResolvedValueOnce(makeDocSnap(config as unknown as Record<string, unknown>));

    const result = await getFastingConfig();

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.data?.protocol).toBe('16:8');
    expect(result.data?.eatingWindowStart).toBe('12:00');
  });

  it('returns null data (not error) when doc does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce(makeDocSnap(null));

    const result = await getFastingConfig();

    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });

  it('returns error on Firestore failure', async () => {
    mockGetDoc.mockRejectedValueOnce(new Error('Firestore unavailable'));

    const result = await getFastingConfig();

    expect(result.error).not.toBeNull();
    expect(result.error?.message).toBe('Firestore unavailable');
    expect(result.data).toBeNull();
  });

  it('calls addBreadcrumb before the Firestore read', async () => {
    const { addBreadcrumb } = jest.requireMock('../services/errorReporting');
    mockGetDoc.mockResolvedValueOnce(makeDocSnap(makeConfig() as unknown as Record<string, unknown>));

    await getFastingConfig();

    expect(addBreadcrumb).toHaveBeenCalledWith('fasting', 'getFastingConfig', expect.any(Object));
  });
});

// ─── saveFastingConfig ────────────────────────────────────────────────────────

describe('saveFastingConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls setDoc with merge:true on success', async () => {
    // First getDoc call (existence check) returns null → new doc
    mockGetDoc.mockResolvedValueOnce(makeDocSnap(null));
    mockSetDoc.mockResolvedValueOnce(undefined);

    const result = await saveFastingConfig({
      protocol: '18:6',
      eatingWindowStart: '13:00',
      eatingWindowEnd: '19:00',
      remindersEnabled: true,
    });

    expect(result.error).toBeNull();
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const callArgs = mockSetDoc.mock.calls[0];
    // Second arg is the data, third is the options object
    expect(callArgs[2]).toEqual({ merge: true });
  });

  it('persists the correct protocol in the merged data', async () => {
    mockGetDoc.mockResolvedValueOnce(makeDocSnap(null));
    mockSetDoc.mockResolvedValueOnce(undefined);

    await saveFastingConfig({
      protocol: '20:4',
      eatingWindowStart: '14:00',
      eatingWindowEnd: '18:00',
      remindersEnabled: false,
    });

    const data = mockSetDoc.mock.calls[0][1];
    expect(data.protocol).toBe('20:4');
    expect(data.eatingWindowStart).toBe('14:00');
  });

  it('adds createdAt on first save (doc does not exist)', async () => {
    mockGetDoc.mockResolvedValueOnce(makeDocSnap(null));
    mockSetDoc.mockResolvedValueOnce(undefined);

    await saveFastingConfig({
      protocol: '16:8',
      eatingWindowStart: '12:00',
      eatingWindowEnd: '20:00',
      remindersEnabled: false,
    });

    const data = mockSetDoc.mock.calls[0][1];
    expect(data.createdAt).toBeDefined();
    expect(data.updatedAt).toBeDefined();
  });

  it('does not overwrite createdAt on subsequent saves (doc already exists)', async () => {
    mockGetDoc.mockResolvedValueOnce(makeDocSnap(makeConfig() as unknown as Record<string, unknown>));
    mockSetDoc.mockResolvedValueOnce(undefined);

    await saveFastingConfig({
      protocol: '16:8',
      eatingWindowStart: '12:00',
      eatingWindowEnd: '20:00',
      remindersEnabled: false,
    });

    const data = mockSetDoc.mock.calls[0][1];
    // createdAt should NOT be present in the merge payload for existing docs
    expect(data.createdAt).toBeUndefined();
    expect(data.updatedAt).toBeDefined();
  });

  it('returns error on Firestore failure', async () => {
    mockGetDoc.mockResolvedValueOnce(makeDocSnap(null));
    mockSetDoc.mockRejectedValueOnce(new Error('Quota exceeded'));

    const result = await saveFastingConfig({
      protocol: '16:8',
      eatingWindowStart: '12:00',
      eatingWindowEnd: '20:00',
      remindersEnabled: false,
    });

    expect(result.error).not.toBeNull();
    expect(result.error?.message).toBe('Quota exceeded');
  });
});

// ─── logFastComplete ──────────────────────────────────────────────────────────

describe('logFastComplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds a doc with fastCompleted=true and breakTime=null', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'new-log-id' });

    const result = await logFastComplete('2026-03-24');

    expect(result.error).toBeNull();
    expect(result.data).toBe('new-log-id');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const data = mockAddDoc.mock.calls[0][1];
    expect(data.fastCompleted).toBe(true);
    expect(data.breakTime).toBeNull();
    expect(data.date).toBe('2026-03-24');
  });

  it('sets completedAt to serverTimestamp', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'new-log-id' });

    await logFastComplete('2026-03-24');

    const data = mockAddDoc.mock.calls[0][1];
    expect(data.completedAt).toBe('SERVER_TS');
  });

  it('returns error on Firestore failure', async () => {
    mockAddDoc.mockRejectedValueOnce(new Error('Write failed'));

    const result = await logFastComplete('2026-03-24');

    expect(result.error?.message).toBe('Write failed');
  });
});

// ─── logBreakFast ─────────────────────────────────────────────────────────────

describe('logBreakFast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds a doc with fastCompleted=false and breakTime=serverTimestamp', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'break-log-id' });

    const result = await logBreakFast('2026-03-24');

    expect(result.error).toBeNull();
    expect(result.data).toBe('break-log-id');
    const data = mockAddDoc.mock.calls[0][1];
    expect(data.fastCompleted).toBe(false);
    expect(data.breakTime).toBe('SERVER_TS');
    expect(data.completedAt).toBeNull();
  });

  it('returns error on Firestore failure', async () => {
    mockAddDoc.mockRejectedValueOnce(new Error('Network error'));

    const result = await logBreakFast('2026-03-24');

    expect(result.error?.message).toBe('Network error');
  });
});

// ─── getWeeklyCompletionCount ─────────────────────────────────────────────────
// (formerly getWeeklyStreak — renamed because it counts completed days in the
// 7-day window, not consecutive days)

describe('getWeeklyCompletionCount', () => {
  // Helper: build dates for last N days from a base date
  function buildRecentDates(fromDate: Date, count: number): string[] {
    const dates: string[] = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(fromDate);
      d.setDate(fromDate.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    return dates;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 0 when no log entries exist', async () => {
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));

    const result = await getWeeklyCompletionCount();

    expect(result.error).toBeNull();
    expect(result.data).toBe(0);
  });

  it('returns 7 when all 7 days have a completed fast', async () => {
    // Use local today (same reference the service uses) so the window aligns
    const today = new Date();
    const dates = buildRecentDates(today, 7);
    const entries = dates.map((date, i) =>
      makeLogEntry({ id: `log-${i}`, date, fastCompleted: true, breakTime: null }),
    );
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap(entries));

    const result = await getWeeklyCompletionCount();

    expect(result.error).toBeNull();
    expect(result.data).toBe(7);
  });

  it('counts only fastCompleted=true && breakTime===null entries', async () => {
    // 3 complete, 2 broken, 1 false, 1 missing
    const entries = [
      makeLogEntry({ id: '1', date: '2026-03-24', fastCompleted: true, breakTime: null }),
      makeLogEntry({ id: '2', date: '2026-03-23', fastCompleted: true, breakTime: null }),
      makeLogEntry({ id: '3', date: '2026-03-22', fastCompleted: true, breakTime: null }),
      makeLogEntry({ id: '4', date: '2026-03-21', fastCompleted: false, breakTime: { seconds: 1234, nanoseconds: 0 } as any }),
      makeLogEntry({ id: '5', date: '2026-03-20', fastCompleted: true, breakTime: { seconds: 5678, nanoseconds: 0 } as any }),
    ];
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap(entries));

    const result = await getWeeklyCompletionCount();

    expect(result.error).toBeNull();
    // 3 complete out of the 7-day window (only dates 24, 23, 22 qualify)
    expect(result.data).toBe(3);
  });

  it('deduplicates by date — multiple complete entries for same day count as 1', async () => {
    // Same date logged twice (both complete) — should count as 1
    const entries = [
      makeLogEntry({ id: '1', date: '2026-03-24', fastCompleted: true, breakTime: null }),
      makeLogEntry({ id: '2', date: '2026-03-24', fastCompleted: true, breakTime: null }),
      makeLogEntry({ id: '3', date: '2026-03-23', fastCompleted: true, breakTime: null }),
    ];
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap(entries));

    const result = await getWeeklyCompletionCount();

    // Only 2 unique dates qualify
    expect(result.data).toBe(2);
  });

  it('favors the complete entry if a day has both a break and a complete', async () => {
    // One break + one complete for the same day — day should count
    const entries = [
      makeLogEntry({ id: '1', date: '2026-03-24', fastCompleted: false, breakTime: { seconds: 100, nanoseconds: 0 } as any }),
      makeLogEntry({ id: '2', date: '2026-03-24', fastCompleted: true, breakTime: null }),
    ];
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap(entries));

    const result = await getWeeklyCompletionCount();

    expect(result.data).toBe(1);
  });

  it('returns error on Firestore query failure', async () => {
    mockGetDocs.mockRejectedValueOnce(new Error('Query failed'));

    const result = await getWeeklyCompletionCount();

    expect(result.error?.message).toBe('Query failed');
    expect(result.data).toBeNull();
  });

  it('calls addBreadcrumb with fasting context', async () => {
    const { addBreadcrumb } = jest.requireMock('../services/errorReporting');
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));

    await getWeeklyCompletionCount();

    expect(addBreadcrumb).toHaveBeenCalledWith('fasting', 'getWeeklyCompletionCount', expect.any(Object));
  });
});

// ─── getRecentLogs ────────────────────────────────────────────────────────────

describe('getRecentLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns logs from the Firestore query', async () => {
    const entries = [
      makeLogEntry({ id: '1', date: '2026-03-24' }),
      makeLogEntry({ id: '2', date: '2026-03-23' }),
    ];
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap(entries));

    const result = await getRecentLogs(7);

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    expect(result.data?.[0].date).toBe('2026-03-24');
  });

  it('returns empty array when no logs exist', async () => {
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));

    const result = await getRecentLogs(7);

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(0);
  });

  it('returns error on Firestore failure', async () => {
    mockGetDocs.mockRejectedValueOnce(new Error('Read failed'));

    const result = await getRecentLogs(7);

    expect(result.error?.message).toBe('Read failed');
  });

  it('passes the correct date range constraint to queryDocuments', async () => {
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));

    await getRecentLogs(1);

    // where() should have been called with a 'date' field constraint
    expect(mockWhere).toHaveBeenCalledWith('date', '>=', expect.any(String));
  });
});
