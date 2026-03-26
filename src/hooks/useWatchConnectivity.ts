import { useState, useEffect, useRef, useCallback } from 'react';
import {
  isWatchConnectivityAvailable,
  isPaired,
  isReachable,
  sendToWatch,
  updateWatchState,
  onWatchMessage,
} from '../services/watchConnectivity';
import type { WatchMessage, WatchMessageType } from '../types/watchConnectivity';

type UseWatchConnectivityReturn = {
  /** Whether the WatchConnectivity native module is available (false in Expo Go / Android) */
  isAvailable: boolean;
  /** Whether a watch is paired with this iPhone */
  isPaired: boolean;
  /** Whether the watch app is currently reachable (in foreground) */
  isReachable: boolean;
  /** Send a real-time message to the watch. Returns reply or null. */
  sendToWatch: (type: WatchMessageType, payload: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  /** Push a background state update to the watch (latest-only). */
  updateWatchState: (state: Record<string, unknown>) => Promise<boolean>;
  /** Last message received from the watch, or null */
  lastWatchMessage: WatchMessage | null;
};

/**
 * React hook for Apple Watch communication via WatchConnectivity.
 *
 * @param onMessage - optional callback fired whenever the watch sends a message.
 *   Stored in a ref — callers do NOT need to memoize this. Inline functions are safe.
 */
export function useWatchConnectivity(
  onMessage?: (msg: WatchMessage) => void
): UseWatchConnectivityReturn {
  const [pairedState, setPairedState] = useState(false);
  const [reachableState, setReachableState] = useState(false);
  const [lastWatchMessage, setLastWatchMessage] = useState<WatchMessage | null>(null);

  // Keep onMessage in a ref so the subscription effect never needs to re-run
  // when the callback changes identity (avoids the inline-function re-subscribe footgun).
  const onMessageRef = useRef(onMessage);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  const isAvailable = isWatchConnectivityAvailable();

  // Poll paired/reachable status on mount
  useEffect(() => {
    if (!isAvailable) return;
    let cancelled = false;
    (async () => {
      const [p, r] = await Promise.all([isPaired(), isReachable()]);
      if (!cancelled) {
        setPairedState(p);
        setReachableState(r);
      }
    })();
    return () => { cancelled = true; };
  }, [isAvailable]);

  // Subscribe to watch→phone messages.
  // Depends only on isAvailable — never re-subscribes due to onMessage identity changes.
  useEffect(() => {
    if (!isAvailable) return;
    const unsubscribe = onWatchMessage((msg) => {
      setLastWatchMessage(msg);
      onMessageRef.current?.(msg);
    });
    return unsubscribe;
  }, [isAvailable]);

  const send = useCallback(
    (type: WatchMessageType, payload: Record<string, unknown>) =>
      sendToWatch(type, payload),
    []
  );

  const updateState = useCallback(
    (state: Record<string, unknown>) => updateWatchState(state),
    []
  );

  return {
    isAvailable,
    isPaired: pairedState,
    isReachable: reachableState,
    sendToWatch: send,
    updateWatchState: updateState,
    lastWatchMessage,
  };
}
