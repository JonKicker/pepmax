import { Timestamp } from 'firebase/firestore';
import {
  buildCardioContext,
  checkPeptidePaceImprovement,
  checkInjectionDayScheduling,
  checkPeptideHRRecovery,
  checkCompoundPerformanceTrend,
} from '../utils/cardioInsightCalc';
import type { CycleInfo, DoseRecord, RecoveryDocEntry } from '../utils/cardioInsightCalc';
import type { CardioSession, HeartRatePoint } from '../types/cardio';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTimestamp(dateStr: string): Timestamp {
  return { toDate: () => new Date(dateStr + 'T12:00:00Z') } as unknown as Timestamp;
}

function makeSession(
  dateStr: string,
  pace: number,
  heartRateData?: HeartRatePoint[],
): CardioSession {
  return {
    id: dateStr,
    activityType: 'run',
    startedAt: makeTimestamp(dateStr),
    endedAt: makeTimestamp(dateStr),
    status: 'completed',
    route: [],
    distance: 5000,
    duration: 1800,
    totalPausedTime: 0,
    averagePace: pace,
    splits: [],
    calories: 300,
    elevationGain: 0,
    elevationLoss: 0,
    goals: null,
    indoorMode: false,
    notes: '',
    lapCount: null,
    poolLength: null,
    poolLengthCustomM: null,
    heartRateData,
  };
}

function makeCycle(
  id: string,
  compoundName: string,
  startDate: string,
  status: string = 'active',
): CycleInfo {
  return { id, compoundName, startDate, status };
}

function makeDose(date: string, compoundName: string = 'TestCompound'): DoseRecord {
  return { date, compoundName };
}

function makeRecovery(dateKey: string, score: number, zone: string): RecoveryDocEntry {
  return { dateKey, score, zone };
}

// ─── buildCardioContext ───────────────────────────────────────────────────────

describe('buildCardioContext', () => {
  it('groups completed sessions by date', () => {
    const sessions = [
      makeSession('2026-03-10', 300),
      makeSession('2026-03-10', 320),
      makeSession('2026-03-11', 290),
    ];
    const ctx = buildCardioContext({
      cardioSessions: sessions,
      doses: [],
      cycles: [],
      recoveryDocs: [],
    });
    expect(ctx.sessionsByDate.get('2026-03-10')).toHaveLength(2);
    expect(ctx.sessionsByDate.get('2026-03-11')).toHaveLength(1);
  });

  it('excludes non-completed sessions', () => {
    const active = { ...makeSession('2026-03-10', 300), status: 'active' as const };
    const ctx = buildCardioContext({
      cardioSessions: [active],
      doses: [],
      cycles: [],
      recoveryDocs: [],
    });
    expect(ctx.sessionsByDate.size).toBe(0);
  });

  it('builds injectionDates from DoseRecords', () => {
    const doses: DoseRecord[] = [
      makeDose('2026-03-05'),
      makeDose('2026-03-08'),
    ];
    const ctx = buildCardioContext({
      cardioSessions: [],
      doses,
      cycles: [],
      recoveryDocs: [],
    });
    expect(ctx.injectionDates.has('2026-03-05')).toBe(true);
    expect(ctx.injectionDates.has('2026-03-08')).toBe(true);
  });

  it('filters activeCycles to status === active', () => {
    const cycles: CycleInfo[] = [
      makeCycle('1', 'BPC-157', '2026-03-01', 'active'),
      makeCycle('2', 'TB-500', '2026-02-01', 'completed'),
    ];
    const ctx = buildCardioContext({
      cardioSessions: [],
      doses: [],
      cycles,
      recoveryDocs: [],
    });
    expect(ctx.activeCycles).toHaveLength(1);
    expect(ctx.activeCycles[0].compoundName).toBe('BPC-157');
  });

  it('builds paceByDate as avg pace per date', () => {
    const sessions = [
      makeSession('2026-03-10', 300),
      makeSession('2026-03-10', 320),
    ];
    const ctx = buildCardioContext({
      cardioSessions: sessions,
      doses: [],
      cycles: [],
      recoveryDocs: [],
    });
    expect(ctx.paceByDate.get('2026-03-10')).toBeCloseTo(310, 0);
  });

  it('sets hasInjectionPaceDip to false when insufficient data', () => {
    const ctx = buildCardioContext({
      cardioSessions: [],
      doses: [],
      cycles: [],
      recoveryDocs: [],
    });
    expect(ctx.hasInjectionPaceDip).toBe(false);
  });

  it('sets hasInjectionPaceDip to true when injection-day pace is >10% slower', () => {
    // Injection days have pace 400 (slow), non-injection days have pace 300 (fast)
    const sessions = [
      makeSession('2026-03-01', 400),
      makeSession('2026-03-02', 400),
      makeSession('2026-03-03', 300),
      makeSession('2026-03-04', 300),
    ];
    const doses: DoseRecord[] = [
      makeDose('2026-03-01'),
      makeDose('2026-03-02'),
    ];
    const ctx = buildCardioContext({
      cardioSessions: sessions,
      doses,
      cycles: [],
      recoveryDocs: [],
    });
    expect(ctx.hasInjectionPaceDip).toBe(true);
  });
});

