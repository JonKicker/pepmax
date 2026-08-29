/**
 * useCelebration — shared celebration queue via React Context.
 *
 * Features:
 * - Single shared queue across the entire app (context-based)
 * - Queue capped at 3 items (drop-oldest when full)
 * - Priority sort: higher priority plays first
 * - Sequential playback with 200ms gap between items
 * - 3500ms safety timeout per celebration
 * - Reduced motion: cap duration at 1500ms
 *
 * Usage:
 *   // Wrap app in <CelebrationProvider> (done in _layout.tsx)
 *   const { triggerCelebration, currentItem } = useCelebration();
 */
import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from './useReducedMotion';
import type { CelebrationConfig, CelebrationQueueItem } from '../types/celebration';
import type { HapticPattern } from '../types/celebration';

const MAX_QUEUE_SIZE = 3;
const GAP_BETWEEN_MS = 200;
const SAFETY_TIMEOUT_MS = 3500;
const REDUCED_MAX_MS = 1500;

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

const CelebrationContext = createContext<UseCelebrationReturn | null>(null);

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
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

    const rawDuration = next.config.duration;
    const effectiveDuration = reducedMotionRef.current
      ? Math.min(rawDuration, REDUCED_MAX_MS)
      : rawDuration;
    const timeout = Math.min(effectiveDuration + 500, SAFETY_TIMEOUT_MS + 500);

    safetyTimerRef.current = setTimeout(() => {
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
      queueRef.current.sort((a, b) => a.addedAt - b.addedAt);
      queueRef.current.shift();
    }

    queueRef.current.push(item);

    if (!isPlayingRef.current) {
      advance();
    }
  }, [advance]);

  useEffect(() => {
    return () => {
      clearSafetyTimer();
    };
  }, []);

  return React.createElement(
    CelebrationContext.Provider,
    { value: { currentItem, triggerCelebration, onCelebrationComplete } },
    children,
  );
}

export function useCelebration(): UseCelebrationReturn {
  const ctx = useContext(CelebrationContext);
  if (!ctx) {
    throw new Error('useCelebration must be used within a CelebrationProvider');
  }
  return ctx;
}
