import {
  haversineDistance,
  metersToMiles,
  metersToKm,
  formatDuration,
  formatPace,
  formatDistance,
  calculateCalories,
  maxSpeedForActivity,
  rollingPace,
  speakPace,
  speakDistance,
  speakDuration,
} from '../utils/cardio';
import type { RoutePoint } from '../types/cardio';

// ─── haversineDistance ────────────────────────────────────────────────────────

describe('haversineDistance', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistance(40.7128, -74.006, 40.7128, -74.006)).toBe(0);
  });

  it('calculates ~111 km per degree of latitude', () => {
    const d = haversineDistance(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });

  it('handles negative coordinates', () => {
    const d = haversineDistance(-33.8688, 151.2093, -37.8136, 144.9631);
    // Sydney to Melbourne ~714 km
    expect(d).toBeGreaterThan(700000);
    expect(d).toBeLessThan(730000);
  });
});

// ─── metersToMiles / metersToKm ──────────────────────────────────────────────

describe('metersToMiles', () => {
  it('converts 1609.344m to 1 mile', () => {
    expect(metersToMiles(1609.344)).toBeCloseTo(1, 5);
  });

  it('returns 0 for 0', () => {
    expect(metersToMiles(0)).toBe(0);
  });
});

describe('metersToKm', () => {
  it('converts 1000m to 1 km', () => {
    expect(metersToKm(1000)).toBe(1);
  });

  it('returns 0 for 0', () => {
    expect(metersToKm(0)).toBe(0);
  });
});

// ─── formatDuration ──────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('formats sub-hour as M:SS', () => {
    expect(formatDuration(125)).toBe('2:05');
  });

  it('formats hour+ as H:MM:SS', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  it('handles 0 seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('handles exact minutes', () => {
    expect(formatDuration(120)).toBe('2:00');
  });
});

// ─── formatPace ──────────────────────────────────────────────────────────────

describe('formatPace', () => {
  it('formats km pace', () => {
    // 300 sec/km = 5:00 /km
    expect(formatPace(300, 'km')).toBe('5:00 /km');
  });

  it('formats mi pace (multiplied by 1.60934)', () => {
    // 300 sec/km * 1.60934 = 482.8 sec/mi = 8:02 /mi
    const result = formatPace(300, 'mi');
    expect(result).toMatch(/^8:0[2-3] \/mi$/);
  });

  it('returns --:-- for 0', () => {
    expect(formatPace(0, 'km')).toBe('--:-- /km');
  });

  it('returns --:-- for negative', () => {
    expect(formatPace(-10, 'mi')).toBe('--:-- /mi');
  });

  it('returns --:-- for Infinity', () => {
    expect(formatPace(Infinity, 'km')).toBe('--:-- /km');
  });
});

// ─── formatDistance ──────────────────────────────────────────────────────────

describe('formatDistance', () => {
  it('formats in miles', () => {
    expect(formatDistance(1609.344, 'mi')).toBe('1.00 mi');
  });

  it('formats in km', () => {
    expect(formatDistance(1500, 'km')).toBe('1.50 km');
  });
});

// ─── calculateCalories ───────────────────────────────────────────────────────

describe('calculateCalories', () => {
  it('uses correct MET for running (9.8)', () => {
    // MET * weight * hours = 9.8 * 70 * 1 = 686
    expect(calculateCalories('run', 70, 1)).toBe(686);
  });

  it('uses correct MET for cycling (7.5)', () => {
    expect(calculateCalories('cycle', 70, 1)).toBe(525);
  });

  it('uses correct MET for walking (3.5)', () => {
    expect(calculateCalories('walk', 70, 1)).toBe(245);
  });

  it('uses correct MET for swimming (6.0)', () => {
    expect(calculateCalories('swim', 70, 1)).toBe(420);
  });

  it('returns 0 for 0 duration', () => {
    expect(calculateCalories('run', 70, 0)).toBe(0);
  });
});

// ─── maxSpeedForActivity ─────────────────────────────────────────────────────

describe('maxSpeedForActivity', () => {
  it('returns 12 for run', () => {
    expect(maxSpeedForActivity('run')).toBe(12);
  });

  it('returns 22 for cycle', () => {
    expect(maxSpeedForActivity('cycle')).toBe(22);
  });

  it('returns 4 for walk', () => {
    expect(maxSpeedForActivity('walk')).toBe(4);
  });

  it('returns 3 for swim', () => {
    expect(maxSpeedForActivity('swim')).toBe(3);
  });
});

// ─── rollingPace ─────────────────────────────────────────────────────────────

describe('rollingPace', () => {
  it('returns 0 for fewer than 2 points', () => {
    expect(rollingPace([])).toBe(0);
    expect(rollingPace([{ latitude: 0, longitude: 0, timestamp: 1000, altitude: 0, speed: null, accuracy: null }])).toBe(0);
  });

  it('returns 0 when points outside window', () => {
    const points: RoutePoint[] = [
      { latitude: 0, longitude: 0, timestamp: 0, altitude: 0, speed: null, accuracy: null },
      { latitude: 0.001, longitude: 0, timestamp: 50000, altitude: 0, speed: null, accuracy: null },
    ];
    // Window is 30s, second point is at 50s — first point is outside window
    // Only 1 point in window → 0
    expect(rollingPace(points, 30000)).toBe(0);
  });

  it('calculates pace from known points', () => {
    // Two points 100m apart, 20 seconds apart
    // 100m in 20s → pace = (20/100)*1000 = 200 sec/km
    const points: RoutePoint[] = [
      { latitude: 0, longitude: 0, timestamp: 0, altitude: 0, speed: null, accuracy: null },
      { latitude: 0.0009, longitude: 0, timestamp: 20000, altitude: 0, speed: null, accuracy: null },
    ];
    const pace = rollingPace(points, 30000);
    // ~0.0009 degrees ≈ 100m, pace should be roughly 200 sec/km
    expect(pace).toBeGreaterThan(150);
    expect(pace).toBeLessThan(250);
  });
});

// ─── speakPace ───────────────────────────────────────────────────────────────

describe('speakPace', () => {
  it('returns human-readable pace for km', () => {
    // 300 sec/km → "5 minutes per kilometer"
    expect(speakPace(300, 'km')).toBe('5 minutes per kilometer');
  });

  it('returns "pace unavailable" for invalid input', () => {
    expect(speakPace(0, 'km')).toBe('pace unavailable');
    expect(speakPace(-1, 'mi')).toBe('pace unavailable');
    expect(speakPace(Infinity, 'km')).toBe('pace unavailable');
  });
});

// ─── speakDistance ────────────────────────────────────────────────────────────

describe('speakDistance', () => {
  it('speaks in miles', () => {
    expect(speakDistance(1609.344, 'mi')).toBe('1.00 miles');
  });

  it('speaks in kilometers', () => {
    expect(speakDistance(1000, 'km')).toBe('1.00 kilometers');
  });
});

// ─── speakDuration ───────────────────────────────────────────────────────────

describe('speakDuration', () => {
  it('returns "0 seconds" for 0', () => {
    expect(speakDuration(0)).toBe('0 seconds');
  });

  it('formats minutes and seconds', () => {
    expect(speakDuration(125)).toBe('2 minutes 5 seconds');
  });

  it('omits seconds when hours > 0', () => {
    expect(speakDuration(3665)).toBe('1 hour 1 minute');
  });

  it('handles exact minutes', () => {
    expect(speakDuration(60)).toBe('1 minute');
  });

  it('handles singular values', () => {
    expect(speakDuration(1)).toBe('1 second');
  });
});
