/**
 * ChallengeDetail — single challenge view with leaderboard.
 *
 * Route params: challengeId (string)
 *
 * Shows: title, description, rules section, circular progress,
 *        time remaining, participant leaderboard, join button.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../../src/services/firebase/index';
import {
  getChallengeDetail,
  getChallengeParticipants,
  getMyProgress,
  joinChallenge,
} from '../../../src/services/challengeService';
import type { ChallengeDoc, ChallengeParticipantDoc } from '../../../src/types/challenges';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import { ShareButton } from '../../../src/components/sharing/ShareButton';
import type { ChallengeCardData } from '../../../src/types/shareCard';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#6C5CE7';
const ACCENT_LIGHT = '#EDE8FF';
const BG = '#0F0F1A';
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

  if (diffMs <= 0) return 'Challenge ended';

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffDays > 0) return `${diffDays}d ${diffHours}h remaining`;
  if (diffHours > 0) return `${diffHours}h ${diffMins}m remaining`;
  return `${diffMins}m remaining`;
}

function formatStartsIn(startDate: { toDate: () => Date } | Date): string {
  const start = startDate instanceof Date ? startDate : startDate.toDate();
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Starting soon';
  return `Starts in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
}

// ─── Circular Progress ────────────────────────────────────────────────────────

type CircularProgressProps = {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  label: string;
};

function CircularProgress({ progress, size = 120, strokeWidth = 10, label }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const pct = Math.round(clampedProgress * 100);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background track */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: BORDER,
        }}
      />
      {/* Progress arc (approximated with a border overlay) */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: ACCENT,
          borderTopColor: clampedProgress >= 0.25 ? ACCENT : 'transparent',
          borderRightColor: clampedProgress >= 0.5 ? ACCENT : 'transparent',
          borderBottomColor: clampedProgress >= 0.75 ? ACCENT : 'transparent',
          borderLeftColor: clampedProgress >= 1 ? ACCENT : 'transparent',
          opacity: clampedProgress > 0 ? 1 : 0,
        }}
      />
      {/* Center text */}
      <View style={{ alignItems: 'center' }}>
        <Text style={{ color: TEXT_PRIMARY, fontSize: 22, fontWeight: '800' }}>{pct}%</Text>
        <Text style={{ color: TEXT_SECONDARY, fontSize: 10, textAlign: 'center', maxWidth: size - 24 }}>
          {label}
        </Text>
      </View>
    </View>
  );
}

// ─── Participant Row ──────────────────────────────────────────────────────────

type ParticipantRowProps = {
  participant: ChallengeParticipantDoc;
  index: number;
  targetValue: number;
  targetUnit: string;
  isMe: boolean;
};

