import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { AchievementDefinition, AchievementDoc } from '../../types/gamification';

// Module accent colors keyed by category
const CATEGORY_COLORS: Record<string, string> = {
  peptides: Colors.peptide,
  gym: Colors.gym,
  nutrition: Colors.nutrition,
  cardio: Colors.cardio,
  crossModule: Colors.gold,
};

export type AchievementProgress = {
  current: number;
  target: number;
};

type Props = {
  definition: AchievementDefinition;
  unlocked?: AchievementDoc;
  /** Progress toward this achievement (locked only) */
  progress?: AchievementProgress;
  onPress: (definition: AchievementDefinition) => void;
};

export function AchievementCard({ definition, unlocked, progress, onPress }: Props) {
  const { colors } = useTheme();
  const accentColor = CATEGORY_COLORS[definition.category] ?? colors.textSecondary;
  const isUnlocked = !!unlocked;

  const iconColor = isUnlocked ? accentColor : colors.border;
  const bgColor = isUnlocked
    ? (colors as any).surface
    : (colors as any).background;

  const unlockDate = unlocked?.unlockedAt?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) ?? null;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: bgColor,
          borderColor: isUnlocked ? accentColor : colors.border,
          borderWidth: isUnlocked ? 1.5 : 1,
        },
      ]}
      onPress={() => onPress(definition)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconWrapper,
          { backgroundColor: isUnlocked ? accentColor + '22' : colors.border + '33' },
        ]}
      >
        <Ionicons
          name={definition.icon as any}
          size={28}
          color={iconColor}
        />
      </View>
      <Text
        style={[
          styles.title,
          { color: isUnlocked ? colors.textPrimary : colors.textSecondary },
        ]}
        numberOfLines={2}
      >
        {definition.title}
      </Text>
      {isUnlocked && unlockDate ? (
        <Text style={[styles.date, { color: accentColor }]}>{unlockDate}</Text>
      ) : progress ? (
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: colors.border + '44' }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, Math.round((progress.current / progress.target) * 100))}%` as any,
                  backgroundColor: accentColor + '88',
                },
              ]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
            {progress.current}/{progress.target}
          </Text>
        </View>
      ) : (
        <Text style={[styles.locked, { color: colors.border }]}>Locked</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 4,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    minHeight: 110,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  date: {
    fontSize: 11,
    fontWeight: '500',
  },
  locked: {
    fontSize: 11,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 2,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});
