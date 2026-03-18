import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, TextInput, ActivityIndicator, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { serverTimestamp } from 'firebase/firestore';
import { useTheme } from '../../src/hooks/useTheme';
import { Colors, Theme } from '../../src/constants/theme';
import { useAuth } from '../../src/contexts/AuthContext';
import { mergeDocument, COLLECTIONS } from '../../src/services/firebase/firestore';
import { analytics, AnalyticsEvent } from '../../src/services/analytics';
import { calculateTDEE, calculateMacros, lbsToKg, feetInchesToCm } from '../../src/utils/tdee';
import type { Goal, ExperienceLevel, Units, Sex } from '../../src/types/profile';

const TOTAL_STEPS = 4;

type QuizData = {
  goals: Goal[];
  experienceLevel: ExperienceLevel | null;
  heightFt: string;
  heightIn: string;
  heightCm: string;
  weightLbs: string;
  weightKg: string;
  age: string;
  sex: Sex | null;
  inputUnits: Units; // unit toggle for step 3 inputs
  units: Units | null;
};

const INITIAL: QuizData = {
  goals: [],
  experienceLevel: null,
  heightFt: '', heightIn: '', heightCm: '',
  weightLbs: '', weightKg: '',
  age: '',
  sex: null,
  inputUnits: 'imperial',
  units: null,
};

export default function QuizScreen() {
  const { colors } = useTheme();
  const { currentUser, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<QuizData>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof QuizData>(key: K, value: QuizData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function toggleGoal(goal: Goal) {
    setData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter((g) => g !== goal)
        : [...prev.goals, goal],
    }));
    setError(null);
  }

  function validateStep(): string | null {
    if (step === 1 && data.goals.length === 0) return 'Select at least one goal.';
    if (step === 2 && !data.experienceLevel) return 'Select your experience level.';
    if (step === 3) {
      if (data.inputUnits === 'imperial') {
        if (!data.heightFt || !data.heightIn) return 'Enter your height.';
        if (!data.weightLbs) return 'Enter your weight.';
      } else {
        if (!data.heightCm) return 'Enter your height.';
        if (!data.weightKg) return 'Enter your weight.';
      }
      if (!data.age) return 'Enter your age.';
      const age = parseInt(data.age);
      if (isNaN(age) || age < 13 || age > 120) return 'Enter a valid age (13–120).';
      if (!data.sex) return 'Select your biological sex.';
    }
    if (step === 4 && !data.units) return 'Select your preferred units.';
    return null;
  }

  async function handleNext() {
    const err = validateStep();
    if (err) { setError(err); return; }

    if (step < TOTAL_STEPS) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      analytics.track(AnalyticsEvent.ONBOARDING_STEP_VIEWED, { step: step + 1, total_steps: TOTAL_STEPS });
      setStep((s) => s + 1);
      return;
    }

    // Step 4 — Finish
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await saveProfile();
  }

  async function saveProfile() {
    if (!currentUser) {
      console.log('[quiz] saveProfile: no currentUser, aborting');
      return;
    }
    setSaving(true);

    // Convert body stats to metric
    let heightCm: number;
    let weightKg: number;

    if (data.inputUnits === 'imperial') {
      heightCm = feetInchesToCm(parseInt(data.heightFt) || 0, parseInt(data.heightIn) || 0);
      weightKg = lbsToKg(parseFloat(data.weightLbs));
    } else {
      heightCm = parseFloat(data.heightCm);
      weightKg = parseFloat(data.weightKg);
    }

    const age = parseInt(data.age);
    const sex = data.sex!;
    const tdee = calculateTDEE(weightKg, heightCm, age, sex);
    const macros = calculateMacros(tdee);

    const result = await mergeDocument(COLLECTIONS.PROFILE, 'data', {
      goals: data.goals,
      experienceLevel: data.experienceLevel!,
      units: data.units!,
      heightCm,
      weightKg,
      age,
      sex,
      tdee,
      calorieTarget: tdee,
      macros,
      onboardingComplete: true,
      quizCompletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (result.error) {
      console.error('[quiz] Firestore write failed:', result.error);
      setSaving(false);
      setError('Failed to save. Check your connection and try again.');
      return;
    }

    console.log('[quiz] Firestore write confirmed — onboardingComplete: true saved to users/{uid}/profile/data');
    // Refresh full profile from Firestore — returns onboardingComplete: true + all quiz data (TDEE, macros, etc.)
    // AuthGuard re-evaluates on profileLoading → false and redirects to /(tabs).
    await refreshProfile();
    analytics.track(AnalyticsEvent.ONBOARDING_COMPLETED, {
      goals: data.goals.join(','),
      experience_level: data.experienceLevel ?? '',
    });
    console.log('[quiz] refreshProfile complete — AuthGuard should redirect to /(tabs)');
    setSaving(false);
  }

  function handleBack() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    setStep((s) => s - 1);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: Colors.accent, width: `${(step / TOTAL_STEPS) * 100}%` },
            ]}
          />
        </View>
        <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
          Step {step} of {TOTAL_STEPS}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {step === 1 && <Step1 data={data} colors={colors} onToggleGoal={toggleGoal} />}
        {step === 2 && <Step2 data={data} colors={colors} onSelect={(v) => update('experienceLevel', v)} />}
        {step === 3 && <Step3 data={data} colors={colors} onUpdate={update} />}
        {step === 4 && <Step4 data={data} colors={colors} onSelect={(v) => update('units', v)} />}

        {error && (
          <View style={[styles.errorBox, { backgroundColor: Colors.error + '18', borderColor: Colors.error + '40' }]}>
            <Text style={[styles.errorText, { color: Colors.error }]}>{error}</Text>
          </View>
        )}

        <View style={styles.navRow}>
          {step > 1 && (
            <TouchableOpacity
              style={[styles.backBtn, { borderColor: colors.border }]}
              onPress={handleBack}
            >
              <Text style={[styles.backBtnText, { color: colors.textPrimary }]}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: Colors.accent, opacity: saving ? 0.7 : 1, flex: step > 1 ? 1 : undefined }]}
            onPress={handleNext}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.nextBtnText}>{step === TOTAL_STEPS ? 'Finish' : 'Next'}</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Step components ─────────────────────────────────────────────────────────

