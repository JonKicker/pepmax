import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Animated,
  PanResponder,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { getTodaysWorkouts, deleteWorkout } from '../../../src/services/trainingService';
import { useWorkoutRecovery } from '../../../src/hooks/useWorkoutRecovery';
import { updateSession } from '../../../src/services/workoutSessionService';
import { useEquipmentProfiles } from '../../../src/hooks/useEquipmentProfiles';
import { EquipmentQuickSwitch } from '../../../src/components/training/EquipmentQuickSwitch';
import type { WorkoutLog } from '../../../src/types/training';

// ─── Swipeable card ───────────────────────────────────────────────────────────

const DELETE_WIDTH = 80;

function SwipeableCard({
  workout,
  onDelete,
  colors,
}: {
  workout: WorkoutLog;
  onDelete: (id: string) => void;
  colors: ReturnType<typeof import('../../../src/hooks/useTheme').useTheme>['colors'];
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const close = useCallback(() => {
    isOpen.current = false;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5,
      onPanResponderMove: (_, { dx }) => {
        if (!isOpen.current) {
          if (dx < 0) translateX.setValue(Math.max(dx, -DELETE_WIDTH));
        } else {
          translateX.setValue(Math.min(0, dx - DELETE_WIDTH));
        }
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (!isOpen.current && (dx < -DELETE_WIDTH / 2 || vx < -0.3)) {
          isOpen.current = true;
          Animated.spring(translateX, { toValue: -DELETE_WIDTH, useNativeDriver: true }).start();
        } else {
          isOpen.current = false;
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const exerciseNames = workout.exercises.map((e) => e.name).join(', ');
  const totalSets = workout.exercises.reduce((sum, e) => sum + e.sets, 0);

  return (
    <View style={styles.swipeWrapper}>
      <View style={[styles.deleteBackground, { width: DELETE_WIDTH }]}>
        <TouchableOpacity
          onPress={() => { close(); onDelete(workout.id); }}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={20} color="white" />
          <Text style={styles.deleteBtnLabel}>Delete</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={() => { if (isOpen.current) close(); }}
          activeOpacity={0.85}
        >
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.cardAccent, { backgroundColor: Colors.gym }]} />
            <View style={styles.cardBody}>
              <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
                {exerciseNames}
              </Text>
              <View style={styles.cardBadgeRow}>
                <View style={[styles.badge, { backgroundColor: Colors.gym + '1A' }]}>
                  <Text style={[styles.badgeText, { color: Colors.gym }]}>
                    {totalSets} set{totalSets !== 1 ? 's' : ''}
                  </Text>
                </View>
                {workout.exercises[0]?.weightKg != null && (
                  <View style={[styles.badge, { marginLeft: 6 }]}>
                    <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                      {workout.exercises[0].weightKg} kg
                    </Text>
                  </View>
                )}
              </View>
              {!!workout.notes && (
                <Text style={[styles.cardNotes, { color: colors.textSecondary }]} numberOfLines={1}>
                  {workout.notes}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  colors,
}: {
  colors: ReturnType<typeof import('../../../src/hooks/useTheme').useTheme>['colors'];
}) {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: Colors.gym + '1A' }]}>
        <Ionicons name="barbell-outline" size={52} color={Colors.gym} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No workouts today</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Hit Quick Start to begin a workout.
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TrainingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { activeSession, isChecking: recoveryChecking, dismiss: dismissRecovery, check: checkRecovery } = useWorkoutRecovery();

  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quickSwitchVisible, setQuickSwitchVisible] = useState(false);

  const { profiles, activeProfile, loadProfiles, switchProfile } = useEquipmentProfiles();

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setLoadError(null);
    const result = await getTodaysWorkouts();
    if (result.error) {
      setLoadError("Failed to load today's workouts. Pull down to retry.");
    } else {
      setWorkouts(result.data ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      load();
      checkRecovery();
      loadProfiles();
    }, [checkRecovery, loadProfiles])
  );

  const handleDelete = (id: string) => {
    Alert.alert('Delete workout?', 'This will remove it from today\'s log.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          const result = await deleteWorkout(id);
          if (result.error) {
            Alert.alert('Delete failed', 'Could not delete workout. Please try again.');
            return;
          }
          setWorkouts((prev) => prev.filter((w) => w.id !== id));
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.gym} size="large" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{loadError}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: Colors.gym }]}
          onPress={() => load()}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleResumeWorkout = () => {
    if (activeSession) {
      router.push({
        pathname: '/(tabs)/training/active-session',
        params: { sessionId: activeSession.id },
      });
    }
  };

  const handleDiscardRecovery = () => {
    if (activeSession) {
      Alert.alert('Discard workout?', 'This will permanently discard the unfinished session.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            await updateSession(activeSession.id, { status: 'abandoned' });
            dismissRecovery();
          },
        },
      ]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Recovery banner */}
      {activeSession && (
        <View style={[styles.recoveryBanner, { backgroundColor: Colors.warning + '20', borderColor: Colors.warning + '40' }]}>
          <View style={styles.recoveryContent}>
            <Ionicons name="alert-circle" size={20} color={Colors.warning} />
            <View style={styles.recoveryText}>
              <Text style={[styles.recoveryTitle, { color: colors.textPrimary }]}>
                Unfinished workout
              </Text>
              <Text style={[styles.recoverySubtitle, { color: colors.textSecondary }]}>
                {activeSession.templateName}
              </Text>
            </View>
          </View>
          <View style={styles.recoveryActions}>
            <TouchableOpacity onPress={handleResumeWorkout} style={[styles.recoveryBtn, { backgroundColor: Colors.gym }]}>
              <Text style={styles.recoveryBtnText}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDiscardRecovery} style={styles.recoveryDismiss}>
              <Text style={[styles.recoveryDismissText, { color: colors.textSecondary }]}>Discard</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Equipment profile chip */}
      {activeProfile && (
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQuickSwitchVisible(true); }}
          style={[styles.equipChip, { backgroundColor: Colors.gym + '15', borderColor: Colors.gym + '30' }]}
          activeOpacity={0.7}
        >
          <Ionicons name="barbell-outline" size={14} color={Colors.gym} />
          <Text style={[styles.equipChipText, { color: Colors.gym }]}>
            Equipment: {activeProfile.name}
          </Text>
          <Ionicons name="chevron-down" size={14} color={Colors.gym} />
        </TouchableOpacity>
      )}

      {/* Quick-action buttons */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: Colors.gym + '15', borderColor: Colors.gym + '30' }]}
          onPress={() => router.push('/(tabs)/training/exercises')}
          activeOpacity={0.8}
        >
          <Ionicons name="library-outline" size={18} color={Colors.gym} />
          <Text style={[styles.quickBtnText, { color: Colors.gym }]}>Exercises</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: Colors.gym + '15', borderColor: Colors.gym + '30' }]}
          onPress={() => router.push('/(tabs)/training/templates')}
          activeOpacity={0.8}
        >
          <Ionicons name="clipboard-outline" size={18} color={Colors.gym} />
          <Text style={[styles.quickBtnText, { color: Colors.gym }]}>Templates</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: Colors.gym + '15', borderColor: Colors.gym + '30' }]}
          onPress={() => router.push('/(tabs)/training/history')}
          activeOpacity={0.8}
        >
          <Ionicons name="time-outline" size={18} color={Colors.gym} />
          <Text style={[styles.quickBtnText, { color: Colors.gym }]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: Colors.gym + '15', borderColor: Colors.gym + '30' }]}
          onPress={() => router.push('/(tabs)/training/progress')}
          activeOpacity={0.8}
        >
          <Ionicons name="analytics-outline" size={18} color={Colors.gym} />
          <Text style={[styles.quickBtnText, { color: Colors.gym }]}>Progress</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, workouts.length === 0 && styles.listEmpty]}
        ListEmptyComponent={<EmptyState colors={colors} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={Colors.gym}
          />
        }
        renderItem={({ item }) => (
          <SwipeableCard workout={item} onDelete={handleDelete} colors={colors} />
        )}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: Colors.gym }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push({
            pathname: '/(tabs)/training/active-session',
            params: { mode: 'quick' },
          });
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="flash" size={26} color="white" />
      </TouchableOpacity>

      <EquipmentQuickSwitch
        visible={quickSwitchVisible}
        onClose={() => setQuickSwitchVisible(false)}
        profiles={profiles}
        activeProfileId={activeProfile?.id ?? null}
        onSwitch={switchProfile}
        onManage={() => router.push('/(tabs)/training/equipment-profiles')}
        colors={colors}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 15, textAlign: 'center', marginTop: 16, marginBottom: 24, lineHeight: 22 },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },
  listEmpty: { flex: 1 },

  swipeWrapper: { marginBottom: 10, borderRadius: 12, overflow: 'hidden' },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.error,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: { alignItems: 'center', justifyContent: 'center', padding: 14 },
  deleteBtnLabel: { color: 'white', fontSize: 10, marginTop: 2, fontWeight: '600' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  cardBody: { flex: 1, paddingVertical: 14, paddingHorizontal: 14 },
  cardName: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  cardBadgeRow: { flexDirection: 'row', alignItems: 'center' },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: Colors.gym + '1A',
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardNotes: { fontSize: 12, marginTop: 5 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  equipChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  equipChipText: { fontSize: 13, fontWeight: '700' },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  quickBtn: {
    width: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  quickBtnText: { fontSize: 14, fontWeight: '700' },

  recoveryBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  recoveryContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  recoveryText: { marginLeft: 10, flex: 1 },
  recoveryTitle: { fontSize: 15, fontWeight: '700' },
  recoverySubtitle: { fontSize: 13, marginTop: 2 },
  recoveryActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recoveryBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  recoveryBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  recoveryDismiss: { paddingHorizontal: 12, paddingVertical: 8 },
  recoveryDismissText: { fontSize: 14, fontWeight: '600' },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
});
