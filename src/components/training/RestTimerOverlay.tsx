/**
 * RestTimerOverlay.tsx
 *
 * Fixed-bottom overlay shown during a rest period between sets.
 * Includes progress bar, time display, and +/- 15s adjustment buttons.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/theme';

// ─── formatTime ───────────────────────────────────────────────────────────────

/**
 * Formats a duration in seconds as M:SS or H:MM:SS.
 * Exported so active-session header can import it rather than duplicating.
 */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── RestTimerOverlay ─────────────────────────────────────────────────────────

export function RestTimerOverlay({
  state,
  onSkip,
  onAdjust,
  colors,
}: {
  state: { isRunning: boolean; remaining: number; total: number; exerciseName: string; progress: number };
  onSkip: () => void;
  onAdjust: (delta: number) => void;
  colors: any;
}) {
  if (!state.isRunning) return null;

  return (
    <View style={[timerStyles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={timerStyles.row}>
        <Text style={[timerStyles.label, { color: colors.textSecondary }]}>
          Rest — {state.exerciseName}
        </Text>
        <Text style={[timerStyles.time, { color: colors.textPrimary }]}>
          {formatTime(state.remaining)}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={[timerStyles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[timerStyles.progressBar, { width: `${state.progress * 100}%`, backgroundColor: Colors.gym }]}
        />
      </View>

      <View style={timerStyles.actions}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onAdjust(-15)} style={timerStyles.adjustBtn}>
          <Text style={[timerStyles.adjustText, { color: colors.textSecondary }]}>-15s</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={onSkip} style={[timerStyles.skipBtn, { backgroundColor: Colors.gym }]}>
          <Text style={[timerStyles.skipText, { color: colors.textPrimary }]}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onAdjust(15)} style={timerStyles.adjustBtn}>
          <Text style={[timerStyles.adjustText, { color: colors.textSecondary }]}>+15s</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const timerStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 13 },
  time: { fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'] },
  progressTrack: { height: 4, borderRadius: 2, marginVertical: 8 },
  progressBar: { height: 4, borderRadius: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  adjustBtn: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 44 },
  adjustText: { fontSize: 14, fontWeight: '600' },
  skipBtn: { paddingHorizontal: 24, paddingVertical: 8, borderRadius: 8, minHeight: 44 },
  skipText: { fontWeight: '700', fontSize: 14 },
});
