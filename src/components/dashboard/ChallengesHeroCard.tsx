/**
 * ChallengesHeroCard — dashboard entry point for Challenges & Duels.
 *
 * Presentational only — no hooks.
 * Shows active challenge count, active duel count, and pending duel invites.
 * Pending badge is highlighted when > 0.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Constants ────────────────────────────────────────────────────────────────

const BG = '#1E1E2E';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#A0A0B8';
const BORDER = '#2E2E42';
const ACCENT = '#6C5CE7';
const ORANGE = '#FF7675';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  activeChallengeCount: number;
  activeDuelCount: number;
  pendingDuelCount: number;
  onPress: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ChallengesHeroCard({
  activeChallengeCount,
  activeDuelCount,
  pendingDuelCount,
  onPress,
}: Props): React.ReactElement {
  const hasPending = pendingDuelCount > 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="trophy-outline" size={20} color={ACCENT} />
        </View>
        <Text style={styles.title}>Challenges & Duels</Text>
        <Ionicons name="chevron-forward" size={18} color={TEXT_SECONDARY} />
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        {/* Active challenges */}
        <View style={styles.statRow}>
          <Ionicons name="flame-outline" size={16} color="#FDCB6E" />
          <Text style={styles.statValue}>{activeChallengeCount}</Text>
          <Text style={styles.statLabel}>active challenge{activeChallengeCount !== 1 ? 's' : ''}</Text>
        </View>

        {/* Active duels */}
        <View style={styles.statRow}>
          <Ionicons name="flash-outline" size={16} color={ACCENT} />
          <Text style={styles.statValue}>{activeDuelCount}</Text>
          <Text style={styles.statLabel}>active duel{activeDuelCount !== 1 ? 's' : ''}</Text>
        </View>

        {/* Pending duel invites */}
        <View style={styles.statRow}>
          <Ionicons
            name="notifications-outline"
            size={16}
            color={hasPending ? ORANGE : TEXT_SECONDARY}
          />
          <Text style={[styles.statValue, hasPending && styles.statValueHighlighted]}>
            {pendingDuelCount}
          </Text>
          <Text style={[styles.statLabel, hasPending && styles.statLabelHighlighted]}>
            pending invite{pendingDuelCount !== 1 ? 's' : ''}
          </Text>
          {hasPending && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingDuelCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: BG,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ACCENT + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
  statsSection: {
    gap: 10,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
    minWidth: 20,
  },
  statValueHighlighted: {
    color: ORANGE,
  },
  statLabel: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    flex: 1,
  },
  statLabelHighlighted: {
    color: ORANGE,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: ORANGE,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
