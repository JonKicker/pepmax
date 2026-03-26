/**
 * duel-detail — active/completed duel view.
 *
 * Route params: duelId (string)
 *
 * Layout:
 *   Top: challenger vs opponent split with progress bars + "VS" badge
 *   Middle: metric label + countdown timer to endDate
 *   Bottom: status-specific content
 *     - active:    "In progress..."
 *     - pending (I'm opponent): Accept / Decline buttons
 *     - completed: "Winner: {username}" with trophy icon
 *
 * Analytics: DUEL_DETAIL_VIEWED tracked on mount
 */
import React, { useEffect, useState, useCallback } from 'react';
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
import type { DuelDoc, DuelMetric } from '../../../src/types/challenges';

// ─── Constants ────────────────────────────────────────────────────────────────

const BG = '#12121F';
const SURFACE = '#1E1E2E';
const SURFACE2 = '#252535';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#A0A0B8';
const BORDER = '#2E2E42';
const ACCENT = '#6C5CE7';
const GREEN = '#00B894';
const RED = '#E17055';
const GOLD = '#FFD700';

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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DuelDetailScreen() {
  const router = useRouter();
  const { duelId } = useLocalSearchParams<{ duelId: string }>();
  const myUid = auth.currentUser?.uid ?? '';

  const [duel, setDuel] = useState<DuelDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!duelId) return;
    setLoading(true);
    const result = await getDuelDetail(duelId);
    if (!result.error) setDuel(result.data);
    setLoading(false);
  }, [duelId]);

  useFocusEffect(
    useCallback(() => {
      load();
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
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={ACCENT} size="large" />
      </View>
    );
  }

  if (!duel) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.errorText}>Duel not found.</Text>
      </View>
    );
  }

  const iAmChallenger = duel.challengerUid === myUid;
  const iAmOpponent = duel.opponentUid === myUid;
  const isPendingForMe = duel.status === 'pending' && iAmOpponent;

  const totalProgress = duel.challengerProgress + duel.opponentProgress;
  const challengerPct = progressPercent(duel.challengerProgress, totalProgress || 1);
  const opponentPct = progressPercent(duel.opponentProgress, totalProgress || 1);

  const isWinner = (uid: string) => duel.status === 'completed' && duel.winnerId === uid;
  const isTie = duel.status === 'completed' && duel.winnerId === null;

  const metricLabel = METRIC_LABELS[duel.metric];
  const metricIcon = METRIC_ICONS[duel.metric];

  const myProgress = iAmChallenger ? duel.challengerProgress : duel.opponentProgress;
  const theirProgress = iAmChallenger ? duel.opponentProgress : duel.challengerProgress;
  const theirName = iAmChallenger ? duel.opponentUsername : duel.challengerUsername;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Versus panel ──────────────────────────────────────────────── */}
        <View style={styles.versusPanel}>
          {/* Challenger column */}
          <View style={styles.playerColumn}>
            <View style={[styles.playerAvatar, isWinner(duel.challengerUid) && styles.playerAvatarWinner]}>
              <Text style={styles.playerAvatarText}>
                {duel.challengerUsername.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text
              style={[styles.playerName, isWinner(duel.challengerUid) && styles.winnerName]}
              numberOfLines={1}
            >
              {duel.challengerUsername}
              {duel.challengerUid === myUid ? ' (You)' : ''}
            </Text>
            {/* Vertical progress bar */}
            <View style={styles.progressBarWrap}>
              <View style={styles.progressTrack}>
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
            <Text style={styles.progressNum}>{duel.challengerProgress}</Text>
          </View>

          {/* VS badge */}
          <View style={styles.vsColumn}>
            <View style={styles.vsBadge}>
              <Text style={styles.vsText}>VS</Text>
            </View>
          </View>

          {/* Opponent column */}
          <View style={styles.playerColumn}>
            <View style={[styles.playerAvatar, styles.playerAvatarOpponent, isWinner(duel.opponentUid) && styles.playerAvatarWinner]}>
              <Text style={styles.playerAvatarText}>
                {duel.opponentUsername.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text
              style={[styles.playerName, isWinner(duel.opponentUid) && styles.winnerName]}
              numberOfLines={1}
            >
              {duel.opponentUsername}
              {duel.opponentUid === myUid ? ' (You)' : ''}
            </Text>
            <View style={styles.progressBarWrap}>
              <View style={styles.progressTrack}>
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
            <Text style={styles.progressNum}>{duel.opponentProgress}</Text>
          </View>
        </View>

        {/* ── Metric + countdown ────────────────────────────────────────── */}
        <View style={styles.metricSection}>
          <View style={styles.metricRow}>
            <Ionicons name={metricIcon} size={18} color={ACCENT} />
            <Text style={styles.metricLabel}>{metricLabel}</Text>
          </View>
          {duel.status === 'active' && (
            <View style={styles.countdownRow}>
              <Ionicons name="timer-outline" size={15} color={TEXT_SECONDARY} />
              <Text style={styles.countdown}>{formatCountdown(duel.endDate as any)}</Text>
            </View>
          )}
        </View>

        {/* ── Status content ────────────────────────────────────────────── */}
        <View style={styles.statusSection}>
          {duel.status === 'active' && (
            <View style={styles.inProgressCard}>
              <Ionicons name="pulse-outline" size={20} color={GREEN} />
              <Text style={styles.inProgressText}>Duel in progress...</Text>
            </View>
          )}

          {isPendingForMe && (
            <View style={styles.pendingCard}>
              <Text style={styles.pendingTitle}>You've been challenged!</Text>
              <Text style={styles.pendingSubtext}>
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
            </View>
          )}

          {duel.status === 'pending' && !iAmOpponent && (
            <View style={styles.sentCard}>
              <Ionicons name="hourglass-outline" size={20} color={GOLD} />
              <Text style={styles.sentText}>Waiting for {duel.opponentUsername} to accept...</Text>
            </View>
          )}

          {duel.status === 'completed' && (
            <View style={styles.completedCard}>
              {isTie ? (
                <View style={styles.resultRow}>
                  <Ionicons name="medal-outline" size={22} color={TEXT_SECONDARY} />
                  <Text style={styles.tieText}>It's a tie!</Text>
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
                <Text style={styles.finalScoreLabel}>Final Scores</Text>
                <View style={styles.finalScoreRow}>
                  <Text style={styles.finalScoreItem}>
                    {duel.challengerUsername}: <Text style={styles.finalScoreNum}>{duel.challengerProgress}</Text>
                  </Text>
                  <Text style={styles.finalScoreItem}>
                    {duel.opponentUsername}: <Text style={styles.finalScoreNum}>{duel.opponentProgress}</Text>
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
                  pathname: '/(tabs)/dashboard/compare',
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

          {duel.status === 'declined' && (
            <View style={styles.declinedCard}>
              <Ionicons name="close-circle-outline" size={20} color={RED} />
              <Text style={styles.declinedText}>This duel was declined.</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: TEXT_SECONDARY,
    fontSize: 15,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  // Versus panel
  versusPanel: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: SURFACE,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  playerColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
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
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '800',
  },
  playerName: {
    color: TEXT_PRIMARY,
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
    backgroundColor: BORDER,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  progressFill: {
    width: '100%',
    borderRadius: 10,
  },
  progressNum: {
    color: TEXT_PRIMARY,
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
    backgroundColor: SURFACE2,
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  vsText: {
    color: TEXT_SECONDARY,
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
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countdown: {
    color: TEXT_SECONDARY,
    fontSize: 13,
  },
  // Status sections
  statusSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  pendingTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '800',
  },
  pendingSubtext: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 20,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 10,
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
    color: '#FFF',
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
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
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
    color: TEXT_SECONDARY,
    fontSize: 16,
    fontWeight: '700',
  },
  finalScores: {
    gap: 6,
  },
  finalScoreLabel: {
    color: TEXT_SECONDARY,
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
    color: TEXT_SECONDARY,
    fontSize: 13,
  },
  finalScoreNum: {
    color: TEXT_PRIMARY,
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
});