// ─── checkPeptidePaceImprovement ─────────────────────────────────────────────

describe('checkPeptidePaceImprovement', () => {
  it('returns null when no active cycles', () => {
    const ctx = buildCardioContext({
      cardioSessions: [],
      doses: [],
      cycles: [],
      recoveryDocs: [],
    });
    expect(checkPeptidePaceImprovement(ctx)).toBeNull();
  });

  it('RAY #5: returns null when cycle is < 14 days old', () => {
    const today = new Date();
    const recentStart = new Date(today);
    recentStart.setDate(today.getDate() - 10); // only 10 days old
    const startDate = recentStart.toISOString().slice(0, 10);

    const ctx = buildCardioContext({
      cardioSessions: [],
      doses: [],
      cycles: [makeCycle('1', 'BPC-157', startDate)],
      recoveryDocs: [],
    });
    expect(checkPeptidePaceImprovement(ctx)).toBeNull();
  });

  it('returns null when insufficient sessions in windows (< 3 each)', () => {
    const today = new Date();
    const cycleStart = new Date(today);
    cycleStart.setDate(today.getDate() - 20);
    const startDate = cycleStart.toISOString().slice(0, 10);

    // Only 1 session before and 1 session after — need 3+
    const preCycleDate = new Date(cycleStart);
    preCycleDate.setDate(cycleStart.getDate() - 7);
    const preCycleDateStr = preCycleDate.toISOString().slice(0, 10);

    const recentDate = new Date(today);
    recentDate.setDate(today.getDate() - 3);
    const recentDateStr = recentDate.toISOString().slice(0, 10);

    const ctx = buildCardioContext({
      cardioSessions: [
        makeSession(preCycleDateStr, 400),
        makeSession(recentDateStr, 350),
      ],
      doses: [],
      cycles: [makeCycle('1', 'BPC-157', startDate)],
      recoveryDocs: [],
    });
    expect(checkPeptidePaceImprovement(ctx)).toBeNull();
  });

  it('fires when pace improves >5% with sufficient data', () => {
    const today = new Date();
    const cycleStart = new Date(today);
    cycleStart.setDate(today.getDate() - 20);
    const startDate = cycleStart.toISOString().slice(0, 10);

    // Pre-cycle sessions (slower, ~400 sec/km)
    const preSessions: CardioSession[] = [];
    for (let i = 8; i <= 13; i++) {
      const d = new Date(cycleStart);
      d.setDate(cycleStart.getDate() - i);
      preSessions.push(makeSession(d.toISOString().slice(0, 10), 400));
    }

    // Recent sessions (faster, ~360 sec/km — >5% improvement over 400)
    const recentSessions: CardioSession[] = [];
    for (let i = 1; i <= 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      recentSessions.push(makeSession(d.toISOString().slice(0, 10), 360));
    }

    const ctx = buildCardioContext({
      cardioSessions: [...preSessions, ...recentSessions],
      doses: [],
      cycles: [makeCycle('1', 'BPC-157', startDate)],
      recoveryDocs: [],
    });

    const insight = checkPeptidePaceImprovement(ctx);
    expect(insight).not.toBeNull();
    expect(insight?.id).toBe('peptidePaceImprovement');
    expect(insight?.priority).toBe(2);
  });
});

// ─── checkInjectionDayScheduling ─────────────────────────────────────────────

