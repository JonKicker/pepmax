/**
 * LeaderboardPodium — top-3 Olympic-style podium visualization.
 *
 * Layout:
 *   Left column  → 2nd place (medium height, silver glow)
 *   Center column → 1st place (tallest, gold glow, floating animation)
 *   Right column  → 3rd place (shorter, bronze glow)
 *
 * Staggered entrance: 3rd → 2nd → 1st (build anticipation).
 * 1st place has subtle floating animation (translateY oscillation).
 *
 * useReducedMotion: static layout, no float, no stagger.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { RankBadge } from './RankBadge';
import { RANK_TIERS_V2 } from '../../utils/rankTierV2';
import type { RankTierV2 } from '../../types/rankV2';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#A0A0B8';
const SURFACE = '#1E1E2E';
const BORDER = '#2E2E42';
const GOLD_COLOR = '#FFD700';
const SILVER_COLOR = '#C0C0C0';
const BRONZE_COLOR = '#CD7F32';

const PODIUM_HEIGHTS = {
  1: 110, // tallest
  2: 80,
  3: 60,
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────

type PodiumEntry = {
  rank: number;
  username: string;
  value: number;
  tier: RankTierV2;
};

type Props = {
  entries: PodiumEntry[];
  unit: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMedalColor(rank: number): string {
  if (rank === 1) return GOLD_COLOR;
  if (rank === 2) return SILVER_COLOR;
  return BRONZE_COLOR;
}

function getTierColor(tier: RankTierV2): string {
  return RANK_TIERS_V2.find((t) => t.tier === tier)?.color ?? '#FFFFFF';
}

function formatValue(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

// ─── PodiumColumn ─────────────────────────────────────────────────────────────

type PodiumColumnProps = {
  entry: PodiumEntry;
  unit: string;
  entranceDelay: number;
  reducedMotion: boolean;
};

function PodiumColumn({ entry, unit, entranceDelay, reducedMotion }: PodiumColumnProps) {
  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  const translateY = useSharedValue(reducedMotion ? 0 : 30);
  const floatY = useSharedValue(0);

  const podiumHeight = PODIUM_HEIGHTS[entry.rank as 1 | 2 | 3] ?? 60;
  const medalColor = getMedalColor(entry.rank);
  const tierColor = getTierColor(entry.tier);

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 1;
      translateY.value = 0;
      floatY.value = 0;
      return;
    }

    // Staggered entrance
    opacity.value = withDelay(entranceDelay, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(
      entranceDelay,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.back(1.2)) }),
    );

    // Floating animation for 1st place only
    if (entry.rank === 1) {
      floatY.value = withDelay(
        entranceDelay + 600,
        withRepeat(
          withSequence(
            withTiming(-6, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        ),
      );
    }
  }, [reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <Animated.View style={[styles.column, containerStyle]}>
      {/* Avatar area with float */}
      <Animated.View style={[styles.avatarArea, avatarStyle]}>
        <RankBadge tier={entry.tier} size={entry.rank === 1 ? 'lg' : 'md'} glow={entry.rank === 1} />
        <Text style={[styles.username, { color: entry.rank === 1 ? TEXT_PRIMARY : TEXT_SECONDARY }]} numberOfLines={1}>
          @{entry.username}
        </Text>
        <View style={[styles.valuePill, { borderColor: medalColor + '44', backgroundColor: medalColor + '11' }]}>
          <Text style={[styles.valueText, { color: medalColor }]}>
            {formatValue(entry.value)} {unit}
          </Text>
        </View>
      </Animated.View>

      {/* Podium block */}
      <View
        style={[
          styles.podiumBlock,
          {
            height: podiumHeight,
            backgroundColor: medalColor + '22',
            borderColor: medalColor + '55',
          },
        ]}
      >
        <Text style={[styles.rankLabel, { color: medalColor }]}>#{entry.rank}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LeaderboardPodium({ entries, unit }: Props) {
  const reducedMotion = useReducedMotion();

  // Only use top 3
  const top3 = entries.slice(0, 3);
  const first = top3.find((e) => e.rank === 1);
  const second = top3.find((e) => e.rank === 2);
  const third = top3.find((e) => e.rank === 3);

  if (top3.length === 0) return null;

  // Staggered delays: 3rd → 2nd → 1st
  // 3rd: 0ms, 2nd: 300ms, 1st: 600ms
  const getDelay = (rank: number) => {
    if (rank === 3) return 0;
    if (rank === 2) return 300;
    return 600; // rank 1 last for drama
  };

  return (
    <View style={styles.container}>
      {/* Podium layout: 2nd | 1st | 3rd */}
      <View style={styles.podiumRow}>
        {second && (
          <PodiumColumn
            entry={second}
            unit={unit}
            entranceDelay={getDelay(2)}
            reducedMotion={reducedMotion}
          />
        )}
        {first && (
          <PodiumColumn
            entry={first}
            unit={unit}
            entranceDelay={getDelay(1)}
            reducedMotion={reducedMotion}
          />
        )}
        {third && (
          <PodiumColumn
            entry={third}
            unit={unit}
            entranceDelay={getDelay(3)}
            reducedMotion={reducedMotion}
          />
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 120,
  },
  avatarArea: {
    alignItems: 'center',
    gap: 6,
    paddingBottom: 10,
  },
  username: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 90,
  },
  valuePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  valueText: {
    fontSize: 11,
    fontWeight: '700',
  },
  podiumBlock: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderBottomWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
  },
  rankLabel: {
    fontSize: 15,
    fontWeight: '900',
  },
});
