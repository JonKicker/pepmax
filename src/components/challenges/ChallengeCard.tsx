/**
 * ChallengeCard — list item for a community challenge.
 *
 * Shows: title, time remaining, participant count, progress bar (if joined),
 *        XP reward pill, join/joined button, category chip.
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
import type { ChallengeDoc, ChallengeType } from '../../types/challenges';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#6C5CE7';
const ACCENT_LIGHT = '#EDE8FF';
const SURFACE = '#1E1E2E';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#A0A0B8';
const BORDER = '#2E2E42';
const GREEN = '#00B894';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeRemaining(endDate: { toDate: () => Date } | Date): string {
  const end = endDate instanceof Date ? endDate : endDate.toDate();
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) return 'Ended';

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDays > 0) return `${diffDays}d ${diffHours}h left`;
  if (diffHours > 0) return `${diffHours}h left`;
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${diffMins}m left`;
}

function formatStartsIn(startDate: { toDate: () => Date } | Date): string {
  const start = startDate instanceof Date ? startDate : startDate.toDate();
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Starting soon';
  return `Starts in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
}

const CATEGORY_LABELS: Record<ChallengeType, string> = {
  distance: 'Distance',
  volume: 'Volume',
  consistency: 'Consistency',
  cross_module: 'Cross-Module',
};

const CATEGORY_COLORS: Record<ChallengeType, string> = {
  distance: '#00CEC9',
  volume: '#E17055',
  consistency: '#FDCB6E',
  cross_module: '#6C5CE7',
};

// ─── Props ────────────────────────────────────────────────────────────────────

type ChallengeCardProps = {
  challenge: ChallengeDoc;
  myProgress?: number;
  onJoin?: () => void;
  onPress: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ChallengeCard({
  challenge,
  myProgress,
  onJoin,
  onPress,
}: ChallengeCardProps): React.ReactElement {
  const isJoined = myProgress !== undefined;
  const progressPct = useMemo(() => {
    if (!isJoined || challenge.targetValue === 0) return 0;
    return Math.min(1, (myProgress ?? 0) / challenge.targetValue);
  }, [isJoined, myProgress, challenge.targetValue]);

  const timeLabel = useMemo(() => {
    if (challenge.status === 'completed') return 'Ended';
    if (challenge.status === 'upcoming') return formatStartsIn(challenge.startDate);
    return formatTimeRemaining(challenge.endDate);
  }, [challenge.status, challenge.startDate, challenge.endDate]);

  const categoryColor = CATEGORY_COLORS[challenge.type] ?? ACCENT;
  const categoryLabel = CATEGORY_LABELS[challenge.type] ?? challenge.category;

  const showJoinButton = !isJoined && (challenge.status === 'active' || challenge.status === 'upcoming');

  return (
    <Pressable onPress={onPress} style={styles.container}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {challenge.title}
          </Text>
          {/* XP reward pill */}
          <View style={styles.xpPill}>
            <Text style={styles.xpPillText}>+{challenge.xpReward} XP</Text>
          </View>
        </View>

        {/* Category chip */}
        <View style={[styles.categoryChip, { backgroundColor: categoryColor + '22' }]}>
          <Text style={[styles.categoryText, { color: categoryColor }]}>{categoryLabel}</Text>
        </View>
      </View>

      {/* Meta row */}
      <View style={styles.metaRow}>
        {/* Time */}
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={13} color={TEXT_SECONDARY} />
          <Text style={styles.metaText}>{timeLabel}</Text>
        </View>

        {/* Participants */}
        <View style={styles.metaItem}>
          <Ionicons name="people-outline" size={13} color={TEXT_SECONDARY} />
          <Text style={styles.metaText}>
            {challenge.participantCount.toLocaleString()}
          </Text>
        </View>

        {/* Target */}
        <View style={styles.metaItem}>
          <Ionicons name="trophy-outline" size={13} color={TEXT_SECONDARY} />
          <Text style={styles.metaText}>
            {challenge.targetValue} {challenge.targetUnit}
          </Text>
        </View>
      </View>

      {/* Progress bar (only if joined) */}
      {isJoined && (
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>Your progress</Text>
            <Text style={styles.progressValue}>
              {myProgress ?? 0} / {challenge.targetValue} {challenge.targetUnit}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
          </View>
        </View>
      )}

      {/* Footer: join button or joined badge */}
      <View style={styles.footer}>
        {showJoinButton ? (
          <TouchableOpacity
            style={styles.joinButton}
            onPress={(e) => {
              e.stopPropagation?.();
              onJoin?.();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.joinButtonText}>Join</Text>
          </TouchableOpacity>
        ) : isJoined ? (
          <View style={styles.joinedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={GREEN} />
            <Text style={styles.joinedBadgeText}>Joined</Text>
          </View>
        ) : null}
      </View>
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
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  xpPill: {
    backgroundColor: ACCENT_LIGHT,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  xpPillText: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: '700',
  },
  categoryChip: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
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
  progressSection: {
    marginBottom: 8,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    color: TEXT_SECONDARY,
    fontSize: 12,
  },
  progressValue: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    backgroundColor: BORDER,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  joinButton: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: GREEN + '18',
    borderRadius: 10,
  },
  joinedBadgeText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '600',
  },
});