function ParticipantRow({ participant, index, targetValue, targetUnit, isMe }: ParticipantRowProps) {
  const pct = targetValue > 0 ? Math.min(1, participant.progress / targetValue) : 0;

  return (
    <View style={[styles.participantRow, isMe && styles.participantRowMe]}>
      <Text style={[styles.rankText, isMe && styles.meText]}>#{index + 1}</Text>
      <View style={styles.participantInfo}>
        <Text style={[styles.participantName, isMe && styles.meText]} numberOfLines={1}>
          {participant.displayHandle || participant.username}
          {isMe ? ' (You)' : ''}
        </Text>
        <View style={styles.miniProgressTrack}>
          <View style={[styles.miniProgressFill, { width: `${pct * 100}%` }]} />
        </View>
      </View>
      <Text style={[styles.participantValue, isMe && styles.meText]}>
        {participant.progress} {targetUnit}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ChallengeDetail(): React.ReactElement {
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
  const router = useRouter();

  const [challenge, setChallenge] = useState<ChallengeDoc | null>(null);
  const [participants, setParticipants] = useState<ChallengeParticipantDoc[]>([]);
  const [myProgress, setMyProgress] = useState<ChallengeParticipantDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const uid = auth.currentUser?.uid ?? '';

  const loadData = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);

    const [detailResult, participantsResult, myProgressResult] = await Promise.all([
      getChallengeDetail(challengeId),
      getChallengeParticipants(challengeId),
      getMyProgress(challengeId),
    ]);

    if (detailResult.data) setChallenge(detailResult.data);
    if (participantsResult.data) setParticipants(participantsResult.data);
    if (myProgressResult.data) setMyProgress(myProgressResult.data);

    setLoading(false);
  }, [challengeId]);

  useEffect(() => {
    loadData();
    analytics.track(AnalyticsEvent.CHALLENGE_DETAIL_VIEWED, { challengeId: challengeId ?? '' });
  }, [loadData, challengeId]);

  const handleJoin = useCallback(async () => {
    if (!challengeId) return;
    setJoining(true);
    const result = await joinChallenge(challengeId);
    setJoining(false);

    if (result.error) {
      Alert.alert('Could not join', result.error.message);
      return;
    }

    analytics.track(AnalyticsEvent.CHALLENGE_JOINED, { challengeId });
    // Reload to get fresh participant data
    loadData();
  }, [challengeId, loadData]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={ACCENT} />
      </View>
    );
  }

  if (!challenge) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Challenge not found.</Text>
      </View>
    );
  }

  const isJoined = myProgress !== null;
  const progressPct =
    isJoined && challenge.targetValue > 0
      ? (myProgress!.progress ?? 0) / challenge.targetValue
      : 0;

  const timeLabel =
    challenge.status === 'completed'
      ? 'Challenge ended'
      : challenge.status === 'upcoming'
        ? formatStartsIn(challenge.startDate)
        : formatTimeRemaining(challenge.endDate);

  const showJoinButton =
    !isJoined && (challenge.status === 'active' || challenge.status === 'upcoming');

  return (
    <View style={styles.container}>
      <FlatList
        data={participants}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Title */}
            <Text style={styles.title}>{challenge.title}</Text>

            {/* XP + time */}
            <View style={styles.pillRow}>
              <View style={styles.xpPill}>
                <Text style={styles.xpPillText}>+{challenge.xpReward} XP</Text>
              </View>
              <View style={styles.timePill}>
                <Ionicons name="time-outline" size={13} color={TEXT_SECONDARY} />
                <Text style={styles.timePillText}>{timeLabel}</Text>
              </View>
              <View style={styles.timePill}>
                <Ionicons name="people-outline" size={13} color={TEXT_SECONDARY} />
                <Text style={styles.timePillText}>
                  {challenge.participantCount.toLocaleString()} joined
                </Text>
              </View>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bodyText}>{challenge.description}</Text>
            </View>

            {/* Rules */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rules</Text>
              <Text style={styles.bodyText}>
                Reach {challenge.targetValue} {challenge.targetUnit} before{' '}
                {challenge.status === 'completed'
                  ? 'the challenge ended.'
                  : 'the challenge ends.'}
              </Text>
              <Text style={styles.bodyText}>
                Progress is tracked automatically when you log workouts and cardio sessions.
              </Text>
            </View>

            {/* Progress section */}
            {isJoined && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Progress</Text>
                <View style={styles.progressCenter}>
                  <CircularProgress
                    progress={progressPct}
                    label={`${myProgress?.progress ?? 0} / ${challenge.targetValue} ${challenge.targetUnit}`}
                  />
                </View>
              </View>
            )}

            {/* Leaderboard header */}
            {participants.length > 0 && (
              <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 8, marginBottom: 4 }]}>
                Leaderboard
              </Text>
            )}
          </>
        }
        renderItem={({ item, index }) => (
          <ParticipantRow
            participant={item}
            index={index}
            targetValue={challenge.targetValue}
            targetUnit={challenge.targetUnit}
            isMe={item.uid === uid}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyParticipants}>
            <Text style={styles.emptyText}>Be the first to join!</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      {/* Join button */}
      {showJoinButton && (
        <View style={styles.joinFooter}>
          <TouchableOpacity
            style={styles.joinButton}
            onPress={handleJoin}
            disabled={joining}
            activeOpacity={0.7}
          >
            {joining ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.joinButtonText}>Join Challenge</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isJoined && challenge.status !== 'completed' && (
        <View style={styles.joinFooter}>
          <View style={styles.joinedBanner}>
            <Ionicons name="checkmark-circle" size={18} color={GREEN} />
            <Text style={styles.joinedBannerText}>You're participating in this challenge</Text>
          </View>
        </View>
      )}

      {isJoined && challenge.status === 'completed' && (() => {
        const myRank = participants.findIndex((p) => p.uid === uid) + 1;
        const challengeCardData: ChallengeCardData = {
          type: 'challenge',
          challengeTitle: challenge.title,
          challengeType: challenge.targetUnit,
          finalResult: `${myProgress?.progress ?? 0} ${challenge.targetUnit}`,
          rank: myRank > 0 ? myRank : participants.length,
          participantCount: challenge.participantCount,
          xpEarned: challenge.xpReward,
        };
        return (
          <View style={styles.joinFooter}>
            <View style={styles.completedBanner}>
              <Ionicons name="trophy" size={18} color={ACCENT} />
              <Text style={styles.completedBannerText}>Challenge complete!</Text>
              <ShareButton data={challengeCardData} color={ACCENT} size={20} />
            </View>
          </View>
        );
      })()}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG,
  },
  errorText: {
    color: TEXT_SECONDARY,
    fontSize: 15,
  },
  listContent: {
    paddingBottom: 16,
  },
  title: {
    color: TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: '800',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  xpPill: {
    backgroundColor: ACCENT_LIGHT,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  xpPillText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '700',
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SURFACE,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  timePillText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  bodyText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
  progressCenter: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 10,
  },
  participantRowMe: {
    backgroundColor: ACCENT + '1A',
  },
  rankText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '700',
    width: 32,
  },
  meText: {
    color: ACCENT,
  },
  participantInfo: {
    flex: 1,
    gap: 4,
  },
  participantName: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '600',
  },
  miniProgressTrack: {
    height: 4,
    backgroundColor: BORDER,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
  participantValue: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    minWidth: 60,
  },
  emptyParticipants: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
  },
  joinFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  joinButton: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  joinedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: GREEN + '18',
    borderRadius: 12,
    paddingVertical: 14,
  },
  joinedBannerText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '600',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: ACCENT + '18',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  completedBannerText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
