/**
 * SegmentMatchCard — shown on session summary when segments are matched.
 *
 * Lists each matched segment with name, time, and a PR badge if applicable.
 * Tapping a row navigates to that segment's detail screen.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import type { SegmentMatch } from '../../types/segments';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  matches: SegmentMatch[];
  onViewSegment: (segmentId: string) => void;
};

export default function SegmentMatchCard({ matches, onViewSegment }: Props) {
  const { colors } = useTheme();

  if (matches.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.titleRow}>
        <Ionicons name="flag" size={16} color={Colors.cardio} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Segments Matched</Text>
      </View>

      {matches.map((match) => (
        <TouchableOpacity
          key={match.segment.id}
          style={[styles.row, { borderTopColor: colors.border }]}
          onPress={() => onViewSegment(match.segment.id)}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.segmentName, { color: colors.textPrimary }]} numberOfLines={1}>
              {match.segment.name}
            </Text>
            <Text style={[styles.segmentTime, { color: Colors.cardio }]}>
              {formatDuration(match.durationSeconds)}
            </Text>
          </View>

          <View style={styles.rightCol}>
            {match.isPR && (
              <View style={[styles.prBadge, { backgroundColor: Colors.gold + '28' }]}>
                <Text style={[styles.prBadgeText, { color: Colors.gold }]}>PR!</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  title: { fontSize: 14, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  segmentName: { fontSize: 14, fontWeight: '600' },
  segmentTime: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  rightCol: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  prBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
});
