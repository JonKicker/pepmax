/**
 * DuelCard — list item component for a duel.
 *
 * Props:
 *   duel        — the DuelDoc
 *   currentUid  — the viewing user's UID (determines perspective)
 *   onPress     — navigate to duel detail
 *   onAccept?   — show Accept button when pending + I'm the opponent
 *   onDecline?  — show Decline button when pending + I'm the opponent
 *
 * Rendering by status:
 *   pending  — shows metric/duration + optional Accept/Decline if I'm opponent
 *   active   — shows both progress bars side by side
 *   completed — highlights the winner's side
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DuelDoc, DuelMetric, DuelStatus } from '../../types/challenges';

// ─── Constants ────────────────────────────────────────────────────────────────

const SURFACE = '#1E1E2E';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#A0A0B8';
const BORDER = '#2E2E42';
const ACCENT = '#6C5CE7';
const GREEN = '#00B894';
const RED = '#E17055';
const GOLD = '#FFD700';
const YELLOW = '#FDCB6E';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const STATUS_BADGE: Record<DuelStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: YELLOW, bg: YELLOW + '22' },
  active: { label: 'Active', color: GREEN, bg: GREEN + '22' },
  completed: { label: 'Completed', color: ACCENT, bg: ACCENT + '22' },
  declined: { label: 'Declined', color: RED, bg: RED + '22' },
  expired: { label: 'Expired', color: TEXT_SECONDARY, bg: TEXT_SECONDARY + '22' },
};

function progressPercent(value: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(1, value / max);
}

// ─── Props ────────────────────────────────────────────────────────────────────

type DuelCardProps = {
  duel: DuelDoc;
  currentUid: string;
  onPress: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DuelCard({
  duel,
  currentUid,
  onPress,
  onAccept,
  onDecline,
}: DuelCardProps): React.ReactElement {
  const iAmChallenger = duel.challengerUid === currentUid;
  const iAmOpponent = duel.opponentUid === currentUid;

  // Perspective-aware opponent label
  const vsLabel = iAmChallenger
    ? `vs ${duel.opponentUsername}`
    : `vs ${duel.challengerUsername}`;

  const badge = STATUS_BADGE[duel.status] ?? STATUS_BADGE.expired;
  const metricLabel = METRIC_LABELS[duel.metric];
  const metricIcon = METRIC_ICONS[duel.metric];

  const isPendingForMe = duel.status === 'pending' && iAmOpponent;

  // For progress bars: challenger is always "left", opponent is "right"
  const totalProgress = duel.challengerProgress + duel.opponentProgress;
  const challengerPct = progressPercent(duel.challengerProgress, totalProgress || 1);
  const opponentPct = progressPercent(duel.opponentProgress, totalProgress || 1);

  const isWinner = (uid: string) => duel.status === 'completed' && duel.winnerId === uid;
  const isTie = duel.status === 'completed' && duel.winnerId === null;

  return (
    <Pressable onPress={onPress} style={styles.container}>
      {/* Header: vs label + status badge */}
      <View style={styles.header}>
        <Text style={styles.vsLabel} numberOfLines={1}>
          {vsLabel}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      {/* Metric + duration row */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name={metricIcon} size={13} color={TEXT_SECONDARY} />
          <Text style={styles.metaText}>{metricLabel}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={13} color={TEXT_SECONDARY} />
          <Text style={styles.metaText}>
            {duel.durationWeeks} {duel.durationWeeks === 1 ? 'week' : 'weeks'}
          </Text>
        </View>
      </View>

      {/* Active: side-by-side progress bars */}
      {duel.status === 'active' && (
        <View style={styles.progressSection}>
          {/* Challenger side */}
          <View style={styles.progressColumn}>
            <Text
              style={[
                styles.progressUsername,
                isWinner(duel.challengerUid) && styles.winnerText,
              ]}
              numberOfLines={1}
            >
              {duel.challengerUsername}
            </Text>
            <View style={styles.progressTrackVertical}>
              <View
                style={[
                  styles.progressFillVertical,
                  { height: `${challengerPct * 100}%`, backgroundColor: ACCENT },
                ]}
              />
            </View>
            <Text style={styles.progressValue}>{duel.challengerProgress}</Text>
          </View>

          {/* VS badge */}
          <View style={styles.vsCenter}>
            <Text style={styles.vsBadge}>VS</Text>
          </View>

          {/* Opponent side */}
          <View style={styles.progressColumn}>
            <Text
              style={[
                styles.progressUsername,
                isWinner(duel.opponentUid) && styles.winnerText,
              ]}
              numberOfLines={1}
            >
              {duel.opponentUsername}
            </Text>
            <View style={styles.progressTrackVertical}>
              <View
                style={[
                  styles.progressFillVertical,
                  { height: `${opponentPct * 100}%`, backgroundColor: RED },
                ]}
              />
            </View>
            <Text style={styles.progressValue}>{duel.opponentProgress}</Text>
          </View>
        </View>
      )}

      {/* Completed: winner highlight */}
      {duel.status === 'completed' && (
        <View style={styles.completedSection}>
          {isTie ? (
            <Text style={styles.tieText}>It was a tie!</Text>
          ) : (
            <View style={styles.winnerRow}>
              <Ionicons name="trophy" size={16} color={GOLD} />
              <Text style={styles.winnerLabel}>
                Winner:{' '}
                {duel.winnerId === duel.challengerUid
                  ? duel.challengerUsername
                  : duel.opponentUsername}
              </Text>
            </View>
          )}
          <View style={styles.scoresRow}>
            <Text style={styles.scoreText}>
              {duel.challengerUsername}: {duel.challengerProgress}
            </Text>
            <Text style={styles.scoreSep}>·</Text>
            <Text style={styles.scoreText}>
              {duel.opponentUsername}: {duel.opponentProgress}
            </Text>
          </View>
        </View>
      )}

      {/* Pending + I'm opponent: Accept / Decline buttons */}
      {isPendingForMe && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={(e) => {
              e.stopPropagation?.();
              onDecline?.();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={(e) => {
              e.stopPropagation?.();
              onAccept?.();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  vsLabel: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
  },
  // Active progress bars
  progressSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 8,
    height: 80,
  },
  progressColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  progressUsername: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  winnerText: {
    color: GOLD,
  },
  progressTrackVertical: {
    width: 16,
    height: 50,
    backgroundColor: BORDER,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  progressFillVertical: {
    width: '100%',
    borderRadius: 8,
  },
  progressValue: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '700',
  },
  vsCenter: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsBadge: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '800',
  },
  // Completed section
  completedSection: {
    marginBottom: 6,
    gap: 4,
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  winnerLabel: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '700',
  },
  tieText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '600',
  },
  scoresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
  },
  scoreSep: {
    color: TEXT_SECONDARY,
    fontSize: 12,
  },
  // Action buttons
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  acceptButton: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  declineButton: {
    backgroundColor: RED + '22',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  declineButtonText: {
    color: RED,
    fontSize: 13,
    fontWeight: '700',
  },
});
