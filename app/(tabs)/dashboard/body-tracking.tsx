/**
 * Body Tracking — main hub screen.
 *
 * Sections: current weight display + log button, weight chart with time range tabs,
 * stats row, goal weight card, progress photos grid.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useBodyWeight } from '../../../src/hooks/useBodyWeight';
import { kgToLbs } from '../../../src/utils/tdee';
import { toLocalDateKey } from '../../../src/utils/nutrition';
import { mergeDocument } from '../../../src/services/firebase/firestore';
import { COLLECTIONS } from '../../../src/services/firebase/firestore';
import { useProgressPhotos } from '../../../src/hooks/useProgressPhotos';
import LogWeightModal from '../../../src/components/body/LogWeightModal';
import WeightChart from '../../../src/components/body/WeightChart';
import WeightStatsRow from '../../../src/components/body/WeightStatsRow';
import GoalWeightCard from '../../../src/components/body/GoalWeightCard';
import PhotoGrid from '../../../src/components/body/PhotoGrid';

export default function BodyTrackingScreen() {
  const { colors } = useTheme();
  const { userProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const units = userProfile?.units ?? 'imperial';
  const isImperial = units === 'imperial';
  const unitLabel = isImperial ? 'lbs' : 'kg';

  const {
    entries,
    allEntries,
    todaysEntry,
    stats,
    timeRange,
    setTimeRange,
    loading,
    error,
    logWeight,
    refresh,
  } = useBodyWeight(toLocalDateKey());

  const {
    entries: photoEntries,
    loading: photosLoading,
    deleteEntry: deletePhoto,
  } = useProgressPhotos();

  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Current weight for display (most recent entry or today's)
  const currentWeightKg = todaysEntry?.weight ?? (allEntries.length > 0 ? allEntries[allEntries.length - 1].weight : null);
  const displayWeight = currentWeightKg != null
    ? (isImperial ? (Math.round(kgToLbs(currentWeightKg) * 10) / 10).toFixed(1) : (Math.round(currentWeightKg * 10) / 10).toFixed(1))
    : null;

  const handleLogWeight = useCallback(async (
    weightKg: number,
    displayUnit: 'kg' | 'lbs',
    date: string,
    note?: string,
  ) => {
    setSaving(true);
    const result = await logWeight({ weight: weightKg, displayUnit, date, note });
    setSaving(false);
    setModalVisible(false);

    if (result.error) {
      Alert.alert('Error', 'Failed to save weight entry. Please try again.');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [logWeight]);

  const handleSaveGoal = useCallback(async (goalKg: number) => {
    const result = await mergeDocument(COLLECTIONS.PROFILE, 'data', { goalWeight: goalKg });
    if (result.error) {
      Alert.alert('Error', 'Failed to save goal weight.');
    } else {
      await refreshProfile();
    }
  }, [refreshProfile]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Starting weight for goal progress (first entry overall)
  const startWeightKg = allEntries.length > 0 ? allEntries[0].weight : undefined;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.body} />
      }
    >
      {/* ─── Current Weight Display ─────────────────────────────────── */}
      <View style={styles.weightHero}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.body} />
        ) : displayWeight ? (
          <>
            <Text style={[styles.weightValue, { color: colors.textPrimary }]}>
              {displayWeight}
            </Text>
            <Text style={[styles.weightUnit, { color: colors.textSecondary }]}>
              {unitLabel}
            </Text>
          </>
        ) : (
          <Text style={[styles.noWeight, { color: colors.textSecondary }]}>
            No weight logged yet
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.logButton, { backgroundColor: Colors.body }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.logButtonText}>Log Weight</Text>
      </TouchableOpacity>

      {/* ─── Weight Chart ───────────────────────────────────────────── */}
      <WeightChart
        entries={entries}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        goalWeightKg={userProfile?.goalWeight}
        units={units}
      />

      {/* ─── Stats Row ──────────────────────────────────────────────── */}
      {stats && (
        <WeightStatsRow
          stats={stats}
          goalWeightKg={userProfile?.goalWeight}
          units={units}
        />
      )}

      {/* ─── Goal Weight ────────────────────────────────────────────── */}
      <GoalWeightCard
        goalWeightKg={userProfile?.goalWeight}
        currentWeightKg={currentWeightKg ?? undefined}
        startWeightKg={startWeightKg}
        units={units}
        onSaveGoal={handleSaveGoal}
      />

      {/* ─── Progress Photos ─────────────────────────────────────────── */}
      <View style={[styles.photoSection, { borderColor: colors.border }]}>
        <View style={styles.photoHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Progress Photos
          </Text>
          {photoEntries.length >= 2 && (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/dashboard/photo-comparison')}
              hitSlop={8}
            >
              <Text style={[styles.compareLink, { color: Colors.body }]}>Compare</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.photoButton, { borderColor: Colors.body }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(tabs)/dashboard/progress-camera');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="camera-outline" size={20} color={Colors.body} />
          <Text style={[styles.photoButtonText, { color: Colors.body }]}>
            Take Progress Photos
          </Text>
        </TouchableOpacity>

        <PhotoGrid
          entries={photoEntries}
          units={units}
          loading={photosLoading}
          onEntryPress={(date) => router.push({ pathname: '/(tabs)/dashboard/photo-detail', params: { date, pose: 'front' } })}
          onDelete={(date) => deletePhoto(date)}
        />

        {!photosLoading && photoEntries.length === 0 && (
          <Text style={[styles.photoPlaceholder, { color: colors.textSecondary }]}>
            No progress photos yet. Take your first set to start tracking visually.
          </Text>
        )}
      </View>

      {/* ─── Log Weight Modal ───────────────────────────────────────── */}
      <LogWeightModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleLogWeight}
        lastWeightKg={currentWeightKg ?? undefined}
        units={units}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  weightHero: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  weightValue: {
    fontSize: 56,
    fontWeight: '800',
  },
  weightUnit: {
    fontSize: 20,
    fontWeight: '600',
  },
  noWeight: {
    fontSize: 18,
    fontStyle: 'italic',
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  logButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  photoSection: {
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  compareLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  photoButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  photoPlaceholder: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
});
