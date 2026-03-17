/**
 * Nutrition Settings — TDEE Calculator, Macro Targets, Meal Slot Customization.
 *
 * Save points:
 *   "Save as My Target" → writes calorieTarget, tdee, activityLevel to profile
 *   "Save Macro Targets" → writes macros (both grams AND percentages) to profile
 *   "Save Meal Slots" → writes mealSlots array to profile
 *
 * Inline slot rename updates local state only — no Firestore write until Save Meal Slots.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors, Theme } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { updateDocument, COLLECTIONS } from '../../../src/services/firebase/firestore';
import {
  calculateTDEE,
  ACTIVITY_LEVELS,
  kgToLbs,
  lbsToKg,
  cmToFeetInches,
  feetInchesToCm,
} from '../../../src/utils/tdee';
import { DEFAULT_MEAL_SLOTS } from '../../../src/types/nutrition';
import type { MealSlotConfig } from '../../../src/types/nutrition';

// ─── Slot ID generator ────────────────────────────────────────────────────────

/**
 * Generates a unique slot ID by slugifying the label, then appending a counter
 * if the slug collides with any existing slot ID.
 * Ray requirement #1: collision prevention.
 */
function generateSlotId(label: string, existingSlots: MealSlotConfig[]): string {
  const base = label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '') || 'slot';

  if (!existingSlots.some((s) => s.id === base)) return base;

  let counter = 2;
  while (existingSlots.some((s) => s.id === `${base}-${counter}`)) counter++;
  return `${base}-${counter}`;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionHeader({ title, colors }: { title: string; colors: Theme['colors'] }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{title}</Text>
  );
}

function SaveButton({
  label,
  onPress,
  saving,
}: {
  label: string;
  onPress: () => void;
  saving: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.saveBtn, { backgroundColor: Colors.nutrition }]}
      onPress={onPress}
      disabled={saving}
      activeOpacity={0.85}
    >
      {saving ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={styles.saveBtnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Percentage Slider ────────────────────────────────────────────────────────
// Custom slider built with PanResponder — no native module dependency.

function PercentageSlider({
  value,
  onChange,
  color,
  colors,
}: {
  value: number;       // 0-100 integer
  onChange: (v: number) => void;
  color: string;
  colors: Theme['colors'];
}) {
  const trackWidth = useRef(0);

  const clampPct = (raw: number) => Math.min(95, Math.max(5, Math.round(raw)));

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (trackWidth.current > 0) {
          onChange(clampPct((evt.nativeEvent.locationX / trackWidth.current) * 100));
        }
      },
      onPanResponderMove: (evt) => {
        if (trackWidth.current > 0) {
          onChange(clampPct((evt.nativeEvent.locationX / trackWidth.current) * 100));
        }
      },
    })
  ).current;

  return (
    <View
      style={[styles.sliderTrack, { backgroundColor: color + '33' }]}
      onLayout={(e) => { trackWidth.current = e.nativeEvent.layout.width; }}
      {...panResponder.panHandlers}
    >
      <View style={[styles.sliderFill, { width: `${value}%`, backgroundColor: color }]} />
      <View style={[styles.sliderThumb, { left: `${value}%`, backgroundColor: color }]} />
    </View>
  );
}

// ─── TDEE Section ─────────────────────────────────────────────────────────────

