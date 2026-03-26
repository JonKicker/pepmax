import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { XPProgressBar } from '../gamification/XPProgressBar';
import type { LevelInfo } from '../../types/gamification';

type Props = {
  level: number;
  levelInfo: LevelInfo;
  totalXP: number;
  todayXP: number;
  latestAchievementTitle?: string;
  loading: boolean;
  onPress: () => void;
};

export function GamificationCard({
  level,
  levelInfo,
  totalXP,
  todayXP,
  latestAchievementTitle,
  loading,
  onPress,
}: Props) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.gold + '22' }]}>
            <Ionicons name="trophy" size={20} color={Colors.gold} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Progress</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </View>

      {/* Level badge + progress */}
      <View style={styles.body}>
        <View style={[styles.levelBadge, { borderColor: Colors.gold }]}>
          <Text style={styles.levelNumber}>{level}</Text>
          <Text style={[styles.levelLabel, { color: Colors.gold }]}>LVL</Text>
        </View>
        <View style={styles.progressSection}>
          <XPProgressBar
            level={level}
            currentLevelXP={levelInfo.currentLevelXP}
            xpToNextLevel={levelInfo.xpToNextLevel}
            progress={levelInfo.progress}
            compact
          />
          <Text style={[styles.todayXP, { color: colors.textSecondary }]}>
            Today: {todayXP}/{200} XP
          </Text>
        </View>
      </View>

      {/* Latest achievement */}
      {!!latestAchievementTitle && (
        <View style={[styles.achievementRow, { borderTopColor: colors.border }]}>
          <Ionicons name="star" size={13} color={Colors.gold} />
          <Text style={[styles.achievementText, { color: colors.textSecondary }]} numberOfLines={1}>
            {latestAchievementTitle}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  levelBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold + '12',
  },
  levelNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.gold,
    lineHeight: 36,
  },
  levelLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  progressSection: {
    flex: 1,
    gap: 6,
  },
  todayXP: {
    fontSize: 12,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  achievementText: {
    fontSize: 12,
    flex: 1,
  },
});
