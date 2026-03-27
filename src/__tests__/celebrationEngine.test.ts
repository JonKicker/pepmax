/**
 * celebrationEngine.test.ts
 * Tests for celebration presets, particle counts, and queue logic.
 */
import {
  micro,
  dailyQuest,
  duelWin,
  rankUp,
  seasonReward,
  elite,
  perfectWeek,
  getParticleCountForTier,
} from '../utils/celebrationPresets';
import type { CelebrationConfig, CelebrationQueueItem, CelebrationTier } from '../types/celebration';

// ─── Factory helpers ──────────────────────────────────────────────────────────
function makeQueueItem(config: CelebrationConfig, addedAt = Date.now()): CelebrationQueueItem {
  return { id: `test_${Math.random()}`, config, addedAt };
}

// Minimal queue implementation mirroring useCelebration logic
const MAX_QUEUE_SIZE = 3;

function addToQueue(queue: CelebrationQueueItem[], item: CelebrationQueueItem): CelebrationQueueItem[] {
  const q = [...queue];
  if (q.length >= MAX_QUEUE_SIZE) {
    // drop-oldest
    q.sort((a, b) => a.addedAt - b.addedAt);
    q.shift();
  }
  q.push(item);
  return q;
}

function sortByPriority(queue: CelebrationQueueItem[]): CelebrationQueueItem[] {
  return [...queue].sort((a, b) => {
    if (b.config.priority !== a.config.priority) return b.config.priority - a.config.priority;
    return a.addedAt - b.addedAt;
  });
}

// ─── Preset factories — tier ──────────────────────────────────────────────────

describe('Preset factories — tier', () => {
  it('micro returns tier "micro"', () => {
    expect(micro().tier).toBe('micro');
  });

  it('dailyQuest returns tier "medium"', () => {
    expect(dailyQuest().tier).toBe('medium');
  });

  it('duelWin returns tier "medium"', () => {
    expect(duelWin().tier).toBe('medium');
  });

  it('rankUp returns tier "major"', () => {
    expect(rankUp().tier).toBe('major');
  });

  it('seasonReward returns tier "major"', () => {
    expect(seasonReward().tier).toBe('major');
  });

  it('elite returns tier "legendary"', () => {
    expect(elite().tier).toBe('legendary');
  });

  it('perfectWeek returns tier "legendary"', () => {
    expect(perfectWeek().tier).toBe('legendary');
  });
});

// ─── Preset factories — duration ──────────────────────────────────────────────

describe('Preset factories — duration', () => {
  it('micro has duration 300', () => {
    expect(micro().duration).toBe(300);
  });

  it('dailyQuest has duration 2000', () => {
    expect(dailyQuest().duration).toBe(2000);
  });

  it('duelWin has duration 2500', () => {
    expect(duelWin().duration).toBe(2500);
  });

  it('rankUp has duration 3000', () => {
    expect(rankUp().duration).toBe(3000);
  });

  it('seasonReward has duration 3000', () => {
    expect(seasonReward().duration).toBe(3000);
  });

  it('elite has duration 3500', () => {
    expect(elite().duration).toBe(3500);
  });

  it('perfectWeek has duration 3500', () => {
    expect(perfectWeek().duration).toBe(3500);
  });
});

// ─── Preset factories — priority ─────────────────────────────────────────────

describe('Preset factories — priority', () => {
  it('micro has priority 1', () => {
    expect(micro().priority).toBe(1);
  });

  it('dailyQuest has priority 3', () => {
    expect(dailyQuest().priority).toBe(3);
  });

  it('duelWin has priority 4', () => {
    expect(duelWin().priority).toBe(4);
  });

  it('rankUp has priority 5', () => {
    expect(rankUp().priority).toBe(5);
  });

  it('seasonReward has priority 5', () => {
    expect(seasonReward().priority).toBe(5);
  });

  it('elite has priority 5', () => {
    expect(elite().priority).toBe(5);
  });

  it('perfectWeek has priority 5', () => {
    expect(perfectWeek().priority).toBe(5);
  });
});

// ─── Preset factories — hapticPattern ────────────────────────────────────────

describe('Preset factories — hapticPattern', () => {
  it('micro uses haptic "tap"', () => {
    expect(micro().hapticPattern).toBe('tap');
  });

  it('dailyQuest uses haptic "success"', () => {
    expect(dailyQuest().hapticPattern).toBe('success');
  });

  it('duelWin uses haptic "success"', () => {
    expect(duelWin().hapticPattern).toBe('success');
  });

  it('rankUp uses haptic "heavy"', () => {
    expect(rankUp().hapticPattern).toBe('heavy');
  });

  it('seasonReward uses haptic "heavy"', () => {
    expect(seasonReward().hapticPattern).toBe('heavy');
  });

  it('elite uses haptic "doubleHeavy"', () => {
    expect(elite().hapticPattern).toBe('doubleHeavy');
  });

  it('perfectWeek uses haptic "doubleHeavy"', () => {
    expect(perfectWeek().hapticPattern).toBe('doubleHeavy');
  });
});

// ─── Preset factories — particle counts ──────────────────────────────────────

describe('Preset factories — particle counts', () => {
  it('micro has 0 particles', () => {
    expect(micro().particleCount).toBe(0);
  });

  it('dailyQuest has 20 particles', () => {
    expect(dailyQuest().particleCount).toBe(20);
  });

  it('duelWin has 20 particles', () => {
    expect(duelWin().particleCount).toBe(20);
  });

  it('rankUp has 32 particles', () => {
    expect(rankUp().particleCount).toBe(32);
  });

  it('seasonReward has 32 particles', () => {
    expect(seasonReward().particleCount).toBe(32);
  });

  it('elite has 40 particles', () => {
    expect(elite().particleCount).toBe(40);
  });

  it('perfectWeek has 40 particles', () => {
    expect(perfectWeek().particleCount).toBe(40);
  });
});