function TDEESection({ colors }: { colors: Theme['colors'] }) {
  const { userProfile, refreshProfile } = useAuth();
  const isImperial = userProfile?.units === 'imperial';

  // Pre-fill from profile (convert from stored metric to display units)
  const storedWeight = userProfile?.weightKg ?? 70;
  const storedHeight = userProfile?.heightCm ?? 170;
  const storedFeet = cmToFeetInches(storedHeight);

  const [age, setAge] = useState(String(userProfile?.age ?? 25));
  const [weightInput, setWeightInput] = useState(
    isImperial ? String(kgToLbs(storedWeight)) : String(storedWeight)
  );
  const [feetInput, setFeetInput] = useState(String(storedFeet.feet));
  const [inchesInput, setInchesInput] = useState(String(storedFeet.inches));
  const [cmInput, setCmInput] = useState(String(storedHeight));
  const [sex, setSex] = useState<'male' | 'female'>(userProfile?.sex ?? 'male');
  const [activityIdx, setActivityIdx] = useState(() => {
    const stored = userProfile?.activityLevel;
    if (!stored) return 2; // default: Moderately Active
    const idx = ACTIVITY_LEVELS.findIndex((l) => Math.abs(l.multiplier - stored) < 0.01);
    return idx >= 0 ? idx : 2;
  });
  const [showActivityPicker, setShowActivityPicker] = useState(false);

  const [calculatedTDEE, setCalculatedTDEE] = useState<number | null>(null);
  const [goalOffset, setGoalOffset] = useState<-500 | 0 | 500>(0);
  const [customOffset, setCustomOffset] = useState('');
  const [useCustomOffset, setUseCustomOffset] = useState(false);

  const [saving, setSaving] = useState(false);

  const computedTarget = (() => {
    if (!calculatedTDEE) return null;
    if (useCustomOffset) {
      const n = parseInt(customOffset, 10);
      if (!isFinite(n) || n < -1000 || n > 1000) return calculatedTDEE;
      return calculatedTDEE + n;
    }
    return calculatedTDEE + goalOffset;
  })();

  const handleCalculate = () => {
    const ageN = parseFloat(age);
    if (!isFinite(ageN) || ageN < 1 || ageN > 120) {
      Alert.alert('Invalid age', 'Enter an age between 1 and 120.');
      return;
    }

    let weightKg: number;
    let heightCm: number;

    if (isImperial) {
      const lbs = parseFloat(weightInput);
      if (!isFinite(lbs) || lbs <= 0) { Alert.alert('Invalid weight', 'Enter a valid weight.'); return; }
      weightKg = lbsToKg(lbs);

      const ft = parseFloat(feetInput);
      const inch = parseFloat(inchesInput);
      if (!isFinite(ft) || ft < 0 || !isFinite(inch) || inch < 0 || inch >= 12) {
        Alert.alert('Invalid height', 'Enter a valid height.');
        return;
      }
      heightCm = feetInchesToCm(ft, inch);
    } else {
      const kg = parseFloat(weightInput);
      if (!isFinite(kg) || kg <= 0) { Alert.alert('Invalid weight', 'Enter a valid weight.'); return; }
      weightKg = kg;

      const cm = parseFloat(cmInput);
      if (!isFinite(cm) || cm <= 0) { Alert.alert('Invalid height', 'Enter a valid height.'); return; }
      heightCm = cm;
    }

    const multiplier = ACTIVITY_LEVELS[activityIdx].multiplier;
    const tdee = calculateTDEE(weightKg, heightCm, ageN, sex, multiplier);
    setCalculatedTDEE(tdee);
  };

  const handleSaveTarget = async () => {
    if (!computedTarget || computedTarget <= 0) {
      Alert.alert('Calculate first', 'Please calculate your TDEE before saving.');
      return;
    }

    // Validate custom offset bounds (Ray requirement #7)
    if (useCustomOffset) {
      const n = parseInt(customOffset, 10);
      if (!isFinite(n) || n < -1000 || n > 1000) {
        Alert.alert('Invalid offset', 'Custom offset must be between -1,000 and +1,000 calories.');
        return;
      }
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await updateDocument(COLLECTIONS.PROFILE, 'data', {
      calorieTarget: Math.round(computedTarget),
      tdee: calculatedTDEE!,
      activityLevel: ACTIVITY_LEVELS[activityIdx].multiplier,
    } as any);

    setSaving(false);

    if (result.error) {
      Alert.alert('Save failed', 'Could not save target. Please try again.');
      return;
    }

    await refreshProfile();
    Alert.alert('Saved', `Daily calorie target set to ${Math.round(computedTarget).toLocaleString()} kcal.`);
  };

  return (
    <View>
      <SectionHeader title="TDEE CALCULATOR" colors={colors} />
      <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>

        {/* Age */}
        <FormRow label="Age">
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            maxLength={3}
            returnKeyType="done"
          />
        </FormRow>

        {/* Weight */}
        <FormRow label={`Weight (${isImperial ? 'lbs' : 'kg'})`}>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
            value={weightInput}
            onChangeText={setWeightInput}
            keyboardType="decimal-pad"
            maxLength={6}
            returnKeyType="done"
          />
        </FormRow>

        {/* Height */}
        {isImperial ? (
          <FormRow label="Height (ft / in)">
            <View style={styles.heightRow}>
              <TextInput
                style={[styles.formInputSmall, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                value={feetInput}
                onChangeText={setFeetInput}
                keyboardType="number-pad"
                maxLength={1}
                returnKeyType="done"
                placeholder="ft"
                placeholderTextColor={colors.textSecondary}
              />
              <TextInput
                style={[styles.formInputSmall, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                value={inchesInput}
                onChangeText={setInchesInput}
                keyboardType="number-pad"
                maxLength={2}
                returnKeyType="done"
                placeholder="in"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </FormRow>
        ) : (
          <FormRow label="Height (cm)">
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
              value={cmInput}
              onChangeText={setCmInput}
              keyboardType="decimal-pad"
              maxLength={5}
              returnKeyType="done"
            />
          </FormRow>
        )}

        {/* Sex */}
        <FormRow label="Biological Sex">
          <View style={styles.toggleRow}>
            {(['male', 'female'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.toggleBtn,
                  { borderColor: colors.border },
                  sex === s && { backgroundColor: Colors.nutrition, borderColor: Colors.nutrition },
                ]}
                onPress={() => setSex(s)}
              >
                <Text style={[styles.toggleBtnText, { color: sex === s ? 'white' : colors.textPrimary }]}>
                  {s === 'male' ? 'Male' : 'Female'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </FormRow>

        {/* Activity level */}
        <FormRow label="Activity Level">
          <TouchableOpacity
            style={[styles.pickerBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => setShowActivityPicker((v) => !v)}
          >
            <Text style={[styles.pickerBtnText, { color: colors.textPrimary }]} numberOfLines={1}>
              {ACTIVITY_LEVELS[activityIdx].label}
            </Text>
            <Ionicons name={showActivityPicker ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </FormRow>
        {showActivityPicker && (
          <View style={[styles.pickerDropdown, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {ACTIVITY_LEVELS.map((level, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                onPress={() => { setActivityIdx(idx); setShowActivityPicker(false); }}
              >
                <Text style={[styles.pickerItemText, { color: idx === activityIdx ? Colors.nutrition : colors.textPrimary }]}>
                  {level.label}
                </Text>
                {idx === activityIdx && <Ionicons name="checkmark" size={14} color={Colors.nutrition} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.calcBtn, { backgroundColor: colors.border }]}
          onPress={handleCalculate}
        >
          <Text style={[styles.calcBtnText, { color: colors.textPrimary }]}>Calculate TDEE</Text>
        </TouchableOpacity>

        {calculatedTDEE !== null && (
          <>
            <View style={[styles.tdeeResult, { backgroundColor: Colors.nutrition + '15', borderColor: Colors.nutrition + '40' }]}>
              <Text style={[styles.tdeeResultLabel, { color: colors.textSecondary }]}>
                Your estimated TDEE
              </Text>
              <Text style={[styles.tdeeResultValue, { color: Colors.nutrition }]}>
                {calculatedTDEE.toLocaleString()} calories/day
              </Text>
            </View>

            {/* Goal adjustment */}
            <Text style={[styles.subLabel, { color: colors.textSecondary }]}>GOAL ADJUSTMENT</Text>
            <View style={styles.goalRow}>
              {([
                { label: 'Lose Weight', offset: -500 as const },
                { label: 'Maintain', offset: 0 as const },
                { label: 'Gain Weight', offset: 500 as const },
              ] as const).map(({ label, offset }) => (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.goalBtn,
                    { borderColor: colors.border },
                    !useCustomOffset && goalOffset === offset && { backgroundColor: Colors.nutrition, borderColor: Colors.nutrition },
                  ]}
                  onPress={() => { setGoalOffset(offset); setUseCustomOffset(false); }}
                >
                  <Text style={[
                    styles.goalBtnText,
                    { color: !useCustomOffset && goalOffset === offset ? 'white' : colors.textPrimary },
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.subLabel, { color: colors.textSecondary }]}>CUSTOM OFFSET (−1000 to +1000 cal)</Text>
            <TextInput
              style={[styles.offsetInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: useCustomOffset ? Colors.nutrition : colors.border }]}
              value={customOffset}
              onChangeText={(v) => { setCustomOffset(v); setUseCustomOffset(v.trim() !== ''); }}
              placeholder="e.g. -300 or +200"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              returnKeyType="done"
            />

            {computedTarget !== null && (
              <View style={[styles.targetResult, { borderColor: colors.border }]}>
                <Text style={[styles.targetResultText, { color: colors.textPrimary }]}>
                  Daily calorie target:{' '}
                  <Text style={{ color: Colors.nutrition, fontWeight: '800' }}>
                    {Math.max(0, Math.round(computedTarget)).toLocaleString()} calories
                  </Text>
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      <SaveButton label="Save as My Target" onPress={handleSaveTarget} saving={saving} />
    </View>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.formRow}>
      <Text style={styles.formLabel}>{label}</Text>
      {children}
    </View>
  );
}

// ─── Macro Targets Section ────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Balanced', protein: 30, carbs: 40, fat: 30 },
  { label: 'High Protein', protein: 40, carbs: 30, fat: 30 },
  { label: 'Low Carb', protein: 35, carbs: 20, fat: 45 },
  { label: 'Keto', protein: 25, carbs: 5, fat: 70 },
] as const;

type MacroPct = { protein: number; carbs: number; fat: number };

/**
 * When macro X changes, distribute the delta proportionally among the other two.
 * Each macro is clamped to [5, 90] and the total is always forced to exactly 100.
 */
function adjustPercentages(changed: keyof MacroPct, newValue: number, current: MacroPct): MacroPct {
  const clamped = Math.min(90, Math.max(5, Math.round(newValue)));
  const others = (['protein', 'carbs', 'fat'] as const).filter((k) => k !== changed);
  const otherTotal = others.reduce((s, k) => s + current[k], 0);
  const remaining = 100 - clamped;

  const result: MacroPct = { ...current, [changed]: clamped };

  if (otherTotal > 0) {
    for (const key of others) {
      result[key] = Math.round((current[key] / otherTotal) * remaining);
    }
    // Fix rounding error by adjusting the largest "other" macro
    const total = result.protein + result.carbs + result.fat;
    if (total !== 100) {
      const largest = others.reduce((a, b) => result[a] > result[b] ? a : b);
      result[largest] = Math.max(0, result[largest] + (100 - total));
    }
  } else {
    const per = Math.floor(remaining / 2);
    result[others[0]] = per;
    result[others[1]] = remaining - per;
  }

  return result;
}

function MacroTargetsSection({ colors }: { colors: Theme['colors'] }) {
  const { userProfile, refreshProfile } = useAuth();

  const calorieTarget = userProfile?.calorieTarget ?? 2000;
  const storedMacros = userProfile?.macros;

  const [mode, setMode] = useState<'pct' | 'grams'>('pct');
  const [pct, setPct] = useState<MacroPct>({
    protein: storedMacros?.proteinPct ?? 30,
    carbs: storedMacros?.carbsPct ?? 40,
    fat: storedMacros?.fatPct ?? 30,
  });

  const [gramInputs, setGramInputs] = useState({
    protein: String(storedMacros?.proteinG ?? Math.round((calorieTarget * 0.3) / 4)),
    carbs: String(storedMacros?.carbsG ?? Math.round((calorieTarget * 0.4) / 4)),
    fat: String(storedMacros?.fatG ?? Math.round((calorieTarget * 0.3) / 9)),
  });

  const [saving, setSaving] = useState(false);

  // Derived gram values from percentages
  const gramsFromPct = {
    protein: Math.round((calorieTarget * pct.protein) / 100 / 4),
    carbs: Math.round((calorieTarget * pct.carbs) / 100 / 4),
    fat: Math.round((calorieTarget * pct.fat) / 100 / 9),
  };

  // Total calories from gram inputs (for warning)
  const gramProtein = parseFloat(gramInputs.protein);
  const gramCarbs = parseFloat(gramInputs.carbs);
  const gramFat = parseFloat(gramInputs.fat);
  const calFromGrams =
    (isFinite(gramProtein) ? gramProtein : 0) * 4 +
    (isFinite(gramCarbs) ? gramCarbs : 0) * 4 +
    (isFinite(gramFat) ? gramFat : 0) * 9;
  const gramMismatch = Math.abs(calFromGrams - calorieTarget) > 50;

  const handleSaveMacros = async () => {
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let payload: {
      proteinG: number; carbsG: number; fatG: number;
      proteinPct?: number; carbsPct?: number; fatPct?: number;
    };

    if (mode === 'pct') {
      // Ray requirement #4: persist BOTH grams and percentages
      payload = {
        proteinG: gramsFromPct.protein,
        carbsG: gramsFromPct.carbs,
        fatG: gramsFromPct.fat,
        proteinPct: pct.protein,
        carbsPct: pct.carbs,
        fatPct: pct.fat,
      };
    } else {
      const p = parseFloat(gramInputs.protein);
      const c = parseFloat(gramInputs.carbs);
      const f = parseFloat(gramInputs.fat);
      if (!isFinite(p) || p < 0 || !isFinite(c) || c < 0 || !isFinite(f) || f < 0) {
        Alert.alert('Invalid values', 'Macro grams must be valid numbers.');
        setSaving(false);
        return;
      }
      payload = { proteinG: Math.round(p), carbsG: Math.round(c), fatG: Math.round(f) };
    }

    const result = await updateDocument(COLLECTIONS.PROFILE, 'data', {
      macros: payload,
    } as any);

    setSaving(false);

    if (result.error) {
      Alert.alert('Save failed', 'Could not save macro targets. Please try again.');
      return;
    }

    await refreshProfile();
    Alert.alert('Saved', 'Macro targets updated.');
  };

  return (
    <View>
      <SectionHeader title="MACRO TARGETS" colors={colors} />
      <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>

        {/* Mode toggle */}
        <View style={[styles.modeToggle, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {(['pct', 'grams'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && { backgroundColor: Colors.nutrition }]}
              onPress={() => setMode(m)}
            >
              <Text style={[styles.modeBtnText, { color: mode === m ? 'white' : colors.textPrimary }]}>
                {m === 'pct' ? 'By Percentage' : 'Fixed Grams'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === 'pct' ? (
          <>
            {/* Presets */}
            <View style={styles.presetRow}>
              {PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={[styles.presetBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPct({ protein: preset.protein, carbs: preset.carbs, fat: preset.fat });
                  }}
                >
                  <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sliders */}
            {([
              { key: 'protein' as const, label: 'Protein', color: '#4A90D9' },
              { key: 'carbs' as const, label: 'Carbs', color: Colors.warning },
              { key: 'fat' as const, label: 'Fat', color: Colors.error },
            ]).map(({ key, label, color }) => (
              <View key={key} style={styles.sliderRow}>
                <View style={styles.sliderLabelRow}>
                  <Text style={[styles.sliderLabel, { color: colors.textPrimary }]}>{label}</Text>
                  <Text style={[styles.sliderPct, { color }]}>{pct[key]}%</Text>
                  <Text style={[styles.sliderGrams, { color: colors.textSecondary }]}>
                    = {gramsFromPct[key]}g
                  </Text>
                </View>
                <PercentageSlider
                  value={pct[key]}
                  onChange={(v) => setPct((prev) => adjustPercentages(key, v, prev))}
                  color={color}
                  colors={colors}
                />
              </View>
            ))}

            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total</Text>
              <Text style={[styles.totalValue, { color: pct.protein + pct.carbs + pct.fat === 100 ? '#4CAF50' : Colors.error }]}>
                {pct.protein + pct.carbs + pct.fat}%
              </Text>
            </View>
          </>
        ) : (
          <>
            {([
              { key: 'protein' as const, label: 'Protein (g)', color: '#4A90D9' },
              { key: 'carbs' as const, label: 'Carbs (g)', color: Colors.warning },
              { key: 'fat' as const, label: 'Fat (g)', color: Colors.error },
            ]).map(({ key, label }) => (
              <FormRow key={key} label={label}>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                  value={gramInputs[key]}
                  onChangeText={(v) => setGramInputs((prev) => ({ ...prev, [key]: v }))}
                  keyboardType="decimal-pad"
                  maxLength={5}
                  returnKeyType="done"
                />
              </FormRow>
            ))}

            <View style={[styles.calFromMacros, { borderColor: colors.border }]}>
              <Text style={[styles.calFromMacrosText, { color: colors.textSecondary }]}>
                Total from macros:{' '}
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                  {Math.round(calFromGrams).toLocaleString()} cal
                </Text>
              </Text>
              {gramMismatch && (
                <Text style={[styles.gramWarning, { color: Colors.warning }]}>
                  ⚠ These macros total {Math.round(calFromGrams).toLocaleString()} cal, but your target is{' '}
                  {calorieTarget.toLocaleString()} cal.
                </Text>
              )}
            </View>
          </>
        )}
      </View>

      <SaveButton label="Save Macro Targets" onPress={handleSaveMacros} saving={saving} />
    </View>
  );
}

// ─── Meal Slot Customization Section ─────────────────────────────────────────

function MealSlotsSection({ colors }: { colors: Theme['colors'] }) {
  const { userProfile, refreshProfile } = useAuth();
  const [slots, setSlots] = useState<MealSlotConfig[]>(
    userProfile?.mealSlots ?? DEFAULT_MEAL_SLOTS
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Inline rename — local state only, no Firestore write (Ray requirement #6)
  const handleRename = (id: string, newLabel: string) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, label: newLabel } : s))
    );
  };

  const handleAdd = () => {
    const newLabel = 'New Slot';
    const newId = generateSlotId(newLabel, slots); // Ray requirement #1: collision-safe
    setSlots((prev) => [...prev, { id: newId, label: newLabel, isDefault: false }]);
    setEditingId(newId);
  };

  const handleDelete = (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSave = async () => {
    // Validate: no empty labels
    if (slots.some((s) => !s.label.trim())) {
      Alert.alert('Empty label', 'All meal slot names must be non-empty.');
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const cleanSlots = slots.map((s) => ({ ...s, label: s.label.trim() }));
    const result = await updateDocument(COLLECTIONS.PROFILE, 'data', {
      mealSlots: cleanSlots,
    } as any);

    setSaving(false);

    if (result.error) {
      Alert.alert('Save failed', 'Could not save meal slots. Please try again.');
      return;
    }

    setSlots(cleanSlots);
    await refreshProfile();
    Alert.alert('Saved', 'Meal slots updated.');
  };

  return (
    <View>
      <SectionHeader title="MEAL SLOT CUSTOMIZATION" colors={colors} />
      <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {slots.map((slot) => (
          <View
            key={slot.id}
            style={[styles.slotRow, { borderBottomColor: colors.border }]}
          >
            <Ionicons name="menu-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />

            {editingId === slot.id ? (
              <TextInput
                style={[styles.slotNameInput, { color: colors.textPrimary, borderColor: Colors.nutrition }]}
                value={slot.label}
                onChangeText={(v) => handleRename(slot.id, v)}
                onBlur={() => setEditingId(null)}
                autoFocus
                maxLength={30}
                returnKeyType="done"
                onSubmitEditing={() => setEditingId(null)}
              />
            ) : (
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => setEditingId(slot.id)}
              >
                <Text style={[styles.slotName, { color: colors.textPrimary }]}>{slot.label}</Text>
              </TouchableOpacity>
            )}

            {slot.isDefault ? (
              <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
            ) : (
              <TouchableOpacity
                onPress={() => handleDelete(slot.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.addSlotBtn, { borderColor: Colors.nutrition }]}
          onPress={handleAdd}
        >
          <Ionicons name="add" size={16} color={Colors.nutrition} />
          <Text style={[styles.addSlotBtnText, { color: Colors.nutrition }]}>Add Meal Slot</Text>
        </TouchableOpacity>
      </View>

      <SaveButton label="Save Meal Slots" onPress={handleSave} saving={saving} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NutritionSettingsScreen() {
  const { colors } = useTheme();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <TDEESection colors={colors} />
      <MacroTargetsSection colors={colors} />
      <MealSlotsSection colors={colors} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 60 },

  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 2,
  },

  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },

  formRow: { gap: 6 },
  formLabel: { fontSize: 12, fontWeight: '600', color: '#888', letterSpacing: 0.4 },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  formInputSmall: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    flex: 1,
  },
  heightRow: { flexDirection: 'row', gap: 8 },

  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleBtnText: { fontSize: 14, fontWeight: '600' },

  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  pickerBtnText: { fontSize: 14, flex: 1 },
  pickerDropdown: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginTop: -4 },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerItemText: { fontSize: 13, flex: 1 },

  calcBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  calcBtnText: { fontSize: 15, fontWeight: '700' },

  tdeeResult: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  tdeeResultLabel: { fontSize: 13 },
  tdeeResultValue: { fontSize: 22, fontWeight: '800' },

  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 4,
  },

  goalRow: { flexDirection: 'row', gap: 6 },
  goalBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  goalBtnText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  offsetInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },

  targetResult: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginTop: 4,
  },
  targetResultText: { fontSize: 15, textAlign: 'center' },

  saveBtn: {
    marginTop: 12,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 4,
  },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  // Macro targets
  modeToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  modeBtnText: { fontSize: 14, fontWeight: '600' },

  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  presetBtnText: { fontSize: 13, fontWeight: '500' },

  sliderRow: { gap: 8 },
  sliderLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sliderLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  sliderPct: { fontSize: 14, fontWeight: '700', width: 36, textAlign: 'right' },
  sliderGrams: { fontSize: 12, width: 44, textAlign: 'right' },

  sliderTrack: {
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 14,
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    top: 3,
    marginLeft: -11,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  totalLabel: { fontSize: 13 },
  totalValue: { fontSize: 14, fontWeight: '700' },

  calFromMacros: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 6,
  },
  calFromMacrosText: { fontSize: 14 },
  gramWarning: { fontSize: 13, lineHeight: 18 },

  // Meal slots
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  slotName: { fontSize: 15, fontWeight: '500', flex: 1 },
  slotNameInput: {
    flex: 1,
    fontSize: 15,
    borderBottomWidth: 1.5,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  addSlotBtnText: { fontSize: 14, fontWeight: '600' },
});
