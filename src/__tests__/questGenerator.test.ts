/**
 * questGenerator.test.ts — pure unit tests for the quest selection algorithm.
 *
 * No Firebase mocks needed — questGenerator is a pure function.
 */
import { generateDailyQuests, QUEST_POOL } from '../utils/questGenerator';
import type { XPModule } from '../types/gamification';

// ─── Helper ───────────────────────────────────────────────────────────────────

function modulesIn(quests: ReturnType<typeof generateDailyQuests>): Set<XPModule> {
  return new Set(quests.map((q) => q.module));
}

// ─── Core invariants ──────────────────────────────────────────────────────────

describe('generateDailyQuests — core invariants', () => {
  it('returns exactly 3 quests', () => {
    const result = generateDailyQuests(['gym', 'nutrition', 'cardio'], [], 42);
    expect(result).toHaveLength(3);
  });

  it('all returned quests have status "active"', () => {
    const result = generateDailyQuests(['gym', 'nutrition', 'cardio'], [], 42);
    result.forEach((q) => {
      expect(q.status).toBe('active');
    });
  });

  it('all returned quests have valid ids from the pool', () => {
    const poolIds = new Set(QUEST_POOL.map((q) => q.id));
    const result = generateDailyQuests(['gym', 'nutrition', 'cardio', 'peptides', 'recovery'], [], 42);
    result.forEach((q) => {
      expect(poolIds.has(q.id)).toBe(true);
    });
  });
});

// ─── Module filtering ─────────────────────────────────────────────────────────

describe('generateDailyQuests — module filtering', () => {
  it('filters by active modules — no quests from inactive modules', () => {
    const result = generateDailyQuests(['gym'], [], 1);
    result.forEach((q) => {
      expect(q.module).toBe('gym');
    });
  });

  it('returns quests from 2+ different modules when multiple modules are active', () => {
    const result = generateDailyQuests(['gym', 'nutrition', 'cardio'], [], 1);
    const uniqueModules = modulesIn(result);
    expect(uniqueModules.size).toBeGreaterThanOrEqual(2);
  });

  it('only uses nutrition quests when only nutrition is active', () => {
    const result = generateDailyQuests(['nutrition'], [], 99);
    result.forEach((q) => {
      expect(q.module).toBe('nutrition');
    });
  });

  it('handles all 5 modules being active', () => {
    const allModules: XPModule[] = ['peptides', 'gym', 'nutrition', 'cardio', 'recovery'];
    const result = generateDailyQuests(allModules, [], 123);
    expect(result).toHaveLength(3);
    // All from valid modules
    result.forEach((q) => {
      expect(allModules).toContain(q.module);
    });
  });
});

// ─── Recency de-duplication ───────────────────────────────────────────────────

describe('generateDailyQuests — recency de-duplication', () => {
  it('removes recently used quests when alternatives exist', () => {
    // Mark all gym quests as recent — result should have no gym quests
    const gymQuestIds = QUEST_POOL.filter((q) => q.module === 'gym').map((q) => q.id);
    const result = generateDailyQuests(['gym', 'nutrition', 'cardio', 'recovery'], gymQuestIds, 7);
    result.forEach((q) => {
      expect(q.module).not.toBe('gym');
    });
  });

  it('wraps around (ignores recency) when all quests were recently used', () => {
    const allIds = QUEST_POOL.map((q) => q.id);
    // Should still return 3 quests despite all being "recent"
    const result = generateDailyQuests(['gym', 'nutrition', 'cardio'], allIds, 5);
    expect(result).toHaveLength(3);
  });

  it('wraps around when only 1 active module and all its quests are recent', () => {
    const nutritionIds = QUEST_POOL.filter((q) => q.module === 'nutrition').map((q) => q.id);
    const result = generateDailyQuests(['nutrition'], nutritionIds, 5);
    expect(result).toHaveLength(3);
    result.forEach((q) => {
      expect(q.module).toBe('nutrition');
    });
  });

  it('does not include recently used quests when fresh alternatives exist', () => {
    // Use the first two gym quest IDs as recent
    const gymIds = QUEST_POOL.filter((q) => q.module === 'gym').map((q) => q.id);
    const recentIds = gymIds.slice(0, 1);
    const result = generateDailyQuests(['gym', 'nutrition'], recentIds, 3);
    const resultIds = new Set(result.map((q) => q.id));
    // The excluded quest should not appear
    expect(resultIds.has(recentIds[0])).toBe(false);
  });
});

