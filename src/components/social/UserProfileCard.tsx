/**
 * UserProfileCard — public-facing profile card for the social system.
 *
 * Displays:
 * - Username + display handle
 * - Level badge + tier badge (with tier color)
 * - XP total with tier progress bar
 * - Featured stat chip
 * - Up to 3 featured achievement badges (icon + title)
 * - Leaderboard-opted-out indicator when applicable
 *
 * Intentionally displays no PII — no email, no real name.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import { getTierInfo, getTierProgress, getXPToNextTier } from '../../utils/rankTier';
import { ACHIEVEMENT_DEFINITIONS } from '../../utils/achievementDefinitions';
import type { PublicProfile, FeaturedStat } from '../../types/social';

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  profile: PublicProfile;
  /** Optional rank position (1-based) from a leaderboard query */
  rank?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FEATURED_STAT_LABELS: Record<FeaturedStat, string> = {
  totalXP: 'Total XP',
  workouts: 'Workouts',
  doseStreak: 'Dose Streak',
  cardioSessions: 'Cardio Sessions',
  level: 'Level',
};

function formatXP(xp: number): string {
  if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1)}M`;
  if (xp >= 1_000) return `${(xp / 1_000).toFixed(1)}K`;
  return xp.toString();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserProfileCard({ profile, rank }: Props) {
  const { colors } = useTheme();
  const tierInfo = getTierInfo(profile.tier);
  const progress = getTierProgress(profile.totalXP);
  const xpToNext = getXPToNextTier(profile.totalXP);

  const featuredDefs = (profile.topAchievementIds ?? [])
    .slice(0, 3)
    .map((id) => ACHIEVEMENT_DEFINITIONS.find((d) => d.id === id))
    .filter(Boolean);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: tierInfo.color + '55',
          borderWidth: 1.5,
        },
      ]}
    >
      {/* ── Header row ─────────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.identityBlock}>
          {rank !== undefined && (
            <Text style={[styles.rankBadge, { color: colors.textSecondary }]}>
              #{rank}
            </Text>
          )}
          <Text style={[styles.username, { color: colors.textPrimary }]}>
            @{profile.username}
          </Text>
          {profile.displayHandle !== profile.username && (
            <Text style={[styles.displayHandle, { color: colors.textSecondary }]}>
              {profile.displayHandle}
            </Text>
          )}
          {!!profile.instagramHandle && (
            <TouchableOpacity
              onPress={() =>
                Linking.openURL(`https://instagram.com/${profile.instagramHandle}`)
              }
              style={styles.instagramRow}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-instagram" size={12} color={colors.textSecondary} />
              <Text style={[styles.instagramHandle, { color: colors.textSecondary }]}>
                @{profile.instagramHandle}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tier badge */}
        <View
          style={[
            styles.tierBadge,
            { backgroundColor: tierInfo.color + '22', borderColor: tierInfo.color },
          ]}
        >
          <Ionicons
            name={tierInfo.icon as any}
            size={14}
            color={tierInfo.color}
          />
          <Text style={[styles.tierLabel, { color: tierInfo.color }]}>
            {tierInfo.label}
          </Text>
        </View>
      </View>

      {/* ── Level + XP row ─────────────────────────────────────────────── */}
      <View style={styles.xpRow}>
        <View
          style={[
            styles.levelBadge,
            { backgroundColor: Colors.accent + '22' },
          ]}
        >
          <Text style={[styles.levelText, { color: Colors.accent }]}>
            Lv {profile.level}
          </Text>
        </View>
        <View style={styles.xpBlock}>
          <Text style={[styles.xpTotal, { color: colors.textPrimary }]}>
            {formatXP(profile.totalXP)} XP
          </Text>
          {xpToNext !== null && (
            <Text style={[styles.xpToNext, { color: colors.textSecondary }]}>
              {formatXP(xpToNext)} to {RANK_TIER_NEXT_LABEL[profile.tier] ?? 'max'}
            </Text>
          )}
        </View>
      </View>

      {/* ── Tier progress bar ───────────────────────────────────────────── */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.round(progress * 100)}%` as any,
              backgroundColor: tierInfo.color,
            },
          ]}
        />
      </View>

      {/* ── Featured stat chip ──────────────────────────────────────────── */}
      <View style={styles.chipsRow}>
        <View
          style={[
            styles.featuredStatChip,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name="stats-chart-outline"
            size={12}
            color={colors.textSecondary}
          />
          <Text style={[styles.chipLabel, { color: colors.textSecondary }]}>
            {FEATURED_STAT_LABELS[profile.featuredStat] ?? 'Total XP'}
          </Text>
        </View>

        {profile.leaderboardOptOut && (
          <View
            style={[
              styles.optOutChip,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="eye-off-outline"
              size={12}
              color={colors.textSecondary}
            />
            <Text style={[styles.chipLabel, { color: colors.textSecondary }]}>
              Private
            </Text>
          </View>
        )}
      </View>

      {/* ── Featured achievements ───────────────────────────────────────── */}
      {featuredDefs.length > 0 && (
        <View style={styles.achievementsRow}>
          {featuredDefs.map((def) => {
            if (!def) return null;
            return (
              <View
                key={def.id}
                style={[
                  styles.achievementBadge,
                  {
                    backgroundColor: Colors.gold + '18',
                    borderColor: Colors.gold + '44',
                  },
                ]}
              >
                <Ionicons
                  name={def.icon as any}
                  size={16}
                  color={Colors.gold}
                />
                <Text
                  style={[styles.achievementTitle, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {def.title}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Tier → next tier label ───────────────────────────────────────────────────

const RANK_TIER_NEXT_LABEL: Record<string, string> = {
  bronze: 'Silver',
  silver: 'Gold',
  gold: 'Platinum',
  platinum: 'Elite',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  identityBlock: {
    flex: 1,
    gap: 2,
  },
  rankBadge: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  displayHandle: {
    fontSize: 13,
  },
  instagramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  instagramHandle: {
    fontSize: 12,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  xpBlock: {
    flex: 1,
  },
  xpTotal: {
    fontSize: 15,
    fontWeight: '700',
  },
  xpToNext: {
    fontSize: 11,
    marginTop: 1,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  featuredStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  optOutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 11,
  },
  achievementsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  achievementTitle: {
    fontSize: 11,
    fontWeight: '500',
    maxWidth: 90,
  },
});
