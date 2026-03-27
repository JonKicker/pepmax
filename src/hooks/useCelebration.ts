/**
 * useCelebration — celebration queue manager.
 *
 * Features:
 * - Queue capped at 3 items (drop-oldest when full)
 * - Priority sort: higher priority plays first
 * - Sequential playback with 200ms gap between items
 * - 3500ms safety timeout per celebration
 * - Reduced motion: cap duration at 1500ms
 *
 * Usage:
 *   const { triggerCelebration, currentItem } = useCelebration();
 *   // Render <CelebrationOverlay> when currentItem != null
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from './useReducedMotion';
import type { CelebrationConfig, CelebrationQueueItem } from '../types/celebration';
import type { HapticPattern } from '../types/celebration';

const MAX_QUEUE_SIZE = 3;
const GAP_BETWEEN_MS = 200;
const SAFETY_TIMEOUT_MS = 3500;
const REDUCED_MAX_MS = 1500;

// itemCounter is module-level intentionally: IDs remain unique across hook
// re-mounts within the same JS bundle lifetime. Trade-off: resets on full reload,
// which is acceptable since IDs are only used for React key deduplication.
let itemCounter = 0;
function nextId(): string {
  return `cel_${Date.now()}_${++itemCounter}`;
}

function fireHaptic(pattern: HapticPattern): void {
  if (Platform.OS === 'web') return;
  switch (pattern) {
    case 'tap':
      Haptics.selectionAsync().catch(() => {});
      break;
    case 'success':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      break;
    case 'heavy':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      break;
    case 'doubleHeavy':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }, 120);
      break;
  }
}

export type UseCelebrationReturn = {
  currentItem: CelebrationQueueItem | null;
  triggerCelebration: (config: CelebrationConfig) => void;
  onCelebrationComplete: () => void;
};

export function useCelebration(): UseCelebrationReturn {
  const reducedMotion = useReducedMotion();
  // Ref keeps reducedMotion current inside timeout callbacks, eliminating the
  // advance ↔ onCelebrationComplete circular dependency chain.
  const reducedMotionRef = useRef(reducedMotion);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  const queueRef = useRef<CelebrationQueueItem[]>([]);
  const [currentItem, setCurrentItem] = useState<CelebrationQueueItem | null>(null);
  const isPlayingRef = useRef(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSafetyTimer = () => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  };

  const onCelebrationComplete = useCallback(() => {
    clearSafetyTimer();
    setCurrentItem(null);
    // 200ms gap before next item
    setTimeout(() => {
      advance(); // eslint-disable-line @typescript-eslint/no-use-before-define
    }, GAP_BETWEEN_MS);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const advance = useCallback(() => {
    clearSafetyTimer();

    if (queueRef.current.length === 0) {
      isPlayingRef.current = false;
      setCurrentItem(null);
      return;
    }

    // Sort by priority descending, then by addedAt ascending (FIFO for equal priority)
    queueRef.current.sort((a, b) => {
      if (b.config.priority !== a.config.priority) {
        return b.config.priority - a.config.priority;
      }
      return a.addedAt - b.addedAt;
    });

    const next = queueRef.current.shift()!;
    isPlayingRef.current = true;
    setCurrentItem(next);
    fireHaptic(next.config.hapticPattern);

    // Calculate effective duration — read from ref to avoid stale closure
    const rawDuration = next.config.duration;
    const effectiveDuration = reducedMotionRef.current
      ? Math.min(rawDuration, REDUCED_MAX_MS)
      : rawDuration;
    const timeout = Math.min(effectiveDuration + 500, SAFETY_TIMEOUT_MS + 500);

    safetyTimerRef.current = setTimeout(() => {
      // Safety fallback: force-advance even if onComplete never fires
      onCelebrationComplete();
    }, timeout);
  }, [onCelebrationComplete]);

  const triggerCelebration = useCallback((config: CelebrationConfig) => {
    const item: CelebrationQueueItem = {
      id: nextId(),
      config,
      addedAt: Date.now(),
    };

    if (queueRef.current.length >= MAX_QUEUE_SIZE) {
      // Drop-oldest: remove the item with the smallest addedAt
      queueRef.current.sort((a, b) => a.addedAt - b.addedAt);
      queueRef.current.shift();
    }

    queueRef.current.push(item);

    if (!isPlayingRef.current) {
      advance();
    }
  }, [advance]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSafetyTimer();
    };
  }, []);

  return { currentItem, triggerCelebration, onCelebrationComplete };
}