// ─── getParticleCountForTier ──────────────────────────────────────────────────

describe('getParticleCountForTier', () => {
  it('returns 0 for micro', () => {
    expect(getParticleCountForTier('micro')).toBe(0);
  });

  it('returns 20 for medium', () => {
    expect(getParticleCountForTier('medium')).toBe(20);
  });

  it('returns 32 for major', () => {
    expect(getParticleCountForTier('major')).toBe(32);
  });

  it('returns 40 for legendary', () => {
    expect(getParticleCountForTier('legendary')).toBe(40);
  });
});

// ─── No preset exceeds 40 particles ──────────────────────────────────────────

describe('Particle safety cap', () => {
  const allPresets = [
    micro(),
    dailyQuest(),
    duelWin(),
    rankUp(),
    seasonReward(),
    elite(),
    perfectWeek(),
  ];

  it('no preset exceeds 40 particles', () => {
    for (const preset of allPresets) {
      expect(preset.particleCount).toBeLessThanOrEqual(40);
    }
  });

  it('no preset has negative particleCount', () => {
    for (const preset of allPresets) {
      expect(preset.particleCount).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── Queue — max depth 3 ─────────────────────────────────────────────────────

describe('Queue — max depth 3', () => {
  it('queue never exceeds 3 items', () => {
    let queue: CelebrationQueueItem[] = [];
    for (let i = 0; i < 6; i++) {
      queue = addToQueue(queue, makeQueueItem(micro(), i));
    }
    expect(queue.length).toBeLessThanOrEqual(3);
  });

  it('queue has exactly 3 items after adding 4', () => {
    let queue: CelebrationQueueItem[] = [];
    for (let i = 0; i < 4; i++) {
      queue = addToQueue(queue, makeQueueItem(micro(), i));
    }
    expect(queue.length).toBe(3);
  });

  it('queue has exactly 1 item after adding 1', () => {
    let queue: CelebrationQueueItem[] = [];
    queue = addToQueue(queue, makeQueueItem(micro(), 0));
    expect(queue.length).toBe(1);
  });
});

// ─── Queue — drop-oldest policy ──────────────────────────────────────────────

describe('Queue — drop-oldest policy', () => {
  it('drops the oldest item when queue is full', () => {
    let queue: CelebrationQueueItem[] = [];
    const items = [0, 1, 2, 3].map((t) => makeQueueItem(micro(), t));
    for (const item of items) {
      queue = addToQueue(queue, item);
    }
    // After adding 4, oldest (addedAt=0) should be gone
    const ids = queue.map((q) => q.id);
    expect(ids).not.toContain(items[0].id);
  });

  it('retains the most recent 3 items', () => {
    let queue: CelebrationQueueItem[] = [];
    const items = [0, 1, 2, 3].map((t) => makeQueueItem(micro(), t));
    for (const item of items) {
      queue = addToQueue(queue, item);
    }
    const ids = queue.map((q) => q.id);
    expect(ids).toContain(items[1].id);
    expect(ids).toContain(items[2].id);
    expect(ids).toContain(items[3].id);
  });
});

// ─── Queue — priority ordering ────────────────────────────────────────────────

describe('Queue — priority ordering', () => {
  it('higher priority plays first', () => {
    let queue: CelebrationQueueItem[] = [];
    queue = addToQueue(queue, makeQueueItem(micro(), 0));        // priority 1
    queue = addToQueue(queue, makeQueueItem(dailyQuest(), 1));   // priority 3
    queue = addToQueue(queue, makeQueueItem(rankUp(), 2));       // priority 5

    const sorted = sortByPriority(queue);
    expect(sorted[0].config.priority).toBe(5);
    expect(sorted[1].config.priority).toBe(3);
    expect(sorted[2].config.priority).toBe(1);
  });

  it('equal priority plays FIFO (earlier addedAt first)', () => {
    let queue: CelebrationQueueItem[] = [];
    queue = addToQueue(queue, makeQueueItem(elite(), 100));      // priority 5, older
    queue = addToQueue(queue, makeQueueItem(perfectWeek(), 200)); // priority 5, newer

    const sorted = sortByPriority(queue);
    expect(sorted[0].addedAt).toBe(100);
    expect(sorted[1].addedAt).toBe(200);
  });

  it('duelWin (priority 4) plays before dailyQuest (priority 3)', () => {
    let queue: CelebrationQueueItem[] = [];
    queue = addToQueue(queue, makeQueueItem(dailyQuest(), 0));
    queue = addToQueue(queue, makeQueueItem(duelWin(), 1));

    const sorted = sortByPriority(queue);
    expect(sorted[0].config.hapticPattern).toBe('success');
    expect(sorted[0].config.duration).toBe(2500); // duelWin
  });

  it('legendary tier has higher priority than medium tier', () => {
    expect(elite().priority).toBeGreaterThan(dailyQuest().priority);
  });
});

// ─── Preset overrides ────────────────────────────────────────────────────────

describe('Preset overrides', () => {
  it('can override title via overrides param', () => {
    const c = dailyQuest({ title: 'Custom Title' });
    expect(c.title).toBe('Custom Title');
  });

  it('can override accentColor', () => {
    const c = elite({ accentColor: '#FF0000' });
    expect(c.accentColor).toBe('#FF0000');
  });

  it('overrides do not affect tier or priority', () => {
    const c = rankUp({ title: 'Test' });
    expect(c.tier).toBe('major');
    expect(c.priority).toBe(5);
  });
});
