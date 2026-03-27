/**
 * YourRankBanner — sticky bottom banner for leaderboard screens.
 *
 * Shows: "You are #X of Y — Top Z%" with RankBadge
 * If nextUsername provided: "X more [unit] to overtake @[nextUsername]"
 *
 * GlassCard-style background.
 * Optional onScrollToMe callback on tap.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { RankBadge } from './RankBadge';
import type { RankTierV2 } from '../../types/rankV2';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#6C5CE7';

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  rank: number;
  total: number;
  nextUsername?: string;
  pointsToNext?: number;
  unit?: string;
  tier: RankTierV2;
  onScrollToMe?: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcTopPercent(rank: number, total: number): string {
  if (total === 0) return '0%';
  const pct = Math.ceil((rank / total) * 100);
  return `${pct}%`;
}

function formatPoints(pts: number, unit?: string): string {
  const suffix = unit ? ` ${unit}` : '';
  if (pts >= 1000) return `${(pts / 1000).toFixed(1)}k${suffix}`;
  return `${Math.round(pts)}${suffix}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function YourRankBanner({
  rank,
  total,
  nextUsername,
  pointsToNext,
  unit,
  tier,
  onScrollToMe,
}: Props) {
  const { colors } = useTheme();

  const topPercent = calcTopPercent(rank, total);
  const showNextTarget = nextUsername && pointsToNext !== undefined && pointsToNext > 0;

  const bannerAccessibilityLabel = onScrollToMe
    ? `You are ranked number ${rank}. Tap to scroll to your position`
    : `You are ranked number ${rank} of ${total}`;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.glass.heavy,
          borderColor: colors.glass.border,
        },
      ]}
      onPress={onScrollToMe}
      activeOpacity={onScrollToMe ? 0.8 : 1}
      accessibilityRole="button"
      accessibilityLabel={bannerAccessibilityLabel}
    >
      {/* Left: badge + rank info */}
      <View style={styles.left}>
        <RankBadge tier={tier} size="sm" />
        <View style={styles.rankInfo}>
          <Text style={[styles.rankPrimary, { color: colors.textPrimary }]}>
            You are{' '}
            <Text style={[styles.rankHighlight, { color: ACCENT }]}>#{rank}</Text>
            {' '}of {total}
          </Text>
          <Text style={[styles.rankSecondary, { color: colors.textSecondary }]}>
            Top {topPercent}
          </Text>
        </View>
      </View>

      {/* Right: scroll-to-me caret */}
      {onScrollToMe && (
        <Ionicons
          name="locate-outline"
          size={18}
          color={colors.textSecondary}
        />
      )}

      {/* Next target row — only if applicable */}
      {showNextTarget && (
        <View style={[styles.nextTargetRow, { borderTopColor: colors.glass.border }]}>
          <Ionicons name="arrow-up-circle-outline" size={14} color={ACCENT} />
          <Text style={[styles.nextTargetText, { color: colors.textSecondary }]}>
            <Text style={{ color: ACCENT }}>
              {formatPoints(pointsToNext!, unit)}
            </Text>
            {' '}more to overtake{' '}
            <Text style={{ color: colors.textPrimary }}>@{nextUsername}</Text>
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28, // safe area buffer
    borderTopWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rankInfo: {
    gap: 2,
  },
  rankPrimary: {
    fontSize: 14,
    fontWeight: '700',
  },
  rankHighlight: {
    fontWeight: '900',
  },
  rankSecondary: {
    fontSize: 12,
    fontWeight: '500',
  },
  nextTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    paddingTop: 8,
    borderTopWidth: 1,
    marginTop: 2,
  },
  nextTargetText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
