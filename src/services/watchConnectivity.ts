/**
 * WatchConnectivity service — Apple Watch communication via WatchConnectivity.
 *
 * Every exported function:
 *  - Starts with a `!WC` guard → returns null/false/no-op when native module absent
 *  - Is wrapped in try/catch → never throws, returns null on failure
 *  - Errors are breadcrumbed via errorReporting, never surfaced to UI
 *
 * Pattern mirrors healthKitService.ts: lazy native module load, safe for Expo Go.
 *
 * WatchConnectivity channels:
 *  - sendMessage      → real-time, watch must be reachable (app in foreground)
 *  - updateWatchState → updateApplicationContext, latest-state only (overwrites)
 */
import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import { addBreadcrumb } from './errorReporting';
import type { WatchMessage, WatchMessageType } from '../types/watchConnectivity';

// ─── Lazy native module import (safe for Expo Go) ────────────────────────────

let WC: {
  sendMessageToWatch: (data: { type: WatchMessageType; payload: Record<string, unknown>; timestamp: number }) => Promise<Record<string, unknown>>;
  updateWatchContext: (data: Record<string, unknown>) => Promise<boolean>;
  isWatchPaired: () => Promise<boolean>;
  isWatchReachable: () => Promise<boolean>;
} | null = null;

let wcEmitter: NativeEventEmitter | null = null;

/** true when the native WatchConnectivity module loaded successfully */
export function isWatchConnectivityAvailable(): boolean {
  return WC !== null;
}

try {
  if (Platform.OS === 'ios') {
    const mod = NativeModules.WatchConnectivityModule;
    if (mod) {
      WC = {
        sendMessageToWatch: mod.sendMessageToWatch.bind(mod),
        updateWatchContext: mod.updateWatchContext.bind(mod),
        isWatchPaired: mod.isWatchPaired.bind(mod),
        isWatchReachable: mod.isWatchReachable.bind(mod),
      };
      wcEmitter = new NativeEventEmitter(mod);
    }
  }
} catch {
  // Native module not available (e.g. Expo Go, Android) — all functions will no-op
  if (__DEV__) console.log('[WatchConnectivity] Native module unavailable — running in stub mode');
  WC = null;
}

// ─── Send (real-time) ─────────────────────────────────────────────────────────

/**
 * Sends a real-time message to the watch.
 * Requires the watch to be paired, in range, and the watch app to be reachable.
 * Returns the reply dict on success, null on failure or when watch is unreachable.
 */
export async function sendToWatch(
  type: WatchMessageType,
  payload: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  if (!WC) return null;
  try {
    const message = { type, payload, timestamp: Date.now() };
    return await WC.sendMessageToWatch(message);
  } catch (e) {
    addBreadcrumb('watchConnectivity', `sendToWatch failed: ${type}`, { error: String(e) });
    return null;
  }
}

// ─── Application Context (background state) ───────────────────────────────────

/**
 * Updates the watch's application context (latest state only — overwrites previous).
 * Delivered in background; watch app receives it on next launch if not reachable now.
 * Use for: today's macro totals, next dose schedule, current program.
 */
export async function updateWatchState(
  state: Record<string, unknown>
): Promise<boolean> {
  if (!WC) return false;
  try {
    return await WC.updateWatchContext(state);
  } catch (e) {
    addBreadcrumb('watchConnectivity', 'updateWatchState failed', { error: String(e) });
    return false;
  }
}

// ─── Status ──────────────────────────────────────────────────────────────────

export async function isPaired(): Promise<boolean> {
  if (!WC) return false;
  try {
    return await WC.isWatchPaired();
  } catch {
    return false;
  }
}

export async function isReachable(): Promise<boolean> {
  if (!WC) return false;
  try {
    return await WC.isWatchReachable();
  } catch {
    return false;
  }
}

// ─── Receive ─────────────────────────────────────────────────────────────────

/**
 * Subscribe to messages sent from the watch to the phone.
 * Returns an unsubscribe function — call it in useEffect cleanup.
 *
 * Example:
 *   useEffect(() => onWatchMessage((msg) => console.log(msg)), []);
 */
export function onWatchMessage(callback: (msg: WatchMessage) => void): () => void {
  if (!wcEmitter) return () => {};
  const subscription = wcEmitter.addListener('onWatchMessage', callback);
  return () => subscription.remove();
}
