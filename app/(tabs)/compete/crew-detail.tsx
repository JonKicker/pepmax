/**
 * Crew detail screen.
 *
 * Route param: crewId (string)
 *
 * Shows:
 * - Crew name / emoji / member count
 * - FlatList of members (username + level + role badge)
 * - Invite code with Copy + Share buttons
 * - Leave button (Alert confirmation)
 *
 * Owner extras:
 * - Remove Member on each row (long-press or swipe — using inline button)
 * - Regenerate Invite Code button
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Share,
  RefreshControl,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import {
  getCrewById,
  leaveCrew,
  removeMember,
  regenerateInviteCode,
} from '../../../src/services/crewService';
import { getCrewLeaderboard } from '../../../src/services/leaderboardService';
import { LeaderboardRow } from '../../../src/components/social/LeaderboardRow';
import { LEADERBOARD_CATEGORIES, getCategoryConfig } from '../../../src/utils/leaderboardCategories';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import type { CrewDoc, CrewMember, LeaderboardCategory, LeaderboardTimeframe, LeaderboardEntry } from '../../../src/types/social';

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  isOwner,
  isMe,
  canRemove,
  onRemove,
  colors,
}: {
  member: CrewMember;
  isOwner: boolean;
  isMe: boolean;
  canRemove: boolean;
  onRemove: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[styles.memberRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={[styles.memberUsername, { color: colors.textPrimary }]}>
            @{member.username || member.uid.slice(0, 8)}
          </Text>
          {isMe && (
            <View style={[styles.meBadge, { backgroundColor: Colors.accent + '22' }]}>
              <Text style={[styles.meBadgeText, { color: Colors.accent }]}>You</Text>
            </View>
          )}
          {member.role === 'owner' && (
            <View style={[styles.ownerBadge, { backgroundColor: '#F59E0B22' }]}>
              <Text style={[styles.ownerBadgeText]}>Owner</Text>
            </View>
          )}
        </View>
        <Text style={[styles.memberSub, { color: colors.textSecondary }]}>
          Lv {member.level}
        </Text>
      </View>
      {canRemove && (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.removeBtn}
        >
          <Ionicons name="person-remove-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CrewDetailScreen() {
  const { crewId } = useLocalSearchParams<{ crewId: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const { currentUser } = useAuth();
  const myUid = currentUser?.uid ?? '';

  const [crew, setCrew] = useState<CrewDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // ── Crew leaderboard state ─────────────────────────────────────────────────
  const lbViewedRef = useRef(false);
  const [lbCategory, setLbCategory] = useState<LeaderboardCategory>('weeklyVolume');
  const [lbTimeframe, setLbTimeframe] = useState<LeaderboardTimeframe>('weekly');
  const [lbEntries, setLbEntries] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);

  const fetchCrew = useCallback(async () => {
    if (!crewId) return;
    setLoading(true);
    const result = await getCrewById(crewId);
    if (!result.error) setCrew(result.data);
    setLoading(false);
  }, [crewId]);

  const fetchLeaderboard = useCallback(async (memberUids: string[]) => {
    if (!memberUids.length) return;
    setLbLoading(true);
    const result = await getCrewLeaderboard(lbCategory, lbTimeframe, memberUids);
    if (!result.error) setLbEntries(result.data ?? []);
    setLbLoading(false);
  }, [lbCategory, lbTimeframe]);

  useEffect(() => {
    fetchCrew();
    analytics.track(AnalyticsEvent.CREW_DETAIL_VIEWED);
  }, [fetchCrew]);

  // Re-fetch leaderboard when crew loads or filters change
  useEffect(() => {
    if (crew?.memberUids?.length) {
      if (!lbViewedRef.current) {
        analytics.track(AnalyticsEvent.CREW_LEADERBOARD_VIEWED, { crewId: crewId ?? '' });
        lbViewedRef.current = true;
      }
      fetchLeaderboard(crew.memberUids);
    }
  }, [crew?.memberUids, fetchLeaderboard, crewId]);

  const isOwner = crew?.createdBy === myUid;

  // ── Copy invite code ───────────────────────────────────────────────────────

  const handleCopy = async () => {
    if (!crew) return;
    await Clipboard.setStringAsync(crew.inviteCode);
    Alert.alert('Copied!', `Invite code ${crew.inviteCode} copied to clipboard.`);
  };

  // ── Share invite code ──────────────────────────────────────────────────────

  const handleShare = async () => {
    if (!crew) return;
    await Share.share({
      message: `Join my crew "${crew.name}" on PepMax! Use invite code: ${crew.inviteCode}`,
    });
    analytics.track(AnalyticsEvent.CREW_INVITE_SHARED);
  };

  // ── Regenerate code ────────────────────────────────────────────────────────

  const handleRegenerate = () => {
    Alert.alert(
      'Regenerate Invite Code',
      'The current code will stop working. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            if (!crewId) return;
            setRegenerating(true);
            const result = await regenerateInviteCode(crewId);
            setRegenerating(false);
            if (result.error) {
              Alert.alert('Error', result.error.message);
            } else {
              await fetchCrew();
            }
          },
        },
      ],
    );
  };

  // ── Leave crew ────────────────────────────────────────────────────────────

  const handleLeave = () => {
    Alert.alert(
      'Leave Crew',
      isOwner
        ? 'You are the owner. Ownership will transfer to the next member. Continue?'
        : `Are you sure you want to leave "${crew?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (!crewId) return;
            setLeaving(true);
            const result = await leaveCrew(crewId);
            setLeaving(false);
            if (result.error) {
              Alert.alert('Error', result.error.message);
            } else {
              analytics.track(AnalyticsEvent.CREW_LEFT);
              router.back();
            }
          },
        },
      ],
    );
  };

  // ── Remove member ─────────────────────────────────────────────────────────

  const handleRemoveMember = (member: CrewMember) => {
    Alert.alert(
      'Remove Member',
      `Remove @${member.username || member.uid.slice(0, 8)} from the crew?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!crewId) return;
            const result = await removeMember(crewId, member.uid);
            if (result.error) {
              Alert.alert('Error', result.error.message);
            } else {
              analytics.track(AnalyticsEvent.CREW_MEMBER_REMOVED);
              await fetchCrew();
            }
          },
        },
      ],
    );
  };

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (!crew) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Crew not found.</Text>
      </View>
    );
  }

  const categoryConfig = getCategoryConfig(lbCategory);
  const TIMEFRAMES: { key: LeaderboardTimeframe; label: string }[] = [
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'allTime', label: 'All-Time' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={fetchCrew}
          tintColor={Colors.accent}
          colors={[Colors.accent]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header card */}
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={styles.emoji}>{crew.avatarEmoji}</Text>
        <View style={styles.headerInfo}>
          <Text style={[styles.crewName, { color: colors.textPrimary }]}>{crew.name}</Text>
          <Text style={[styles.memberCount, { color: colors.textSecondary }]}>
            {crew.memberUids.length} / 10 members
          </Text>
        </View>
      </View>

      {/* Invite code */}
      <View style={[styles.codeSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Invite Code</Text>
        <View style={styles.codeRow}>
          <Text style={[styles.code, { color: colors.textPrimary }]}>{crew.inviteCode}</Text>
          <TouchableOpacity onPress={handleCopy} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="copy-outline" size={20} color={Colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="share-outline" size={20} color={Colors.accent} />
          </TouchableOpacity>
        </View>
        {isOwner && (
          <TouchableOpacity
            style={[styles.regenBtn, { borderColor: colors.border }]}
            onPress={handleRegenerate}
            disabled={regenerating}
          >
            {regenerating ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Text style={[styles.regenText, { color: colors.textSecondary }]}>Regenerate Code</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Member list */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>MEMBERS</Text>
      {crew.members.map((item) => (
        <MemberRow
          key={item.uid}
          member={item}
          isOwner={item.role === 'owner'}
          isMe={item.uid === myUid}
          canRemove={isOwner && item.uid !== myUid}
          onRemove={() => handleRemoveMember(item)}
          colors={colors}
        />
      ))}

      {/* ── Crew Leaderboard ─────────────────────────────────────────────── */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary, marginTop: 16 }]}>
        CREW LEADERBOARD
      </Text>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryPills}
      >
        {LEADERBOARD_CATEGORIES.map((cat) => {
          const active = cat.category === lbCategory;
          return (
            <TouchableOpacity
              key={cat.category}
              style={[
                styles.pill,
                {
                  backgroundColor: active ? '#7C3AED' : colors.surface,
                  borderColor: active ? '#7C3AED' : colors.border,
                },
              ]}
              onPress={() => setLbCategory(cat.category)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={cat.icon as any}
                size={13}
                color={active ? '#fff' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.pillText,
                  { color: active ? '#fff' : colors.textSecondary },
                ]}
              >
                {cat.shortLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Timeframe toggle */}
      <View style={[styles.timeframeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {TIMEFRAMES.map(({ key, label }) => {
          const active = key === lbTimeframe;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.timeframeBtn,
                active && { backgroundColor: '#7C3AED' },
              ]}
              onPress={() => setLbTimeframe(key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.timeframeBtnText, { color: active ? '#fff' : colors.textSecondary }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Leaderboard entries */}
      {lbLoading ? (
        <ActivityIndicator color={Colors.accent} style={styles.lbLoader} />
      ) : lbEntries.length === 0 ? (
        <View style={[styles.lbEmpty, { borderColor: colors.border }]}>
          <Ionicons name="podium-outline" size={28} color={colors.textSecondary} />
          <Text style={[styles.lbEmptyText, { color: colors.textSecondary }]}>
            No {categoryConfig.label} data yet this period.
          </Text>
        </View>
      ) : (
        lbEntries.map((entry) => (
          <LeaderboardRow
            key={entry.uid}
            entry={entry}
            formattedValue={categoryConfig.formatValue(entry.value ?? 0)}
            isCurrentUser={entry.uid === myUid}
          />
        ))
      )}

      {/* Leave button */}
      <View style={styles.leaveSection}>
        <TouchableOpacity
          style={[styles.leaveBtn, { borderColor: '#EF4444' }]}
          onPress={handleLeave}
          disabled={leaving}
          activeOpacity={0.7}
        >
          {leaving ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Text style={styles.leaveBtnText}>Leave Crew</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  emoji: { fontSize: 36 },
  headerInfo: { flex: 1 },
  crewName: { fontSize: 20, fontWeight: '700' },
  memberCount: { fontSize: 13, marginTop: 2 },
  codeSection: {
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  codeLabel: { fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  code: { fontSize: 22, fontWeight: '800', letterSpacing: 3, flex: 1 },
  regenBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
  },
  regenText: { fontSize: 13 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    paddingBottom: 6,
  },
  categoryPills: {
    gap: 6,
    paddingBottom: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeframeRow: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  timeframeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeframeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  lbLoader: {
    paddingVertical: 20,
  },
  lbEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  lbEmptyText: {
    flex: 1,
    fontSize: 13,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 6,
  },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberUsername: { fontSize: 14, fontWeight: '600' },
  memberSub: { fontSize: 12, marginTop: 1 },
  meBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  meBadgeText: { fontSize: 11, fontWeight: '700' },
  ownerBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  ownerBadgeText: { fontSize: 11, fontWeight: '700', color: '#F59E0B' },
  removeBtn: { padding: 4 },
  leaveSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 8,
  },
  leaveBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '600' },
});
