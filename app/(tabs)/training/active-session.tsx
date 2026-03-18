import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
import type { SessionExercise, SessionSet } from '../../../src/types/workout';
import type { Exercise } from '../../../src/types/exercise';
import type { PRDetectionResult } from '../../../src/types/personalRecord';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── RPE selector ────────────────────────────────────────────────────────────

function RPESelector({
  value,
  onChange,
  colors,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  colors: any;
}) {
  return (
    <View style={rpeStyles.container}>
      {[6, 7, 8, 9, 10].map((n) => (
        <TouchableOpacity
          key={n}
          onPress={() => onChange(value === n ? null : n)}
          style={[
            rpeStyles.chip,
            { borderColor: value === n ? Colors.gym : colors.border },
            value === n && { backgroundColor: Colors.gym + '20' },
          ]}
        >
          <Text style={[rpeStyles.chipText, { color: value === n ? Colors.gym : colors.textSecondary }]}>
            {n}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const rpeStyles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 4, marginTop: 4 },
  chip: { width: 30, height: 26, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 12, fontWeight: '600' },
});

// ─── Swipeable set row ───────────────────────────────────────────────────────

const DELETE_THRESHOLD = 60;

function SetRow({
  set,
  exerciseIndex,
  setIndex,
  onComplete,
  onDelete,
  colors,
  weightUnit,
}: {
  set: SessionSet;
  exerciseIndex: number;
  setIndex: number;
  onComplete: (ei: number, si: number, data: { weight: number; weightUnit: 'lbs' | 'kg'; reps: number; rpe: number | null }) => void;
  onDelete: (ei: number, si: number) => void;
  colors: any;
  weightUnit: 'lbs' | 'kg';
}) {
  const [weight, setWeight] = useState(set.weight > 0 ? String(set.weight) : '');
  const [reps, setReps] = useState(set.reps > 0 ? String(set.reps) : '');
  const [rpe, setRpe] = useState<number | null>(set.rpe);

  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5,
      onPanResponderMove: (_, { dx }) => {
        if (dx < 0) translateX.setValue(Math.max(dx, -DELETE_THRESHOLD - 20));
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx < -DELETE_THRESHOLD / 2 || vx < -0.5) {
          onDelete(exerciseIndex, setIndex);
        }
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const handleComplete = () => {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps, 10) || 0;
    if (r === 0) {
      Alert.alert('Enter reps', 'Please enter the number of reps before completing the set.');
      return;
    }
    onComplete(exerciseIndex, setIndex, {
      weight: w,
      weightUnit,
      reps: r,
      rpe,
    });
  };

  return (
    <View style={setRowStyles.wrapper}>
      <View style={[setRowStyles.deleteHint, { backgroundColor: Colors.error }]}>
        <Ionicons name="trash-outline" size={16} color="white" />
      </View>
      <Animated.View
        style={[{ transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            setRowStyles.row,
            {
              backgroundColor: set.isPersonalRecord
                ? Colors.gold + '15'
                : set.completed
                  ? Colors.gym + '10'
                  : colors.surface,
              borderColor: set.isPersonalRecord ? Colors.gold : colors.border,
            },
          ]}
        >
          <Text style={[setRowStyles.setNum, { color: colors.textSecondary }]}>
            {set.setNumber}
          </Text>

          <TextInput
            style={[setRowStyles.input, { color: colors.textPrimary, borderColor: colors.border }]}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            placeholder={weightUnit}
            placeholderTextColor={colors.textSecondary + '80'}
            editable={!set.completed}
          />

          <Text style={[setRowStyles.times, { color: colors.textSecondary }]}>x</Text>

          <TextInput
            style={[setRowStyles.input, { color: colors.textPrimary, borderColor: colors.border }]}
            value={reps}
            onChangeText={setReps}
            keyboardType="numeric"
            placeholder="reps"
            placeholderTextColor={colors.textSecondary + '80'}
            editable={!set.completed}
          />

          {!set.completed ? (
            <TouchableOpacity onPress={handleComplete} style={[setRowStyles.checkBtn, { backgroundColor: Colors.gym }]}>
              <Ionicons name="checkmark" size={18} color="white" />
            </TouchableOpacity>
          ) : (
            <View style={[setRowStyles.checkBtn, { backgroundColor: Colors.gym + '40' }]}>
              <Ionicons name="checkmark" size={18} color={Colors.gym} />
            </View>
          )}

          {set.isPersonalRecord && (
            <View style={setRowStyles.prBadge}>
              <Ionicons name="trophy" size={10} color="#333" />
              <Text style={setRowStyles.prText}>PR</Text>
            </View>
          )}
        </View>

        {!set.completed && (
          <RPESelector value={rpe} onChange={setRpe} colors={colors} />
        )}
      </Animated.View>
    </View>
  );
}

const setRowStyles = StyleSheet.create({
  wrapper: { marginBottom: 6, overflow: 'hidden' },
  deleteHint: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: 60,
    alignItems: 'center', justifyContent: 'center', borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  setNum: { width: 20, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  times: { fontSize: 14, fontWeight: '600' },
  checkBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.gold,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  prText: { fontSize: 9, fontWeight: '800', color: '#333' },
});

// ─── Exercise section ────────────────────────────────────────────────────────

function ExerciseSection({
  exercise,
  exerciseIndex,
  templateTarget,
  previousBest,
  onCompleteSet,
  onAddSet,
  onRemoveSet,
  onSwapPress,
  needsSwap,
  colors,
  weightUnit,
}: {
  exercise: SessionExercise;
  exerciseIndex: number;
  templateTarget?: string;
  previousBest?: string;
  onCompleteSet: (ei: number, si: number, data: any) => void;
  onAddSet: (ei: number) => void;
  onRemoveSet: (ei: number, si: number) => void;
  onSwapPress?: (exerciseIndex: number) => void;
  needsSwap?: boolean;
  colors: any;
  weightUnit: 'lbs' | 'kg';
}) {
  return (
    <View style={sectionStyles.container}>
      <View style={sectionStyles.header}>
        <Text style={[sectionStyles.name, { color: colors.textPrimary }]}>
          {exercise.exerciseName}
        </Text>
        <View style={[sectionStyles.muscleBadge, { backgroundColor: Colors.gym + '1A' }]}>
          <Text style={[sectionStyles.muscleText, { color: Colors.gym }]}>
            {exercise.primaryMuscle}
          </Text>
        </View>
        {needsSwap && (
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSwapPress?.(exerciseIndex); }}
            style={[sectionStyles.swapBtn, { backgroundColor: Colors.warning + '20', borderColor: Colors.warning + '40' }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="swap-horizontal" size={14} color={Colors.warning} />
            <Text style={[sectionStyles.swapTxt, { color: Colors.warning }]}>Swap</Text>
          </TouchableOpacity>
        )}
      </View>

      {templateTarget && (
        <Text style={[sectionStyles.target, { color: colors.textSecondary }]}>
          Target: {templateTarget}
        </Text>
      )}

      {previousBest && (
        <Text style={[sectionStyles.prevBest, { color: colors.textSecondary }]}>
          Last time: {previousBest}
        </Text>
      )}

      {/* Set header */}
      <View style={sectionStyles.setHeader}>
        <Text style={[sectionStyles.setHeaderText, { color: colors.textSecondary, width: 20 }]}>Set</Text>
        <Text style={[sectionStyles.setHeaderText, { color: colors.textSecondary, flex: 1, textAlign: 'center' }]}>Weight</Text>
        <Text style={[sectionStyles.setHeaderText, { color: colors.textSecondary, width: 14 }]} />
        <Text style={[sectionStyles.setHeaderText, { color: colors.textSecondary, flex: 1, textAlign: 'center' }]}>Reps</Text>
        <Text style={[sectionStyles.setHeaderText, { color: colors.textSecondary, width: 34 }]} />
      </View>

      {exercise.sets.map((set, si) => (
        <SetRow
          key={si}
          set={set}
          exerciseIndex={exerciseIndex}
          setIndex={si}
          onComplete={onCompleteSet}
          onDelete={onRemoveSet}
          colors={colors}
          weightUnit={weightUnit}
        />
      ))}

      <TouchableOpacity
        onPress={() => onAddSet(exerciseIndex)}
        style={[sectionStyles.addSetBtn, { borderColor: colors.border }]}
      >
        <Ionicons name="add" size={16} color={Colors.gym} />
        <Text style={[sectionStyles.addSetText, { color: Colors.gym }]}>Add Set</Text>
      </TouchableOpacity>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: { marginBottom: 20, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  name: { fontSize: 17, fontWeight: '700', flex: 1 },
  muscleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  muscleText: { fontSize: 11, fontWeight: '700' },
  target: { fontSize: 13, marginBottom: 2, fontStyle: 'italic' },
  prevBest: { fontSize: 13, marginBottom: 8 },
  swapBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  swapTxt: { fontSize: 12, fontWeight: '700' },
  setHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginBottom: 4, gap: 8 },
  setHeaderText: { fontSize: 11, fontWeight: '600' },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
    gap: 4,
  },
  addSetText: { fontSize: 13, fontWeight: '600' },
});

// ─── Rest timer overlay ──────────────────────────────────────────────────────

function RestTimerOverlay({
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
        <TouchableOpacity onPress={() => onAdjust(-15)} style={timerStyles.adjustBtn}>
          <Text style={[timerStyles.adjustText, { color: colors.textSecondary }]}>-15s</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSkip} style={[timerStyles.skipBtn, { backgroundColor: Colors.gym }]}>
          <Text style={timerStyles.skipText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onAdjust(15)} style={timerStyles.adjustBtn}>
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
    shadowColor: '#000',
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
  adjustBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  adjustText: { fontSize: 14, fontWeight: '600' },
  skipBtn: { paddingHorizontal: 24, paddingVertical: 8, borderRadius: 8 },
  skipText: { color: 'white', fontWeight: '700', fontSize: 14 },
});

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

  const [previousBests, setPreviousBests] = useState<Record<string, string>>({});
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [prCelebration, setPrCelebration] = useState<{ visible: boolean; details: string[] }>({
    visible: false,
    details: [],
  });
  const [swapModal, setSwapModal] = useState<{ visible: boolean; exerciseIndex: number } | null>(null);
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

  // ─── Reload equipment profile on focus (e.g. user switched profile elsewhere) ──

  useFocusEffect(
    useCallback(() => {
      loadProfiles();
    }, [loadProfiles])
  );

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
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!workout.session || workout.session.status !== 'active') return;
      e.preventDefault();

      Alert.alert(
        'Active workout',
        'You have an active workout. What would you like to do?',
        [
          { text: 'Keep Going', style: 'cancel' },
          {
            text: 'Save & Finish',
            onPress: async () => {
              await workout.finishWorkout('', null);
              navigation.dispatch(e.data.action);
            },
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: async () => {
              await workout.abandonWorkout();
              navigation.dispatch(e.data.action);
            },
          },
        ],
      );
    });
    return unsubscribe;
  }, [navigation, workout.session]);

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

      // Start rest timer using this exercise's configured rest duration
      const restSecs = workout.session!.exercises[exerciseIndex]?.restSeconds ?? 90;
      restTimer.start(restSecs, exerciseName);
    },
    [workout, restTimer],
  );

  // ─── Add exercise via picker ─────────────────────────────────────────────

  const handleAddExercise = useCallback(() => {
    const existingIds = new Set(
      workout.session?.exercises.map((e) => e.exerciseId) ?? [],
    );
    picker.setPickerCallback((exercise: Exercise) => {
      workout.addExercise(exercise);
    }, existingIds);
    router.push({
      pathname: '/(tabs)/training/exercises',
      params: { mode: 'picker' },
    });
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

  // ─── Swap modal content ──────────────────────────────────────────────────

  const swapModalContent = useMemo(() => {
    if (!swapModal || !workout.session) return null;
    const exercise = workout.session.exercises[swapModal.exerciseIndex];
    if (!exercise) return null;
    const libExercise = exerciseLibrary.find((e) => e.id === exercise.exerciseId);
    const alternatives = libExercise && activeProfile
      ? findAlternatives(libExercise, exerciseLibrary, activeProfile.equipment)
      : [];
    return {
      exerciseName: exercise.exerciseName,
      missingEquipment: libExercise?.equipment ?? '',
      alternatives: alternatives.map((a) => ({
        id: a.id,
        name: a.name,
        equipment: a.equipment,
        primaryMuscles: a.primaryMuscles,
      })),
    };
  }, [swapModal, workout.session, activeProfile]);

  // ─── Finish ──────────────────────────────────────────────────────────────

  const handleFinish = useCallback(() => {
    if (!workout.session) return;
    const completedSets = workout.session.exercises.flatMap((e) =>
      e.sets.filter((s) => s.completed),
    );
    if (completedSets.length === 0) {
      Alert.alert('No sets completed', 'Complete at least one set before finishing.');
      return;
    }
    router.push({
      pathname: '/(tabs)/training/session-summary',
      params: { sessionId: workout.session.id, elapsed: String(workout.elapsedSeconds) },
    });
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

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          {workout.session.exercises.map((exercise, ei) => {
            const libExercise = exerciseLibrary.find((e) => e.id === exercise.exerciseId);
            const needsSwap = !!activeProfile && !!libExercise &&
              !isExerciseAvailable(libExercise, activeProfile.equipment);
            return (
              <ExerciseSection
                key={`${exercise.exerciseId}-${ei}`}
                exercise={exercise}
                exerciseIndex={ei}
                previousBest={previousBests[exercise.exerciseId]}
                onCompleteSet={handleCompleteSet}
                onAddSet={workout.addSet}
                onRemoveSet={workout.removeSet}
                onSwapPress={handleSwapPress}
                needsSwap={needsSwap}
                colors={colors}
                weightUnit={weightUnit}
              />
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
      {swapModal && swapModalContent && (
        <ExerciseSwapModal
          visible={swapModal.visible}
          onClose={() => setSwapModal(null)}
          exerciseName={swapModalContent.exerciseName}
          missingEquipment={swapModalContent.missingEquipment}
          alternatives={swapModalContent.alternatives}
          onSwap={handleSwapConfirm}
          colors={colors}
        />
      )}
    </View>
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
  finishBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  finishBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

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
