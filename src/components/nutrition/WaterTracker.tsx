/**
 * WaterTracker — inline hydration quick-log for the nutrition screen.
 *
 * Features:
 *  - Animated progress bar (0 → goal)
 *  - 8oz / 16oz preset buttons + custom oz input
 *  - Undo last entry button
 *  - Goal display with oz remaining
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import type { Theme } from '../../constants/theme';
import { useWater } from '../../hooks/useWater';
import { MAX_SINGLE_LOG_OZ } from '../../types/water';

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  colors: Theme['colors'];
};

// ─── Quick-log preset buttons ─────────────────────────────────────────────────

const PRESETS = [8, 16] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function WaterTracker({ colors }: Props): React.ReactElement {
  const water = useWater();
  const [customOz, setCustomOz] = useState('');
  const [logging, setLogging] = useState(false);

  // Animated progress bar
  const progressValue = useSharedValue(0);

  useEffect(() => {
    progressValue.value = withTiming(water.progress, {
      duration: 700,
      easing: Easing.out(Easing.quad),
    });
  }, [water.progress]); // eslint-disable-line react-hooks/exhaustive-deps

  const barStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  const ozRemaining = Math.max(0, water.goalOz - water.totalOz);
  const barColor = water.goalReached ? Colors.teal : Colors.accent;

  const handleLog = async (oz: number) => {
    if (logging) return;
    setLogging(true);
    const result = await water.logWater(oz);
    setLogging(false);
    if (result?.error) {
      Alert.alert('Could not log water', result.error.message);
    }
  };

  const handleCustomLog = async () => {
    const parsed = parseFloat(customOz);
    if (isNaN(parsed) || parsed <= 0 || parsed > MAX_SINGLE_LOG_OZ) {
      Alert.alert('Invalid amount', `Enter between 1 and ${MAX_SINGLE_LOG_OZ} oz`);
      return;
    }
    setCustomOz('');
    await handleLog(Math.round(parsed));
  };

  const handleUndo = async () => {
    if (water.entries.length === 0) return;
    const result = await water.undoLast();
    if (result?.error) {
      Alert.alert('Cannot undo', result.error.message);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.glass.subtle, borderColor: colors.glass.border }]}
      accessibilityRole="none"
      accessible={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="water-outline" size={16} color={barColor} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Hydration</Text>
        </View>
        <Text
          style={[styles.ozText, { color: colors.textSecondary }]}
          accessibilityLabel={`${Math.round(water.totalOz)} of ${water.goalOz} ounces`}
        >
          {Math.round(water.totalOz)} / {water.goalOz} oz
        </Text>
      </View>

      {/* ── Progress bar ── */}
      <View style={[styles.track, { backgroundColor: barColor + '22' }]}>
        <Reanimated.View
          style={[styles.fill, barStyle, { backgroundColor: barColor }]}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: water.goalOz, now: water.totalOz }}
        />
      </View>

      {/* ── Goal status text ── */}
      {water.goalReached ? (
        <Text style={[styles.goalText, { color: barColor }]}>
          Goal reached! Great work
        </Text>
      ) : (
        <Text style={[styles.goalText, { color: colors.textSecondary }]}>
          {Math.round(ozRemaining)} oz to go
        </Text>
      )}

      {/* ── Quick-log buttons ── */}
      {water.loading ? (
        <ActivityIndicator size="small" color={barColor} style={styles.loader} />
      ) : (
        <View style={styles.buttonRow}>
          {PRESETS.map((oz) => (
            <TouchableOpacity
              key={oz}
              style={[styles.presetBtn, { backgroundColor: barColor + '18', borderColor: barColor + '44' }]}
              onPress={() => handleLog(oz)}
              disabled={logging}
              accessibilityRole="button"
              accessibilityLabel={`Log ${oz} ounces`}
            >
              <Text style={[styles.presetBtnText, { color: barColor }]}>+{oz} oz</Text>
            </TouchableOpacity>
          ))}

          {/* Custom input */}
          <View style={[styles.customInputWrap, { borderColor: colors.border }]}>
            <TextInput
              style={[styles.customInput, { color: colors.textPrimary }]}
              placeholder="oz"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={customOz}
              onChangeText={setCustomOz}
              maxLength={3}
              returnKeyType="done"
              onSubmitEditing={handleCustomLog}
              accessibilityLabel="Custom ounces input"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.addBtn,
              { backgroundColor: barColor, opacity: customOz.length > 0 && !logging ? 1 : 0.4 },
            ]}
            onPress={handleCustomLog}
            disabled={customOz.length === 0 || logging}
            accessibilityRole="button"
            accessibilityLabel="Log custom amount"
          >
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Undo ── */}
      {water.entries.length > 0 && !water.loading && (
        <TouchableOpacity
          style={styles.undoRow}
          onPress={handleUndo}
          disabled={logging}
          accessibilityRole="button"
          accessibilityLabel="Undo last water log"
        >
          <Ionicons name="arrow-undo-outline" size={13} color={colors.textSecondary} />
          <Text style={[styles.undoText, { color: colors.textSecondary }]}>
            Undo last ({water.entries[water.entries.length - 1].oz} oz)
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  ozText: {
    fontSize: 13,
    fontWeight: '500',
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  goalText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loader: {
    marginVertical: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  presetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  presetBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  customInputWrap: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 56,
    alignItems: 'center',
  },
  customInput: {
    fontSize: 13,
    fontWeight: '500',
    minWidth: 32,
    textAlign: 'center',
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  undoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  undoText: {
    fontSize: 12,
  },
});
