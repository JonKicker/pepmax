/**
 * LiveSegmentBanner — minimal HUD overlay for active segment detection.
 *
 * Zen Mode philosophy: gray/translucent, small text, non-intrusive.
 * Shown only when liveState.status is 'active' or 'completed'.
 * Fades in/out with a simple opacity animation.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import type { LiveSegmentState } from '../../types/segments';

// HUD overlay: intentionally uses fixed dark semi-transparent background
// rather than theme colors, because this banner renders over map/GPS content
// and must remain readable regardless of light/dark theme setting.
// Text colors are derived from the theme where possible; the gold PR badge
// color is a fixed constant because it represents an achievement indicator,
// not a generic theme element.
const HUD_BACKGROUND = 'rgba(30,30,30,0.78)';
const PR_BADGE_COLOR = '#FFD700'; // gold — intentional, not a theme alias

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSeconds(totalSeconds: number): string {
  const absS = Math.abs(totalSeconds);
  const h = Math.floor(absS / 3600);
  const m = Math.floor((absS % 3600) / 60);
  const s = absS % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDelta(deltaSeconds: number): string {
  const prefix = deltaSeconds >= 0 ? '+' : '-';
  return `${prefix}${formatSeconds(Math.abs(deltaSeconds))}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  liveState: LiveSegmentState;
};

export default function LiveSegmentBanner({ liveState }: Props) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const isVisible = liveState.status === 'active' || liveState.status === 'completed';

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: isVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible, opacity]);

  if (!isVisible && !liveState.segment) return null;

  const { segment, status, elapsedSeconds, prSeconds, deltaSeconds } = liveState;
  if (!segment) return null;

  const isCompleted = status === 'completed';
  const isPR = prSeconds !== null && elapsedSeconds < prSeconds;

  let content: React.ReactNode;

  if (isCompleted) {
    const timeStr = formatSeconds(elapsedSeconds);
    if (isPR) {
      content = (
        <Text style={[styles.text, { color: colors.textPrimary }]}>
          Segment complete! {timeStr}{' '}
          <Text style={styles.prBadge}>(New PR!)</Text>
        </Text>
      );
    } else {
      const deltaStr = formatDelta(deltaSeconds);
      content = (
        <Text style={[styles.text, { color: colors.textPrimary }]}>
          Segment complete! {timeStr} ({deltaStr})
        </Text>
      );
    }
  } else {
    // Active — show name, PR reference, and live delta
    const elapsedStr = formatSeconds(elapsedSeconds);
    const prStr = prSeconds !== null ? formatSeconds(prSeconds) : null;
    const deltaStr = prSeconds !== null ? formatDelta(deltaSeconds) : null;

    content = (
      <Text style={[styles.text, { color: colors.textPrimary }]} numberOfLines={1}>
        {'\uD83C\uDFC1'} {segment.name}
        {prStr ? ` — PR: ${prStr}` : ''}
        {deltaStr ? ` | ${deltaStr}` : ` — ${elapsedStr}`}
      </Text>
    );
  }

  return (
    <Animated.View style={[styles.banner, { opacity }]}>
      {content}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: HUD_BACKGROUND, // fixed dark overlay — see comment above
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    // base color intentionally omitted here — set dynamically from theme
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  prBadge: {
    color: PR_BADGE_COLOR, // fixed gold — achievement badge, not a theme alias
    fontWeight: '700',
  },
});
