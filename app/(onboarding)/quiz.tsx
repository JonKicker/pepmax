/**
 * quiz.tsx — Onboarding Quiz Orchestrator (v2)
 *
 * Manages:
 * - QuizData state (all 15 screens worth of data)
 * - Step index with visitedSteps history (for conditional skip + smart back)
 * - Reduce-motion support via AccessibilityInfo
 * - Progress bar
 * - Validation per step
 * - Save logic: mergeDocument → BuildingPlan → PersonalizedSummary
 *
 * Step map (1-indexed, as displayed in the progress bar):
 *  1  GoalsStep          — multi-select goals
 *  2  ExperienceStep     — single-select experience level
 *  3  UnitsStep          — unit preference
 *  4  BodyStatsStep      — height / weight / age / sex
 *  5  GoalTypeStep       — lose / maintain / gain
 *  6  TrainingDaysStep   — days per week (2-6)
 *  7  TrainTimeStep      — preferred train time
 *  8  ActivityLevelStep  — activity category → multiplier at save time
 *  9  ChallengesStep     — multi-select challenges (optional)
 * 10  VisionStep         — 12-week vision
 * 11  RecoveryStep       — CONDITIONAL: skipped if no training/cardio goal
 * 12  PersonalNoteStep   — free text (optional, skip button)
 * 13  CheckInDayStep     — day of week
 * 14  RemindersStep      — opt-in
 * 15  ConfirmStep        — recap + "Build My Plan"
 *
 * After step 15: BuildingPlan → PersonalizedSummary → navigate to /(tabs)
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, AccessibilityInfo,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { serverTimestamp } from 'firebase/firestore';
import { useTheme } from '../../src/hooks/useTheme';
import { Colors } from '../../src/constants/theme';
import { useAuth } from '../../src/contexts/AuthContext';
import { mergeDocument, COLLECTIONS } from '../../src/services/firebase/firestore';
import { analytics, AnalyticsEvent } from '../../src/services/analytics';
import {
  calculateTDEE, calculateMacros, lbsToKg, feetInchesToCm,
} from '../../src/utils/tdee';
import {
  shouldSkipRecovery as _shouldSkipRecovery,
  nextStep as _nextStep,
  prevStep as _prevStep,
  sanitisePersonalNote as _sanitisePersonalNote,
  getActivityMultiplier,
} from '../../src/utils/quizUtils';
import type { Goal, ExperienceLevel, Units, Sex } from '../../src/types/profile';

// Shared components
import ProgressBar from '../../src/components/onboarding/ProgressBar';
import BuildingPlan from '../../src/components/onboarding/BuildingPlan';
import PersonalizedSummary from '../../src/components/onboarding/PersonalizedSummary';

// Step components
import GoalsStep from '../../src/components/onboarding/steps/GoalsStep';
import ExperienceStep from '../../src/components/onboarding/steps/ExperienceStep';
import UnitsStep from '../../src/components/onboarding/steps/UnitsStep';
import BodyStatsStep from '../../src/components/onboarding/steps/BodyStatsStep';
import type { BodyStats } from '../../src/components/onboarding/steps/BodyStatsStep';
import GoalTypeStep from '../../src/components/onboarding/steps/GoalTypeStep';
import TrainingDaysStep from '../../src/components/onboarding/steps/TrainingDaysStep';
import TrainTimeStep from '../../src/components/onboarding/steps/TrainTimeStep';
import ActivityLevelStep from '../../src/components/onboarding/steps/ActivityLevelStep';
import type { ActivityCategory } from '../../src/components/onboarding/steps/ActivityLevelStep';
import ChallengesStep from '../../src/components/onboarding/steps/ChallengesStep';
import VisionStep from '../../src/components/onboarding/steps/VisionStep';
import RecoveryStep from '../../src/components/onboarding/steps/RecoveryStep';
import PersonalNoteStep from '../../src/components/onboarding/steps/PersonalNoteStep';
import CheckInDayStep, { sanitiseCheckInDay } from '../../src/components/onboarding/steps/CheckInDayStep';
import RemindersStep from '../../src/components/onboarding/steps/RemindersStep';
import ConfirmStep from '../../src/components/onboarding/steps/ConfirmStep';

// ── Types ─────────────────────────────────────────────────────────────────────

type GoalType = 'lose' | 'maintain' | 'gain';
type TrainTime = 'morning' | 'midday' | 'afternoon' | 'evening' | 'varies';
type RecoveryPriority = 'high' | 'medium' | 'low';
type Vision = 'stronger' | 'leaner' | 'optimized' | 'back_on_track';

type QuizData = {
  // Step 1
  goals: Goal[];
  // Step 2
  experienceLevel: ExperienceLevel | null;
  // Step 3
  units: Units | null;
  // Step 4 (body stats sub-object)
  bodyStats: BodyStats;
  // Step 5
  goalType: GoalType | null;
  // Step 6
  trainingDaysPerWeek: number | null;
  // Step 7
  preferredTrainTime: TrainTime | null;
  // Step 8
  activityCategory: ActivityCategory | null;
  // Step 9
  challenges: string[];
  // Step 10
  twelveWeekVision: Vision | null;
  // Step 11 (conditional)
  recoveryPriority: RecoveryPriority | null;
  // Step 12
  personalGoalNote: string;
  // Step 13
  checkInDay: number | null;
  // Step 14
  remindersOptIn: boolean | null;
};

const INITIAL_BODY_STATS: BodyStats = {
  heightFt: '', heightIn: '', heightCm: '',
  weightLbs: '', weightKg: '',
  age: '',
  sex: null,
  inputUnits: 'imperial',
};

const INITIAL: QuizData = {
  goals: [],
  experienceLevel: null,
  units: null,
  bodyStats: INITIAL_BODY_STATS,
  goalType: null,
  trainingDaysPerWeek: null,
  preferredTrainTime: null,
  activityCategory: null,
  challenges: [],
  twelveWeekVision: null,
  recoveryPriority: null,
  personalGoalNote: '',
  checkInDay: null,
  remindersOptIn: null,
};

const TOTAL_STEPS = 15;

// ── Step-skip logic (re-exported from src/utils/quizUtils for DRY) ────────────

export const shouldSkipRecovery = _shouldSkipRecovery;
export const prevStep = _prevStep;

/** Adapts the pure nextStep(step, goals) signature to accept QuizData. */
export function nextStep(currentStep: number, data: QuizData): number {
  return _nextStep(currentStep, data.goals);
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateStep(step: number, data: QuizData): string | null {
  switch (step) {
    case 1:
      return data.goals.length === 0 ? 'Select at least one goal.' : null;
    case 2:
      return data.experienceLevel === null ? 'Select your experience level.' : null;
    case 3:
      return data.units === null ? 'Select your preferred units.' : null;
    case 4: {
      const s = data.bodyStats;
      const imp = s.inputUnits === 'imperial';
      if (imp) {
        if (!s.heightFt || !s.heightIn) return 'Enter your height.';
        if (!s.weightLbs) return 'Enter your weight.';
      } else {
        if (!s.heightCm) return 'Enter your height.';
        if (!s.weightKg) return 'Enter your weight.';
      }
      if (!s.age) return 'Enter your age.';
      const age = parseInt(s.age, 10);
      if (isNaN(age) || age < 13 || age > 120) return 'Enter a valid age (13–120).';
      if (!s.sex) return 'Select your biological sex.';
      return null;
    }
    case 5:
      return data.goalType === null ? 'Select your primary goal.' : null;
    case 6:
      return data.trainingDaysPerWeek === null ? 'Select how many days you train.' : null;
    case 7:
      return data.preferredTrainTime === null ? 'Select your preferred train time.' : null;
    case 8:
      return data.activityCategory === null ? 'Select your activity level.' : null;
    case 9:
      return null; // optional
    case 10:
      return data.twelveWeekVision === null ? 'Pick your 12-week vision.' : null;
    case 11:
      return null; // optional (also conditional)
    case 12:
      return null; // optional (has skip button)
    case 13:
      return data.checkInDay === null ? 'Pick your weekly check-in day.' : null;
    case 14:
      return data.remindersOptIn === null ? 'Choose a reminders preference.' : null;
    case 15:
      return null; // confirm screen, no extra validation
    default:
      return null;
  }
}

// ── Sanitize personalGoalNote (imported from src/utils/quizUtils) ────────────
export const sanitisePersonalNote = _sanitisePersonalNote;

// ── Component ─────────────────────────────────────────────────────────────────

type Phase = 'quiz' | 'building' | 'summary';

export default function QuizScreen() {
  const { colors } = useTheme();
  const { currentUser, refreshProfile } = useAuth();

  // Core state
  const [data, setData] = useState<QuizData>(INITIAL);
  const [step, setStep] = useState(1);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([]); // history for back nav
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('quiz');
  const [reduceMotion, setReduceMotion] = useState(false);

  // Calculated at save time — stored so PersonalizedSummary can display them
  const [calculatedCalories, setCalculatedCalories] = useState(0);
  const [calculatedMacros, setCalculatedMacros] = useState({ proteinG: 0, carbsG: 0, fatG: 0 });

  // Check OS reduce-motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
    });
    return () => sub.remove();
  }, []);

  // ── Data helpers ─────────────────────────────────────────────────────────

  function update<K extends keyof QuizData>(key: K, value: QuizData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function updateBodyStats<K extends keyof BodyStats>(key: K, value: BodyStats[K]) {
    setData((prev) => ({
      ...prev,
      bodyStats: { ...prev.bodyStats, [key]: value },
    }));
    setError(null);
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  function handleNext() {
    const err = validateStep(step, data);
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    if (step < TOTAL_STEPS) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      analytics.track(AnalyticsEvent.ONBOARDING_STEP_VIEWED, {
        step: step + 1,
        total_steps: TOTAL_STEPS,
      });
      const next = nextStep(step, data);
      setVisitedSteps((prev) => [...prev, step]);
      setStep(next);
      return;
    }

    // Step 15 — "Build My Plan"
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase('building');
  }

  function handleBack() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    const [prev, newVisited] = prevStep(visitedSteps);
    setVisitedSteps(newVisited);
    setStep(prev);
  }

  function handleSkipNote() {
    // PersonalNoteStep skip button — jump straight to next step
    setError(null);
    const next = nextStep(step, data);
    setVisitedSteps((prev) => [...prev, step]);
    setStep(next);
  }

  // ── Save logic ────────────────────────────────────────────────────────────

  const saveProfile = useCallback(async () => {
    if (!currentUser) {
      if (__DEV__) console.log('[quiz] saveProfile: no currentUser, aborting');
      return;
    }

    // Convert body stats to metric
    const s = data.bodyStats;
    let heightCm: number;
    let weightKg: number;

    if (s.inputUnits === 'imperial') {
      heightCm = feetInchesToCm(parseInt(s.heightFt, 10) || 0, parseInt(s.heightIn, 10) || 0);
      weightKg = lbsToKg(parseFloat(s.weightLbs));
    } else {
      heightCm = parseFloat(s.heightCm);
      weightKg = parseFloat(s.weightKg);
    }

    const age = parseInt(s.age, 10);
    const sex = s.sex!;

    // Ray's requirement: map activityCategory → numeric multiplier for TDEE
    const activityMultiplier = getActivityMultiplier(data.activityCategory);
    const tdee = calculateTDEE(weightKg, heightCm, age, sex, activityMultiplier);

    // Apply calorie offset based on goalType
    const OFFSETS: Record<string, number> = { lose: -500, maintain: 0, gain: 250 };
    const offset = data.goalType ? (OFFSETS[data.goalType] ?? 0) : 0;
    const calorieTarget = Math.max(1200, tdee + offset);

    // Macros based on adjusted calorieTarget (not raw TDEE) so they match actual intake
    const macros = calculateMacros(calorieTarget);

    // Stash for summary screen
    setCalculatedCalories(calorieTarget);
    setCalculatedMacros(macros);

    // Ray's requirement: sanitise personalGoalNote
    const cleanNote = sanitisePersonalNote(data.personalGoalNote);

    // Ray's requirement: sanitise checkInDay
    const checkInDay = data.checkInDay !== null
      ? sanitiseCheckInDay(data.checkInDay)
      : 1; // default Monday

    const result = await mergeDocument(COLLECTIONS.PROFILE, 'data', {
      goals: data.goals,
      experienceLevel: data.experienceLevel!,
      units: data.units!,
      heightCm,
      weightKg,
      age,
      sex,
      tdee,
      calorieTarget,
      macros,
      activityLevel: activityMultiplier,    // numeric, for backward compat
      activityCategory: data.activityCategory, // human-readable category (new)
      trainingDaysPerWeek: data.trainingDaysPerWeek, // authoritative field
      preferredTrainTime: data.preferredTrainTime,
      goalType: data.goalType,
      challenges: data.challenges.length > 0 ? data.challenges : undefined,
      twelveWeekVision: data.twelveWeekVision,
      recoveryPriority: data.recoveryPriority,
      personalGoalNote: cleanNote.length > 0 ? cleanNote : undefined,
      checkInDay,
      remindersOptIn: data.remindersOptIn ?? false,
      quizCompletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // onboardingComplete is set in PersonalizedSummary after user taps "Let's Go"
    });

    if (result.error) {
      console.error('[quiz] Firestore write failed:', result.error);
      setError('Failed to save. Check your connection and try again.');
      setPhase('quiz');
      return;
    }

    if (__DEV__) console.log('[quiz] Profile saved. Showing PersonalizedSummary.');

    analytics.track(AnalyticsEvent.ONBOARDING_COMPLETED, {
      goals: data.goals.join(','),
      experience_level: data.experienceLevel ?? '',
      goal_type: data.goalType ?? '',
    });

    // BuildingPlan's Promise.all awaits this + delay(4000)
    // Once both resolve, BuildingPlan unmounts and we show summary
    setPhase('summary');
  }, [data, currentUser]);

  const handleLetsGo = useCallback(async () => {
    // Final step: mark onboarding complete and refresh profile
    await mergeDocument(COLLECTIONS.PROFILE, 'data', {
      onboardingComplete: true,
      updatedAt: serverTimestamp(),
    });
    await refreshProfile();
    // AuthGuard will redirect to /(tabs) when onboardingComplete becomes true
    if (__DEV__) console.log('[quiz] onboardingComplete: true — AuthGuard should redirect to /(tabs)');
  }, [refreshProfile]);

  // ── Rendering ─────────────────────────────────────────────────────────────

  if (phase === 'building') {
    return (
      <BuildingPlan
        onComplete={saveProfile}
      />
    );
  }

  if (phase === 'summary') {
    return (
      <PersonalizedSummary
        calories={calculatedCalories}
        macros={calculatedMacros}
        trainingDaysPerWeek={data.trainingDaysPerWeek}
        twelveWeekVision={data.twelveWeekVision}
        onLetsGo={handleLetsGo}
      />
    );
  }

  const isFirstStep = step === 1;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ProgressBar step={step} total={TOTAL_STEPS} reduceMotion={reduceMotion} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step content */}
        {step === 1 && (
          <GoalsStep
            goals={data.goals}
            onChange={(goals) => update('goals', goals)}
            reduceMotion={reduceMotion}
          />
        )}
        {step === 2 && (
          <ExperienceStep
            value={data.experienceLevel}
            onChange={(v) => update('experienceLevel', v)}
            reduceMotion={reduceMotion}
          />
        )}
        {step === 3 && (
          <UnitsStep
            value={data.units}
            onChange={(v) => {
              update('units', v);
              // Sync input units with display units
              updateBodyStats('inputUnits', v);
            }}
            reduceMotion={reduceMotion}
          />
        )}
        {step === 4 && (
          <BodyStatsStep
            stats={data.bodyStats}
            onChange={updateBodyStats}
            reduceMotion={reduceMotion}
          />
        )}
        {step === 5 && (
          <GoalTypeStep
            value={data.goalType}
            onChange={(v) => update('goalType', v)}
            reduceMotion={reduceMotion}
          />
        )}
        {step === 6 && (
          <TrainingDaysStep
            value={data.trainingDaysPerWeek}
            onChange={(v) => update('trainingDaysPerWeek', v)}
            reduceMotion={reduceMotion}
          />
        )}
        {step === 7 && (
          <TrainTimeStep
            value={data.preferredTrainTime}
            onChange={(v) => update('preferredTrainTime', v)}
            reduceMotion={reduceMotion}
          />
        )}
        {step === 8 && (
          <ActivityLevelStep
            value={data.activityCategory}
            onChange={(v) => update('activityCategory', v)}
            reduceMotion={reduceMotion}
          />
        )}
        {step === 9 && (
          <ChallengesStep
            selected={data.challenges}
            onChange={(v) => update('challenges', v)}
            reduceMotion={reduceMotion}
          />
        )}
        {step === 10 && (
          <VisionStep
            value={data.twelveWeekVision}
            onChange={(v) => update('twelveWeekVision', v)}
            reduceMotion={reduceMotion}
          />
        )}
        {step === 11 && (
          <RecoveryStep
            value={data.recoveryPriority}
            onChange={(v) => update('recoveryPriority', v)}
            reduceMotion={reduceMotion}
          />
        )}
        {step === 12 && (
          <PersonalNoteStep
            value={data.personalGoalNote}
            onChange={(v) => update('personalGoalNote', v)}
            onSkip={handleSkipNote}
            reduceMotion={reduceMotion}
          />
        )}
        {step === 13 && (
          <CheckInDayStep
            value={data.checkInDay}
            onChange={(v) => update('checkInDay', v)}
            reduceMotion={reduceMotion}
          />
        )}
        {step === 14 && (
          <RemindersStep
            value={data.remindersOptIn}
            onChange={(v) => update('remindersOptIn', v)}
            reduceMotion={reduceMotion}
          />
        )}
        {step === 15 && (
          <ConfirmStep
            summary={{
              goals: data.goals,
              goalType: data.goalType,
              trainingDaysPerWeek: data.trainingDaysPerWeek,
              activityCategory: data.activityCategory,
              twelveWeekVision: data.twelveWeekVision,
            }}
            reduceMotion={reduceMotion}
          />
        )}

        {/* Error message */}
        {error && (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: Colors.error + '18', borderColor: Colors.error + '40' },
            ]}
          >
            <Text style={[styles.errorText, { color: Colors.error }]}>{error}</Text>
          </View>
        )}

        {/* Nav row */}
        <View style={styles.navRow}>
          {!isFirstStep && (
            <TouchableOpacity
              style={[styles.backBtn, { borderColor: colors.border }]}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={[styles.backBtnText, { color: colors.textPrimary }]}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.nextBtn,
              { backgroundColor: Colors.accent, flex: isFirstStep ? undefined : 1 },
            ]}
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel={step === TOTAL_STEPS ? 'Build my plan' : 'Next step'}
          >
            <Text style={styles.nextBtnText}>
              {step === TOTAL_STEPS ? 'Build My Plan 🚀' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    padding: 24,
    paddingTop: 12,
    gap: 16,
    paddingBottom: 40,
  },
  errorBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  errorText: { fontSize: 13 },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  backBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backBtnText: { fontSize: 15, fontWeight: '600' },
  nextBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
