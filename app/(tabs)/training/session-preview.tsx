import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { getTemplateById } from '../../../src/services/templateService';
import { generateBareMinimum } from '../../../src/utils/bareMinimum';
import { setPendingBareMinimum } from '../../../src/utils/sessionPreviewStore';
import type { WorkoutTemplate } from '../../../src/types/template';
import PremiumGate from '../../../src/components/premium/PremiumGate';
import ProBadge from '../../../src/components/premium/ProBadge';

type Mode = 'full' | 'bareMinimum';
const TIME_CAPS = [15, 20, 30, 45] as const;

export default function SessionPreviewScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { templateId } = useLocalSearchParams<{ templateId: string }>();

  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('full');
  const [timeCap, setTimeCap] = useState<number>(30);

  useEffect(() => {
    (async () => {
      if (!templateId) { setLoading(false); return; }
      const result = await getTemplateById(templateId);
      if (result.data) setTemplate(result.data);
      setLoading(false);
    })();
  }, [templateId]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.gym} size="large" />
      </View>
    );
  }

  if (!template) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Template not found.</Text>
      </View>
    );
  }

  const bareResult = generateBareMinimum(template.exercises, timeCap);
  const originalSets = template.exercises.reduce((s, e) => s + e.targetSets, 0);
  const originalMinutes = template.estimatedDuration ?? Math.round(originalSets * 3);

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (mode === 'bareMinimum') {
      setPendingBareMinimum({
        templateId,
        exercises: bareResult.exercises,
        timeCap,
        originalTotalSets: originalSets,
      });
    }

    router.push({
      pathname: '/(tabs)/training/active-session',
      params: { templateId },
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <Text style={[styles.templateName, { color: colors.textPrimary }]}>{template.name}</Text>
      <Text style={[styles.templateMeta, { color: colors.textSecondary }]}>
        {template.exercises.length} exercises · ~{originalMinutes} min
      </Text>

      {/* Mode toggle */}
      <View style={[styles.modeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => { setMode('full'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[
            styles.modeBtn,
            mode === 'full' && { backgroundColor: colors.success },
          ]}
        >
          <Ionicons
            name="barbell-outline"
            size={16}
            color={mode === 'full' ? 'white' : colors.textSecondary}
          />
          <Text style={[styles.modeBtnText, { color: mode === 'full' ? 'white' : colors.textSecondary }]}>
            Full Workout
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { setMode('bareMinimum'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[
            styles.modeBtn,
            mode === 'bareMinimum' && { backgroundColor: Colors.warning },
          ]}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={mode === 'bareMinimum' ? 'white' : colors.textSecondary}
          />
          <Text style={[styles.modeBtnText, { color: mode === 'bareMinimum' ? 'white' : colors.textSecondary }]}>
            Bare Minimum
          </Text>
          <ProBadge style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      {mode === 'bareMinimum' && (
        <PremiumGate mode="blur">
        <>
          {/* Time cap pills */}
          <View style={styles.timeCapRow}>
            {TIME_CAPS.map((cap) => (
              <TouchableOpacity
                key={cap}
                onPress={() => { setTimeCap(cap); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[
                  styles.timeCapChip,
                  {
                    backgroundColor: timeCap === cap ? Colors.warning : colors.surface,
                    borderColor: timeCap === cap ? Colors.warning : colors.border,
                  },
                ]}
              >
                <Text style={[styles.timeCapText, { color: timeCap === cap ? 'white' : colors.textSecondary }]}>
                  {cap} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Comparison view */}
          <View style={styles.comparison}>
            <View style={styles.comparisonCol}>
              <Text style={[styles.comparisonHeader, { color: colors.textSecondary }]}>Full Plan</Text>
              {template.exercises.map((ex) => {
                const isRemoved = bareResult.removedExercises.some((r) => r.exerciseId === ex.exerciseId);
                return (
                  <View key={ex.exerciseId} style={styles.exerciseRow}>
                    <Text
                      style={[
                        styles.exerciseText,
                        { color: isRemoved ? colors.textSecondary : colors.textPrimary },
                        isRemoved && styles.strikethrough,
                      ]}
                      numberOfLines={2}
                    >
                      {ex.exerciseName}
                    </Text>
                    <Text style={[styles.setsText, { color: isRemoved ? colors.textSecondary : colors.textSecondary }]}>
                      {ex.targetSets}×
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.comparisonCol}>
              <Text style={[styles.comparisonHeader, { color: Colors.warning }]}>Today's Version</Text>
              {bareResult.exercises.map((ex) => (
                <View key={ex.exerciseId} style={styles.exerciseRow}>
                  <Text style={[styles.exerciseText, { color: colors.textPrimary }]} numberOfLines={2}>
                    {ex.exerciseName}
                  </Text>
                  <Text style={[styles.setsText, { color: Colors.warning }]}>
                    {ex.targetSets}×
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Summary bar */}
          <View style={[styles.summaryBar, { backgroundColor: Colors.warning + '15', borderColor: Colors.warning + '40' }]}>
            <Text style={[styles.summaryText, { color: Colors.warning }]}>
              {bareResult.exercises.length} exercises · ~{bareResult.estimatedMinutes} min · {bareResult.volumePercentage}% volume
            </Text>
          </View>
        </>
        </PremiumGate>
      )}

      {mode === 'full' && (
        <View style={[styles.exerciseList, { borderColor: colors.border }]}>
          {template.exercises.map((ex, i) => (
            <View
              key={ex.exerciseId}
              style={[
                styles.fullExerciseRow,
                { borderBottomColor: colors.border },
                i === template.exercises.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <Text style={[styles.exerciseText, { color: colors.textPrimary }]} numberOfLines={1}>
                {ex.exerciseName}
              </Text>
              <Text style={[styles.setsText, { color: colors.textSecondary }]}>
                {ex.targetSets} × {ex.targetReps}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Start button */}
      <TouchableOpacity
        onPress={handleStart}
        style={[
          styles.startBtn,
          { backgroundColor: mode === 'bareMinimum' ? Colors.warning : Colors.gym },
        ]}
        activeOpacity={0.85}
      >
        <Ionicons name="play" size={20} color="white" />
        <Text style={styles.startBtnText}>
          {mode === 'bareMinimum' ? 'Start Adapted Workout' : 'Start Full Workout'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 15, textAlign: 'center' },

  templateName: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  templateMeta: { fontSize: 14, marginBottom: 20 },

  modeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modeBtnText: { fontSize: 14, fontWeight: '700' },

  timeCapRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  timeCapChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  timeCapText: { fontSize: 13, fontWeight: '600' },

  comparison: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  comparisonCol: { flex: 1 },
  comparisonHeader: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  divider: { width: 1, alignSelf: 'stretch' },

  exerciseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 4 },
  exerciseText: { fontSize: 13, fontWeight: '500', flex: 1 },
  setsText: { fontSize: 13, fontWeight: '700' },
  strikethrough: { textDecorationLine: 'line-through', opacity: 0.5 },

  summaryBar: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryText: { fontSize: 14, fontWeight: '700' },

  exerciseList: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  fullExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  startBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
