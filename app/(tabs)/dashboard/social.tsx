/**
 * Social Hub — central entry point for all social features.
 *
 * Shows:
 *  - Own UserProfileCard (fetched from publicProfiles/{uid})
 *  - Quick Actions row: Friends (with pending badge), Crews, Leaderboards
 *  - Best Rank snapshot: user's best rank tier + category name
 *
 * Analytics: SOCIAL_HUB_VIEWED on mount.
 */
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { GlassBackground } from '../../../src/components/GlassBackground';
import { Colors } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useFriends } from '../../../src/hooks/useFriends';
import { useCrews } from '../../../src/hooks/useCrews';
import { getPublicProfile } from '../../../src/services/publicProfileService';
import { UserProfileCard } from '../../../src/components/social/UserProfileCard';
import { CompareButton } from '../../../src/components/social/CompareButton';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import { getTierInfo } from '../../../src/utils/rankTier';
import { LEADERBOARD_CATEGORIES } from '../../../src/utils/leaderboardCategories';
import type { PublicProfile, LeaderboardSummary } from '../../../src/types/social';
import * as Haptics from 'expo-haptics';

// ─── Best rank helper ─────────────────────────────────────────────────────────

type BestRank = {
  rank: number;
  percentile: number;
  categoryLabel: string;
  timeframe: string;
};

function computeBestRank(summary?: LeaderboardSummary): BestRank | null {
  if (!summary) return null;

  let best: BestRank | null = null;
  for (const [key, rankData] of Object.entries(summary)) {
    if (!rankData) continue;
    // key format: "{category}_{timeframe}"
    const lastUnderscore = key.lastIndexOf('_');
    const categoryKey = key.slice(0, lastUnderscore);
    const timeframe = key.slice(lastUnderscore + 1);

    const categoryConfig = LEADERBOARD_CATEGORIES.find((c) => c.category === categoryKey);
    if (!categoryConfig) continue;

    const TIMEFRAME_LABELS: Record<string, string> = {
      weekly: 'Weekly',
      monthly: 'Monthly',
      allTime: 'All-Time',
    };

    if (!best || rankData.rank < best.rank) {
      best = {
        rank: rankData.rank,
        percentile: rankData.percentile,
        categoryLabel: categoryConfig.label,
        timeframe: TIMEFRAME_LABELS[timeframe] ?? timeframe,
      };
    }
  }

  return best;
}

// ─── Quick action card ────────────────────────────────────────────────────────

type QuickActionProps = {
  icon: string;
  label: string;
  subtitle: string;
  color: string;
  badge?: number;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
};

