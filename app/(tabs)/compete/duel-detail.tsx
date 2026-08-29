/**
 * duel-detail — active/completed duel view.
 *
 * Route params: duelId (string)
 *
 * Layout:
 *   Top: challenger vs opponent split with progress bars + "VS" badge
 *   Middle: metric label + countdown timer to endDate
 *   Bottom: status-specific content
 *     - active:    DuelProgressBar tug-of-war + "In progress..."
 *     - pending (I'm opponent): Accept / Decline buttons
 *     - completed: DuelResultScreen overlay on first view, then static result
 *
 * Analytics: DUEL_DETAIL_VIEWED tracked on mount
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../../src/services/firebase/index';
import { getDuelDetail, acceptDuel, declineDuel } from '../../../src/services/duelService';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import { useDuels } from '../../../src/hooks/useDuels';
import { DuelProgressBar } from '../../../src/components/pvp/DuelProgressBar';
import { SuccessBurst } from '../../../src/components/animations/SuccessBurst';
import { DuelResultScreen } from '../../../src/components/pvp/DuelResultScreen';
import { WinStreakBadge } from '../../../src/components/pvp/WinStreakBadge';
import { VSScreen } from '../../../src/components/pvp/VSScreen';
import { getTierForRP } from '../../../src/utils/rankTierV2';
import { ShareCardRenderer } from '../../../src/components/pvp/ShareCardRenderer';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { ArenaBackground } from '../../../src/components/ArenaBackground';
import { arenaCardStyle, ARENA_GLOW } from '../../../src/constants/competeTheme';
import type { DuelDoc, DuelMetric } from '../../../src/types/challenges';
import type { RankTierV2 } from '../../../src/types/rankV2';
import type { ShareCardData } from '../../../src/utils/shareCardUtils';

// ─── Shared color constants (non-BG/SURFACE — kept for semantic use) ──────────

const ACCENT = Colors.social;
const GREEN = Colors.nutrition;
const RED = Colors.cardio;
const GOLD = Colors.gold;

const METRIC_LABELS: Record<DuelMetric, string> = {
  volume_lifted: 'Volume Lifted (kg)',
  distance_run: 'Distance Run (km)',
  days_on_plan: 'Days On Plan',
  xp_earned: 'XP Earned',
};

const METRIC_ICONS: Record<DuelMetric, keyof typeof Ionicons.glyphMap> = {
  volume_lifted: 'barbell-outline',
  distance_run: 'walk-outline',
  days_on_plan: 'calendar-outline',
  xp_earned: 'star-outline',
};

/** Short unit string for DuelProgressBar and DuelResultScreen */
const METRIC_UNITS: Record<DuelMetric, string> = {
  volume_lifted: 'kg',
  distance_run: 'km',
  days_on_plan: 'days',
  xp_earned: 'XP',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCountdown(endDate: { toDate: () => Date } | Date | null | undefined): string {
  if (!endDate) return '—';
  const end = typeof (endDate as any).toDate === 'function'
    ? (endDate as any).toDate()
    : (endDate as Date);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return 'Ended';
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

function progressPercent(value: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(1, value / max);
}

/**
 * Compute consecutive win streak for myUid from completedDuels.
 * Walks from most-recent backward; stops at first non-win.
 */
function computeWinStreak(completedDuels: DuelDoc[], myUid: string): number {
  // Sort by updatedAt descending (most recent first)
  const sorted = [...completedDuels].sort((a, b) => {
    const aMs = a.updatedAt?.toDate?.()?.getTime() ?? 0;
    const bMs = b.updatedAt?.toDate?.()?.getTime() ?? 0;
    return bMs - aMs;
  });

  let streak = 0;
  for (const d of sorted) {
    if (d.winnerId === myUid) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Resolve a RankTierV2 from optional RP value, defaulting to 'bronze'.
 */
function resolveRankTier(rp?: number): RankTierV2 {
  if (typeof rp !== 'number') return 'bronze';
  return getTierForRP(rp).tier;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DuelDetailScreen() {
  const router = useRouter();
  const { duelId } = useLocalSearchParams<{ duelId: string }>();
  const { colors, dark } = useTheme();
  const myUid = auth.currentUser?.uid ?? '';

  const [duel, setDuel] = useState<DuelDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  // Show result overlay once on first view of a completed duel
  const resultSeenRef = useRef(false);
  const [showResult, setShowResult] = useState(true);
  // Show VS overlay once per session when duel is active
  const vsSeenRef = useRef(false);
  const [showVS, setShowVS] = useState(false);
  // Share card state
  const [shareVisible, setShareVisible] = useState(false);
  // SuccessBurst on duel accept
  const [showAcceptBurst, setShowAcceptBurst] = useState(false);

  // Auto-hide accept burst after 800ms
  useEffect(() => {
    if (!showAcceptBurst) return;
    const timer = setTimeout(() => setShowAcceptBurst(false), 800);
    return () => clearTimeout(timer);
  }, [showAcceptBurst]);

  const dismissResult = useCallback(() => {
    resultSeenRef.current = true;
    setShowResult(false);
  }, []);

  // useDuels provides completedDuels for win-streak computation
  const { completedDuels } = useDuels();

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!duelId) return;
    setLoading(true);
    const result = await getDuelDetail(duelId);
    if (!result.error) {
      setDuel(result.data);
      // Show VS overlay once per session when duel is active
      if (result.data?.status === 'active' && !vsSeenRef.current) {
        vsSeenRef.current = true;
        setShowVS(true);
      }
    }
    setLoading(false);
  }, [duelId]);

  useFocusEffect(
    useCallback(() => {
      load();
      // Don't re-show result overlay if already dismissed this session
      if (resultSeenRef.current) setShowResult(false);
    }, [load]),
  );

  // Analytics on mount
  useEffect(() => {
    if (duelId) {
      analytics.track(AnalyticsEvent.DUEL_DETAIL_VIEWED, { duelId });
    }
  }, [duelId]);

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleAccept() {
    if (!duelId) return;
    setActionLoading(true);
    const result = await acceptDuel(duelId);
    setActionLoading(false);
    if (result.error) {
      Alert.alert('Error', result.error.message);
      return;
    }
    analytics.track(AnalyticsEvent.DUEL_ACCEPTED, { duelId });
    setShowAcceptBurst(true);
    await load();
  }

  async function handleDecline() {
    if (!duelId) return;
    Alert.alert('Decline Duel', 'Are you sure you want to decline this challenge?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          const result = await declineDuel(duelId);
          setActionLoading(false);
          if (result.error) {
            Alert.alert('Error', result.error.message);
            return;
          }
          analytics.track(AnalyticsEvent.DUEL_DECLINED, { duelId });
          router.back();
        },
      },
    ]);
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <ArenaBackground>
        <View style={styles.loadingScreen}>
          <ActivityIndicator color={ACCENT} size="large" />
        </View>
      </ArenaBackground>
    );
  }

  if (!duel) {
    return (
      <ArenaBackground>
        <View style={styles.loadingScreen}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>Duel not found.</Text>
        </View>
      </ArenaBackground>
    );
  }

  const iAmChallenger = duel.challengerUid === myUid;
  const iAmOpponent = duel.opponentUid === myUid;
  const isPendingForMe = duel.status === 'pending' && iAmOpponent;

  const totalProgress = duel.challengerProgress + duel.opponentProgress;
  const challengerPct = progressPercent(duel.challengerProgress, totalProgress || 1);
  const opponentPct = progressPercent(duel.opponentProgress, totalProgress || 1);

  const isWinner = (uid: string) => duel.status === 'completed' && duel.winnerId === uid;
  const isTie = duel.status === 'completed' && !duel.winnerId;

  const metricLabel = METRIC_LABELS[duel.metric];
  const metricIcon = METRIC_ICONS[duel.metric];
  const metricUnit = METRIC_UNITS[duel.metric];

  const myProgress = iAmChallenger ? duel.challengerProgress : duel.opponentProgress;
  const theirProgress = iAmChallenger ? duel.opponentProgress : duel.challengerProgress;
  const theirName = iAmChallenger ? duel.opponentUsername : duel.challengerUsername;

  // Tiers — DuelDoc does not carry RP; default both to bronze
  const challengerTier = resolveRankTier(undefined);
  const opponentTier = resolveRankTier(undefined);

  // Win streak computed from all completed duels
  const winStreak = computeWinStreak(completedDuels, myUid);

  // DuelResultScreen: map winnerId to 'challenger' | 'opponent' | 'tie'
  const resultWinner: 'challenger' | 'opponent' | 'tie' = isTie
    ? 'tie'
    : duel.winnerId === duel.challengerUid
    ? 'challenger'
    : 'opponent';

  // Which side am I on?
  const isMe: 'challenger' | 'opponent' = iAmChallenger ? 'challenger' : 'opponent';

  // Revenge handler: navigate to opponent's compare page
  const handleRevenge = () => {
    router.push({
      pathname: '/(tabs)/compete/compare',
      params: {
        opponentId: iAmChallenger ? duel.opponentUid : duel.challengerUid,
        opponentName: theirName,
      },
    });
  };

  return (
    <ArenaBackground>
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Versus panel ──────────────────────────────────────────────── */}
        <View style={[styles.versusPanel, arenaCardStyle(dark, ARENA_GLOW.purple)]}>
          {/* Challenger column */}
          <View style={styles.playerColumn}>
            <View style={[styles.playerAvatar, isWinner(duel.challengerUid) && styles.playerAvatarWinner]}>
              <Text style={[styles.playerAvatarText, { color: colors.textPrimary }]}>
                {duel.challengerUsername.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.playerNameRow}>
              <Text
                style={[styles.playerName, { color: colors.textPrimary }, isWinner(duel.challengerUid) && styles.winnerName]}
                numberOfLines={1}
              >
                {duel.challengerUsername}
                {duel.challengerUid === myUid ? ' (You)' : ''}
              </Text>
              {duel.challengerUid === myUid && winStreak >= 3 && (
                <WinStreakBadge streak={winStreak} style={styles.streakBadge} />
              )}
            </View>
            {/* Vertical progress bar — kept for the versus panel visual */}
            <View style={styles.progressBarWrap}>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      height: `${challengerPct * 100}%`,
                      backgroundColor: ACCENT,
                    },
                  ]}
                />
              </View>
            </View>
            <Text style={[styles.progressNum, { color: colors.textPrimary }]}>{duel.challengerProgress}</Text>
          </View>

          {/* VS badge */}
          <View style={styles.vsColumn}>
            <View style={[styles.vsBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.vsText, { color: colors.textSecondary }]}>VS</Text>
            </View>
          </View>

          {/* Opponent column */}
          <View style={styles.playerColumn}>
            <View style={[styles.playerAvatar, styles.playerAvatarOpponent, isWinner(duel.opponentUid) && styles.playerAvatarWinner]}>
              <Text style={[styles.playerAvatarText, { color: colors.textPrimary }]}>
                {duel.opponentUsername.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.playerNameRow}>
              <Text
                style={[styles.playerName, { color: colors.textPrimary }, isWinner(duel.opponentUid) && styles.winnerName]}
                numberOfLines={1}
              >
                {duel.opponentUsername}
                {duel.opponentUid === myUid ? ' (You)' : ''}
              </Text>
              {duel.opponentUid === myUid && winStreak >= 3 && (
                <WinStreakBadge streak={winStreak} style={styles.streakBadge} />
              )}
            </View>
            <View style={styles.progressBarWrap}>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      height: `${opponentPct * 100}%`,
                      backgroundColor: RED,
                    },
                  ]}
                />
              </View>
            </View>
            <Text style={[styles.progressNum, { color: colors.textPrimary }]}>{duel.opponentProgress}</Text>
          </View>
        </View>

        {/* ── Metric + countdown ────────────────────────────────────────── */}
        <View style={styles.metricSection}>
          <View style={styles.metricRow}>
            <Ionicons name={metricIcon} size={18} color={ACCENT} />
            <Text style={[styles.metricLabel, { color: colors.textPrimary }]}>{metricLabel}</Text>
          </View>
          {duel.status === 'active' && (
            <View style={styles.countdownRow}>
              <Ionicons name="timer-outline" size={15} color={colors.textSecondary} />
              <Text style={[styles.countdown, { color: colors.textSecondary }]}>{formatCountdown(duel.endDate as any)}</Text>
            </View>
          )}
        </View>

        {/* ── Status content ────────────────────────────────────────────── */}
        <View style={styles.statusSection}>
          {duel.status === 'active' && (
            <>
              {/* DuelProgressBar — animated tug-of-war visualization */}
              <View style={[styles.tugCard, arenaCardStyle(dark, ARENA_GLOW.purple)]}>
                <DuelProgressBar
                  challengerProgress={duel.challengerProgress}
                  opponentProgress={duel.opponentProgress}
                  challengerName={duel.challengerUsername}
                  opponentName={duel.opponentUsername}
                  challengerTier={challengerTier}
                  opponentTier={opponentTier}
                  targetValue={0}
                  unit={metricUnit}
                />
              </View>
              <View style={styles.inProgressCard}>
                <Ionicons name="pulse-outline" size={20} color={GREEN} />
                <Text style={styles.inProgressText}>Duel in progress...</Text>
              </View>
            </>
          )}

          {isPendingForMe && (
            <View style={[styles.pendingCard, arenaCardStyle(dark, ARENA_GLOW.purple)]}>
              <Text style={[styles.pendingTitle, { color: colors.textPrimary }]}>You've been challenged!</Text>
              <Text style={[styles.pendingSubtext, { color: colors.textSecondary }]}>
                {duel.challengerUsername} wants to compete on {metricLabel} for{' '}
                {duel.durationWeeks} {duel.durationWeeks === 1 ? 'week' : 'weeks'}.
              </Text>
              <View style={styles.pendingActions}>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={handleDecline}
                  disabled={actionLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={handleAccept}
                  disabled={actionLoading}
                  activeOpacity={0.7}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.acceptButtonText}>Accept Challenge</Text>
                  )}
                </TouchableOpacity>
              </View>
              {/* SuccessBurst — shown briefly after accept succeeds */}
              <View style={styles.acceptBurstWrap}>
                <SuccessBurst visible={showAcceptBurst} color={GREEN} size={72} />
              </View>
            </View>
          )}

          {duel.status === 'pending' && !iAmOpponent && (
            <View style={styles.sentCard}>
              <Ionicons name="hourglass-outline" size={20} color={GOLD} />
              <Text style={styles.sentText}>Waiting for {duel.opponentUsername} to accept...</Text>
            </View>
          )}

          {duel.status === 'completed' && (
            <View style={[styles.completedCard, arenaCardStyle(dark, ARENA_GLOW.gold)]}>
              {isTie ? (
                <View style={styles.resultRow}>
                  <Ionicons name="medal-outline" size={22} color={colors.textSecondary} />
                  <Text style={[styles.tieText, { color: colors.textSecondary }]}>It's a tie!</Text>
                </View>
              ) : (
                <View style={styles.resultRow}>
                  <Ionicons name="trophy" size={22} color={GOLD} />
                  <Text style={styles.winnerText}>
                    Winner:{' '}
                    {duel.winnerId === duel.challengerUid
                      ? duel.challengerUsername
                      : duel.opponentUsername}
                  </Text>
                </View>
              )}
              <View style={styles.finalScores}>
                <Text style={[styles.finalScoreLabel, { color: colors.textSecondary }]}>Final Scores</Text>
                <View style={styles.finalScoreRow}>
                  <Text style={[styles.finalScoreItem, { color: colors.textSecondary }]}>
                    {duel.challengerUsername}: <Text style={[styles.finalScoreNum, { color: colors.textPrimary }]}>{duel.challengerProgress}</Text>
                  </Text>
                  <Text style={[styles.finalScoreItem, { color: colors.textSecondary }]}>
                    {duel.opponentUsername}: <Text style={[styles.finalScoreNum, { color: colors.textPrimary }]}>{duel.opponentProgress}</Text>
                  </Text>
                </View>
              </View>
            </View>
          )}

          {duel.status === 'completed' && (
            <TouchableOpacity
              style={styles.compareLink}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/compete/compare',
                  params: {
                    opponentId: iAmChallenger ? duel.opponentUid : duel.challengerUid,
                    opponentName: theirName,
                  },
                })
              }
              activeOpacity={0.7}
            >
              <Ionicons name="git-compare-outline" size={16} color={ACCENT} />
              <Text style={styles.compareLinkText}>See Full Comparison</Text>
            </TouchableOpacity>
          )}

          {/* Share Victory button — only when completed and user won */}
          {duel.status === 'completed' && duel.winnerId === myUid && (
            <TouchableOpacity
              style={styles.shareVictoryButton}
              onPress={() => setShareVisible(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Share Victory"
            >
              <Ionicons name="share-outline" size={16} color={GREEN} />
              <Text style={styles.shareVictoryText}>Share Victory</Text>
            </TouchableOpacity>
          )}

          {duel.status === 'declined' && (
            <View style={styles.declinedCard}>
              <Ionicons name="close-circle-outline" size={20} color={RED} />
              <Text style={styles.declinedText}>This duel was declined.</Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* ── DuelResultScreen overlay — shown once on first view of completed duel ── */}
      {duel.status === 'completed' && showResult && (
        <DuelResultScreen
          winner={resultWinner}
          challengerName={duel.challengerUsername}
          opponentName={duel.opponentUsername}
          challengerTier={challengerTier}
          opponentTier={opponentTier}
          challengerValue={duel.challengerProgress}
          opponentValue={duel.opponentProgress}
          unit={metricUnit}
          isMe={isMe}
          onComplete={dismissResult}
          onRevenge={handleRevenge}
        />
      )}

      {/* ── VSScreen overlay — shown once per session when duel is active ── */}
      {showVS && duel && (
        <VSScreen
          challenger={{ name: duel.challengerUsername, tier: challengerTier }}
          opponent={{ name: duel.opponentUsername, tier: opponentTier }}
          metric={metricLabel}
          onComplete={() => setShowVS(false)}
        />
      )}

      {/* ── ShareCardRenderer — off-screen, fires when shareVisible=true ── */}
      {shareVisible && duel && (() => {
        const myName = iAmChallenger ? duel.challengerUsername : duel.opponentUsername;
        const shareData: ShareCardData = {
          username: myName,
          tier: iAmChallenger ? challengerTier : opponentTier,
          opponentName: theirName,
          metric: metricLabel,
          myValue: myProgress,
          theirValue: theirProgress,
          winStreak: winStreak > 1 ? winStreak : undefined,
        };
        return (
          <ShareCardRenderer
            type="duel_victory"
            data={shareData}
            visible={shareVisible}
            onCapture={() => setShareVisible(false)}
          />
        );
      })()}
    </SafeAreaView>
    </ArenaBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 15,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  // Versus panel — BG/border set inline with arenaCardStyle
  versusPanel: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  playerColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  playerNameRow: {
    alignItems: 'center',
    gap: 4,
  },
  streakBadge: {
    marginTop: 2,
  },
  playerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ACCENT + '33',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: ACCENT,
  },
  playerAvatarOpponent: {
    backgroundColor: RED + '33',
    borderColor: RED,
  },
  playerAvatarWinner: {
    borderColor: GOLD,
    backgroundColor: GOLD + '22',
  },
  playerAvatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  playerName: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 90,
  },
  winnerName: {
    color: GOLD,
  },
  progressBarWrap: {
    alignItems: 'center',
  },
  progressTrack: {
    width: 20,
    height: 70,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  progressFill: {
    width: '100%',
    borderRadius: 10,
  },
  progressNum: {
    fontSize: 14,
    fontWeight: '800',
  },
  vsColumn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 30,
  },
  vsBadge: {
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '900',
  },
  // Metric section
  metricSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 6,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countdown: {
    fontSize: 13,
  },
  // Status sections
  statusSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  tugCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  inProgressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: GREEN + '15',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: GREEN + '44',
  },
  inProgressText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '600',
  },
  pendingCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  pendingSubtext: {
    fontSize: 13,
    lineHeight: 20,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  acceptBurstWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 0,
    overflow: 'visible',
    marginTop: 4,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  declineButton: {
    flex: 1,
    backgroundColor: RED + '22',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonText: {
    color: RED,
    fontSize: 14,
    fontWeight: '700',
  },
  sentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: GOLD + '15',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: GOLD + '44',
  },
  sentText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  completedCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  winnerText: {
    color: GOLD,
    fontSize: 16,
    fontWeight: '800',
  },
  tieText: {
    fontSize: 16,
    fontWeight: '700',
  },
  finalScores: {
    gap: 6,
  },
  finalScoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  finalScoreRow: {
    flexDirection: 'row',
    gap: 16,
  },
  finalScoreItem: {
    fontSize: 13,
  },
  finalScoreNum: {
    fontWeight: '700',
  },
  declinedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: RED + '15',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: RED + '44',
  },
  declinedText: {
    color: RED,
    fontSize: 13,
    fontWeight: '600',
  },
  compareLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
    alignSelf: 'center',
  },
  compareLinkText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '600',
  },
  shareVictoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: GREEN + '18',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: GREEN + '55',
    alignSelf: 'center',
    marginTop: 4,
  },
  shareVictoryText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '700',
  },
});