function Step1({ data, colors, onToggleGoal }: { data: QuizData; colors: Theme['colors']; onToggleGoal: (g: Goal) => void }) {
  const OPTIONS: { value: Goal; label: string; color: string }[] = [
    { value: 'peptides', label: 'Peptide Tracking', color: Colors.peptide },
    { value: 'nutrition', label: 'Nutrition', color: Colors.nutrition },
    { value: 'training', label: 'Gym Training', color: Colors.gym },
    { value: 'cardio', label: 'Cardio / Running', color: Colors.gym },
  ];
  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
        What are you using PepMax for?
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Select all that apply
      </Text>
      {OPTIONS.map((opt) => {
        const selected = data.goals.includes(opt.value);
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.multiOption,
              {
                borderColor: selected ? opt.color : colors.border,
                backgroundColor: selected ? opt.color + '15' : colors.surface,
              },
            ]}
            onPress={() => onToggleGoal(opt.value)}
          >
            <View style={[styles.checkbox, { borderColor: selected ? opt.color : colors.border, backgroundColor: selected ? opt.color : 'transparent' }]}>
              {selected && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>}
            </View>
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Step2({ data, colors, onSelect }: { data: QuizData; colors: Theme['colors']; onSelect: (v: ExperienceLevel) => void }) {
  const OPTIONS: { value: ExperienceLevel; label: string; desc: string }[] = [
    { value: 'beginner', label: 'Beginner', desc: 'New to training and tracking' },
    { value: 'intermediate', label: 'Intermediate', desc: 'Consistent for 1–3 years' },
    { value: 'advanced', label: 'Advanced', desc: 'Experienced, optimising performance' },
  ];
  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Experience level?</Text>
      {OPTIONS.map((opt) => {
        const selected = data.experienceLevel === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.singleOption,
              { borderColor: selected ? Colors.accent : colors.border, backgroundColor: selected ? Colors.accent + '12' : colors.surface },
            ]}
            onPress={() => onSelect(opt.value)}
          >
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>{opt.label}</Text>
            <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{opt.desc}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Step3({ data, colors, onUpdate }: { data: QuizData; colors: Theme['colors']; onUpdate: <K extends keyof QuizData>(key: K, value: QuizData[K]) => void }) {
  const imp = data.inputUnits === 'imperial';
  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Your body stats</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Used to calculate your daily calorie target
      </Text>

      {/* Unit toggle */}
      <View style={[styles.segmentRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {(['imperial', 'metric'] as Units[]).map((u) => (
          <TouchableOpacity
            key={u}
            style={[styles.segment, { backgroundColor: data.inputUnits === u ? Colors.accent : 'transparent' }]}
            onPress={() => onUpdate('inputUnits', u)}
          >
            <Text style={[styles.segmentText, { color: data.inputUnits === u ? '#fff' : colors.textSecondary }]}>
              {u.charAt(0).toUpperCase() + u.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Height */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Height</Text>
      {imp ? (
        <View style={styles.inlineRow}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, flex: 1 }]}
            placeholder="ft"
            placeholderTextColor={colors.textSecondary}
            value={data.heightFt}
            onChangeText={(v) => onUpdate('heightFt', v)}
            keyboardType="number-pad"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, flex: 1 }]}
            placeholder="in"
            placeholderTextColor={colors.textSecondary}
            value={data.heightIn}
            onChangeText={(v) => onUpdate('heightIn', v)}
            keyboardType="number-pad"
          />
        </View>
      ) : (
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="cm"
          placeholderTextColor={colors.textSecondary}
          value={data.heightCm}
          onChangeText={(v) => onUpdate('heightCm', v)}
          keyboardType="decimal-pad"
        />
      )}

      {/* Weight */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Weight</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
        placeholder={imp ? 'lbs' : 'kg'}
        placeholderTextColor={colors.textSecondary}
        value={imp ? data.weightLbs : data.weightKg}
        onChangeText={(v) => onUpdate(imp ? 'weightLbs' : 'weightKg', v)}
        keyboardType="decimal-pad"
      />

      {/* Age */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Age</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
        placeholder="Years"
        placeholderTextColor={colors.textSecondary}
        value={data.age}
        onChangeText={(v) => onUpdate('age', v)}
        keyboardType="number-pad"
      />

      {/* Sex */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Biological sex</Text>
      <View style={styles.inlineRow}>
        {(['male', 'female'] as Sex[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[
              styles.singleOption,
              { flex: 1, borderColor: data.sex === s ? Colors.accent : colors.border, backgroundColor: data.sex === s ? Colors.accent + '12' : colors.surface },
            ]}
            onPress={() => onUpdate('sex', s)}
          >
            <Text style={[styles.optionText, { color: colors.textPrimary, textAlign: 'center' }]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function Step4({ data, colors, onSelect }: { data: QuizData; colors: Theme['colors']; onSelect: (v: Units) => void }) {
  const OPTIONS: { value: Units; label: string; desc: string }[] = [
    { value: 'imperial', label: 'Imperial', desc: 'lbs, inches, miles' },
    { value: 'metric', label: 'Metric', desc: 'kg, cm, km' },
  ];
  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Unit preference</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        You can change this later in settings
      </Text>
      {OPTIONS.map((opt) => {
        const selected = data.units === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.singleOption,
              { borderColor: selected ? Colors.accent : colors.border, backgroundColor: selected ? Colors.accent + '12' : colors.surface },
            ]}
            onPress={() => onSelect(opt.value)}
          >
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>{opt.label}</Text>
            <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{opt.desc}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  progressContainer: { paddingHorizontal: 24, paddingTop: 16, gap: 6 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: { fontSize: 12, textAlign: 'right' },
  scroll: { padding: 24, paddingTop: 16, gap: 12 },
  stepContainer: { gap: 12 },
  stepTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  stepSubtitle: { fontSize: 14, marginBottom: 4 },
  multiOption: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, padding: 16, gap: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  singleOption: { borderRadius: 12, borderWidth: 1.5, padding: 16, gap: 4 },
  optionText: { fontSize: 15, fontWeight: '600' },
  optionDesc: { fontSize: 13 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  inlineRow: { flexDirection: 'row', gap: 10 },
  segmentRow: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  segment: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 14, fontWeight: '600' },
  errorBox: { borderRadius: 10, borderWidth: 1, padding: 12 },
  errorText: { fontSize: 13 },
  navRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  backBtn: { height: 52, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  backBtnText: { fontSize: 15, fontWeight: '600' },
  nextBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', minWidth: 160 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
