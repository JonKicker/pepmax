/**
 * Tests for the Body Hub empty-state detection logic.
 *
 * The logic is extracted as a pure function that mirrors `getActiveLayerState()`
 * in body-hub.tsx. This avoids mounting the full screen component and lets us
 * test the isEmpty calculation directly.
 *
 * Ray note #4: isEmpty must ONLY be true when loading===false AND error===null.
 * Never show empty state during loading (empty flash guard).
 */

import type { BodyHubLayer } from '../types/bodyHub';
import type { MeasurementPointData } from '../types/bodyHub';

// ─── Pure function mirroring getActiveLayerState isEmpty logic ───────────────

type LayerHookLike = {
  loading: boolean;
  error: string | null;
};

type MusclesHook = LayerHookLike & { muscleStats: Map<string, unknown> };
type InjectionsHook = LayerHookLike & { siteStats: unknown[] };
type MeasurementsHook = LayerHookLike & { points: Pick<MeasurementPointData, 'latestValue'>[] };
type CardioHook = LayerHookLike & {
  heartData: unknown | null;
  lungData: unknown | null;
  legData: unknown | null;
};

function computeIsEmpty(
  activeLayer: BodyHubLayer,
  muscles: MusclesHook,
  injections: InjectionsHook,
  measurements: MeasurementsHook,
  cardio: CardioHook
): boolean {
  const hooks: Record<BodyHubLayer, LayerHookLike> = { muscles, injections, measurements, cardio };
  const hook = hooks[activeLayer];

  // Empty flash guard — never report empty during load or error
  if (hook.loading || hook.error !== null) return false;

  switch (activeLayer) {
    case 'muscles':
      return muscles.muscleStats.size === 0;
    case 'injections':
      return injections.siteStats.length === 0;
    case 'measurements':
      return (
        measurements.points.length === 0 ||
        measurements.points.every((p) => p.latestValue === null)
      );
    case 'cardio':
      return (
        cardio.heartData === null &&
        cardio.lungData === null &&
        cardio.legData === null
      );
  }
}

// ─── Factory helpers ──────────────────────────────────────────────────────────

function makeMuscles(overrides?: Partial<MusclesHook>): MusclesHook {
  return { loading: false, error: null, muscleStats: new Map(), ...overrides };
}
function makeInjections(overrides?: Partial<InjectionsHook>): InjectionsHook {
  return { loading: false, error: null, siteStats: [], ...overrides };
}
function makeMeasurements(overrides?: Partial<MeasurementsHook>): MeasurementsHook {
  return { loading: false, error: null, points: [], ...overrides };
}
function makeCardio(overrides?: Partial<CardioHook>): CardioHook {
  return { loading: false, error: null, heartData: null, lungData: null, legData: null, ...overrides };
}

// Helper: measurement point with a value
const withValue = (latestValue: number | null): Pick<MeasurementPointData, 'latestValue'> => ({
  latestValue,
});

// ─── muscles layer ────────────────────────────────────────────────────────────

describe('isEmpty — muscles layer', () => {
  it('returns true when muscleStats is empty Map', () => {
    expect(
      computeIsEmpty('muscles', makeMuscles(), makeInjections(), makeMeasurements(), makeCardio())
    ).toBe(true);
  });

  it('returns false when muscleStats has entries', () => {
    const m = makeMuscles({ muscleStats: new Map([['chest', {}]]) });
    expect(computeIsEmpty('muscles', m, makeInjections(), makeMeasurements(), makeCardio())).toBe(false);
  });

  it('returns false (empty flash guard) when loading is true even if map is empty', () => {
    const m = makeMuscles({ loading: true });
    expect(computeIsEmpty('muscles', m, makeInjections(), makeMeasurements(), makeCardio())).toBe(false);
  });

  it('returns false (empty flash guard) when error is set even if map is empty', () => {
    const m = makeMuscles({ error: 'Network error' });
    expect(computeIsEmpty('muscles', m, makeInjections(), makeMeasurements(), makeCardio())).toBe(false);
  });
});

// ─── injections layer ─────────────────────────────────────────────────────────

describe('isEmpty — injections layer', () => {
  it('returns true when siteStats array is empty', () => {
    expect(
      computeIsEmpty('injections', makeMuscles(), makeInjections(), makeMeasurements(), makeCardio())
    ).toBe(true);
  });

  it('returns false when siteStats has entries', () => {
    const inj = makeInjections({ siteStats: [{ site: 'leftDelt' }] });
    expect(computeIsEmpty('injections', makeMuscles(), inj, makeMeasurements(), makeCardio())).toBe(false);
  });

  it('returns false (empty flash guard) when loading is true', () => {
    const inj = makeInjections({ loading: true });
    expect(computeIsEmpty('injections', makeMuscles(), inj, makeMeasurements(), makeCardio())).toBe(false);
  });

  it('returns false (empty flash guard) when error is set', () => {
    const inj = makeInjections({ error: 'Failed to load' });
    expect(computeIsEmpty('injections', makeMuscles(), inj, makeMeasurements(), makeCardio())).toBe(false);
  });
});

