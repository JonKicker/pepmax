/**
 * WeeklyLeagueCard — dashboard card showing the user's weekly league status.
 *
 * Shows: bracket name, week countdown, mini leaderboard (top 3 + your position),
 * promotion/relegation zone colour coding, and a "View Full Standings" link.
 *
 * Accepts league data and standings as props for reusability.
 * useReducedMotion() respected — no animations used beyond what the OS permits.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../GlassCard';
import { useTheme } from '../../hooks/useTheme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { WeeklyLeagueDoc, LeagueStanding } from '../../types/pvp';

// ─── Bracket display config ───────────────────────────────────────────────────

const BRACKET_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  diamond:  { label: 'Diamond League',  icon: 'diamond',        color: '#B9F2FF' },
  platinum: { label: 'Platinum League', icon: 'diamond-outline', color: '#E5E4E2' },
  gold:     { label: 'Gold League',     icon: 'shield',          color: '#FFD700' },
  silver:   { label: 'Silver League',   icon: 'shield-half-outline', color: '#C0C0C0' },
  bronze:   { label: 'Bronze League',   icon: 'shield-outline',  color: '#CD7F32' },
};

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  league: WeeklyLeagueDoc | null;
  standings: LeagueStanding[];
  myStanding: LeagueStanding | null;
  timeRemaining: string;
  loading?: boolean;
  onViewFullStandings?: () => void;
};

// ─── Row component ────────────────────────────────────────────────────────────

type RowProps = {
  standing: LeagueStanding;
  isMe: boolean;
};

function StandingRow({ standing, isMe }: RowProps) {
  const { colors } = useTheme();
  const { rank, member, status } = standing;

  let rowTint: string | undefined;
  if (status === 'promote')  rowTint = 'rgba(0, 200, 100, 0.12)';
  if (status === 'relegate') rowTint = 'rgba(255, 60, 60, 0.12)';

  return (
    <View
      style={[
        styles.row,
        rowTint ? { backgroundColor: rowTint } : undefined,
        isMe ? { borderRadius: 8 } : undefined,
      ]}
    >
      {/* Rank */}
      <Text style={[styles.rowRank, { color: colors.textSecondary }]}>
        #{rank}
      </Text>

      {/* Username */}
      <Text
        style={[styles.rowUsername, { color: isMe ? colors.accent : colors.textPrimary }]}
        numberOfLines={1}
      >
        {isMe ? 'You' : member.username}
      </Text>

      {/* Zone badge */}
      {status === 'promote' && (
        <Ionicons name="arrow-up-circle" size={14} color="#00C864" style={styles.zoneBadge} />
      )}
      {status === 'relegate' && (
        <Ionicons name="arrow-down-circle" size={14} color="#FF3C3C" style={styles.zoneBadge} />
      )}

      {/* Weekly delta */}
      <Text
        style={[
          styles.rowDelta,
          { color: member.weeklyDelta >= 0 ? '#00C864' : '#FF3C3C' },
        ]}
      >
        {member.weeklyDelta >= 0 ? '+' : ''}{member.weeklyDelta} RP
      </Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WeeklyLeagueCard({
  league,
  standings,
  myStanding,
  timeRemaining,
  loading = false,
  onViewFullStandings,
}: Props) {
  const { colors } = useTheme();
  // useReducedMotion — no animations in this component, respecting reduced motion preference
  useReducedMotion();

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!league && !loading) {
    return (
      <GlassCard style={styles.card}>
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={32} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No League This Week
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Leagues are assigned every Monday. Keep training to compete!
          </Text>
        </View>
      </GlassCard>
    );
  }

  if (loading || !league) {
    return (
      <GlassCard style={styles.card}>
        <View style={styles.loadingPlaceholder} />
      </GlassCard>
    );
  }

  const bracketConfig = BRACKET_CONFIG[league.bracket] ?? BRACKET_CONFIG.bronze;

  // Build mini leaderboard: top 3 + your position if not in top 3
  const top3 = standings.slice(0, 3);
  const myRank = myStanding?.rank ?? null;
  const showMyRow = myRank !== null && myRank > 3;
  const myFullStanding = myStanding;

  return (
    <GlassCard style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name={bracketConfig.icon as any}
            size={20}
            color={bracketConfig.color}
          />
          <View style={styles.headerText}>
            <Text style={[styles.bracketLabel, { color: bracketConfig.color }]}>
              {bracketConfig.label}
            </Text>
            <Text style={[styles.weekLabel, { color: colors.textSecondary }]}>
              {league.weekKey}
            </Text>
          </View>
        </View>

        {/* Countdown */}
        <View style={styles.countdown}>
          <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
          <Text style={[styles.countdownText, { color: colors.textSecondary }]}>
            {timeRemaining || 'Ended'}
          </Text>
        </View>
      </View>

      {/* Zone legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(0, 200, 100, 0.3)' }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            Top {league.promotionSlots} promote
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(255, 60, 60, 0.3)' }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            Bottom {league.relegationSlots} relegate
          </Text>
        </View>
      </View>

      {/* Mini leaderboard */}
      <View style={styles.leaderboard}>
        {top3.map((standing) => (
          <StandingRow
            key={standing.member.uid}
            standing={standing}
            isMe={standing.member.uid === myFullStanding?.member.uid}
          />
        ))}

        {showMyRow && myFullStanding && (
          <>
            <View style={[styles.separator, { borderTopColor: colors.glass.border }]}>
              <Text style={[styles.separatorDots, { color: colors.textSecondary }]}>
                • • •
              </Text>
            </View>
            <StandingRow standing={myFullStanding} isMe={true} />
          </>
        )}
      </View>

      {/* View full standings */}
      {onViewFullStandings && (
        <TouchableOpacity
          style={[styles.viewAllButton, { borderTopColor: colors.glass.border }]}
          onPress={onViewFullStandings}
          activeOpacity={0.7}
        >
          <Text style={[styles.viewAllText, { color: colors.accent }]}>
            View Full Standings
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.accent} />
        </TouchableOpacity>
      )}
    </GlassCard>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    gap: 1,
  },
  bracketLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  weekLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  leaderboard: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 8,
  },
  rowRank: {
    fontSize: 12,
    fontWeight: '700',
    width: 28,
  },
  rowUsername: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  zoneBadge: {
    marginRight: 2,
  },
  rowDelta: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 52,
    textAlign: 'right',
  },
  separator: {
    borderTopWidth: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  separatorDots: {
    fontSize: 12,
    letterSpacing: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
  },
  loadingPlaceholder: {
    height: 120,
  },
});
