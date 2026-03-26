/**
 * GreetingSection — greeting text and date.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Theme } from '../../constants/theme';

type Props = {
  greeting: string;
  colors: Theme['colors'];
};

export function GreetingSection({ greeting, colors }: Props) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <Text style={[styles.greeting, { color: colors.textPrimary }]}>{greeting}</Text>
      <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>{dateStr}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  greeting: { fontSize: 28, fontWeight: '700', marginTop: 8, marginBottom: 2 },
  dateLabel: { fontSize: 13 },
});
