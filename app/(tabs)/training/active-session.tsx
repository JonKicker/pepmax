import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useWorkoutSession } from '../../../src/hooks/useWorkoutSession';
import { useRestTimer } from '../../../src/hooks/useRestTimer';
import { useExercisePicker } from '../../../src/contexts/ExercisePickerContext';
import { useEquipmentProfiles } from '../../../src/hooks/useEquipmentProfiles';
import { getLastWeight } from '../../../src/utils/weightMemory';
import { getLastSessionWithExercise } from '../../../src/services/workoutSessionService';
import { exerciseLibrary } from '../../../src/data/exerciseLibrary';
import { isExerciseAvailable, findAlternatives } from '../../../src/utils/equipmentMapping';
import PRCelebration from '../../../src/components/PRCelebration';
import { ExerciseSwapModal } from '../../../src/components/training/EquipmentQuickSwitch';
import { GlassBackground } from '../../../src/components/GlassBackground';
import { BarCalcSection } from '../../../src/components/training/BarCalcSection';
import { ExerciseSection } from '../../../src/components/training/ExerciseSection';
import { RestTimerOverlay, formatTime } from '../../../src/components/training/RestTimerOverlay';
import { SupersetGroup } from '../../../src/components/training/SupersetGroup';
import {
  groupExercisesBySuperset,
  shouldRestAfterSet,
  getNextSupersetExerciseName,
} from '../../../src/utils/supersetNavigation';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import { useGymSettings } from '../../../src/hooks/useGymSettings';
import type { Exercise } from '../../../src/types/exercise';
import type { BarType } from '../../../src/types/warmUp';
import type { SessionExercise } from '../../../src/types/workout';
import type { EquipmentProfile } from '../../../src/types/equipmentProfile';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BAR_TYPES: ReadonlySet<BarType> = new Set<BarType>(['Barbell', 'EZ Bar', 'Smith Machine']);

/** Returns the BarType for bar-based equipment, or null for everything else. */
function getBarType(equipment: string): BarType | null {
  return BAR_TYPES.has(equipment as BarType) ? (equipment as BarType) : null;
}

// ─── Exercise card renderer ───────────────────────────────────────────────────

interface ExerciseCardCtx {
  activeProfile: EquipmentProfile | null;
  previousBests: Record<string, string>;
  handleCompleteSet: any;
  addSet: any;
  removeSet: any;
  handleSwapPress: (idx: number) => void;
  colors: any;
  weightUnit: 'lbs' | 'kg';
  gymSettings: { showWarmUp: boolean; showPlateCalc: boolean };
  toggleWarmUp: () => void;
  togglePlateCalc: () => void;
}

