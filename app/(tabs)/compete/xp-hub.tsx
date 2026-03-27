import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useXP } from '../../../src/hooks/useXP';
import { useXPProgress } from '../../../src/hooks/useXPProgress';
import { XPProgressBar } from '../../../src/components/gamification/XPProgressBar';
import { XPGrowthChart } from '../../../src/components/gamification/XPGrowthChart';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import { DAILY_XP_CAP } from '../../../src/utils/xpEngine';

// Human-readable labels for XP sources
const SOURCE_LABELS: Record<string, string> = {
  log_dose: 'Injection logged',
  complete_workout: 'Workout completed',
  complete_workout_bare: 'Bare minimum workout',
  log_all_meals: 'All meals logged',
  macro_targets_hit: 'Macro targets hit',
  complete_cardio: 'Cardio session',
  personal_record: 'Personal record',
  streak_milestone: '7-day streak',
  recovery_checkin: 'Morning check-in',
  achievement_bonus: 'Achievement unlocked',
};

const MODULE_COLORS: Record<string, string> = {
  peptides: Colors.peptide,
  gym: Colors.gym,
  nutrition: Colors.nutrition,
  cardio: Colors.cardio,
  recovery: '#9B59B6',
  system: Colors.gold,
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function XPHubScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { level, totalXP, levelInfo, todayXP, recentLog, loading } = useXP();
  const xpProgress = useXPProgress('3M');

  useEffect(() => {
    analytics.track(AnalyticsEvent.XP_HUB_VIEWED);
  }, []);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
    >
      {/* Level badge */}
      <View style={styles.badgeSection}>
        <View style={[styles.bigBadge, { borderColor: Colors.gold }]}>
          <Text style={styles.bigLevel}>{level}</Text>
          <Text style={[styles.bigLevelLabel, { color: Colors.gold }]}>LEVEL</Text>
        </View>
      </View>

      {/* XP progress */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <XPProgressBar
          level={level}
          currentLevelXP={levelInfo.currentLevelXP}
          xpToNextLevel={levelInfo.xpToNextLevel}
          progress={levelInfo.progress}
          totalXP={totalXP}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.dailyRow}>
          <Text style={[styles.dailyLabel, { color: colors.textSecondary }]}>Today's XP</Text>
          <Text style={[styles.dailyValue, { color: colors.textPrimary }]}>
            {todayXP}
            <Text style={{ color: colors.textSecondary }}>/{DAILY_XP_CAP}</Text>
          </Text>
        </View>
        {todayXP >= DAILY_XP_CAP && (
          <Text style={[styles.capNote, { color: Colors.warning }]}>
            Daily cap reached — PRs and streaks still count!
          </Text>
        )}
      </View>

      {/* Trophy Case link */}
      <TouchableOpacity
        style={[styles.trophyLink, { backgroundColor: Colors.gold + '18', borderColor: Colors.gold + '44' }]}
        onPress={() => router.push('/(tabs)/compete/trophy-case')}
        activeOpacity={0.7}
      >
        <Ionicons name="trophy-outline" size={20} color={Colors.gold} />
        <Text style={[styles.trophyLinkText, { color: Colors.gold }]}>View Trophy Case</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.gold} />
      </TouchableOpacity>

      {/* XP Growth Chart */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>XP Growth</Text>
      <XPGrowthChart
        data={xpProgress.cumulativeData}
        timeRange={xpProgress.timeRange}
        onTimeRangeChange={xpProgress.setTimeRange}
        colors={colors}
      />

      {/* Recent earnings */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Earnings</Text>

      {loading ? (
        <ActivityIndicator color={Colors.gold} style={{ marginTop: 24 }} />
      ) : recentLog.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="star-outline" size={32} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Log a dose, complete a workout, or track a meal to earn your first XP!
          </Text>
        </View>
      ) : (
        <View style={[styles.logCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {recentLog.map((entry, i) => {
            const moduleColor = MODULE_COLORS[entry.module] ?? colors.textSecondary;
            const label = SOURCE_LABELS[entry.source] ?? entry.source;
            const entryDate = entry.createdAt?.toDate?.() ?? new Date();
            return (
              <View
                key={entry.id}
                style={[
                  styles.logRow,
                  i < recentLog.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
              >
                <View style={[styles.moduleDot, { backgroundColor: moduleColor }]} />
                <View style={styles.logRowBody}>
                  <Text style={[styles.logLabel, { color: colors.textPrimary }]}>{label}</Text>
                  <Text style={[styles.logTime, { color: colors.textSecondary }]}>
                    {formatRelativeTime(entryDate)}
                  </Text>
                </View>
                <Text style={[styles.logAmount, { color: Colors.gold }]}>+{entry.amount}</Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40, gap: 14 },

  badgeSection: { alignItems: 'center', paddingVertical: 16 },
  bigBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold + '14',
  },
  bigLevel: { fontSize: 52, fontWeight: '900', color: Colors.gold, lineHeight: 56 },
  bigLevelLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 2 },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  divider: { height: 1 },
  dailyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dailyLabel: { fontSize: 14 },
  dailyValue: { fontSize: 16, fontWeight: '700' },
  capNote: { fontSize: 12, textAlign: 'center' },

  trophyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  trophyLinkText: { flex: 1, fontSize: 15, fontWeight: '600' },

  sectionTitle: { fontSize: 17, fontWeight: '700', marginTop: 20, marginBottom: 8 },

  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  logCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  moduleDot: { width: 8, height: 8, borderRadius: 4 },
  logRowBody: { flex: 1 },
  logLabel: { fontSize: 14, fontWeight: '500' },
  logTime: { fontSize: 12, marginTop: 1 },
  logAmount: { fontSize: 16, fontWeight: '700' },
});
