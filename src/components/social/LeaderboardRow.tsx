/**
 * LeaderboardRow — a single row in a leaderboard FlatList.
 *
 * Layout: [rank #] [tier icon + username + level badge] [value]
 *
 * - Rank number is left-aligned, fixed width.
 * - Tier icon (colored dot) is from rankTier.ts.
 * - Username + "Lv X" badge in the middle, flex-growing.
 * - Formatted value right-aligned.
 * - Purple highlight background when isCurrentUser === true.
 * - Top 3 get gold/silver/bronze medal icons instead of rank numbers.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { getTierInfo } from '../../utils/rankTier';
import type { LeaderboardEntry } from '../../types/social';

// ─── Medal helpers ────────────────────────────────────────────────────────────

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'] as const;
const MEDAL_ICONS = ['trophy', 'medal-outline', 'medal-outline'] as const;

function RankBadge({ rank }: { rank: number }) {
  const { colors } = useTheme();

  if (rank <= 3) {
    const color = MEDAL_COLORS[rank - 1];
    const iconName = MEDAL_ICONS[rank - 1] as React.ComponentProps<typeof Ionicons>['name'];
    return (
      <View style={styles.rankBadge}>
        <Ionicons name={iconName} size={18} color={color} />
      </View>
    );
  }

  return (
    <View style={styles.rankBadge}>
      <Text style={[styles.rankNumber, { color: colors.textSecondary }]}>
        {rank}
      </Text>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  entry: LeaderboardEntry;
  /** The formatted display value (e.g. "1,234 kg", "12.5 km", "4.5k XP") */
  formattedValue: string;
  /** Whether this row belongs to the current authenticated user */
  isCurrentUser: boolean;
};

export function LeaderboardRow({ entry, formattedValue, isCurrentUser }: Props) {
  const { colors } = useTheme();
  const tierInfo = getTierInfo(entry.tier);
  const rank = entry.rank ?? 0;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: isCurrentUser
            ? '#7C3AED18' // purple tint for current user
            : colors.surface,
          borderColor: isCurrentUser ? '#7C3AED44' : colors.border,
        },
      ]}
    >
      {/* Rank */}
      <RankBadge rank={rank} />

      {/* Tier dot */}
      <View style={[styles.tierDot, { backgroundColor: tierInfo.color }]} />

      {/* Username + level */}
      <View style={styles.nameBlock}>
        <Text
          style={[
            styles.username,
            { color: isCurrentUser ? '#7C3AED' : colors.textPrimary },
          ]}
          numberOfLines={1}
        >
          @{entry.username}
        </Text>
        <View style={styles.levelRow}>
          <View style={[styles.levelBadge, { backgroundColor: tierInfo.color + '22' }]}>
            <Text style={[styles.levelText, { color: tierInfo.color }]}>
              Lv {entry.level}
            </Text>
          </View>
          {isCurrentUser && (
            <Text style={[styles.youLabel, { color: '#7C3AED' }]}> · You</Text>
          )}
        </View>
      </View>

      {/* Value */}
      <Text style={[styles.value, { color: isCurrentUser ? '#7C3AED' : colors.textPrimary }]}>
        {formattedValue}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  rankBadge: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: 15,
    fontWeight: '700',
  },
  tierDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nameBlock: {
    flex: 1,
    gap: 3,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  youLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
});
