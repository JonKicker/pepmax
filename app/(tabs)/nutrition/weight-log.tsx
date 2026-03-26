/**
 * WeightLogScreen — quick daily weight entry with trend chart.
 *
 * Lives under the nutrition tab (not training) because adaptive calorie
 * coaching ties weight data directly to calorie target adjustments.
 * The training/log-measurement screen handles full body composition logs
 * (body fat %, circumferences, photos) — this is for the quick daily weigh-in.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import WeightChart from '../../../src/components/body/WeightChart';
import { useBodyWeight } from '../../../src/hooks/useBodyWeight';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useTheme } from '../../../src/hooks/useTheme';
import { useUnits } from '../../../src/hooks/useUnits';
import { toLocalDateKey } from '../../../src/utils/nutrition';
import { kgToLbs, lbsToKg } from '../../../src/utils/tdee';
import {
  getAdaptiveCoachingData,
  enableAdaptiveCoaching,
} from '../../../src/services/adaptiveCoachingService';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import { Colors } from '../../../src/constants/theme';
import { GlassBackground } from '../../../src/components/GlassBackground';
import type { WeightTrendPoint } from '../../../src/types/adaptiveCoaching';

export default function WeightLogScreen() {
  const { colors } = useTheme();
  const { userProfile, refreshProfile } = useAuth();
  const { isImperial, weightLabel } = useUnits();

  // Computed inside the component so it refreshes if the screen is opened after midnight
  const todayKey = toLocalDateKey();

  const {
    entries,
    allEntries,
    todaysEntry,
    stats,
    timeRange,
    setTimeRange,
    loading,
    logWeight,
    refresh,
  } = useBodyWeight(todayKey);

  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [smoothedTrend, setSmoothedTrend] = useState<WeightTrendPoint[]>([]);
  const [enablingCoaching, setEnablingCoaching] = useState(false);

  const adaptive = userProfile?.adaptiveCoaching;

  // Pre-fill input if there's already a weight logged today
  useEffect(() => {
    if (todaysEntry) {
      const displayed = isImperial
        ? kgToLbs(todaysEntry.weight).toFixed(1)
        : todaysEntry.weight.toFixed(1);
      setInputValue(displayed);
    }
  }, [todaysEntry, isImperial]);

  // Load EMA smoothed data when adaptive coaching is active
  useFocusEffect(
    useCallback(() => {
      if (!adaptive?.enabled) return;
      let cancelled = false;
      (async () => {
        const result = await getAdaptiveCoachingData(30);
        if (!cancelled && result.data) {
          setSmoothedTrend(result.data.weightTrend);
        }
      })();
      return () => { cancelled = true; };
    }, [adaptive?.enabled]),
  );

  async function handleSave() {
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight.');
      return;
    }

    const weightKg = isImperial ? lbsToKg(parsed) : parsed;
    setSaving(true);

    const result = await logWeight({
      weight: weightKg,
      displayUnit: isImperial ? 'lbs' : 'kg',
      date: todayKey,
    });

    setSaving(false);

    if (result.error) {
      Alert.alert('Save Failed', 'Could not save your weight. Please try again.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    analytics.track(AnalyticsEvent.WEIGHT_LOGGED, { source: 'nutrition' });

    // Refresh smoothed trend if adaptive coaching is active
    if (adaptive?.enabled) {
      const coachingData = await getAdaptiveCoachingData(30);
      if (coachingData.data) {
        setSmoothedTrend(coachingData.data.weightTrend);
      }
    }
  }

  async function handleEnableCoaching() {
    setEnablingCoaching(true);
    const result = await enableAdaptiveCoaching(adaptive);
    setEnablingCoaching(false);

    if (result.error) {
      Alert.alert('Error', 'Could not enable adaptive coaching. Please try again.');
      return;
    }

    await refreshProfile();
    analytics.track(AnalyticsEvent.ADAPTIVE_COACHING_ENABLED);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  // Quick stats: today's weight and 7-day change
  const currentDisplayWeight = (() => {
    if (!stats?.current) return null;
    const val = isImperial ? kgToLbs(stats.current) : stats.current;
    return `${val.toFixed(1)} ${weightLabel}`;
  })();

  const weekChange = (() => {
    if (!stats || allEntries.length < 2) return null;
    const recentEntries = allEntries.slice(-7);
    if (recentEntries.length < 2) return null;
    const diffKg = recentEntries[recentEntries.length - 1].weight - recentEntries[0].weight;
    const diff = isImperial ? kgToLbs(diffKg) : diffKg;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)} ${weightLabel} (7d)`;
  })();

  return (
    <GlassBackground>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Opt-in card — shown when adaptive coaching is not yet enabled */}
      {!adaptive?.enabled && (
        <View style={[styles.optInCard, { backgroundColor: colors.surface, borderColor: Colors.nutrition }]}>
          <Ionicons name="analytics-outline" size={22} color={Colors.nutrition} />
          <View style={styles.optInText}>
            <Text style={[styles.optInTitle, { color: colors.textPrimary }]}>
              Enable Adaptive Coaching
            </Text>
            <Text style={[styles.optInSubtitle, { color: colors.textSecondary }]}>
              Log your weight daily and we'll learn your real metabolism — no more formula guessing.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.optInButton, { backgroundColor: Colors.nutrition }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleEnableCoaching(); }}
            disabled={enablingCoaching}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Enable adaptive coaching"
          >
            {enablingCoaching
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.optInButtonText}>Enable</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* Weight input */}
      <View style={[styles.inputCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
          {todaysEntry ? 'Update Today\'s Weight' : 'Today\'s Weight'}
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.weightInput, { color: colors.textPrimary }]}
            value={inputValue}
            onChangeText={setInputValue}
            keyboardType="decimal-pad"
            placeholder="0.0"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
          />
          <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>
            {weightLabel}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: Colors.nutrition, opacity: saving ? 0.7 : 1 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleSave(); }}
          disabled={saving}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={todaysEntry ? 'Update weight' : 'Log weight'}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.saveButtonText}>
                {todaysEntry ? 'Update Weight' : 'Log Weight'}
              </Text>
          }
        </TouchableOpacity>
      </View>

      {/* Quick stats */}
      {(currentDisplayWeight || weekChange) && (
        <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
          {currentDisplayWeight && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {currentDisplayWeight}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Current</Text>
            </View>
          )}
          {weekChange && (
            <View style={styles.statItem}>
              <Text style={[
                styles.statValue,
                { color: weekChange.startsWith('-') ? Colors.nutrition : Colors.error },
              ]}>
                {weekChange}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>7-day change</Text>
            </View>
          )}
        </View>
      )}

      {/* Weight trend chart */}
      {loading ? (
        <ActivityIndicator size="large" color={Colors.nutrition} style={styles.loader} />
      ) : (
        <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Weight Trend</Text>
          {adaptive?.enabled && smoothedTrend.length > 0 && (
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: Colors.light.success }]} />
                <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Logged</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDashed, { borderColor: Colors.light.success }]} />
                <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Smoothed trend</Text>
              </View>
            </View>
          )}
          <WeightChart
            entries={entries}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            goalWeightKg={userProfile?.goalWeight}
            units={userProfile?.units ?? 'imperial'}
            smoothedData={adaptive?.enabled ? smoothedTrend : undefined}
          />
        </View>
      )}
    </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },

  optInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  optInText: { flex: 1 },
  optInTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  optInSubtitle: { fontSize: 12, lineHeight: 16 },
  optInButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  optInButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  inputCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  inputLabel: { fontSize: 14, fontWeight: '500' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  weightInput: {
    fontSize: 56,
    fontWeight: '300',
    textAlign: 'center',
    minWidth: 160,
  },
  unitLabel: { fontSize: 20, fontWeight: '400', marginBottom: 8 },
  saveButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  statsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontWeight: '600' },
  statLabel: { fontSize: 12 },

  chartCard: { borderRadius: 16, padding: 16 },
  chartTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 20, height: 2, borderRadius: 1 },
  legendDashed: { width: 20, height: 0, borderTopWidth: 2, borderStyle: 'dashed' },
  legendLabel: { fontSize: 11 },

  loader: { marginTop: 40 },
});