// ─── measurements layer ───────────────────────────────────────────────────────

describe('isEmpty — measurements layer', () => {
  it('returns true when points array is empty', () => {
    expect(
      computeIsEmpty('measurements', makeMuscles(), makeInjections(), makeMeasurements(), makeCardio())
    ).toBe(true);
  });

  it('returns true when all points have null latestValue', () => {
    const m = makeMeasurements({ points: [withValue(null), withValue(null)] });
    expect(computeIsEmpty('measurements', makeMuscles(), makeInjections(), m, makeCardio())).toBe(true);
  });

  it('returns false when at least one point has a value', () => {
    const m = makeMeasurements({ points: [withValue(null), withValue(85.5)] });
    expect(computeIsEmpty('measurements', makeMuscles(), makeInjections(), m, makeCardio())).toBe(false);
  });

  it('returns false when all points have values', () => {
    const m = makeMeasurements({ points: [withValue(40), withValue(95)] });
    expect(computeIsEmpty('measurements', makeMuscles(), makeInjections(), m, makeCardio())).toBe(false);
  });

  it('returns false (empty flash guard) when loading is true', () => {
    const m = makeMeasurements({ loading: true });
    expect(computeIsEmpty('measurements', makeMuscles(), makeInjections(), m, makeCardio())).toBe(false);
  });

  it('returns false (empty flash guard) when error is set', () => {
    const m = makeMeasurements({ error: 'Measurement error' });
    expect(computeIsEmpty('measurements', makeMuscles(), makeInjections(), m, makeCardio())).toBe(false);
  });
});

// ─── cardio layer ─────────────────────────────────────────────────────────────

describe('isEmpty — cardio layer', () => {
  it('returns true when all three data fields are null', () => {
    expect(
      computeIsEmpty('cardio', makeMuscles(), makeInjections(), makeMeasurements(), makeCardio())
    ).toBe(true);
  });

  it('returns false when heartData is present', () => {
    const c = makeCardio({ heartData: { restingBpm: 62 } });
    expect(computeIsEmpty('cardio', makeMuscles(), makeInjections(), makeMeasurements(), c)).toBe(false);
  });

  it('returns false when lungData is present', () => {
    const c = makeCardio({ lungData: { weeklyCardioMinutes: 120 } });
    expect(computeIsEmpty('cardio', makeMuscles(), makeInjections(), makeMeasurements(), c)).toBe(false);
  });

  it('returns false when legData is present', () => {
    const c = makeCardio({ legData: { weeklyMileage: 10 } });
    expect(computeIsEmpty('cardio', makeMuscles(), makeInjections(), makeMeasurements(), c)).toBe(false);
  });

  it('returns false when all three are present', () => {
    const c = makeCardio({
      heartData: { restingBpm: 60 },
      lungData: { weeklyCardioMinutes: 90 },
      legData: { weeklyMileage: 5 },
    });
    expect(computeIsEmpty('cardio', makeMuscles(), makeInjections(), makeMeasurements(), c)).toBe(false);
  });

  it('returns false (empty flash guard) when loading is true', () => {
    const c = makeCardio({ loading: true });
    expect(computeIsEmpty('cardio', makeMuscles(), makeInjections(), makeMeasurements(), c)).toBe(false);
  });

  it('returns false (empty flash guard) when error is set', () => {
    const c = makeCardio({ error: 'Cardio fetch failed' });
    expect(computeIsEmpty('cardio', makeMuscles(), makeInjections(), makeMeasurements(), c)).toBe(false);
  });
});

// ─── boundary / cross-layer ───────────────────────────────────────────────────

describe('isEmpty — empty flash guard is layer-scoped', () => {
  it('muscles loading does NOT suppress isEmpty on the injections layer', () => {
    // If user switches layers while muscles is still loading, the new active layer
    // should evaluate its OWN hook state.
    const mLoading = makeMuscles({ loading: true });
    const injEmpty = makeInjections({ loading: false, error: null, siteStats: [] });
    expect(computeIsEmpty('injections', mLoading, injEmpty, makeMeasurements(), makeCardio())).toBe(true);
  });

  it('measurements empty does NOT affect muscles when muscles has data', () => {
    const m = makeMuscles({ muscleStats: new Map([['back', {}]]) });
    expect(computeIsEmpty('muscles', m, makeInjections(), makeMeasurements(), makeCardio())).toBe(false);
  });
});
