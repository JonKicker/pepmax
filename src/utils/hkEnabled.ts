/**
 * hkEnabled — module-level HealthKit opt-in flag.
 *
 * Why a module-level variable:
 *   Service-layer write-back functions (bodyWeightService, nutritionService, etc.)
 *   run outside React component trees and cannot call hooks. They need a synchronous
 *   way to check whether the user has opted into HealthKit sync.
 *
 * Lifecycle:
 *   1. loadHKEnabled() — called once at app startup (RootLayout). Reads the cached
 *      value from AsyncStorage so the flag is correct before the Firestore profile loads.
 *   2. setHKEnabled(v) — called by useHealthKit when the user toggles the switch
 *      (enable() / disable()) and when isEnabled changes via userProfile.
 *   3. isHKEnabled() — called by write functions in healthKitService before each write.
 *
 * Default: false — safe for new installs and before the profile is loaded.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HK_ENABLED_STORAGE_KEY } from '../constants/healthKit';

let _enabled = false;

/** Synchronous read — safe to call from service layer. */
export function isHKEnabled(): boolean {
  return _enabled;
}

/** Update the in-memory flag and persist to AsyncStorage. */
export function setHKEnabled(value: boolean): void {
  _enabled = value;
  AsyncStorage.setItem(HK_ENABLED_STORAGE_KEY, value ? '1' : '0').catch(() => {});
}

/** Load the persisted flag from AsyncStorage. Call once at app startup. */
export async function loadHKEnabled(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(HK_ENABLED_STORAGE_KEY);
    _enabled = stored === '1';
  } catch {
    // Default remains false — no HK writes until we know the user's preference
  }
}
