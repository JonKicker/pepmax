/**
 * CrewVsCrewCard — crew competition card for Crew vs Crew challenges.
 *
 * Shows:
 * - Challenge title, metric, time remaining
 * - Top 2 crews as VS layout (names + emoji + progress bars)
 * - My crew highlighted with accent border (expandable contributions)
 * - Progress bar colors: 1st=gold, 2nd=silver, 3rd=bronze, rest=default
 *
 * useTheme() for all non-rank colors.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { rankCrewEntries, getPerMemberAverage } from '../../utils/pvpEventUtils';
import type { CrewChallenge, CrewChallengeEntry } from '../../types/pvpEvents';

// ─── Rank color constants ─────────────────────────────────────────────────────
// These are competition-rank semantic colors (podium colors). They do NOT
// map to theme tokens as "gold/silver/bronze" are universally understood
// competition semantics that must remain consistent across all themes.

const RANK_COLORS = {
  first:   '#FFD700',
  second:  '#C0C0C0',
  third:   '#CD7F32',
  default: '#4A4A6A',
} as const;

function getRankColor(rank: number): string {
  if (rank === 1) return RANK_COLORS.first;
  if (rank === 2) return RANK_COLORS.second;
  if (rank === 3) return RANK_COLORS.third;
  return RANK_COLORS.default;
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  challenge: CrewChallenge;
  entries: CrewChallengeEntry[];
  myCrew?: CrewChallengeEntry;
  timeRemaining: string;
};

// ─── Sub-component: Crew Progress Row ─────────────────────────────────────────

type CrewRowProps = {
  entry: CrewChallengeEntry & { rank: number };
  targetValue: number;
  targetUnit: string;
  isHighlighted?: boolean;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  surface: string;
  border: string;
};

function CrewProgressRow({
  entry,
  targetValue,
  targetUnit,
  isHighlighted,
  accentColor,
  textPrimary,
  textSecondary,
  surface,
  border,
}: CrewRowProps) {
  const [expanded, setExpanded] = useState(false);
  const rankColor = getRankColor(entry.rank);
  const progressRatio = targetValue > 0
    ? Math.min(1, entry.totalProgress / targetValue)
    : 0;
  const perMember = getPerMemberAverage(entry.totalProgress, entry.memberCount);

  return (
    <View
      style={[
        styles.crewRow,
        { backgroundColor: surface, borderColor: isHighlighted ? accentColor : border },
        isHighlighted && styles.crewRowHighlighted,
      ]}
    >
      {/* Top row: rank + emoji + name + score */}
      <Pressable
        onPress={isHighlighted ? () => setExpanded((v) => !v) : undefined}
        style={styles.crewRowHeader}
        accessibilityRole={isHighlighted ? 'button' : undefined}
        accessibilityLabel={
          isHighlighted
            ? `${entry.crewName}, rank ${entry.rank}, ${entry.totalProgress} ${targetUnit}. ${expanded ? 'Collapse' : 'Expand'} member contributions`
            : `${entry.crewName}, rank ${entry.rank}, ${entry.totalProgress} ${targetUnit}`
        }
      >
        <Text style={[styles.rankBadgeText, { color: rankColor }]}>
          #{entry.rank}
        </Text>
        <Text style={styles.crewEmoji}>{entry.crewEmoji}</Text>
        <Text style={[styles.crewName, { color: textPrimary }]} numberOfLines={1}>
          {entry.crewName}
        </Text>
        {isHighlighted && (
          <Text style={[styles.youLabel, { color: accentColor }]}>YOU</Text>
        )}
        <Text style={[styles.progressValue, { color: rankColor }]}>
          {Math.round(entry.totalProgress)} {targetUnit}
        </Text>
        {isHighlighted && (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={textSecondary}
          />
        )}
      </Pressable>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: border }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressRatio * 100}%` as `${number}%`,
              backgroundColor: rankColor,
            },
          ]}
        />
      </View>

      {/* Per-member average */}
      <Text style={[styles.perMemberText, { color: textSecondary }]}>
        Avg per member: {perMember.toFixed(1)} {targetUnit}
      </Text>

      {/* Expandable: member contributions (only my crew) */}
      {isHighlighted && expanded && (
        <View style={[styles.contributionsBlock, { borderTopColor: border }]}>
          {Object.entries(entry.memberContributions).map(([uid, value]) => (
            <View key={uid} style={styles.contributionRow}>
              <Text style={[styles.contributionUid, { color: textSecondary }]} numberOfLines={1}>
                {uid}
              </Text>
              <Text style={[styles.contributionValue, { color: textPrimary }]}>
                {Math.round(value)} {targetUnit}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CrewVsCrewCard({ challenge, entries, myCrew, timeRemaining }: Props) {
  const { colors } = useTheme();
  const ranked = rankCrewEntries(entries);

  // VS layout: show top 2 crews side by side if >= 2 crews present
  const top2 = ranked.slice(0, 2);
  const hasVS = top2.length >= 2;

  const accentColor = colors.accent ?? '#6C5CE7';
  const textPrimary = colors.textPrimary;
  const textSecondary = colors.textSecondary;
  const surface = colors.surface;
  const glass = colors.glass?.heavy ?? 'rgba(255,255,255,0.06)';
  const border = colors.glass?.border ?? 'rgba(255,255,255,0.1)';

  return (
    <View
      style={[styles.container, { backgroundColor: surface, borderColor: border }]}
      accessibilityLabel={`Crew challenge: ${challenge.title}`}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.challengeTitle, { color: textPrimary }]} numberOfLines={2}>
            {challenge.title}
          </Text>
          <Text style={[styles.challengeMetric, { color: textSecondary }]}>
            {challenge.metric.replace(/_/g, ' ')}
          </Text>
        </View>
        <View style={[styles.timerPill, { backgroundColor: glass }]}>
          <Ionicons name="time-outline" size={12} color={textSecondary} />
          <Text style={[styles.timerText, { color: textSecondary }]}>
            {timeRemaining}
          </Text>
        </View>
      </View>

      {/* VS layout — top 2 crews */}
      {hasVS && (
        <View style={styles.vsRow}>
          {top2.map((entry, idx) => {
            const rankColor = getRankColor(entry.rank);
            const progressRatio = challenge.targetValue > 0
              ? Math.min(1, entry.totalProgress / challenge.targetValue)
              : 0;
            return (
              <React.Fragment key={entry.crewId}>
                <View
                  style={[styles.vsSide, { backgroundColor: glass }]}
                  accessibilityLabel={`${entry.crewName}, rank ${entry.rank}`}
                >
                  <Text style={styles.vsEmoji}>{entry.crewEmoji}</Text>
                  <Text
                    style={[styles.vsCrewName, { color: textPrimary }]}
                    numberOfLines={1}
                  >
                    {entry.crewName}
                  </Text>
                  <Text style={[styles.vsValue, { color: rankColor }]}>
                    {Math.round(entry.totalProgress)}
                  </Text>
                  <Text style={[styles.vsUnit, { color: textSecondary }]}>
                    {challenge.targetUnit}
                  </Text>
                  <View style={[styles.vsTrack, { backgroundColor: border }]}>
                    <View
                      style={[
                        styles.vsFill,
                        {
                          width: `${progressRatio * 100}%` as `${number}%`,
                          backgroundColor: rankColor,
                        },
                      ]}
                    />
                  </View>
                </View>

                {idx === 0 && (
                  <View style={styles.vsCenter}>
                    <Text style={[styles.vsCenterText, { color: textSecondary }]}>VS</Text>
                  </View>
                )}
              </React.Fragment>
            );
          })}
        </View>
      )}

      {/* Full ranked list */}
      <View style={styles.rankList}>
        {ranked.map((entry) => {
          const isMyCrewEntry = myCrew && entry.crewId === myCrew.crewId;
          return (
            <CrewProgressRow
              key={entry.crewId}
              entry={entry}
              targetValue={challenge.targetValue}
              targetUnit={challenge.targetUnit}
              isHighlighted={!!isMyCrewEntry}
              accentColor={accentColor}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              surface={glass}
              border={border}
            />
          );
        })}
      </View>

      {/* Rewards row */}
      <View style={[styles.rewardsRow, { borderTopColor: border }]}>
        <Ionicons name="trophy-outline" size={14} color={textSecondary} />
        <Text style={[styles.rewardsText, { color: textSecondary }]}>
          Rewards: <Text style={{ color: textPrimary }}>{challenge.xpRewardPerMember} XP</Text>
          {' + '}<Text style={{ color: textPrimary }}>{challenge.rpRewardPerMember} RP</Text>
          {' per member on completion'}
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    gap: 3,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  challengeMetric: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vsSide: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  vsEmoji: {
    fontSize: 24,
  },
  vsCrewName: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  vsValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  vsUnit: {
    fontSize: 11,
    fontWeight: '500',
  },
  vsTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  vsFill: {
    height: '100%',
    borderRadius: 2,
  },
  vsCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
  },
  vsCenterText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  rankList: {
    gap: 8,
  },
  crewRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  crewRowHighlighted: {
    borderWidth: 1.5,
  },
  crewRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    minWidth: 26,
  },
  crewEmoji: {
    fontSize: 18,
  },
  crewName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  youLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  perMemberText: {
    fontSize: 11,
    fontWeight: '400',
  },
  contributionsBlock: {
    borderTopWidth: 1,
    paddingTop: 8,
    gap: 4,
  },
  contributionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contributionUid: {
    fontSize: 11,
    fontWeight: '400',
    flex: 1,
  },
  contributionValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  rewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  rewardsText: {
    fontSize: 12,
    fontWeight: '400',
    flex: 1,
  },
});
