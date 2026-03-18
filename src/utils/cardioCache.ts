import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RoutePoint, Split } from '../types/cardio';

const CACHE_KEY = 'pepmax_cardio_active_session';

export type CachedCardioState = {
  sessionId: string;
  route: RoutePoint[];
  distance: number;
  elapsedActive: number;
  totalPausedTime: number;
  splits: Split[];
  lapCount: number;
  elevationGain: number;
  elevationLoss: number;
  lastSavedAt: number;
};

export async function cacheSessionState(state: CachedCardioState): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch {
    // non-critical, ignore
  }
}

export async function getCachedSession(): Promise<CachedCardioState | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearCachedSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    // non-critical, ignore
  }
}
