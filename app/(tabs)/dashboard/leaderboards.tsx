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
import React, { useEffect } from 'react';
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
import { GlassBackground } from '../../../src/components/GlassBackground';
import { Colors } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useFriends } from '../../../src/hooks/useFriends';
import { useLeaderboard } from '../../../src/hooks/useLeaderboard';
import { LeaderboardRow } from '../../../src/components/social/LeaderboardRow';
import { LEADERBOARD_CATEGORIES, getCategoryConfig } from '../../../src/utils/leaderboardCategories';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
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
  const { colors } = useTheme();
  const router = useRouter();
  const { currentUser } = useAuth();
  const friendsHook = useFriends();

  const leaderboard = useLeaderboard({
    friendUids: friendsHook.friends.map((f) => f.friendUid),
  });

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

  // Footer: user's rank (global only) or their position in list (friends/crew)
  const renderFooter = () => {
    if (loading) return null;

    if (scope === 'global' && userRank) {
      const topPercent = Math.max(1, 100 - userRank.percentile);
      return (
        <View style={[styles.rankFooter, { backgroundColor: Colors.social + '18', borderColor: Colors.social + '44' }]}>
          <Ionicons name="ribbon-outline" size={16} color={Colors.social} />
          <Text style={[styles.rankFooterText, { color: Colors.social }]}>
            You are ranked #{userRank.rank} of {userRank.totalParticipants.toLocaleString()} — Top {topPercent}%
          </Text>
        </View>
      );
    }

    if ((scope === 'friends' || scope === 'crew') && currentUser) {
      const userEntry = entries.find((e) => e.uid === currentUser.uid);
      if (userEntry?.rank) {
        return (
          <View style={[styles.rankFooter, { backgroundColor: Colors.social + '18', borderColor: Colors.social + '44' }]}>
            <Ionicons name="ribbon-outline" size={16} color={Colors.social} />
            <Text style={[styles.rankFooterText, { color: Colors.social }]}>
              You are ranked #{userEntry.rank} among {totalParticipants}
            </Text>
          </View>
        );
      }
    }

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
    <GlassBackground>
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
                {
                  backgroundColor: isActive ? Colors.accent : colors.surface,
                  borderColor: isActive ? Colors.accent : colors.border,
                },
              ]}
              onPress={() => { Haptics.selectionAsync(); setCategory(cat); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${cfg.label} category`}
            >
              <Ionicons
                name={cfg.icon as React.ComponentProps<typeof Ionicons>['name']}
                size={14}
                color={isActive ? '#fff' : colors.textSecondary}
              />
              <Text style={[styles.pillLabel, { color: isActive ? '#fff' : colors.textSecondary }]}>
                {cfg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Scope + Timeframe toggles */}
      <View style={styles.togglesRow}>
        {/* Scope */}
        <View style={[styles.segmentedControl, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                  { color: scope === s.key ? '#fff' : colors.textSecondary },
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Timeframe */}
        <View style={[styles.segmentedControl, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                  { color: timeframe === tf.key ? '#fff' : colors.textSecondary },
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
          data={entries}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.list}
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
                          pathname: '/(tabs)/dashboard/friend-profile',
                          params: { uid: item.uid },
                        }),
                    },
                    {
                      text: 'Compare with Me',
                      onPress: () =>
                        router.push({
                          pathname: '/(tabs)/dashboard/compare',
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
    </View>
    </GlassBackground>
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
});
