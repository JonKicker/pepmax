/**
 * Leaderboards screen.
 *
 * Layout:
 *   - Category pills (horizontal scroll) — 6 categories
 *   - Scope toggle: Global | Friends | Crew
 *   - Timeframe toggle: Weekly | Monthly | All-Time
 *   - FlatList of LeaderboardRow
 *   - "You are ranked #X (Top Y%)" footer
 *   - Pull-to-refresh
 *   - Loading skeleton
 *
 * Navigated to from Dashboard → "Leaderboards" entry card.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';
import { ArenaBackground } from '../../../src/components/ArenaBackground';
import { arenaCardStyle, ARENA_GLOW } from '../../../src/constants/competeTheme';
import { Colors } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useFriends } from '../../../src/hooks/useFriends';
import { useLeaderboard } from '../../../src/hooks/useLeaderboard';
import { LeaderboardRow } from '../../../src/components/social/LeaderboardRow';
import { LeaderboardPodium } from '../../../src/components/pvp/LeaderboardPodium';
import { YourRankBanner } from '../../../src/components/pvp/YourRankBanner';
import { ShareCardRenderer } from '../../../src/components/pvp/ShareCardRenderer';
import type { ShareCardData } from '../../../src/utils/shareCardUtils';
import { LEADERBOARD_CATEGORIES, getCategoryConfig } from '../../../src/utils/leaderboardCategories';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import { mapLegacyToV2 } from '../../../src/utils/rankTierV2';
import * as Haptics from 'expo-haptics';
import type {
  LeaderboardCategory,
  LeaderboardTimeframe,
  LeaderboardScope,
} from '../../../src/types/social';

// ─── Scope config ─────────────────────────────────────────────────────────────

const SCOPES: { key: LeaderboardScope; label: string }[] = [
  { key: 'global', label: 'Global' },
  { key: 'friends', label: 'Friends' },
  { key: 'crew', label: 'Crew' },
];

// ─── Timeframe config ─────────────────────────────────────────────────────────

const TIMEFRAMES: { key: LeaderboardTimeframe; label: string; validCategories: LeaderboardCategory[] }[] = [
  {
    key: 'weekly',
    label: 'Weekly',
    validCategories: ['weeklyVolume', 'weeklyDistance', 'weeklyXP'],
  },
  {
    key: 'monthly',
    label: 'Monthly',
    validCategories: ['monthlyVolume', 'monthlyDistance'],
  },
  {
    key: 'allTime',
    label: 'All-Time',
    validCategories: ['allTimeXP'],
  },
];

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LeaderboardSkeleton({ colors }: { colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[
            styles.skeletonRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={[styles.skeletonRank, { backgroundColor: colors.border }]} />
          <View style={styles.skeletonContent}>
            <View style={[styles.skeletonLine, { backgroundColor: colors.border, width: '60%' }]} />
            <View style={[styles.skeletonLine, { backgroundColor: colors.border, width: '30%' }]} />
          </View>
          <View style={[styles.skeletonValue, { backgroundColor: colors.border }]} />
        </View>
      ))}
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LeaderboardsScreen() {
  const { colors, dark } = useTheme();
  const router = useRouter();
  const { currentUser } = useAuth();
  const friendsHook = useFriends();

  const friendUids = useMemo(
    () => friendsHook.friends.map((f) => f.friendUid),
    [friendsHook.friends],
  );

  const leaderboard = useLeaderboard({ friendUids });

  const {
    entries,
    userRank,
    totalParticipants,
    loading,
    category,
    setCategory,
    timeframe,
    setTimeframe,
    scope,
    setScope,
    refresh,
  } = leaderboard;

  // Share card state
  const [shareVisible, setShareVisible] = useState(false);

  // Track screen view
  useEffect(() => {
    analytics.track(AnalyticsEvent.LEADERBOARD_VIEWED);
  }, []);

  // When timeframe changes, ensure category is valid for the new timeframe
  const handleSetTimeframe = (newTimeframe: LeaderboardTimeframe) => {
    const tf = TIMEFRAMES.find((t) => t.key === newTimeframe);
    if (tf && !tf.validCategories.includes(category)) {
      setCategory(tf.validCategories[0]);
    }
    setTimeframe(newTimeframe);
  };

  // Get valid categories for current timeframe
  const validCategories = TIMEFRAMES.find((t) => t.key === timeframe)?.validCategories ?? [];

  const categoryConfig = getCategoryConfig(category);

  // ── Podium: top-3 entries mapped to PodiumEntry shape ────────────────────
  const showPodium = entries.length >= 3;
  const podiumEntries = showPodium
    ? entries.slice(0, 3).map((e) => ({
        rank: e.rank ?? 0,
        username: e.username,
        value: e.value ?? 0,
        tier: mapLegacyToV2(e.tier),
      }))
    : [];

  // FlatList data: skip top-3 when podium is visible to avoid duplication
  const listData = showPodium ? entries.slice(3) : entries;

  // ── YourRankBanner: derive rank/tier/next-opponent data ─────────────────
  const yourRankBanner = (() => {
    // Global scope: use userRank from the hook
    if (scope === 'global' && userRank && currentUser) {
      const userEntry = entries.find((e) => e.uid === currentUser.uid);
      const userTier = userEntry ? mapLegacyToV2(userEntry.tier) : 'bronze';

      // Next opponent: the entry directly above the current user in the list
      const userListRank = userEntry?.rank ?? userRank.rank;
      const nextEntry = entries.find((e) => e.rank === userListRank - 1);
      const pointsToNext =
        nextEntry && userEntry
          ? Math.max(0, (nextEntry.value ?? 0) - (userEntry.value ?? 0))
          : undefined;

      return {
        rank: userRank.rank,
        total: userRank.totalParticipants,
        tier: userTier,
        nextUsername: nextEntry?.username,
        pointsToNext,
        unit: categoryConfig.unit,
      };
    }

    // Friends / crew scope: derive from entries list
    if ((scope === 'friends' || scope === 'crew') && currentUser) {
      const userEntry = entries.find((e) => e.uid === currentUser.uid);
      if (userEntry?.rank) {
        const userTier = mapLegacyToV2(userEntry.tier);
        const nextEntry = entries.find((e) => e.rank === userEntry.rank! - 1);
        const pointsToNext =
          nextEntry
            ? Math.max(0, (nextEntry.value ?? 0) - (userEntry.value ?? 0))
            : undefined;
        return {
          rank: userEntry.rank,
          total: totalParticipants,
          tier: userTier,
          nextUsername: nextEntry?.username,
          pointsToNext,
          unit: categoryConfig.unit,
        };
      }
    }

    return null;
  })();

  // Footer: empty state only (rank info moved to sticky YourRankBanner)
  const renderFooter = () => {
    if (!loading && entries.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrap, { backgroundColor: Colors.accent + '18' }]}>
            <Ionicons name="podium-outline" size={40} color={Colors.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No data yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Start training to appear on the leaderboard.
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <ArenaBackground>
    <View style={styles.container}>


      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsContainer}
      >
        {validCategories.map((cat) => {
          const cfg = getCategoryConfig(cat);
          const isActive = cat === category;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.pill,
                isActive
                  ? { backgroundColor: Colors.accent, borderColor: Colors.accent }
                  : arenaCardStyle(dark),
              ]}
              onPress={() => { Haptics.selectionAsync(); setCategory(cat); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${cfg.label} category`}
            >
              <Ionicons
                name={cfg.icon as React.ComponentProps<typeof Ionicons>['name']}
                size={14}
                color={isActive ? Colors.light.background : colors.textSecondary}
              />
              <Text style={[styles.pillLabel, { color: isActive ? Colors.light.background : colors.textSecondary }]}>
                {cfg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Scope + Timeframe toggles */}
      <View style={styles.togglesRow}>
        {/* Scope */}
        <View style={[styles.segmentedControl, arenaCardStyle(dark)]}>
          {SCOPES.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[
                styles.segmentBtn,
                scope === s.key && { backgroundColor: Colors.accent },
              ]}
              onPress={() => { Haptics.selectionAsync(); setScope(s.key); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${s.label} scope`}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  { color: scope === s.key ? Colors.light.background : colors.textSecondary },
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Timeframe */}
        <View style={[styles.segmentedControl, arenaCardStyle(dark)]}>
          {TIMEFRAMES.map((tf) => (
            <TouchableOpacity
              key={tf.key}
              style={[
                styles.segmentBtn,
                timeframe === tf.key && { backgroundColor: Colors.accent },
              ]}
              onPress={() => { Haptics.selectionAsync(); handleSetTimeframe(tf.key); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${tf.label} timeframe`}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  { color: timeframe === tf.key ? Colors.light.background : colors.textSecondary },
                ]}
              >
                {tf.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      {loading && entries.length === 0 ? (
        <ScrollView contentContainerStyle={styles.list}>
          <LeaderboardSkeleton colors={colors} />
        </ScrollView>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={[styles.list, yourRankBanner ? styles.listWithBanner : undefined]}
          ListHeaderComponent={
            showPodium ? (
              <LeaderboardPodium entries={podiumEntries} unit={categoryConfig.unit} />
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`View options for ${item.username}`}
              onPress={() => {
                if (item.uid === currentUser?.uid) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert(
                  `@${item.username}`,
                  '',
                  [
                    {
                      text: 'View Profile',
                      onPress: () =>
                        router.push({
                          pathname: '/(tabs)/compete/friend-profile',
                          params: { uid: item.uid },
                        }),
                    },
                    {
                      text: 'Compare with Me',
                      onPress: () =>
                        router.push({
                          pathname: '/(tabs)/compete/compare',
                          params: { opponentId: item.uid, opponentName: item.username },
                        }),
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ],
                );
              }}
              activeOpacity={item.uid === currentUser?.uid ? 1 : 0.75}
            >
              <LeaderboardRow
                entry={item}
                formattedValue={categoryConfig.formatValue(item.value ?? 0)}
                isCurrentUser={item.uid === currentUser?.uid}
              />
            </TouchableOpacity>
          )}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={loading && entries.length > 0}
              onRefresh={refresh}
              tintColor={Colors.accent}
              colors={[Colors.accent]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Sticky rank banner — positioned outside FlatList so it always visible */}
      {yourRankBanner && !loading && (
        <YourRankBanner
          rank={yourRankBanner.rank}
          total={yourRankBanner.total}
          tier={yourRankBanner.tier}
          nextUsername={yourRankBanner.nextUsername}
          pointsToNext={yourRankBanner.pointsToNext}
          unit={yourRankBanner.unit}
        />
      )}

      {/* Share Rank button — visible when user has rank data */}
      {yourRankBanner && !loading && (
        <TouchableOpacity
          style={styles.shareRankButton}
          onPress={() => setShareVisible(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Share your rank"
        >
          <Ionicons name="share-outline" size={16} color={Colors.accent} />
          <Text style={[styles.shareRankText, { color: Colors.accent }]}>Share Rank</Text>
        </TouchableOpacity>
      )}

      {/* ShareCardRenderer — off-screen, fires when shareVisible=true */}
      {shareVisible && yourRankBanner && currentUser && (() => {
        const userEntry = entries.find((e) => e.uid === currentUser.uid);
        const shareData: ShareCardData = {
          username: userEntry?.username ?? currentUser.uid,
          tier: yourRankBanner.tier,
          leagueRank: yourRankBanner.rank,
          leagueSize: yourRankBanner.total,
        };
        return (
          <ShareCardRenderer
            type="league_standing"
            data={shareData}
            visible={shareVisible}
            onCapture={() => setShareVisible(false)}
          />
        );
      })()}
    </View>
    </ArenaBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  pillsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillLabel: { fontSize: 12, fontWeight: '600' },
  togglesRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: { fontSize: 12, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  listWithBanner: { paddingBottom: 120 },
  rankFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  rankFooterText: { fontSize: 13, fontWeight: '600', flex: 1 },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  // Skeleton
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  skeletonRank: { width: 32, height: 18, borderRadius: 4 },
  skeletonContent: { flex: 1, gap: 6 },
  skeletonLine: { height: 12, borderRadius: 4 },
  skeletonValue: { width: 60, height: 14, borderRadius: 4 },
  shareRankButton: {
    position: 'absolute',
    bottom: 8,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent + '18',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.accent + '55',
  },
  shareRankText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