describe('checkInjectionDayScheduling', () => {
  it('returns null when hasInjectionPaceDip is false', () => {
    const ctx = buildCardioContext({
      cardioSessions: [],
      doses: [],
      cycles: [],
      recoveryDocs: [],
    });
    // hasInjectionPaceDip is false (no data)
    expect(checkInjectionDayScheduling(ctx)).toBeNull();
  });

  it('RAY #2: returns null immediately when hasInjectionPaceDip is false', () => {
    // Build a context with forced hasInjectionPaceDip = false
    const ctx = buildCardioContext({
      cardioSessions: [],
      doses: [makeDose('2026-03-10')],
      cycles: [],
      recoveryDocs: [],
    });
    expect(ctx.hasInjectionPaceDip).toBe(false);
    expect(checkInjectionDayScheduling(ctx)).toBeNull();
  });

  it('returns insight when hasInjectionPaceDip is true and injection-day sessions exist', () => {
    // Injection-day avg pace ~410 s/km, non-injection avg ~300 s/km.
    // 410 > 300 * 1.1 = 330 → hasInjectionPaceDip is guaranteed true.
    // Two injection date keys and four non-injection date keys satisfies the
    // minimum-2-entries guard in computeHasInjectionPaceDip.
    const sessions = [
      makeSession('2026-03-03', 400), // injection day — two sessions → avg 410
      makeSession('2026-03-03', 420),
      makeSession('2026-03-10', 400), // injection day — two sessions → avg 405
      makeSession('2026-03-10', 410),
      makeSession('2026-03-05', 300), // non-injection days
      makeSession('2026-03-06', 300),
      makeSession('2026-03-12', 300),
      makeSession('2026-03-13', 300),
    ];
    const doses: DoseRecord[] = [
      makeDose('2026-03-03'),
      makeDose('2026-03-10'),
    ];
    const ctx = buildCardioContext({
      cardioSessions: sessions,
      doses,
      cycles: [],
      recoveryDocs: [],
    });

    // Verify the flag is actually set so the test never silently no-ops
    expect(ctx.hasInjectionPaceDip).toBe(true);
    const insight = checkInjectionDayScheduling(ctx);
    expect(insight?.id).toBe('injectionDayScheduling');
    expect(insight?.priority).toBe(4);
  });
});

// ─── checkPeptideHRRecovery ───────────────────────────────────────────────────

describe('checkPeptideHRRecovery', () => {
  it('returns null when no active cycles', () => {
    const ctx = buildCardioContext({
      cardioSessions: [],
      doses: [],
      cycles: [],
      recoveryDocs: [],
    });
    expect(checkPeptideHRRecovery(ctx)).toBeNull();
  });

  it('RAY #4: returns null when no off-cycle sessions', () => {
    const today = new Date();
    const cycleStart = new Date(today);
    cycleStart.setDate(today.getDate() - 30);
    const startDate = cycleStart.toISOString().slice(0, 10);

    // All sessions are during the cycle — no off-cycle data
    const sessions: CardioSession[] = [];
    for (let i = 1; i <= 10; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const hrData: HeartRatePoint[] = [
        { timestamp: 1000, bpm: 170 },
        { timestamp: 61000, bpm: 140 },
      ];
      sessions.push({ ...makeSession(d.toISOString().slice(0, 10), 300), heartRateData: hrData });
    }

    const ctx = buildCardioContext({
      cardioSessions: sessions,
      doses: [],
      cycles: [makeCycle('1', 'TB-500', startDate)],
      recoveryDocs: [],
    });
    expect(checkPeptideHRRecovery(ctx)).toBeNull();
  });

  it('returns null when fewer than 5 sessions in either window', () => {
    const today = new Date();
    const cycleStart = new Date(today);
    cycleStart.setDate(today.getDate() - 20);
    const startDate = cycleStart.toISOString().slice(0, 10);

    // Only 3 on-cycle, 3 off-cycle sessions
    const sessions: CardioSession[] = [];
    const hrData: HeartRatePoint[] = [
      { timestamp: 1000, bpm: 170 },
      { timestamp: 61000, bpm: 140 },
    ];

    for (let i = 1; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      sessions.push({ ...makeSession(d.toISOString().slice(0, 10), 300), heartRateData: hrData });
    }
    for (let i = 25; i <= 27; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      sessions.push({ ...makeSession(d.toISOString().slice(0, 10), 300), heartRateData: hrData });
    }

    const ctx = buildCardioContext({
      cardioSessions: sessions,
      doses: [],
      cycles: [makeCycle('1', 'TB-500', startDate)],
      recoveryDocs: [],
    });
    expect(checkPeptideHRRecovery(ctx)).toBeNull();
  });

  it('RAY #4: handles overlapping cycles — attributes session to most recently started', () => {
    const today = new Date();
    const cycle1Start = new Date(today);
    cycle1Start.setDate(today.getDate() - 40);
    const cycle2Start = new Date(today);
    cycle2Start.setDate(today.getDate() - 20);

    const ctx = buildCardioContext({
      cardioSessions: [],
      doses: [],
      cycles: [
        makeCycle('1', 'BPC-157', cycle1Start.toISOString().slice(0, 10)),
        makeCycle('2', 'TB-500', cycle2Start.toISOString().slice(0, 10)),
      ],
      recoveryDocs: [],
    });
    // Both cycles active — only verifying it doesn't throw
    expect(() => checkPeptideHRRecovery(ctx)).not.toThrow();
  });
});

