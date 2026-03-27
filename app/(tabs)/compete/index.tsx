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
import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
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
import { DailyQuestsCard } from '../../../src/components/dashboard/DailyQuestsCard';
import { GlassBackground } from '../../../src/components/GlassBackground';
import { AnimatedPressable } from '../../../src/components/AnimatedPressable';
import { getTierForRP } from '../../../src/utils/rankTierV2';
import { ACHIEVEMENT_DEFINITIONS } from '../../../src/utils/achievementDefinitions';
import type { RankTierV2 } from '../../../src/types/rankV2';
import type { XPModule } from '../../../src/types/gamification';
import type { DuelDoc } from '../../../src/types/challenges';

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
};

function QuickAction({ icon, label, color, badge, onPress, colors }: QuickActionProps) {
  return (
    <AnimatedPressable
      haptic
      style={[
        styles.quickCard,
        {
          backgroundColor: colors.glass.subtle,
          borderColor: colors.glass.border,
        },
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
  );
}

// ─── Duel Card ────────────────────────────────────────────────────────────────

type DuelCardProps = {
  duel: DuelDoc;
  myUid: string;
  isPending: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
};

function DuelCard({ duel, myUid, isPending, onPress, colors }: DuelCardProps) {
  const isChallenger = duel.challengerUid === myUid;
  const myProgress = isChallenger ? duel.challengerProgress : duel.opponentProgress;
  const theirProgress = isChallenger ? duel.opponentProgress : duel.challengerProgress;
  const myName = isChallenger ? duel.challengerUsername : duel.opponentUsername;
  const theirName = isChallenger ? duel.opponentUsername : duel.challengerUsername;

  const total = myProgress + theirProgress;
  const myFraction = total > 0 ? myProgress / total : 0.5;

  return (
    <AnimatedPressable
      haptic
      style={[
        styles.duelCard,
        { backgroundColor: colors.glass.subtle, borderColor: colors.glass.border },
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
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CompeteHubScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { userProfile, currentUser } = useAuth();

  const { level, totalXP, levelInfo, todayXP, recentLog, achievements } = useXP();
  const questsHook = useQuests();
  const duelsHook = useDuels();
  const pvp = usePvpSeason();
  const friendsHook = useFriends();
  const { activeChallenges } = useChallenges();

  const displayName = userProfile?.firstName ?? 'Athlete';
  const myUid = currentUser?.uid ?? '';

  // Rank tier from RP
  const currentRP = pvp.myStanding?.member.currentRP ?? 0;
  const rankTier: RankTierV2 = getTierForRP(currentRP).tier;

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
    <GlassBackground>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── 1. Hero Section ──────────────────────────────────────────────── */}
        <AnimatedPressable
          haptic
          style={[styles.heroCard, { backgroundColor: colors.glass.subtle, borderColor: colors.glass.border }]}
          onPress={() => router.push('/(tabs)/compete/xp-hub')}
          accessibilityRole="button"
          accessibilityLabel="View XP Hub"
        >
          {/* Level badge + Name + Rank row */}
          <View style={styles.heroTop}>
            <View style={[styles.levelBadge, { borderColor: Colors.gold, backgroundColor: Colors.gold + '14' }]}>
              <Text style={styles.levelNum}>{level}</Text>
              <Text style={[styles.levelLabel, { color: Colors.gold }]}>LVL</Text>
            </View>

            <View style={styles.heroInfo}>
              <Text style={[styles.heroName, { color: colors.textPrimary }]} numberOfLines={1}>
                {displayName}
              </Text>
              <RankBadge tier={rankTier} size="md" glow />
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
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DAILY QUESTS</Text>
        <DailyQuestsCard
          quests={questsHook.quests}
          completedCount={questsHook.completedCount}
          allDone={questsHook.allDone}
          bonusClaimed={questsHook.bonusClaimed}
          loading={questsHook.loading}
          colors={colors}
          onClaimBonus={questsHook.claimBonus}
        />

        {/* ── 3. Active Duels ───────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>YOUR DUELS</Text>

        {duelsHook.loading ? (
          <View style={[styles.duelPlaceholder, { backgroundColor: colors.glass.subtle, borderColor: colors.glass.border }]}>
            <Text style={[styles.duelPlaceholderText, { color: colors.textSecondary }]}>Loading duels…</Text>
          </View>
        ) : hasDuels ? (
          <View style={styles.duelList}>
            {allDuels.map((duel) => (
              <DuelCard
                key={duel.id}
                duel={duel}
                myUid={myUid}
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
            style={[styles.duelCta, { backgroundColor: colors.glass.subtle, borderColor: Colors.social + '55' }]}
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
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>COMPETE</Text>

        <View style={styles.quickGrid}>
          <QuickAction
            icon="trophy-outline"
            label="Trophy Case"
            color={Colors.gold}
            onPress={() => router.push('/(tabs)/compete/trophy-case')}
            colors={colors}
          />
          <QuickAction
            icon="flash-outline"
            label="Challenges"
            color={Colors.social}
            badge={activeChallenges.length > 0 ? activeChallenges.length : undefined}
            onPress={() => router.push('/(tabs)/compete/challenges')}
            colors={colors}
          />
          <QuickAction
            icon="podium-outline"
            label="Leaderboards"
            color={Colors.accent}
            onPress={() => router.push('/(tabs)/compete/leaderboards')}
            colors={colors}
          />
          <QuickAction
            icon="people-circle-outline"
            label="Social"
            color={Colors.social}
            badge={friendsHook.pendingCount > 0 ? friendsHook.pendingCount : undefined}
            onPress={() => router.push('/(tabs)/compete/social')}
            colors={colors}
          />
        </View>

        {/* ── 5. Achievements Progress ──────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ACHIEVEMENTS</Text>

        <AnimatedPressable
          haptic
          style={[styles.achieveCard, { backgroundColor: colors.glass.subtle, borderColor: colors.glass.border }]}
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
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>RECENT XP</Text>

        <View style={[styles.xpFeedCard, { backgroundColor: colors.glass.subtle, borderColor: colors.glass.border }]}>
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
        {/* TODO: Add EventBanner here once usePvpSeason exposes SeasonalEvent data */}

        {!pvp.loading && pvp.season && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SEASON</Text>
            <SeasonBanner
              season={pvp.season}
              progress={pvp.progress}
              timeRemaining={pvp.timeRemaining}
            />
          </>
        )}

        {!pvp.loading && pvp.league && pvp.myStanding && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>YOUR LEAGUE</Text>
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
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNum: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.gold,
    lineHeight: 24,
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
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
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
    width: '47%',
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
});
