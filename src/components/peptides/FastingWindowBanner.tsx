/**
 * FastingWindowBanner — informational banner shown at dose-log time.
 *
 * Displays fasting guidance for the selected peptide when a fasting window
 * is configured. Purely presentational — no async calls.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import type { PeptideFastingWindow } from '../../types/peptideFasting';
import { buildPeptideFastingGuidanceText } from '../../utils/peptideFasting';
import type { Theme } from '../../constants/theme';

type Props = {
  fastingWindow: PeptideFastingWindow;
  colors: Theme['colors'];
  /** Brief explanation of why fasting matters for this category (from getPeptideFastingReasoning) */
  reasoning?: string | null;
};

export function FastingWindowBanner({ fastingWindow, colors, reasoning }: Props) {
  const { preInjectionMinutes: pre, postInjectionMinutes: post } = fastingWindow;
  // Nothing to show when both values are zero
  if (pre === 0 && post === 0) return null;

  const guidanceText = buildPeptideFastingGuidanceText(fastingWindow);

  return (
    <View style={[styles.banner, { backgroundColor: Colors.peptide + '1A', borderColor: Colors.peptide + '4D' }]}>
      <Ionicons name="time-outline" size={16} color={Colors.peptide} style={styles.icon} />
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: Colors.peptide }]}>Fasting Guidance</Text>
        <Text style={[styles.body, { color: colors.textPrimary }]}>{guidanceText}</Text>
        {reasoning ? (
          <Text style={[styles.reasoning, { color: colors.textSecondary }]}>
            {reasoning}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    gap: 10,
  },
  icon: { marginTop: 1 },
  textContainer: { flex: 1 },
  title: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, marginBottom: 3 },
  body: { fontSize: 13, lineHeight: 19 },
  reasoning: { fontSize: 12, lineHeight: 17, marginTop: 6, fontStyle: 'italic' },
});
