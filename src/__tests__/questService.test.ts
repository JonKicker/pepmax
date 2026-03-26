/**
 * questService.test.ts — Firestore interaction tests for the quest service.
 *
 * Mocks: firebase/firestore (raw SDK), firebase/index (auth+db),
 *        gamificationService.awardXP, errorReporting, analytics.
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

const mockRunTransaction = jest.fn();
const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockWriteBatch = jest.fn();
const mockGetDocs = jest.fn();
const mockQuery = jest.fn();
const mockOrderBy = jest.fn();
const mockLimit = jest.fn();
const mockDoc = jest.fn((_db: unknown, ...segments: string[]) => ({
  path: segments.join('/'),
  id: segments[segments.length - 1],
}));
const mockCollection = jest.fn((_db: unknown, ...segments: string[]) => ({
  path: segments.join('/'),
}));
const mockServerTimestamp = jest.fn(() => 'SERVER_TS');

// Batch mock
const batchSetMock = jest.fn();
const batchDeleteMock = jest.fn();
const batchUpdateMock = jest.fn();
const batchCommitMock = jest.fn().mockResolvedValue(undefined);
mockWriteBatch.mockReturnValue({
  set: batchSetMock,
  delete: batchDeleteMock,
  update: batchUpdateMock,
  commit: batchCommitMock,
});

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((...args: unknown[]) => (mockDoc as (...a: unknown[]) => unknown)(...args)),
  getDoc: jest.fn((...args: unknown[]) => (mockGetDoc as (...a: unknown[]) => unknown)(...args)),
  setDoc: jest.fn((...args: unknown[]) => (mockSetDoc as (...a: unknown[]) => unknown)(...args)),
  updateDoc: jest.fn((...args: unknown[]) => (mockUpdateDoc as (...a: unknown[]) => unknown)(...args)),
  collection: jest.fn((...args: unknown[]) => (mockCollection as (...a: unknown[]) => unknown)(...args)),
  getDocs: jest.fn((...args: unknown[]) => (mockGetDocs as (...a: unknown[]) => unknown)(...args)),
  query: jest.fn((...args: unknown[]) => (mockQuery as (...a: unknown[]) => unknown)(...args)),
  orderBy: jest.fn((...args: unknown[]) => (mockOrderBy as (...a: unknown[]) => unknown)(...args)),
  limit: jest.fn((...args: unknown[]) => (mockLimit as (...a: unknown[]) => unknown)(...args)),
  writeBatch: jest.fn((...args: unknown[]) => (mockWriteBatch as (...a: unknown[]) => unknown)(...args)),
  runTransaction: jest.fn((...args: unknown[]) => (mockRunTransaction as (...a: unknown[]) => unknown)(...args)),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1700000000, nanoseconds: 0 })),
    fromDate: jest.fn((d: Date) => ({ seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 })),
  },
  serverTimestamp: jest.fn(() => mockServerTimestamp()),
}));

// ── gamificationService mock ───────────────────────────────────────────────────

const mockAwardXP = jest.fn();
jest.mock('../services/gamificationService', () => ({
  awardXP: jest.fn((...args: unknown[]) => mockAwardXP(...args)),
}));

// ── analytics mock ────────────────────────────────────────────────────────────

jest.mock('../services/analytics', () => ({
  analytics: { track: jest.fn() },
  AnalyticsEvent: {
    QUEST_COMPLETED: 'quest_completed',
    QUEST_BONUS_CLAIMED: 'quest_bonus_claimed',
    QUESTS_GENERATED: 'quests_generated',
  },
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────────

import {
  getTodayQuests,
  completeQuest,
  claimQuestBonus,
  getRecentQuestIds,
  saveQuestHistory,
} from '../services/questService';
import type { DailyQuestsDoc, Quest, QuestHistoryDoc } from '../types/challenges';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeQuest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: 'gym_complete_workout',
    title: 'Grind Session',
    description: 'Complete your planned workout',
    xpReward: 20,
    module: 'gym',
    conditionType: 'complete_workout',
    status: 'active',
    ...overrides,
  };
}

function makeQuestsDoc(overrides: Partial<DailyQuestsDoc> = {}): DailyQuestsDoc {
  return {
    quests: [
      makeQuest({ id: 'q1' }),
      makeQuest({ id: 'q2', module: 'nutrition', conditionType: 'log_all_meals' }),
      makeQuest({ id: 'q3', module: 'cardio', conditionType: 'complete_cardio' }),
    ],
    bonusClaimed: false,
    bonusXP: 25,
    dateKey: '2026-03-24',
    generatedAt: { seconds: 1700000000, nanoseconds: 0 } as any,
    completedCount: 0,
    ...overrides,
  };
}

function makeDocSnap(data: Record<string, unknown> | null) {
  return {
    exists: () => data !== null,
    data: () => data,
    id: data?.dateKey ?? 'doc-id',
  };
}

function makeQuerySnap(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    forEach: (fn: (d: { id: string; data: () => Record<string, unknown>; ref: unknown }) => void) => {
      docs.forEach((d) =>
        fn({ id: d.id, data: () => d.data, ref: { path: `users/test-uid/questHistory/${d.id}` } }),
      );
    },
    docs: docs.map((d) => ({ id: d.id, data: () => d.data, ref: {} })),
  };
}

// ─── getTodayQuests ────────────────────────────────────────────────────────────

describe('getTodayQuests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAwardXP.mockResolvedValue({ data: { xpAwarded: 15, newTotal: 115, leveledUp: false, newLevel: 2 }, error: null });
    // Default: getRecentQuestIds (getDocs) returns empty
    mockGetDocs.mockResolvedValue(makeQuerySnap([]));
  });

  it('returns existing doc when it already exists', async () => {
    const existing = makeQuestsDoc();
    mockRunTransaction.mockImplementation(async (_db: unknown, fn: Function) => {
      const snap = makeDocSnap(existing as unknown as Record<string, unknown>);
      await fn({
        get: jest.fn().mockResolvedValue(snap),
        set: jest.fn(),
        update: jest.fn(),
      });
      return existing;
    });

    const result = await getTodayQuests();
    expect(result.error).toBeNull();
    expect(result.data?.quests).toHaveLength(3);
    expect(result.data?.bonusClaimed).toBe(false);
  });

  it('creates a new doc when none exists', async () => {
    const txSetMock = jest.fn();
    mockRunTransaction.mockImplementation(async (_db: unknown, fn: Function) => {
      const emptySnap = makeDocSnap(null);
      await fn({
        get: jest.fn().mockResolvedValue(emptySnap),
        set: txSetMock,
        update: jest.fn(),
      });
      // Return a generated doc shape
      return {
        quests: [makeQuest({ id: 'q1' }), makeQuest({ id: 'q2' }), makeQuest({ id: 'q3' })],
        bonusClaimed: false,
        bonusXP: 25 as const,
        dateKey: '2026-03-24',
        generatedAt: { seconds: 1700000000, nanoseconds: 0 },
        completedCount: 0,
      } as DailyQuestsDoc;
    });

    const result = await getTodayQuests();
    expect(result.error).toBeNull();
    expect(txSetMock).toHaveBeenCalledTimes(1);
    // The set call should include quests
    const setArg = txSetMock.mock.calls[0][1];
    expect(setArg).toHaveProperty('quests');
    expect(setArg.quests).toHaveLength(3);
  });

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await getTodayQuests();
    expect(result.error).not.toBeNull();

    auth.currentUser = original;
  });

  it('uses runTransaction (not a plain getDoc) to prevent race conditions', async () => {
    mockRunTransaction.mockImplementation(async (_db: unknown, fn: Function) => {
      const existing = makeQuestsDoc();
      const snap = makeDocSnap(existing as unknown as Record<string, unknown>);
      await fn({ get: jest.fn().mockResolvedValue(snap), set: jest.fn(), update: jest.fn() });
      return existing;
    });

    await getTodayQuests();
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    // raw getDoc should NOT have been used for the main quests doc
    expect(mockGetDoc).not.toHaveBeenCalled();
  });
});

// ─── completeQuest ─────────────────────────────────────────────────────────────
// completeQuest now uses runTransaction (Ray fix #1) — tests use mockRunTransaction.

describe('completeQuest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAwardXP.mockResolvedValue({ data: { xpAwarded: 20, newTotal: 120, leveledUp: false, newLevel: 2 }, error: null });
  });

  it('marks the target quest as completed', async () => {
    const questsDoc = makeQuestsDoc();
    const txUpdateMock = jest.fn();
    mockRunTransaction.mockImplementation(async (_db: unknown, fn: Function) => {
      const snap = makeDocSnap(questsDoc as unknown as Record<string, unknown>);
      return fn({ get: jest.fn().mockResolvedValue(snap), update: txUpdateMock, set: jest.fn() });
    });

    const result = await completeQuest('2026-03-24', 'q1');
    expect(result.error).toBeNull();
    expect(txUpdateMock).toHaveBeenCalledTimes(1);

    const updateArg = txUpdateMock.mock.calls[0][1];
    const updatedQ1 = updateArg.quests.find((q: Quest) => q.id === 'q1');
    expect(updatedQ1?.status).toBe('completed');
  });

  it('awards XP for the completed quest', async () => {
    const questsDoc = makeQuestsDoc();
    mockRunTransaction.mockImplementation(async (_db: unknown, fn: Function) => {
      const snap = makeDocSnap(questsDoc as unknown as Record<string, unknown>);
      return fn({ get: jest.fn().mockResolvedValue(snap), update: jest.fn(), set: jest.fn() });
    });

    await completeQuest('2026-03-24', 'q1');
    // exempt=true: quest XP is exempt from the daily cap per gamification blueprint
    expect(mockAwardXP).toHaveBeenCalledWith(
      questsDoc.quests[0].xpReward,
      'quest_complete',
      questsDoc.quests[0].module,
      true,
    );
  });

  it('is idempotent — does nothing if quest is already completed', async () => {
    const questsDoc = makeQuestsDoc({
      quests: [
        makeQuest({ id: 'q1', status: 'completed' }),
        makeQuest({ id: 'q2', module: 'nutrition', conditionType: 'log_all_meals' }),
        makeQuest({ id: 'q3', module: 'cardio', conditionType: 'complete_cardio' }),
      ],
    });
    const txUpdateMock = jest.fn();
    mockRunTransaction.mockImplementation(async (_db: unknown, fn: Function) => {
      const snap = makeDocSnap(questsDoc as unknown as Record<string, unknown>);
      // Transaction returns null when quest already completed — no XP
      return fn({ get: jest.fn().mockResolvedValue(snap), update: txUpdateMock, set: jest.fn() });
    });

    const result = await completeQuest('2026-03-24', 'q1');
    expect(result.error).toBeNull();
    // Transaction should not update and XP should not be awarded
    expect(txUpdateMock).not.toHaveBeenCalled();
    expect(mockAwardXP).not.toHaveBeenCalled();
  });

  it('returns error when quest doc does not exist', async () => {
    mockRunTransaction.mockImplementation(async (_db: unknown, fn: Function) => {
      const snap = makeDocSnap(null);
      return fn({ get: jest.fn().mockResolvedValue(snap), update: jest.fn(), set: jest.fn() });
    });
    const result = await completeQuest('2026-03-24', 'q1');
    expect(result.error).not.toBeNull();
  });

  it('returns error when quest ID is not found in the doc', async () => {
    const questsDoc = makeQuestsDoc();
    mockRunTransaction.mockImplementation(async (_db: unknown, fn: Function) => {
      const snap = makeDocSnap(questsDoc as unknown as Record<string, unknown>);
      return fn({ get: jest.fn().mockResolvedValue(snap), update: jest.fn(), set: jest.fn() });
    });
    const result = await completeQuest('2026-03-24', 'nonexistent-quest-id');
    expect(result.error).not.toBeNull();
  });

  it('increments completedCount correctly', async () => {
    const questsDoc = makeQuestsDoc({ completedCount: 0 });
    const txUpdateMock = jest.fn();
    mockRunTransaction.mockImplementation(async (_db: unknown, fn: Function) => {
      const snap = makeDocSnap(questsDoc as unknown as Record<string, unknown>);
      return fn({ get: jest.fn().mockResolvedValue(snap), update: txUpdateMock, set: jest.fn() });
    });

    await completeQuest('2026-03-24', 'q1');

    const updateArg = txUpdateMock.mock.calls[0][1];
    expect(updateArg.completedCount).toBe(1);
  });

  it('uses runTransaction (not plain getDoc/updateDoc) to prevent race conditions', async () => {
    const questsDoc = makeQuestsDoc();
    mockRunTransaction.mockImplementation(async (_db: unknown, fn: Function) => {
      const snap = makeDocSnap(questsDoc as unknown as Record<string, unknown>);
      return fn({ get: jest.fn().mockResolvedValue(snap), update: jest.fn(), set: jest.fn() });
    });

    await completeQuest('2026-03-24', 'q1');
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    // Raw getDoc and updateDoc must NOT be used
    expect(mockGetDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

// ─── claimQuestBonus ──────────────────────────────────────────────────────────

describe('claimQuestBonus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAwardXP.mockResolvedValue({ data: { xpAwarded: 25, newTotal: 145, leveledUp: false, newLevel: 2 }, error: null });
  });

  it('awards 25 XP bonus when all quests are complete', async () => {
    const doc = makeQuestsDoc({
      quests: [
        makeQuest({ id: 'q1', status: 'completed' }),
        makeQuest({ id: 'q2', status: 'completed', module: 'nutrition', conditionType: 'log_all_meals' }),
        makeQuest({ id: 'q3', status: 'completed', module: 'cardio', conditionType: 'complete_cardio' }),
      ],
      bonusClaimed: false,
      completedCount: 3,
    });

    mockRunTransaction.mockImplementation(async (_db: unknown, fn: Function) => {
      const snap = makeDocSnap(doc as unknown as Record<string, unknown>);
      const txUpdate = jest.fn();
      // Return the value that the transaction callback returns (true = should award XP)
      return fn({ get: jest.fn().mockResolvedValue(snap), update: txUpdate, set: jest.fn() });
    });

    const result = await claimQuestBonus('2026-03-24');
    expect(result.error).toBeNull();
    // exempt=true: quest bonus XP is exempt from the daily cap per gamification blueprint
    expect(mockAwardXP).toHaveBeenCalledWith(25, 'quest_bonus', 'system', true);
  });

  it('is idempotent — succeeds silently when bonus already claimed', async () => {
    const doc = makeQuestsDoc({
      quests: [
        makeQuest({ id: 'q1', status: 'completed' }),
        makeQuest({ id: 'q2', status: 'completed', module: 'nutrition', conditionType: 'log_all_meals' }),
        makeQuest({ id: 'q3', status: 'completed', module: 'cardio', conditionType: 'complete_cardio' }),
      ],
      bonusClaimed: true,
      completedCount: 3,
    });

    const txUpdateMock = jest.fn();
    mockRunTransaction.mockImplementation(async (_db: unknown, fn: Function) => {
      const snap = makeDocSnap(doc as unknown as Record<string, unknown>);
      // Propagate the callback's return value (false = already claimed)
      return fn({ get: jest.fn().mockResolvedValue(snap), update: txUpdateMock, set: jest.fn() });
    });

    const result = await claimQuestBonus('2026-03-24');
    expect(result.error).toBeNull();
    // Should not update doc or award XP since already claimed
    expect(txUpdateMock).not.toHaveBeenCalled();
    expect(mockAwardXP).not.toHaveBeenCalled();
  });

  it('throws when not all quests are complete', async () => {
    const doc = makeQuestsDoc({ completedCount: 1 }); // quests[0] is still active

    mockRunTransaction.mockImplementation(async (_db: unknown, fn: Function) => {
      const snap = makeDocSnap(doc as unknown as Record<string, unknown>);
      try {
        await fn({ get: jest.fn().mockResolvedValue(snap), update: jest.fn(), set: jest.fn() });
      } catch (e) {
        // transaction throws → runTransaction propagates it
        throw e;
      }
    });

    const result = await claimQuestBonus('2026-03-24');
    expect(result.error).not.toBeNull();
    expect(result.error?.message).toMatch(/not all quests completed/i);
    expect(mockAwardXP).not.toHaveBeenCalled();
  });

  it('returns error when doc does not exist', async () => {
    mockRunTransaction.mockImplementation(async (_db: unknown, fn: Function) => {
      const snap = makeDocSnap(null);
      // fn will throw "Quest doc not found" — propagate so questService catches it
      return fn({ get: jest.fn().mockResolvedValue(snap), update: jest.fn(), set: jest.fn() });
    });

    const result = await claimQuestBonus('2026-03-24');
    expect(result.error).not.toBeNull();
  });

  it('uses runTransaction for idempotency guard', async () => {
    const doc = makeQuestsDoc({
      quests: [
        makeQuest({ id: 'q1', status: 'completed' }),
        makeQuest({ id: 'q2', status: 'completed', module: 'nutrition', conditionType: 'log_all_meals' }),
        makeQuest({ id: 'q3', status: 'completed', module: 'cardio', conditionType: 'complete_cardio' }),
      ],
      bonusClaimed: false,
      completedCount: 3,
    });

    mockRunTransaction.mockImplementation(async (_db: unknown, fn: Function) => {
      const snap = makeDocSnap(doc as unknown as Record<string, unknown>);
      return fn({ get: jest.fn().mockResolvedValue(snap), update: jest.fn(), set: jest.fn() });
    });

    await claimQuestBonus('2026-03-24');
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });
});

// ─── getRecentQuestIds ────────────────────────────────────────────────────────

describe('getRecentQuestIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReturnValue({ path: 'query' });
    mockOrderBy.mockReturnValue('orderBy');
    mockLimit.mockReturnValue('limit');
  });

  it('returns quest IDs from history docs', async () => {
    const historyDocs = [
      {
        id: '2026-03-23',
        data: { questIds: ['q1', 'q2', 'q3'], dateKey: '2026-03-23', createdAt: {} } as unknown as Record<string, unknown>,
      },
      {
        id: '2026-03-22',
        data: { questIds: ['q4', 'q5'], dateKey: '2026-03-22', createdAt: {} } as unknown as Record<string, unknown>,
      },
    ];
    mockGetDocs.mockResolvedValue(makeQuerySnap(historyDocs));

    const result = await getRecentQuestIds(3);
    expect(result.error).toBeNull();
    expect(result.data).toEqual(expect.arrayContaining(['q1', 'q2', 'q3', 'q4', 'q5']));
  });

  it('returns empty array when no history exists', async () => {
    mockGetDocs.mockResolvedValue(makeQuerySnap([]));
    const result = await getRecentQuestIds(3);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await getRecentQuestIds(3);
    expect(result.error).not.toBeNull();

    auth.currentUser = original;
  });
});

// ─── saveQuestHistory ─────────────────────────────────────────────────────────

describe('saveQuestHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset batch mocks
    batchSetMock.mockClear();
    batchDeleteMock.mockClear();
    batchCommitMock.mockClear();
    mockWriteBatch.mockReturnValue({
      set: batchSetMock,
      delete: batchDeleteMock,
      update: batchUpdateMock,
      commit: batchCommitMock,
    });
  });

  it('writes today\'s quest history to the batch', async () => {
    mockGetDocs.mockResolvedValue(makeQuerySnap([]));

    const result = await saveQuestHistory(['q1', 'q2', 'q3']);
    expect(result.error).toBeNull();
    expect(batchSetMock).toHaveBeenCalledTimes(1);
    const setArg = batchSetMock.mock.calls[0][1];
    expect(setArg.questIds).toEqual(['q1', 'q2', 'q3']);
  });

  it('deletes docs older than 4 days', async () => {
    // Simulate old history docs — dates older than 4 days ago
    const oldDate1 = new Date();
    oldDate1.setDate(oldDate1.getDate() - 5);
    const oldKey1 = `${oldDate1.getFullYear()}-${String(oldDate1.getMonth() + 1).padStart(2, '0')}-${String(oldDate1.getDate()).padStart(2, '0')}`;

    const oldDate2 = new Date();
    oldDate2.setDate(oldDate2.getDate() - 10);
    const oldKey2 = `${oldDate2.getFullYear()}-${String(oldDate2.getMonth() + 1).padStart(2, '0')}-${String(oldDate2.getDate()).padStart(2, '0')}`;

    const historyDocs = [
      { id: oldKey1, data: { questIds: ['a', 'b'], dateKey: oldKey1, createdAt: {} } as unknown as Record<string, unknown> },
      { id: oldKey2, data: { questIds: ['c', 'd'], dateKey: oldKey2, createdAt: {} } as unknown as Record<string, unknown> },
    ];
    mockGetDocs.mockResolvedValue(makeQuerySnap(historyDocs));

    await saveQuestHistory(['q1', 'q2', 'q3']);
    // Both old docs should be queued for deletion
    expect(batchDeleteMock).toHaveBeenCalledTimes(2);
  });

  it('does not delete recent docs (within 4 days)', async () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 2);
    const recentKey = `${recentDate.getFullYear()}-${String(recentDate.getMonth() + 1).padStart(2, '0')}-${String(recentDate.getDate()).padStart(2, '0')}`;

    const historyDocs = [
      { id: recentKey, data: { questIds: ['a', 'b'], dateKey: recentKey, createdAt: {} } as unknown as Record<string, unknown> },
    ];
    mockGetDocs.mockResolvedValue(makeQuerySnap(historyDocs));

    await saveQuestHistory(['q1', 'q2', 'q3']);
    expect(batchDeleteMock).not.toHaveBeenCalled();
  });

  it('commits the batch', async () => {
    mockGetDocs.mockResolvedValue(makeQuerySnap([]));
    await saveQuestHistory(['q1', 'q2', 'q3']);
    expect(batchCommitMock).toHaveBeenCalledTimes(1);
  });

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await saveQuestHistory(['q1']);
    expect(result.error).not.toBeNull();

    auth.currentUser = original;
  });
});
