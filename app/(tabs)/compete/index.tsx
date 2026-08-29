/**
 * Compete Hub — central entry point for all gamification, social, and PVP features.
 *
 * Sections:
 *   1. Hero — level badge, display name, rank badge, XP progress bar, rank progress bar, today's XP pill
 *   2. Daily Quests — DailyQuestsCard with quest state from useQuests
 *   3. Active Duels — active + pending duels from useDuels, CTA to create if none
 *   4. Quick Actions — Trophy Case, Challenges, Leaderboards, Social (2×2 glass grid)
 *   5. Achievements Progress — unlocked count / total with progress bar
 *   6. Recent XP Feed — last 3 XP log entries with module color dots
 *   7. Season / League — SeasonBanner + WeeklyLeagueCard
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { arenaCardStyle, arenaColors, ARENA_GLOW } from '../../../src/constants/competeTheme';
import { ArenaBackground } from '../../../src/components/ArenaBackground';
import { ArenaSectionDivider } from '../../../src/components/ArenaSectionDivider';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useXP } from '../../../src/hooks/useXP';
import { useQuests } from '../../../src/hooks/useQuests';
import { useDuels } from '../../../src/hooks/useDuels';
import { usePvpSeason } from '../../../src/hooks/usePvpSeason';
import { useFriends } from '../../../src/hooks/useFriends';
import { useChallenges } from '../../../src/hooks/useChallenges';
import { XPProgressBar } from '../../../src/components/gamification/XPProgressBar';
import { RankBadge } from '../../../src/components/pvp/RankBadge';
import { RankProgressBar } from '../../../src/components/pvp/RankProgressBar';
import { WeeklyLeagueCard } from '../../../src/components/pvp/WeeklyLeagueCard';
import { SeasonBanner } from '../../../src/components/pvp/SeasonBanner';
import { EventBanner } from '../../../src/components/pvp/EventBanner';
import { RankChangeIndicator } from '../../../src/components/pvp/RankChangeIndicator';
import { DailyQuestsCard } from '../../../src/components/dashboard/DailyQuestsCard';
// GlassBackground replaced by ArenaBackground for compete screens
import { AnimatedPressable } from '../../../src/components/AnimatedPressable';
import { getTierForRP } from '../../../src/utils/rankTierV2';
import { ACHIEVEMENT_DEFINITIONS } from '../../../src/utils/achievementDefinitions';
import { useCelebration } from '../../../src/hooks/useCelebration';
import { dailyQuest, seasonReward } from '../../../src/utils/celebrationPresets';
import { SuccessBurst } from '../../../src/components/animations/SuccessBurst';
import { ShareCardRenderer } from '../../../src/components/pvp/ShareCardRenderer';
import type { ShareCardData } from '../../../src/utils/shareCardUtils';
import { getActiveEvents, joinEvent } from '../../../src/services/eventService';
import { auth } from '../../../src/services/firebase/index';
import type { RankTierV2 } from '../../../src/types/rankV2';
import type { XPModule } from '../../../src/types/gamification';
import type { DuelDoc } from '../../../src/types/challenges';
import type { SeasonalEvent } from '../../../src/types/pvpEvents';

// ─── Module colors for XP feed ────────────────────────────────────────────────

const MODULE_COLOR: Record<XPModule, string> = {
  peptides: Colors.peptide,
  gym: Colors.gym,
  nutrition: Colors.nutrition,
  cardio: Colors.cardio,
  recovery: Colors.recovery ?? Colors.accent,
  system: Colors.gold,
};

// ─── XP Source label formatter ────────────────────────────────────────────────

function formatXPSource(source: string): string {
  return source
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── Relative time formatter ──────────────────────────────────────────────────

function formatRelativeTime(dateKey: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (dateKey === today) return 'Today';
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateKey === yesterday) return 'Yesterday';
  return dateKey;
}

// ─── Duel metric label ─────────────────────────────────────────────────────────

function formatDuelMetric(metric: string): string {
  const labels: Record<string, string> = {
    volume_lifted: 'Volume Lifted',
    distance_run: 'Distance Run',
    days_on_plan: 'Days on Plan',
    xp_earned: 'XP Earned',
  };
  return labels[metric] ?? metric;
}

// ─── Quick Action Card ────────────────────────────────────────────────────────

type QuickActionProps = {
  icon: string;
  label: string;
  color: string;
  badge?: number;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  dark: boolean;
  animIndex: number;
};

function QuickAction({ icon, label, color, badge, onPress, colors, dark, animIndex }: QuickActionProps) {
  const scale = useSharedValue(0.8);

  useEffect(() => {
    const delay = Math.min(animIndex * 80, 320); // cap stagger at 320ms
    scale.value = withDelay(delay, withSpring(1, { damping: 14 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ width: '47%' }, animStyle]}>
      <AnimatedPressable
        haptic
        style={[
          styles.quickCard,
          arenaCardStyle(dark, ARENA_GLOW.accent),
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={[styles.quickIconWrap, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon as any} size={22} color={color} />
          {badge !== undefined && badge > 0 && (
            <View style={styles.quickBadge}>
              <Text style={styles.quickBadgeText}>{badge > 99 ? '99+' : badge}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.quickLabel, { color: colors.textPrimary }]}>{label}</Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

// ─── Duel Card ────────────────────────────────────────────────────────────────

type DuelCardProps = {
  duel: DuelDoc;
  myUid: string;
  isPending: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  dark: boolean;
};

function DuelCard({ duel, myUid, isPending, onPress, colors, dark }: DuelCardProps) {
  const isChallenger = duel.challengerUid === myUid;
  const myProgress = isChallenger ? duel.challengerProgress : duel.opponentProgress;
  const theirProgress = isChallenger ? duel.opponentProgress : duel.challengerProgress;
  const myName = isChallenger ? duel.challengerUsername : duel.opponentUsername;
  const theirName = isChallenger ? duel.opponentUsername : duel.challengerUsername;

  const total = myProgress + theirProgress;
  const myFraction = total > 0 ? myProgress / total : 0.5;

  // Pulsing border opacity for active duels
  const borderOpacity = useSharedValue(0.3);
  useEffect(() => {
    if (duel.status === 'active') {
      borderOpacity.value = withRepeat(
        withTiming(0.8, { duration: 1200 }),
        -1,
        true,
      );
    }
    return () => {
      cancelAnimation(borderOpacity);
    };
  }, [duel.status]);

  const pulseStyle = useAnimatedStyle(() => ({
    borderColor: Colors.social + Math.round(borderOpacity.value * 255).toString(16).padStart(2, '0'),
  }));

  const baseCardStyle = arenaCardStyle(dark, ARENA_GLOW.purple);

  return (
    <Animated.View style={duel.status === 'active' ? [baseCardStyle, pulseStyle] : undefined}>
    <AnimatedPressable
      haptic
      style={[
        styles.duelCard,
        duel.status === 'active' ? { backgroundColor: baseCardStyle.backgroundColor } : baseCardStyle,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Duel: ${myName} vs ${theirName}`}
    >
      {/* Metric label + status badge */}
      <View style={styles.duelHeaderRow}>
        <View style={[styles.duelMetricPill, { backgroundColor: Colors.social + '18' }]}>
          <Ionicons name="flash-outline" size={11} color={Colors.social} />
          <Text style={[styles.duelMetricText, { color: Colors.social }]}>
            {formatDuelMetric(duel.metric)}
          </Text>
        </View>
        {isPending && (
          <View style={[styles.duelPendingBadge, { backgroundColor: Colors.gold + '22' }]}>
            <Text style={[styles.duelPendingText, { color: Colors.gold }]}>WAITING FOR YOU</Text>
          </View>
        )}
      </View>

      {/* Names row */}
      <View style={styles.duelNamesRow}>
        <Text style={[styles.duelName, { color: colors.textPrimary }]} numberOfLines={1}>
          {myName}
        </Text>
        <Text style={[styles.duelVs, { color: colors.textSecondary }]}>vs</Text>
        <Text style={[styles.duelName, { color: colors.textPrimary }]} numberOfLines={1}>
          {theirName}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.duelProgressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.duelProgressFill,
            { width: `${Math.round(myFraction * 100)}%`, backgroundColor: Colors.social },
          ]}
        />
      </View>

      {/* Score row */}
      <View style={styles.duelScoreRow}>
        <Text style={[styles.duelScore, { color: Colors.social }]}>{myProgress}</Text>
        <Text style={[styles.duelScoreLabel, { color: colors.textSecondary }]}>Tap to view →</Text>
        <Text style={[styles.duelScore, { color: colors.textSecondary }]}>{theirProgress}</Text>
      </View>
    </AnimatedPressable>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CompeteHubScreen() {
  const { colors, dark } = useTheme();
  const arena = arenaColors(dark);
  const router = useRouter();
  const { userProfile, currentUser } = useAuth();

  const { level, totalXP, levelInfo, todayXP, recentLog, achievements } = useXP();
  const questsHook = useQuests();
  const duelsHook = useDuels();
  const pvp = usePvpSeason();
  const friendsHook = useFriends();
  const { activeChallenges } = useChallenges();

  const { triggerCelebration } = useCelebration();

  // Share season state
  const [seasonShareVisible, setSeasonShareVisible] = useState(false);
  const [seasonRewardClaimed, setSeasonRewardClaimed] = useState(false);
  const [showBurst, setShowBurst] = useState(false);

  // Auto-hide SuccessBurst after 800ms
  useEffect(() => {
    if (!showBurst) return;
    const timer = setTimeout(() => setShowBurst(false), 800);
    return () => clearTimeout(timer);
  }, [showBurst]);

  // ── Seasonal Events ────────────────────────────────────────────────────────
  const [activeEvents, setActiveEvents] = useState<SeasonalEvent[]>([]);
  const [joinedEventIds, setJoinedEventIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    getActiveEvents().then((result) => {
      if (!cancelled && !result.error && result.data) {
        setActiveEvents(result.data);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleClaimBonus = useCallback(async () => {
    await questsHook.claimBonus();
    triggerCelebration(dailyQuest());
  }, [questsHook.claimBonus, triggerCelebration]);

  const handleClaimReward = useCallback(async () => {
    await pvp.claimReward();
    triggerCelebration(seasonReward());
    setSeasonRewardClaimed(true);
    setShowBurst(true);
  }, [pvp.claimReward, triggerCelebration]);

  const displayName = userProfile?.firstName ?? 'Athlete';
  const myUid = currentUser?.uid ?? '';

  // Rank tier from RP
  const currentRP = pvp.myStanding?.member.currentRP ?? 0;
  const rankTier: RankTierV2 = getTierForRP(currentRP).tier;

  // Recent RP change: sum of last 5 match history rpDelta values
  const recentRpChange = pvp.progress?.matchHistory
    ? pvp.progress.matchHistory.slice(-5).reduce((sum, m) => sum + m.rpDelta, 0)
    : 0;

  const handleJoinEvent = useCallback(async (eventId: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const result = await joinEvent(uid, eventId);
    if (!result.error) {
      setJoinedEventIds((prev) => new Set(prev).add(eventId));
    }
  }, []);

  // Achievements progress
  const totalAchievements = ACHIEVEMENT_DEFINITIONS.length;
  const unlockedCount = Object.keys(achievements).length;
  const achievementFraction = totalAchievements > 0 ? unlockedCount / totalAchievements : 0;

  // Duels
  const allDuels = [...duelsHook.pendingDuels, ...duelsHook.activeDuels];
  const hasDuels = allDuels.length > 0;

  // Recent XP log (last 3)
  const recentXP = recentLog.slice(0, 3);

  return (
    <ArenaBackground>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── 1. Hero Section ──────────────────────────────────────────────── */}
        <AnimatedPressable
          haptic
          style={[styles.heroCard, arenaCardStyle(dark, ARENA_GLOW.gold)]}
          onPress={() => router.push('/(tabs)/compete/xp-hub')}
          accessibilityRole="button"
          accessibilityLabel="View XP Hub"
        >
          {/* Level badge + Name + Rank row */}
          <View style={styles.heroTop}>
            <View style={[
              styles.levelBadge,
              {
                borderColor: Colors.gold,
                backgroundColor: Colors.gold + '14',
                shadowColor: Colors.gold,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
              },
            ]}>
              <Text style={styles.levelNum}>{level}</Text>
              <Text style={[styles.levelLabel, { color: Colors.gold }]}>LVL</Text>
            </View>

            <View style={styles.heroInfo}>
              <Text style={[styles.heroName, { color: colors.textPrimary }]} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={styles.rankRow}>
                <RankBadge tier={rankTier} size="md" glow />
                <RankChangeIndicator change={recentRpChange} />
              </View>
            </View>

            {/* Today's XP pill */}
            <View style={[styles.todayPill, { backgroundColor: Colors.gold + '18', borderColor: Colors.gold + '44' }]}>
              <Ionicons name="star" size={12} color={Colors.gold} />
              <Text style={[styles.todayPillText, { color: Colors.gold }]}>
                +{todayXP} today
              </Text>
            </View>
          </View>

          {/* XP Progress bar */}
          <View style={styles.progressWrap}>
            <XPProgressBar
              level={level}
              currentLevelXP={levelInfo.currentLevelXP}
              xpToNextLevel={levelInfo.xpToNextLevel}
              progress={levelInfo.progress}
              totalXP={totalXP}
              compact
            />
          </View>

          {/* Rank Progress bar (compact) */}
          <RankProgressBar currentRP={currentRP} size="compact" />

          <Text style={[styles.heroHint, { color: colors.textSecondary }]}>
            Tap to view XP Hub
          </Text>
        </AnimatedPressable>

        {/* ── 2. Daily Quests ───────────────────────────────────────────────── */}
        <ArenaSectionDivider />
        <Text style={[styles.sectionLabel, { color: arena.sectionText }]}>DAILY QUESTS</Text>
        <DailyQuestsCard
          quests={questsHook.quests}
          completedCount={questsHook.completedCount}
          allDone={questsHook.allDone}
          bonusClaimed={questsHook.bonusClaimed}
          loading={questsHook.loading}
          colors={colors}
          onClaimBonus={handleClaimBonus}
        />

        {/* ── 3. Active Duels ───────────────────────────────────────────────── */}
        <ArenaSectionDivider />
        <Text style={[styles.sectionLabel, { color: arena.sectionText }]}>YOUR DUELS</Text>

        {duelsHook.loading ? (
          <View style={[styles.duelPlaceholder, arenaCardStyle(dark, ARENA_GLOW.purple)]}>
            <Text style={[styles.duelPlaceholderText, { color: colors.textSecondary }]}>Loading duels…</Text>
          </View>
        ) : hasDuels ? (
          <View style={styles.duelList}>
            {allDuels.map((duel) => (
              <DuelCard
                key={duel.id}
                duel={duel}
                myUid={myUid}
                dark={dark}
                isPending={duelsHook.pendingDuels.some((d) => d.id === duel.id)}
                onPress={() =>
                  router.push(`/(tabs)/compete/duel-detail?duelId=${duel.id}` as any)
                }
                colors={colors}
              />
            ))}
          </View>
        ) : (
          <AnimatedPressable
            haptic
            style={[styles.duelCta, arenaCardStyle(dark, ARENA_GLOW.purple)]}
            onPress={() => router.push('/(tabs)/compete/create-duel' as any)}
            accessibilityRole="button"
            accessibilityLabel="Challenge a Friend"
          >
            <View style={[styles.duelCtaIcon, { backgroundColor: Colors.social + '18' }]}>
              <Ionicons name="people-outline" size={24} color={Colors.social} />
            </View>
            <View style={styles.duelCtaText}>
              <Text style={[styles.duelCtaTitle, { color: colors.textPrimary }]}>Challenge a Friend</Text>
              <Text style={[styles.duelCtaSubtitle, { color: colors.textSecondary }]}>
                Start a head-to-head duel and compete for glory
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.social} />
          </AnimatedPressable>
        )}

        {/* ── 4. Quick Actions (2×2 grid) ──────────────────────────────────── */}
        <ArenaSectionDivider />
        <Text style={[styles.sectionLabel, { color: arena.sectionText }]}>COMPETE</Text>

        <View style={styles.quickGrid}>
          <QuickAction
            icon="trophy-outline"
            label="Trophy Case"
            color={Colors.gold}
            onPress={() => router.push('/(tabs)/compete/trophy-case')}
            colors={colors}
            dark={dark}
            animIndex={0}
          />
          <QuickAction
            icon="flash-outline"
            label="Challenges"
            color={Colors.social}
            badge={activeChallenges.length > 0 ? activeChallenges.length : undefined}
            onPress={() => router.push('/(tabs)/compete/challenges')}
            colors={colors}
            dark={dark}
            animIndex={1}
          />
          <QuickAction
            icon="podium-outline"
            label="Leaderboards"
            color={Colors.accent}
            onPress={() => router.push('/(tabs)/compete/leaderboards')}
            colors={colors}
            dark={dark}
            animIndex={2}
          />
          <QuickAction
            icon="people-circle-outline"
            label="Social"
            color={Colors.social}
            badge={friendsHook.pendingCount > 0 ? friendsHook.pendingCount : undefined}
            onPress={() => router.push('/(tabs)/compete/social')}
            colors={colors}
            dark={dark}
            animIndex={3}
          />
        </View>

        {/* ── 5. Achievements Progress ──────────────────────────────────────── */}
        <ArenaSectionDivider />
        <Text style={[styles.sectionLabel, { color: arena.sectionText }]}>ACHIEVEMENTS</Text>

        <AnimatedPressable
          haptic
          style={[styles.achieveCard, arenaCardStyle(dark, ARENA_GLOW.gold)]}
          onPress={() => router.push('/(tabs)/compete/trophy-case')}
          accessibilityRole="button"
          accessibilityLabel={`${unlockedCount} of ${totalAchievements} achievements unlocked`}
        >
          <View style={styles.achieveHeaderRow}>
            <View style={[styles.achieveIconWrap, { backgroundColor: Colors.gold + '18' }]}>
              <Ionicons name="trophy" size={20} color={Colors.gold} />
            </View>
            <View style={styles.achieveInfo}>
              <Text style={[styles.achieveTitle, { color: colors.textPrimary }]}>Achievements</Text>
              <Text style={[styles.achieveCount, { color: colors.textSecondary }]}>
                {unlockedCount} / {totalAchievements} Unlocked
              </Text>
            </View>
            <Text style={[styles.achievePercent, { color: Colors.gold }]}>
              {Math.round(achievementFraction * 100)}%
            </Text>
          </View>

          {/* Progress bar */}
          <View style={[styles.achieveTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.achieveFill,
                { width: `${Math.round(achievementFraction * 100)}%`, backgroundColor: Colors.gold },
              ]}
            />
          </View>
        </AnimatedPressable>

        {/* ── 6. Recent XP Feed ─────────────────────────────────────────────── */}
        <ArenaSectionDivider />
        <Text style={[styles.sectionLabel, { color: arena.sectionText }]}>RECENT XP</Text>

        <View style={[styles.xpFeedCard, arenaCardStyle(dark)]}>
          {recentXP.length === 0 ? (
            <View style={styles.xpFeedEmpty}>
              <Ionicons name="star-outline" size={24} color={colors.textSecondary} />
              <Text style={[styles.xpFeedEmptyText, { color: colors.textSecondary }]}>
                Start earning XP!
              </Text>
            </View>
          ) : (
            <>
              {recentXP.map((entry) => (
                <View key={entry.id} style={styles.xpFeedRow}>
                  {/* Module color dot */}
                  <View
                    style={[
                      styles.xpModuleDot,
                      { backgroundColor: MODULE_COLOR[entry.module] ?? Colors.accent },
                    ]}
                  />
                  {/* Source label */}
                  <Text style={[styles.xpSourceLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                    {formatXPSource(entry.source)}
                  </Text>
                  {/* Amount */}
                  <Text style={[styles.xpAmount, { color: Colors.gold }]}>
                    +{entry.amount} XP
                  </Text>
                  {/* Relative time */}
                  <Text style={[styles.xpTime, { color: colors.textSecondary }]}>
                    {formatRelativeTime(entry.dateKey)}
                  </Text>
                </View>
              ))}

              <View style={[styles.xpFeedDivider, { backgroundColor: colors.border }]} />

              <AnimatedPressable
                haptic
                style={styles.xpViewAllRow}
                onPress={() => router.push('/(tabs)/compete/xp-hub')}
                accessibilityRole="button"
                accessibilityLabel="View all XP history"
              >
                <Text style={[styles.xpViewAllText, { color: Colors.accent }]}>View All →</Text>
              </AnimatedPressable>
            </>
          )}
        </View>

        {/* ── 7. Season / League Section ───────────────────────────────────── */}

        {activeEvents.length > 0 && (
          <>
            <ArenaSectionDivider />
            <Text style={[styles.sectionLabel, { color: arena.sectionText }]}>EVENTS</Text>
            {activeEvents.map((event) => (
              <EventBanner
                key={event.id}
                event={event}
                userJoined={joinedEventIds.has(event.id)}
                onJoin={() => handleJoinEvent(event.id)}
                onViewDetails={() => router.push('/(tabs)/compete/leaderboards')}
              />
            ))}
          </>
        )}

        {!pvp.loading && pvp.season && (
          <>
            <ArenaSectionDivider />
            <Text style={[styles.sectionLabel, { color: arena.sectionText }]}>SEASON</Text>
            <SeasonBanner
              season={pvp.season}
              progress={pvp.progress}
              timeRemaining={pvp.timeRemaining}
              onClaimReward={handleClaimReward}
            />
            {/* SuccessBurst — shown briefly after reward claimed */}
            <View style={styles.burstWrap}>
              <SuccessBurst visible={showBurst} color={Colors.gold} size={72} />
            </View>
            {/* Share Season button — shown after reward claimed */}
            {seasonRewardClaimed && (
              <TouchableOpacity
                style={styles.shareSeasonButton}
                onPress={() => setSeasonShareVisible(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Share season results"
              >
                <Ionicons name="share-outline" size={15} color={Colors.gold} />
                <Text style={[styles.shareSeasonText, { color: Colors.gold }]}>Share Season</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {!pvp.loading && pvp.league && pvp.myStanding && (
          <>
            <ArenaSectionDivider />
            <Text style={[styles.sectionLabel, { color: arena.sectionText }]}>YOUR LEAGUE</Text>
            <WeeklyLeagueCard
              league={pvp.league}
              standings={pvp.standings}
              myStanding={pvp.myStanding}
              timeRemaining={pvp.timeRemaining}
              loading={pvp.loading}
              onViewFullStandings={() => router.push('/(tabs)/compete/leaderboards')}
            />
          </>
        )}

      </ScrollView>

      {/* ShareCardRenderer for season summary — off-screen, fires when seasonShareVisible=true */}

      {seasonShareVisible && pvp.season && (() => {
        const shareData: ShareCardData = {
          username: userProfile?.username ?? displayName,
          tier: rankTier,
          seasonName: pvp.season.name,
          totalRP: currentRP,
          peakTier: pvp.progress?.peakTier ?? rankTier,
          rewardTier: pvp.progress?.rewardTier ?? undefined,
        };
        return (
          <ShareCardRenderer
            type="season_summary"
            data={shareData}
            visible={seasonShareVisible}
            onCapture={() => setSeasonShareVisible(false)}
          />
        );
      })()}
    </ArenaBackground>
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

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 4,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNum: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.gold,
    lineHeight: 28,
  },
  levelLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  heroInfo: {
    flex: 1,
    gap: 4,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroName: {
    fontSize: 17,
    fontWeight: '700',
  },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  todayPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressWrap: {
    marginTop: 4,
  },
  heroHint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: -4,
  },

  // ── Section label ─────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 4,
  },

  // ── Duels ─────────────────────────────────────────────────────────────────
  duelList: {
    gap: 8,
  },
  duelCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  duelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  duelMetricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  duelMetricText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  duelPendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  duelPendingText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  duelNamesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  duelName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  duelVs: {
    fontSize: 12,
    fontWeight: '600',
  },
  duelProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  duelProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  duelScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  duelScore: {
    fontSize: 14,
    fontWeight: '800',
  },
  duelScoreLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  duelPlaceholder: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  duelPlaceholderText: {
    fontSize: 14,
  },
  duelCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  duelCtaIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duelCtaText: {
    flex: 1,
    gap: 2,
  },
  duelCtaTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  duelCtaSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },

  // ── Quick actions ─────────────────────────────────────────────────────────
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  quickIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBadge: {
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
  quickBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  // ── Achievements progress ─────────────────────────────────────────────────
  achieveCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  achieveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  achieveIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achieveInfo: {
    flex: 1,
    gap: 2,
  },
  achieveTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  achieveCount: {
    fontSize: 12,
  },
  achievePercent: {
    fontSize: 16,
    fontWeight: '800',
  },
  achieveTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  achieveFill: {
    height: '100%',
    borderRadius: 3,
  },

  // ── XP Feed ───────────────────────────────────────────────────────────────
  xpFeedCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  xpFeedEmpty: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  xpFeedEmptyText: {
    fontSize: 14,
  },
  xpFeedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  xpModuleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  xpSourceLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  xpAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  xpTime: {
    fontSize: 11,
    fontWeight: '500',
    minWidth: 52,
    textAlign: 'right',
  },
  xpFeedDivider: {
    height: 1,
    marginVertical: 6,
  },
  xpViewAllRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  xpViewAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  burstWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 0,
    overflow: 'visible',
  },
  shareSeasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.gold + '18',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.gold + '55',
    alignSelf: 'center',
    marginTop: 6,
  },
  shareSeasonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
