/**
 * MealTips — compact tip display rendered below a meal's food list.
 *
 * Shows 1-2 actionable tips when the meal score has weak components.
 * Hidden when there are no tips or the score is excellent.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import type { Theme } from '../../constants/theme';

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  tips: string[];
  score: number;
  colors: Theme['colors'];
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MealTips({ tips, score, colors }: Props): React.ReactElement | null {
  // No tips to show, or meal is pristine (empty, score = 0 with no entries)
  if (tips.length === 0) return null;

  // When score is great and tip is just positive reinforcement, use a lighter style
  const isPositive = score >= 80;
  const iconName = isPositive ? 'checkmark-circle-outline' : 'bulb-outline';
  const iconColor = isPositive ? '#34C759' : Colors.warning;
  const borderColor = isPositive ? '#34C75930' : Colors.warning + '30';
  const bgColor = isPositive ? '#34C75910' : Colors.warning + '10';

  return (
    <View
      style={[styles.container, { backgroundColor: bgColor, borderColor }]}
      accessibilityRole="text"
      accessibilityLabel={`Meal tips: ${tips.join(' ')}`}
    >
      <Ionicons name={iconName} size={14} color={iconColor} style={styles.icon} />
      <View style={styles.tipList}>
        {tips.map((tip, index) => (
          <Text
            key={index}
            style={[styles.tipText, { color: colors.textSecondary }]}
          >
            {tip}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginTop: 6,
    marginBottom: 4,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  icon: {
    marginTop: 1,
    flexShrink: 0,
  },
  tipList: {
    flex: 1,
    gap: 3,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 17,
  },
});
