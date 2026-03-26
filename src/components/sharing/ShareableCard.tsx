/**
 * ShareableCard — off-screen card rendered at 360x640 and captured at 3x
 * for a 1080x1920 Instagram-Story-sized PNG.
 *
 * Dark background (#1E1E2E), colored accent bar per card type.
 * No personal health data (no calories, weight, peptide info).
 *
 * Usage: wrap with ViewShot ref, capture via cardGenerator.captureCard().
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ShareCardData } from '../../types/shareCard';

// ─── Canvas dimensions (rendered size — 3x capture = 1080x1920) ──────────────

const CARD_W = 360;
const CARD_H = 640;

// ─── Accent colours per card type ────────────────────────────────────────────

const ACCENT_BY_TYPE: Record<string, string> = {
  workout: '#4ECDC4',
  pr: '#FFD700',
  challenge: '#6C5CE7',
  levelUp: '#FFD700',
  achievement: '#FFD700', // category-specific overrides applied inside component
};

const CATEGORY_COLORS: Record<string, string> = {
  peptides: '#2E86C1',
  gym: '#8E44AD',
  nutrition: '#27AE60',
  cardio: '#E74C3C',
  crossModule: '#FFD700',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatVolume(volume: number): string {
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}k`;
  return String(Math.round(volume));
}

// ─── Card content sub-components ─────────────────────────────────────────────

function WorkoutContent({ data }: { data: Extract<ShareCardData, { type: 'workout' }> }) {
  return (
    <>
      <Ionicons name="barbell-outline" size={64} color="#4ECDC4" style={styles.heroIcon} />
      <Text style={styles.cardType}>WORKOUT COMPLETE</Text>
      <Text style={styles.mainTitle} numberOfLines={2}>{data.templateName}</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatDuration(data.duration)}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatVolume(data.totalVolume)}</Text>
          <Text style={styles.statLabel}>Volume {data.volumeUnit}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{data.exerciseCount}</Text>
          <Text style={styles.statLabel}>Exercises</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{data.setCount}</Text>
          <Text style={styles.statLabel}>Sets</Text>
        </View>
      </View>
      {data.prCount > 0 && (
        <View style={[styles.badge, { backgroundColor: '#FFD700' + '22', borderColor: '#FFD700' + '55' }]}>
          <Ionicons name="trophy" size={14} color="#FFD700" />
          <Text style={[styles.badgeText, { color: '#FFD700' }]}>
            {data.prCount} new PR{data.prCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </>
  );
}

function PRContent({ data }: { data: Extract<ShareCardData, { type: 'pr' }> }) {
  return (
    <>
      <Ionicons name="trophy" size={72} color="#FFD700" style={styles.heroIcon} />
      <Text style={styles.cardType}>PERSONAL RECORD</Text>
      <Text style={styles.mainTitle} numberOfLines={2}>{data.exerciseName}</Text>
      <Text style={styles.prNewValue}>{data.newValue}</Text>
      {data.oldValue && (
        <Text style={styles.prOldValue}>Previous: {data.oldValue}</Text>
      )}
    </>
  );
}

function ChallengeContent({ data }: { data: Extract<ShareCardData, { type: 'challenge' }> }) {
  return (
    <>
      <Ionicons name="flash" size={64} color="#6C5CE7" style={styles.heroIcon} />
      <Text style={styles.cardType}>CHALLENGE COMPLETE</Text>
      <Text style={styles.mainTitle} numberOfLines={2}>{data.challengeTitle}</Text>
      <Text style={styles.challengeResult}>{data.finalResult}</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>#{data.rank}</Text>
          <Text style={styles.statLabel}>Rank</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{data.participantCount.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Participants</Text>
        </View>
      </View>
      <View style={[styles.badge, { backgroundColor: '#6C5CE7' + '22', borderColor: '#6C5CE7' + '55' }]}>
        <Ionicons name="star" size={14} color="#6C5CE7" />
        <Text style={[styles.badgeText, { color: '#6C5CE7' }]}>+{data.xpEarned} XP Earned</Text>
      </View>
    </>
  );
}

function LevelUpContent({ data }: { data: Extract<ShareCardData, { type: 'levelUp' }> }) {
  return (
    <>
      <View style={[styles.rankIconCircle, { borderColor: data.rankColor }]}>
        <Ionicons name={data.rankIcon as any} size={52} color={data.rankColor} />
      </View>
      <Text style={styles.cardType}>LEVEL UP</Text>
      <Text style={[styles.levelNumber, { color: '#FFD700' }]}>{data.newLevel}</Text>
      <View style={[styles.badge, { backgroundColor: data.rankColor + '22', borderColor: data.rankColor + '55' }]}>
        <Text style={[styles.badgeText, { color: data.rankColor }]}>{data.rankTier} Rank</Text>
      </View>
      <Text style={styles.xpTotal}>{data.totalXP.toLocaleString()} Total XP</Text>
    </>
  );
}

function AchievementContent({ data }: { data: Extract<ShareCardData, { type: 'achievement' }> }) {
  const accentColor = CATEGORY_COLORS[data.category] ?? '#FFD700';
  return (
    <>
      <View style={[styles.achievementIconCircle, { borderColor: accentColor, backgroundColor: accentColor + '18' }]}>
        <Ionicons name={data.icon as any} size={56} color={accentColor} />
      </View>
      <Text style={styles.cardType}>ACHIEVEMENT UNLOCKED</Text>
      <Text style={styles.mainTitle} numberOfLines={2}>{data.title}</Text>
      <Text style={styles.achievementDesc} numberOfLines={3}>{data.description}</Text>
      <View style={[styles.badge, { backgroundColor: accentColor + '22', borderColor: accentColor + '55' }]}>
        <Text style={[styles.badgeText, { color: accentColor }]}>
          {data.category.charAt(0).toUpperCase() + data.category.slice(1)}
        </Text>
      </View>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  data: ShareCardData;
};

export function ShareableCard({ data }: Props) {
  const accentColor =
    data.type === 'achievement'
      ? CATEGORY_COLORS[data.category] ?? '#FFD700'
      : ACCENT_BY_TYPE[data.type] ?? '#4ECDC4';

  return (
    <View style={styles.canvas}>
      {/* Top accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      {/* Card content */}
      <View style={styles.contentArea}>
        {data.type === 'workout' && <WorkoutContent data={data} />}
        {data.type === 'pr' && <PRContent data={data} />}
        {data.type === 'challenge' && <ChallengeContent data={data} />}
        {data.type === 'levelUp' && <LevelUpContent data={data} />}
        {data.type === 'achievement' && <AchievementContent data={data} />}
      </View>

      {/* Branding footer */}
      <View style={styles.footer}>
        <View style={[styles.footerLine, { backgroundColor: accentColor + '40' }]} />
        <Text style={styles.brandText}>pepmax.app</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  canvas: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: '#1E1E2E',
    borderRadius: 0, // Full bleed for story format
    overflow: 'hidden',
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  contentArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  footer: {
    paddingBottom: 32,
    alignItems: 'center',
    gap: 10,
  },
  footerLine: {
    height: 1,
    width: 120,
  },
  brandText: {
    color: '#606080',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
  },

  // Hero icon
  heroIcon: {
    marginBottom: 4,
  },

  // Text hierarchy
  cardType: {
    color: '#606080',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 34,
  },

  // Stats grid (workout)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 80,
    backgroundColor: '#2A2A40',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: '#606080',
    fontSize: 11,
    marginTop: 2,
  },

  // Badge pill
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // PR
  prNewValue: {
    color: '#FFD700',
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
  },
  prOldValue: {
    color: '#606080',
    fontSize: 15,
    textAlign: 'center',
  },

  // Challenge
  challengeResult: {
    color: '#A0A0C0',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
  },

  // Level up
  rankIconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  levelNumber: {
    fontSize: 80,
    fontWeight: '900',
    lineHeight: 88,
  },
  xpTotal: {
    color: '#606080',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 4,
  },

  // Achievement
  achievementIconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  achievementDesc: {
    color: '#A0A0C0',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
