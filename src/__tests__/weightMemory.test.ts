// Mock AsyncStorage before importing modules that use it
const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStore[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStore[key] = value;
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      for (const key of Object.keys(mockStore)) delete mockStore[key];
      return Promise.resolve();
    }),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLastWeight, setLastWeight } from '../utils/weightMemory';

beforeEach(() => {
  for (const key of Object.keys(mockStore)) delete mockStore[key];
  jest.clearAllMocks();
});

// ─── getLastWeight ───────────────────────────────────────────────────────────

describe('getLastWeight', () => {
  it('returns parsed weight entry from storage', async () => {
    const entry = { weight: 135, unit: 'lbs' };
    await AsyncStorage.setItem('@weight_memory_bench', JSON.stringify(entry));
    const result = await getLastWeight('bench');
    expect(result).toEqual(entry);
  });

  it('returns null when key not found', async () => {
    const result = await getLastWeight('nonexistent');
    expect(result).toBeNull();
  });

  it('returns null on parse error', async () => {
    await AsyncStorage.setItem('@weight_memory_bad', '{invalid json');
    const result = await getLastWeight('bad');
    // JSON.parse will throw, catch block returns null
    expect(result).toBeNull();
  });
});

// ─── setLastWeight ───────────────────────────────────────────────────────────

describe('setLastWeight', () => {
  it('stores serialized entry with correct key', async () => {
    await setLastWeight('squat', 225, 'lbs');
    const raw = await AsyncStorage.getItem('@weight_memory_squat');
    expect(JSON.parse(raw!)).toEqual({ weight: 225, unit: 'lbs' });
  });

  it('does not throw on storage error', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
    // Should not throw
    await expect(setLastWeight('fail', 100, 'kg')).resolves.toBeUndefined();
  });
});