// ─── Module diversity bias ────────────────────────────────────────────────────

describe('generateDailyQuests — module diversity', () => {
  it('prefers 2+ different modules when 2+ active modules have quests', () => {
    // Run with all modules, multiple seeds — diversity should hold consistently
    const seeds = [1, 2, 3, 10, 50, 100, 999, 20260324];
    const results = seeds.map((s) =>
      generateDailyQuests(['gym', 'nutrition', 'cardio', 'recovery', 'peptides'], [], s),
    );
    results.forEach((r, i) => {
      const uniqueModules = modulesIn(r);
      expect(uniqueModules.size).toBeGreaterThanOrEqual(2);
      // sanity: still 3 quests
      expect(r).toHaveLength(3);
    });
  });

  it('biases toward least-active module when one module dominates', () => {
    // With a seed that would normally pick all-gym, other modules should intervene
    // We confirm that with 5 modules we never get all 3 from the same module
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const allModules: XPModule[] = ['peptides', 'gym', 'nutrition', 'cardio', 'recovery'];
    let singleModuleCount = 0;
    for (const seed of seeds) {
      const r = generateDailyQuests(allModules, [], seed);
      if (modulesIn(r).size === 1) singleModuleCount++;
    }
    // Should be rare (or zero) — algorithm actively prevents this
    expect(singleModuleCount).toBeLessThanOrEqual(1);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('generateDailyQuests — edge cases', () => {
  it('handles 1 active module with at least 3 quests in the pool', () => {
    const result = generateDailyQuests(['nutrition'], [], 7);
    expect(result).toHaveLength(3);
    result.forEach((q) => expect(q.module).toBe('nutrition'));
  });

  it('handles empty recentQuestIds array', () => {
    const result = generateDailyQuests(['gym', 'cardio'], [], 0);
    expect(result).toHaveLength(3);
  });

  it('uses deterministic seed — same seed always produces the same result', () => {
    const a = generateDailyQuests(['gym', 'nutrition', 'cardio'], [], 12345);
    const b = generateDailyQuests(['gym', 'nutrition', 'cardio'], [], 12345);
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
  });

  it('different seeds produce different orderings', () => {
    const a = generateDailyQuests(['gym', 'nutrition', 'cardio', 'recovery', 'peptides'], [], 1);
    const b = generateDailyQuests(['gym', 'nutrition', 'cardio', 'recovery', 'peptides'], [], 99999);
    // With a large pool and different seeds, results should differ at least sometimes
    // (Not guaranteed on every seed pair, but these specific values should differ)
    const sameIds = a.map((q) => q.id).join(',') === b.map((q) => q.id).join(',');
    // We can't assert they MUST differ for every pair, but we run multiple and check
    // at least one differs across a range
    const results = [1, 2, 3, 4, 5].map((s) =>
      generateDailyQuests(['gym', 'nutrition', 'cardio', 'recovery', 'peptides'], [], s).map((q) => q.id).join(','),
    );
    const uniqueResults = new Set(results);
    expect(uniqueResults.size).toBeGreaterThan(1);
  });

  it('returned quests have required fields: id, title, xpReward, module, status, conditionType', () => {
    const result = generateDailyQuests(['gym', 'nutrition', 'recovery'], [], 42);
    result.forEach((q) => {
      expect(q.id).toBeTruthy();
      expect(q.title).toBeTruthy();
      expect(typeof q.xpReward).toBe('number');
      expect(q.xpReward).toBeGreaterThan(0);
      expect(q.module).toBeTruthy();
      expect(q.status).toBe('active');
      expect(q.conditionType).toBeTruthy();
    });
  });
});
