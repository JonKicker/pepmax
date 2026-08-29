/**
 * ChallengesHub — browse and join community challenges, and manage duels.
 *
 * Four tabs: Active / Upcoming / Completed / Duels
 * Category filter row at top (All, Distance, Volume, Consistency, Cross-Module)
 * Pull-to-refresh on each tab's FlatList.
 * Duels tab: shows pending received duels (accept/decline), active duels, completed duels.
 * "New Duel" FAB visible on the Duels tab.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChallenges, type ChallengeFilter } from '../../../src/hooks/useChallenges';
import { useDuels } from '../../../src/hooks/useDuels';
import { auth } from '../../../src/services/firebase/index';
import { ChallengeCard } from '../../../src/components/challenges/ChallengeCard';
import { DuelCard } from '../../../src/components/challenges/DuelCard';
import { getMyProgress } from '../../../src/services/challengeService';
import type { ChallengeDoc, DuelDoc } from '../../../src/types/challenges';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import { ArenaBackground } from '../../../src/components/ArenaBackground';
import { arenaCardStyle, ARENA_GLOW } from '../../../src/constants/competeTheme';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../../src/constants/theme';
import { useTheme } from '../../../src/hooks/useTheme';

type TabKey = 'active' | 'upcoming' | 'completed' | 'duels';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'duels', label: 'Duels' },
];

const FILTER_OPTIONS: { key: ChallengeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'distance', label: 'Distance' },
  { key: 'volume', label: 'Volume' },
  { key: 'consistency', label: 'Consistency' },
  { key: 'cross_module', label: 'Cross-Module' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChallengesHub(): React.ReactElement {
  const router = useRouter();
  const { colors, dark } = useTheme();
  const currentUid = auth.currentUser?.uid ?? '';

  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [myProgressMap, setMyProgressMap] = useState<Record<string, number>>({});

  const {
    activeChallenges,
    upcomingChallenges,
    completedChallenges,
    loading: challengesLoading,
    filter,
    setFilter,
    joinChallenge,
    leaveChallenge,
    refresh: refreshChallenges,
  } = useChallenges();

  const {
    activeDuels,
    pendingDuels,
    completedDuels,
    loading: duelsLoading,
    acceptDuel,
    declineDuel,
    refresh: refreshDuels,
  } = useDuels();

  // Track hub view on mount
  useEffect(() => {
    analytics.track(AnalyticsEvent.CHALLENGE_HUB_VIEWED);
  }, []);

  // Load my progress for all challenges
  const loadMyProgress = useCallback(async (challenges: ChallengeDoc[]) => {
    const entries = await Promise.all(
      challenges.map(async (c) => {
        const result = await getMyProgress(c.id);
        return [c.id, result.data?.progress ?? -1] as [string, number];
      }),
    );
    const map: Record<string, number> = {};
    for (const [id, progress] of entries) {
      if (progress >= 0) map[id] = progress;
    }
    setMyProgressMap((prev) => ({ ...prev, ...map }));
  }, []);

  useEffect(() => {
    const all = [...activeChallenges, ...upcomingChallenges, ...completedChallenges];
    if (all.length > 0) {
      loadMyProgress(all);
    }
  }, [activeChallenges, upcomingChallenges, completedChallenges, loadMyProgress]);

  const handleJoin = useCallback(
    async (challengeId: string) => {
      const err = await joinChallenge(challengeId);
      if (err) {
        Alert.alert('Could not join', err.message);
      }
    },
    [joinChallenge],
  );

  const handleChallengePress = useCallback(
    (challengeId: string) => {
      router.push(`/(tabs)/compete/challenge-detail?challengeId=${challengeId}`);
    },
    [router],
  );

  const handleDuelPress = useCallback(
    (duelId: string) => {
      router.push(`/(tabs)/compete/duel-detail?duelId=${duelId}`);
    },
    [router],
  );

  const handleAcceptDuel = useCallback(
    async (duelId: string) => {
      const result = await acceptDuel(duelId);
      if (result.error) {
        Alert.alert('Error', result.error.message);
      }
    },
    [acceptDuel],
  );

  const handleDeclineDuel = useCallback(
    async (duelId: string) => {
      const result = await declineDuel(duelId);
      if (result.error) {
        Alert.alert('Error', result.error.message);
      }
    },
    [declineDuel],
  );

  // ── Challenge list data ───────────────────────────────────────────────────

  const currentChallengeList =
    activeTab === 'active'
      ? activeChallenges
      : activeTab === 'upcoming'
        ? upcomingChallenges
        : completedChallenges;

  const renderChallengeItem = useCallback(
    ({ item }: { item: ChallengeDoc }) => (
      <ChallengeCard
        challenge={item}
        myProgress={myProgressMap[item.id]}
        onJoin={() => handleJoin(item.id)}
        onPress={() => handleChallengePress(item.id)}
      />
    ),
    [myProgressMap, handleJoin, handleChallengePress],
  );

  // ── Duel list data ────────────────────────────────────────────────────────

  // Duels list: pending first, then active, then completed
  const duelList: DuelDoc[] = [...pendingDuels, ...activeDuels, ...completedDuels];

  const renderDuelItem = useCallback(
    ({ item }: { item: DuelDoc }) => (
      <DuelCard
        duel={item}
        currentUid={currentUid}
        onPress={() => handleDuelPress(item.id)}
        onAccept={item.status === 'pending' && item.opponentUid === currentUid
          ? () => handleAcceptDuel(item.id)
          : undefined}
        onDecline={item.status === 'pending' && item.opponentUid === currentUid
          ? () => handleDeclineDuel(item.id)
          : undefined}
      />
    ),
    [currentUid, handleDuelPress, handleAcceptDuel, handleDeclineDuel],
  );

  const challengeKeyExtractor = useCallback((item: ChallengeDoc) => item.id, []);
  const duelKeyExtractor = useCallback((item: DuelDoc) => item.id, []);

  const emptyLabel =
    activeTab === 'active'
      ? 'No active challenges right now.\nCheck back soon!'
      : activeTab === 'upcoming'
        ? 'No upcoming challenges scheduled.'
        : activeTab === 'completed'
          ? 'No completed challenges yet.'
          : duelList.length === 0
            ? 'No duels yet.\nTap "New Duel" to challenge a friend!'
            : '';

  const isLoading = activeTab === 'duels' ? duelsLoading : challengesLoading;

  const handleRefresh = useCallback(() => {
    if (activeTab === 'duels') {
      refreshDuels();
    } else {
      refreshChallenges();
    }
  }, [activeTab, refreshDuels, refreshChallenges]);

  // Pending count badge on Duels tab
  const pendingCount = pendingDuels.length;

  return (
    <ArenaBackground>
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* Category filter row — only visible on non-duel tabs */}
      {activeTab !== 'duels' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_OPTIONS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => { Haptics.selectionAsync(); setFilter(key); }}
              style={[styles.filterChip, filter === key ? styles.filterChipActive : arenaCardStyle(dark)]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${label}`}
            >
              <Text style={[styles.filterChipText, { color: colors.textSecondary }, filter === key && styles.filterChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Tab segmented control */}
      <View style={[styles.tabRow, arenaCardStyle(dark)]}>
        {TABS.map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.tabPill, isActive && styles.tabPillActive]}
              onPress={() => { Haptics.selectionAsync(); setActiveTab(key); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${label} tab`}
            >
              <View style={styles.tabInner}>
                <Text style={[styles.tabLabel, { color: colors.textSecondary }, isActive && styles.tabLabelActive]}>
                  {label}
                </Text>
                {key === 'duels' && pendingCount > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{pendingCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {isLoading && (activeTab === 'duels' ? duelList.length === 0 : currentChallengeList.length === 0) ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.social} />
        </View>
      ) : activeTab === 'duels' ? (
        <FlatList
          data={duelList}
          renderItem={renderDuelItem}
          keyExtractor={duelKeyExtractor}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={duelsLoading}
              onRefresh={refreshDuels}
              tintColor={Colors.social}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{emptyLabel}</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={currentChallengeList}
          renderItem={renderChallengeItem}
          keyExtractor={challengeKeyExtractor}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={challengesLoading}
              onRefresh={refreshChallenges}
              tintColor={Colors.social}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{emptyLabel}</Text>
            </View>
          }
        />
      )}

      {/* New Duel FAB — only on Duels tab */}
      {activeTab === 'duels' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/compete/create-duel'); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Create new duel"
        >
          <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="flash" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.fabText}>New Duel</Text>
        </TouchableOpacity>
      )}
    </View>
    </ArenaBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: Colors.social,
    borderColor: Colors.social,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabPillActive: {
    backgroundColor: Colors.social,
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  tabBadge: {
    backgroundColor: Colors.cardio,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 100,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.social,
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 22,
    shadowColor: Colors.social,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