function QuickActionCard({
  icon,
  label,
  subtitle,
  color,
  badge,
  onPress,
  colors,
}: QuickActionProps) {
  return (
    <TouchableOpacity
      style={[styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${subtitle}`}
    >
      <View style={[styles.quickIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.quickLabel, { color: colors.textPrimary }]}>{label}</Text>
      <Text style={[styles.quickSub, { color: colors.textSecondary }]} numberOfLines={1}>
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SocialHubScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { currentUser } = useAuth();
  const friendsHook = useFriends();
  const crewsHook = useCrews();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch own public profile
  useEffect(() => {
    if (!currentUser?.uid) return;
    setProfileLoading(true);
    getPublicProfile(currentUser.uid).then((result) => {
      if (!result.error && result.data) {
        setProfile(result.data);
      }
      setProfileLoading(false);
    });
  }, [currentUser?.uid]);

  // Analytics
  useEffect(() => {
    analytics.track(AnalyticsEvent.SOCIAL_HUB_VIEWED);
  }, []);

  const bestRank = computeBestRank(profile?.leaderboardSummary);
  const tierInfo = profile ? getTierInfo(profile.tier) : null;

  return (
    <GlassBackground>
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Own profile card ─────────────────────────────────────────────── */}
      {profileLoading ? (
        <View style={[styles.profileSkeleton, { backgroundColor: colors.surface }]}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : profile ? (
        <UserProfileCard profile={profile} />
      ) : (
        <View style={[styles.profileSkeleton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="person-circle-outline" size={40} color={colors.textSecondary} />
          <Text style={[styles.noProfileText, { color: colors.textSecondary }]}>
            Set a username to appear on leaderboards
          </Text>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/profile/choose-username'); }}
            style={[styles.setUsernameBtn, { backgroundColor: Colors.accent }]}
            accessibilityRole="button"
            accessibilityLabel="Choose username"
          >
            <Text style={styles.setUsernameBtnText}>Choose Username</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Quick actions ────────────────────────────────────────────────── */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SOCIAL</Text>
      <View style={styles.quickRow}>
        <QuickActionCard
          icon="people-circle-outline"
          label="Friends"
          subtitle={
            friendsHook.pendingCount > 0
              ? `${friendsHook.pendingCount} pending`
              : `${friendsHook.friends.length} friend${friendsHook.friends.length !== 1 ? 's' : ''}`
          }
          color={Colors.gold}
          badge={friendsHook.pendingCount}
          onPress={() => router.push('/(tabs)/dashboard/friends')}
          colors={colors}
        />
        <QuickActionCard
          icon="shield-half-outline"
          label="Crews"
          subtitle={
            crewsHook.crews.length > 0
              ? `${crewsHook.crews.length} crew${crewsHook.crews.length !== 1 ? 's' : ''}`
              : 'Join or create'
          }
          color={Colors.nutrition}
          onPress={() => router.push('/(tabs)/dashboard/crews')}
          colors={colors}
        />
        <QuickActionCard
          icon="podium-outline"
          label="Rankings"
          subtitle="Weekly & all-time"
          color={Colors.social}
          onPress={() => router.push('/(tabs)/dashboard/leaderboards')}
          colors={colors}
        />
      </View>

      {/* ── Best rank snapshot ───────────────────────────────────────────── */}
      {bestRank && tierInfo && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>YOUR BEST RANK</Text>
          <TouchableOpacity
            style={[styles.rankCard, { backgroundColor: colors.surface, borderColor: tierInfo.color + '55' }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/dashboard/leaderboards'); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Your best rank: number ${bestRank.rank} in ${bestRank.categoryLabel}`}
          >
            <View style={[styles.rankIconWrap, { backgroundColor: tierInfo.color + '22' }]}>
              <Ionicons name={tierInfo.icon as any} size={28} color={tierInfo.color} />
            </View>
            <View style={styles.rankInfo}>
              <Text style={[styles.rankPosition, { color: colors.textPrimary }]}>
                #{bestRank.rank}
              </Text>
              <Text style={[styles.rankCategory, { color: colors.textSecondary }]}>
                {bestRank.timeframe} {bestRank.categoryLabel}
              </Text>
              <Text style={[styles.rankPercentile, { color: tierInfo.color }]}>
                Top {100 - bestRank.percentile}%
              </Text>
            </View>
            <View style={[styles.tierPill, { backgroundColor: tierInfo.color + '22', borderColor: tierInfo.color }]}>
              <Text style={[styles.tierPillText, { color: tierInfo.color }]}>{tierInfo.label}</Text>
            </View>
          </TouchableOpacity>
        </>
      )}

      {/* ── Compare with Friends ─────────────────────────────────────────── */}
      {friendsHook.friends.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            COMPARE WITH FRIENDS
          </Text>
          {friendsHook.friends.slice(0, 5).map((friend) => (
            <View
              key={friend.friendUid}
              style={[
                styles.compareFriendRow,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.compareFriendInfo}>
                <Text style={[styles.compareFriendName, { color: colors.textPrimary }]}>
                  @{friend.friendUsername}
                </Text>
                <Text style={[styles.compareFriendSub, { color: colors.textSecondary }]}>
                  Lv {friend.friendLevel}
                </Text>
              </View>
              <CompareButton
                opponentId={friend.friendUid}
                opponentName={friend.friendUsername}
              />
            </View>
          ))}
          {friendsHook.friends.length > 5 && (
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/dashboard/friends'); }} accessibilityRole="button" accessibilityLabel="See all friends">
              <Text style={[styles.seeAllLink, { color: Colors.accent }]}>
                See all friends →
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ── No rank yet nudge ────────────────────────────────────────────── */}
      {!bestRank && !profileLoading && profile && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>YOUR RANK</Text>
          <View style={[styles.noRankCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="ribbon-outline" size={28} color={colors.textSecondary} />
            <Text style={[styles.noRankText, { color: colors.textSecondary }]}>
              Complete workouts, cardio, and log meals to earn your first rank.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
    </GlassBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 8,
  },
  profileSkeleton: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    minHeight: 100,
    justifyContent: 'center',
  },
  noProfileText: {
    fontSize: 14,
    textAlign: 'center',
  },
  setUsernameBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  setUsernameBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.accent,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  quickSub: {
    fontSize: 10,
    textAlign: 'center',
  },
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
  },
  rankIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankInfo: {
    flex: 1,
    gap: 2,
  },
  rankPosition: {
    fontSize: 22,
    fontWeight: '800',
  },
  rankCategory: {
    fontSize: 12,
  },
  rankPercentile: {
    fontSize: 12,
    fontWeight: '600',
  },
  tierPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  tierPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  noRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  noRankText: {
    flex: 1,
    fontSize: 13,
  },
  compareFriendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  compareFriendInfo: {
    flex: 1,
  },
  compareFriendName: {
    fontSize: 14,
    fontWeight: '600',
  },
  compareFriendSub: {
    fontSize: 11,
    marginTop: 2,
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 8,
  },
});
