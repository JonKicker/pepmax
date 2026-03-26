/**
 * useLiveSegment — live segment detection during an active cardio session.
 *
 * Pre-fetches nearby segments on mount using the session's starting location,
 * stores them in a ref (not state) to avoid re-renders on GPS updates, and
 * runs the entering/exiting checks on each new route point received.
 *
 * Respects liveSegmentsEnabled cardio setting — no-ops when disabled.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { getNearbySegments } from '../services/segmentService';
import { isEnteringSegment, isExitingSegment } from '../utils/segmentMatcher';
import type { RoutePoint } from '../types/cardio';
import type { RouteSegment, LiveSegmentState } from '../types/segments';

const PREFETCH_RADIUS_KM = 5;

const IDLE_STATE: LiveSegmentState = {
  segment: null,
  status: 'idle',
  elapsedSeconds: 0,
  prSeconds: null,
  deltaSeconds: 0,
};

type UseLiveSegmentOptions = {
  /** Most recent GPS route from useCardioSession */
  currentRoute: RoutePoint[];
  /** Elapsed active seconds from useCardioSession */
  elapsedSeconds: number;
  /** Whether live segment detection is enabled (from cardio settings) */
  liveSegmentsEnabled: boolean;
};

export type UseLiveSegmentResult = {
  liveState: LiveSegmentState;
  segmentsLoaded: boolean;
};

export function useLiveSegment({
  currentRoute,
  elapsedSeconds,
  liveSegmentsEnabled,
}: UseLiveSegmentOptions): UseLiveSegmentResult {
  const [liveState, setLiveState] = useState<LiveSegmentState>(IDLE_STATE);
  const [segmentsLoaded, setSegmentsLoaded] = useState(false);

  // Nearby segments stored in ref — mutated without causing re-renders
  const nearbySegmentsRef = useRef<RouteSegment[]>([]);
  // Currently active segment being timed
  const activeSegmentRef = useRef<RouteSegment | null>(null);
  // Timestamp (ms) when the user entered the segment's start
  const segmentStartMsRef = useRef<number>(0);
  // Whether we've already pre-fetched for this session
  const hasPrefetchedRef = useRef(false);
  // Track the route length we last processed to avoid re-processing old points
  const lastProcessedLengthRef = useRef(0);
  // Ref for the auto-dismiss timer so it can be cleared on unmount or re-entry
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-fetch nearby segments once we have a starting location
  useEffect(() => {
    if (!liveSegmentsEnabled) return;
    if (hasPrefetchedRef.current) return;
    if (currentRoute.length === 0) return;

    hasPrefetchedRef.current = true;
    const startPoint = currentRoute[0];

    getNearbySegments(
      { latitude: startPoint.latitude, longitude: startPoint.longitude },
      PREFETCH_RADIUS_KM
    ).then((result) => {
      if (result.data) {
        nearbySegmentsRef.current = result.data;
      }
      setSegmentsLoaded(true);
    });
  }, [liveSegmentsEnabled, currentRoute.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Process new GPS points as the route grows
  useEffect(() => {
    if (!liveSegmentsEnabled) return;
    if (!segmentsLoaded) return;
    if (currentRoute.length === 0) return;
    if (currentRoute.length <= lastProcessedLengthRef.current) return;

    lastProcessedLengthRef.current = currentRoute.length;
    const currentPoint = currentRoute[currentRoute.length - 1];

    // ── Case 1: no segment active — look for entry ────────────────────────
    if (!activeSegmentRef.current) {
      const entering = isEnteringSegment(
        { latitude: currentPoint.latitude, longitude: currentPoint.longitude },
        nearbySegmentsRef.current
      );

      if (entering) {
        activeSegmentRef.current = entering;
        segmentStartMsRef.current = currentPoint.timestamp;

        setLiveState({
          segment: entering,
          status: 'active',
          elapsedSeconds: 0,
          prSeconds: entering.bestEffortSeconds,
          deltaSeconds: 0,
        });
      }
      return;
    }

    // ── Case 2: segment is active — update elapsed + delta ────────────────
    const seg = activeSegmentRef.current;
    const elapsedMs = currentPoint.timestamp - segmentStartMsRef.current;
    const elapsed = Math.max(0, Math.round(elapsedMs / 1000));
    const pr = seg.bestEffortSeconds;
    const delta = pr !== null ? elapsed - pr : 0;

    // Check if user has exited the segment end
    const exiting = isExitingSegment(
      { latitude: currentPoint.latitude, longitude: currentPoint.longitude },
      seg
    );

    if (exiting) {
      activeSegmentRef.current = null;
      setLiveState({
        segment: seg,
        status: 'completed',
        elapsedSeconds: elapsed,
        prSeconds: pr,
        deltaSeconds: delta,
      });

      // Auto-dismiss completed banner after 6 seconds.
      // Clear any previous timer first (guards against rapid segment re-entry).
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
      dismissTimerRef.current = setTimeout(() => {
        dismissTimerRef.current = null;
        setLiveState(IDLE_STATE);
      }, 6000);
      return;
    }

    // Still inside the segment — keep updating elapsed/delta
    setLiveState((prev) => ({
      ...prev,
      status: 'active',
      elapsedSeconds: elapsed,
      deltaSeconds: delta,
    }));
  }, [currentRoute.length, liveSegmentsEnabled, segmentsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up the dismiss timer on unmount to prevent state updates on
  // an already-unmounted component.
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  return { liveState, segmentsLoaded };
}