function renderExerciseCard(
  exercise: SessionExercise,
  originalIndex: number,
  keyPrefix: string,
  ctx: ExerciseCardCtx,
) {
  const libExercise = exerciseLibrary.find((e) => e.id === exercise.exerciseId);
  const needsSwap = !!ctx.activeProfile && !!libExercise &&
    !isExerciseAvailable(libExercise, ctx.activeProfile.equipment);
  const barType = getBarType(libExercise?.equipment ?? '');
  const firstSetWeight = exercise.sets[0]?.weight ?? 0;
  return (
    <View key={`${keyPrefix}-${originalIndex}`}>
      <ExerciseSection
        exercise={exercise}
        exerciseIndex={originalIndex}
        previousBest={ctx.previousBests[exercise.exerciseId]}
        onCompleteSet={ctx.handleCompleteSet}
        onAddSet={ctx.addSet}
        onRemoveSet={ctx.removeSet}
        onSwapPress={ctx.handleSwapPress}
        needsSwap={needsSwap}
        colors={ctx.colors}
        weightUnit={ctx.weightUnit}
      />
      {barType !== null && (
        <BarCalcSection
          barType={barType}
          firstSetWeight={firstSetWeight}
          weightUnit={ctx.weightUnit}
          gymSettings={ctx.gymSettings}
          toggleWarmUp={ctx.toggleWarmUp}
          togglePlateCalc={ctx.togglePlateCalc}
          colors={ctx.colors}
        />
      )}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ActiveSessionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ sessionId?: string; templateId?: string; mode?: string }>();
  const picker = useExercisePicker();

  const workout = useWorkoutSession();
  const restTimer = useRestTimer();
  const { activeProfile, loadProfiles } = useEquipmentProfiles();
  const { settings: gymSettings, toggleWarmUp, togglePlateCalc } = useGymSettings();

  const [previousBests, setPreviousBests] = useState<Record<string, string>>({});
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [prCelebration, setPrCelebration] = useState<{ visible: boolean; details: string[] }>({
    visible: false,
    details: [],
  });
  const [swapModal, setSwapModal] = useState<{ visible: boolean; exerciseIndex: number } | null>(null);
  const [nextExerciseHint, setNextExerciseHint] = useState<string | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  // ─── Initialize session ──────────────────────────────────────────────────

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (params.sessionId) {
      workout.resumeSession(params.sessionId);
    } else {
      workout.startSession(params.templateId ?? null);
    }
  }, []);

  // ─── Reload equipment profile on focus ───────────────────────────────────
  useFocusEffect(useCallback(() => { loadProfiles(); }, [loadProfiles]));

  // ─── Fetch previous bests when exercises change ──────────────────────────

  useEffect(() => {
    if (!workout.session) return;
    const fetchBests = async () => {
      const bests: Record<string, string> = {};
      for (const ex of workout.session!.exercises) {
        if (bests[ex.exerciseId]) continue;
        const result = await getLastSessionWithExercise(ex.exerciseId);
        if (result.data) {
          const completedSets = result.data.sets.filter((s) => s.completed);
          if (completedSets.length > 0) {
            const maxSet = completedSets.reduce((best, s) =>
              s.weight > best.weight ? s : best
            );
            bests[ex.exerciseId] = `${completedSets.length} x ${maxSet.reps} @ ${maxSet.weight} ${maxSet.weightUnit}`;
          }
        }
      }
      setPreviousBests(bests);
    };
    fetchBests();
  }, [workout.session?.exercises.length]);

  // ─── Prefill weights from memory ─────────────────────────────────────────

  useEffect(() => {
    if (!workout.session) return;
    const prefill = async () => {
      for (let ei = 0; ei < workout.session!.exercises.length; ei++) {
        const ex = workout.session!.exercises[ei];
        const lastWeight = await getLastWeight(ex.exerciseId);
        if (lastWeight && ex.sets.every((s) => s.weight === 0 && !s.completed)) {
          setWeightUnit(lastWeight.unit);
        }
      }
    };
    prefill();
  }, [workout.session?.exercises.length]);

  // ─── Back prevention ─────────────────────────────────────────────────────

  useEffect(() => {
    return navigation.addListener('beforeRemove', (e: any) => {
      if (!workout.session || workout.session.status !== 'active') return;
      e.preventDefault();
      Alert.alert('Active workout', 'You have an active workout. What would you like to do?', [
        { text: 'Keep Going', style: 'cancel' },
        { text: 'Save & Finish', onPress: async () => { await workout.finishWorkout('', null); navigation.dispatch(e.data.action); } },
        { text: 'Discard', style: 'destructive', onPress: async () => { await workout.abandonWorkout(); navigation.dispatch(e.data.action); } },
      ]);
    });
  }, [navigation, workout.session]);

  // ─── Next exercise hint helper ────────────────────────────────────────────

  const clearHint = useCallback(() => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setNextExerciseHint(null);
  }, []);

  const showHint = useCallback((name: string) => {
    clearHint();
    setNextExerciseHint(name);
    hintTimerRef.current = setTimeout(() => setNextExerciseHint(null), 3000);
  }, [clearHint]);

  useEffect(() => () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current); }, []);

  // ─── Set completion handler ──────────────────────────────────────────────

  const handleCompleteSet = useCallback(
    async (
      exerciseIndex: number,
      setIndex: number,
      data: { weight: number; weightUnit: 'lbs' | 'kg'; reps: number; rpe: number | null },
    ) => {
      const result = await workout.completeSet(exerciseIndex, setIndex, data);
      if (!result) return;

      const { prResult, isLastSet, exerciseName } = result;

      if (prResult?.isAnyPR) {
        setPrCelebration({ visible: true, details: prResult.details });
      }

      // Auto-add new empty set row if this was the last set
      if (isLastSet) {
        workout.addSet(exerciseIndex);
      }

      // Clear hint on set completion
      clearHint();

      // Superset-aware rest
      const exercises = workout.session!.exercises;
      const shouldRest = shouldRestAfterSet(exercises, exerciseIndex, setIndex);

      if (shouldRest) {
        const restSecs = exercises[exerciseIndex]?.restSeconds ?? 90;
        restTimer.start(restSecs, exerciseName);

        // Fire analytics if this was a superset round completion
        const exercise = exercises[exerciseIndex];
        if (exercise?.supersetGroup != null) {
          analytics.track(AnalyticsEvent.SUPERSET_ROUND_COMPLETED, {
            superset_group: exercise.supersetGroup,
            exercise_name: exerciseName,
            set_index: setIndex,
          });

          // Fire CIRCUIT_COMPLETED when all rounds across all group members are done.
          const grp = exercises.filter((ex) => ex.supersetGroup === exercise.supersetGroup);
          const maxRounds = Math.max(...grp.map((ex) => ex.sets.length));
          if (setIndex + 1 >= maxRounds && grp.every((ex) => ex.sets.every((s) => s.completed))) {
            analytics.track(AnalyticsEvent.CIRCUIT_COMPLETED, { superset_group: exercise.supersetGroup, total_rounds: maxRounds, exercise_count: grp.length });
          }
        }
      } else {
        // Show hint for next exercise in superset
        const nextName = getNextSupersetExerciseName(exercises, exerciseIndex);
        if (nextName) showHint(nextName);
      }
    },
    [workout, restTimer, clearHint, showHint],
  );

  // ─── Add exercise via picker ─────────────────────────────────────────────

  const handleAddExercise = useCallback(() => {
    const existingIds = new Set(workout.session?.exercises.map((e) => e.exerciseId) ?? []);
    picker.setPickerCallback((exercise: Exercise) => { workout.addExercise(exercise); }, existingIds);
    router.push({ pathname: '/(tabs)/training/exercises', params: { mode: 'picker' } });
  }, [workout, picker, router]);

  // ─── Equipment swap ──────────────────────────────────────────────────────

  const handleSwapPress = useCallback((exerciseIndex: number) => {
    setSwapModal({ visible: true, exerciseIndex });
  }, []);

  const handleSwapConfirm = useCallback((newExerciseId: string, _newExerciseName: string) => {
    if (!swapModal) return;
    const newExercise = exerciseLibrary.find((e) => e.id === newExerciseId);
    if (!newExercise) return;
    workout.swapExercise(swapModal.exerciseIndex, newExercise);
    setSwapModal(null);
  }, [swapModal, workout]);

  // ─── Finish ──────────────────────────────────────────────────────────────

  const handleFinish = useCallback(() => {
    if (!workout.session) return;
    const done = workout.session.exercises.flatMap((e) => e.sets.filter((s) => s.completed));
    if (done.length === 0) { Alert.alert('No sets completed', 'Complete at least one set before finishing.'); return; }
    router.push({ pathname: '/(tabs)/training/session-summary', params: { sessionId: workout.session.id, elapsed: String(workout.elapsedSeconds) } });
  }, [workout.session, workout.elapsedSeconds, router]);

  // ─── Loading state ───────────────────────────────────────────────────────

  if (workout.isLoading || !workout.session) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.gym} size="large" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {workout.error ?? 'Starting workout...'}
        </Text>
      </View>
    );
  }

  // ─── Grouped exercises ───────────────────────────────────────────────────

  const groups = groupExercisesBySuperset(workout.session.exercises);
  const cardCtx: ExerciseCardCtx = {
    activeProfile, previousBests, handleCompleteSet,
    addSet: workout.addSet, removeSet: workout.removeSet, handleSwapPress,
    colors, weightUnit, gymSettings, toggleWarmUp, togglePlateCalc,
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <GlassBackground>
    <View style={styles.container}>
      {/* PR celebration overlay */}
      <PRCelebration
        visible={prCelebration.visible}
        details={prCelebration.details}
        onDismiss={() => setPrCelebration({ visible: false, details: [] })}
      />

      {/* Custom header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {workout.session.templateName}
          </Text>
          <Text style={[styles.headerTimer, { color: Colors.gym }]}>
            {formatTime(workout.elapsedSeconds)}
          </Text>
        </View>
        <TouchableOpacity onPress={handleFinish} style={[styles.finishBtn, { backgroundColor: Colors.gym }]}>
          <Text style={styles.finishBtnText}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Next exercise hint banner */}
      {nextExerciseHint && (
        <View style={[styles.hintBanner, { backgroundColor: Colors.warning + '20', borderColor: Colors.warning + '40' }]}>
          <Ionicons name="arrow-forward-circle-outline" size={16} color={Colors.warning} />
          <Text style={[styles.hintText, { color: Colors.warning }]}>
            Next: {nextExerciseHint}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            restTimer.state.isRunning && { paddingBottom: 140 },
          ]}
        >
          {groups.map((group, groupIdx) => {
            if (group.groupNumber === null) {
              return group.exercises.map(({ exercise, originalIndex }) =>
                renderExerciseCard(exercise, originalIndex, 'solo', cardCtx),
              );
            }
            return (
              <SupersetGroup key={`group-${groupIdx}`} groupNumber={group.groupNumber} colors={colors}>
                {group.exercises.map(({ exercise, originalIndex }) =>
                  renderExerciseCard(exercise, originalIndex, 'grouped', cardCtx),
                )}
              </SupersetGroup>
            );
          })}

          {/* Add exercise button */}
          <TouchableOpacity
            onPress={handleAddExercise}
            style={[styles.addExerciseBtn, { borderColor: Colors.gym }]}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.gym} />
            <Text style={[styles.addExerciseText, { color: Colors.gym }]}>Add Exercise</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Rest timer overlay */}
      <RestTimerOverlay
        state={restTimer.state}
        onSkip={restTimer.skip}
        onAdjust={restTimer.adjustTime}
        colors={colors}
      />

      {/* Equipment swap modal */}
      {(() => {
        if (!swapModal) return null;
        const ex = workout.session?.exercises[swapModal.exerciseIndex];
        if (!ex) return null;
        const libEx = exerciseLibrary.find((e) => e.id === ex.exerciseId);
        const alts = libEx && activeProfile
          ? findAlternatives(libEx, exerciseLibrary, activeProfile.equipment).map((a) => ({
              id: a.id, name: a.name, equipment: a.equipment, primaryMuscles: a.primaryMuscles,
            }))
          : [];
        return (
          <ExerciseSwapModal
            visible={swapModal.visible}
            onClose={() => setSwapModal(null)}
            exerciseName={ex.exerciseName}
            missingEquipment={libEx?.equipment ?? ''}
            alternatives={alts}
            onSwap={handleSwapConfirm}
            colors={colors}
          />
        );
      })()}
    </View>
    </GlassBackground>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { fontSize: 15, marginTop: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerLeft: { flex: 1, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerTimer: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'], marginTop: 2 },
  finishBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, minHeight: 44 },
  finishBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

  hintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  hintText: { fontSize: 13, fontWeight: '600' },

  scrollContent: { paddingTop: 16, paddingBottom: 40 },

  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 8,
  },
  addExerciseText: { fontSize: 15, fontWeight: '700' },
});