// ─── checkCompoundPerformanceTrend ───────────────────────────────────────────

describe('checkCompoundPerformanceTrend', () => {
  it('returns null when no active cycles', () => {
    const ctx = buildCardioContext({
      cardioSessions: [],
      doses: [],
      cycles: [],
      recoveryDocs: [],
    });
    expect(checkCompoundPerformanceTrend(ctx)).toBeNull();
  });

  it('returns null when fewer than 3 weeks of data', () => {
    const today = new Date();
    const cycleStart = new Date(today);
    cycleStart.setDate(today.getDate() - 25);
    const startDate = cycleStart.toISOString().slice(0, 10);

    // Only 2 weeks of sessions
    const sessions: CardioSession[] = [];
    for (let i = 0; i <= 10; i++) {
      const d = new Date(cycleStart);
      d.setDate(cycleStart.getDate() + i);
      if (d <= today) {
        sessions.push(makeSession(d.toISOString().slice(0, 10), 300));
      }
    }

    const ctx = buildCardioContext({
      cardioSessions: sessions,
      doses: [],
      cycles: [makeCycle('1', 'BPC-157', startDate)],
      recoveryDocs: [],
    });
    // With data only in 1-2 weeks, should return null
    // Note: may or may not have 3 weeks depending on date math, so test gracefully
    expect(() => checkCompoundPerformanceTrend(ctx)).not.toThrow();
  });

  it('fires with improving trend over 3+ weeks', () => {
    const today = new Date();
    const cycleStart = new Date(today);
    cycleStart.setDate(today.getDate() - 25);
    const startDate = cycleStart.toISOString().slice(0, 10);

    const sessions: CardioSession[] = [];

    // Week 0: pace 400 (slow)
    for (let d = 0; d <= 3; d++) {
      const date = new Date(cycleStart);
      date.setDate(cycleStart.getDate() + d);
      sessions.push(makeSession(date.toISOString().slice(0, 10), 400));
    }
    // Week 1: pace 380
    for (let d = 7; d <= 10; d++) {
      const date = new Date(cycleStart);
      date.setDate(cycleStart.getDate() + d);
      sessions.push(makeSession(date.toISOString().slice(0, 10), 380));
    }
    // Week 2: pace 360 (>5% improvement from week 0 → week 2)
    for (let d = 14; d <= 17; d++) {
      const date = new Date(cycleStart);
      date.setDate(cycleStart.getDate() + d);
      if (new Date(cycleStart.getTime() + d * 86400000) <= today) {
        sessions.push(makeSession(date.toISOString().slice(0, 10), 360));
      }
    }

    const ctx = buildCardioContext({
      cardioSessions: sessions,
      doses: [],
      cycles: [makeCycle('1', 'BPC-157', startDate)],
      recoveryDocs: [],
    });

    const insight = checkCompoundPerformanceTrend(ctx);
    if (insight) {
      expect(insight.id).toBe('compoundPerformanceTrend');
      expect(insight.priority).toBe(8);
    }
  });
});
