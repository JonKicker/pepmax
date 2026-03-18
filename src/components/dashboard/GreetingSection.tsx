/**
 * GreetingSection — greeting text, date, and streak badge.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';
import type { Theme } from '../../constants/theme';
import type { StreakData } from '../../types/dashboard';

type Props = {
  greeting: string;
  colors: Theme['colors'];
  streak: StreakData | null;
};

export function GreetingSection({ greeting, colors, streak }: Props) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.greeting, { color: colors.textPrimary }]}>{greeting}</Text>
        {streak && streak.current > 0 && (
          <View style={[styles.streakBadge, { backgroundColor: Colors.gold + '20' }]}>
            <Text style={styles.streakEmoji}>{'\uD83D\uDD25'}</Text>
            <Text style={[styles.streakText, { color: Colors.gold }]}>
              {streak.current} day{streak.current !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>{dateStr}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 2 },
  greeting: { fontSize: 28, fontWeight: '700', flexShrink: 1 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakEmoji: { fontSize: 14 },
  streakText: { fontSize: 13, fontWeight: '700' },
  dateLabel: { fontSize: 13 },
});
