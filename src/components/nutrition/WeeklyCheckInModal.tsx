/**
 * WeeklyCheckInModal — presents the adaptive coaching weekly review.
 *
 * Two states:
 *   ready    — 7+ days of data collected; shows estimated TDEE, weight trend,
 *              new recommended targets, and Accept/Keep buttons.
 *   progress — fewer than 7 qualifying days; shows a progress bar and
 *              encouragement to keep logging.
 *
 * The modal does not write to Firestore itself — callers handle acceptCheckIn
 * and dismissCheckIn so navigation and profile refresh stay in screen scope.
 */
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { kgToLbs } from '../../utils/tdee';
import { Colors } from '../../constants/theme';
import type { AdaptiveTDEEResult, AdaptiveTargets, DataReadiness } from '../../types/adaptiveCoaching';
import type { NutritionTargets } from '../../types/nutrition';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  onAccept: (targets: AdaptiveTargets) => void;
  // Null when not enough data yet (progress state)
  checkInData: { result: AdaptiveTDEEResult; targets: AdaptiveTargets } | null;
  readiness: DataReadiness | null;
  currentTargets: NutritionTargets;
};

export default function WeeklyCheckInModal({
  visible,
  onDismiss,
  onAccept,
  checkInData,
  readiness,
  currentTargets,
}: Props) {
  const { colors } = useTheme();
  const { isImperial } = useUnits();
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const isReady = checkInData !== null;

  // Trend direction label and icon
  function trendLabel(kgPerWeek: number): { text: string; icon: keyof typeof Ionicons.glyphMap; color: string } {
    const threshold = 0.1; // less than 0.1 kg/week = flat
    if (kgPerWeek < -threshold) {
      // Convert to display units — kgToLbs only when imperial, raw value for metric
      const displayValue = isImperial ? kgToLbs(Math.abs(kgPerWeek)) : Math.abs(kgPerWeek);
      const unit = isImperial ? 'lbs' : 'kg';
      return {
        text: `Down ${displayValue.toFixed(1)} ${unit}/week`,
        icon: 'trending-down-outline',
        color: Colors.nutrition,
      };
    }
    if (kgPerWeek > threshold) {
      const displayValue = isImperial ? kgToLbs(kgPerWeek) : kgPerWeek;
      const unit = isImperial ? 'lbs' : 'kg';
      return {
        text: `Up ${displayValue.toFixed(1)} ${unit}/week`,
        icon: 'trending-up-outline',
        color: Colors.error,
      };
    }
    return { text: 'Stable', icon: 'remove-outline', color: colors.textSecondary };
  }

  function confidenceColor(c: AdaptiveTDEEResult['confidence']): string {
    return c === 'high' ? Colors.nutrition : c === 'medium' ? Colors.warning : Colors.error;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      {/* Overlay tap to dismiss */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onDismiss}
      />

      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="analytics-outline" size={20} color={Colors.nutrition} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Weekly Check-In
          </Text>
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          {isReady ? (
            <ReadyContent
              result={checkInData!.result}
              targets={checkInData!.targets}
              colors={colors}
              trendLabel={trendLabel}
              confidenceColor={confidenceColor}
              howItWorksOpen={howItWorksOpen}
              onToggleHowItWorks={() => setHowItWorksOpen((v) => !v)}
              onAccept={() => onAccept(checkInData!.targets)}
              onDismiss={onDismiss}
            />
          ) : (
            <ProgressContent
              readiness={readiness}
              colors={colors}
              onDismiss={onDismiss}
            />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Ready state ─────────────────────────────────────────────────────────────

function ReadyContent({
  result,
  targets,
  colors,
  trendLabel,
  confidenceColor,
  howItWorksOpen,
  onToggleHowItWorks,
  onAccept,
  onDismiss,
}: {
  result: AdaptiveTDEEResult;
  targets: AdaptiveTargets;
  colors: ReturnType<typeof useTheme>['colors'];
  trendLabel: (kgPerWeek: number) => { text: string; icon: keyof typeof Ionicons.glyphMap; color: string };
  confidenceColor: (c: AdaptiveTDEEResult['confidence']) => string;
  howItWorksOpen: boolean;
  onToggleHowItWorks: () => void;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const trend = trendLabel(result.weightChangeKgPerWeek);

  return (
    <>
      {/* Estimated TDEE card */}
      <View style={[styles.card, { backgroundColor: colors.background }]}>
        <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
          Based on your real data, you burn approximately
        </Text>
        <View style={styles.tdeeRow}>
          <Text style={[styles.tdeeNumber, { color: colors.textPrimary }]}>
            {result.estimatedTDEE.toLocaleString()}
          </Text>
          <Text style={[styles.tdeeUnit, { color: colors.textSecondary }]}> kcal/day</Text>
        </View>
        <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor(result.confidence) + '22' }]}>
          <Text style={[styles.confidenceText, { color: confidenceColor(result.confidence) }]}>
            {result.confidence.charAt(0).toUpperCase() + result.confidence.slice(1)} confidence
            {' '}· {result.daysOfData} days of data
          </Text>
        </View>
      </View>

      {/* Weight trend */}
      <View style={[styles.card, { backgroundColor: colors.background }]}>
        <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Weight trend</Text>
        <View style={styles.trendRow}>
          <Ionicons name={trend.icon} size={20} color={trend.color} />
          <Text style={[styles.trendText, { color: trend.color }]}>{trend.text}</Text>
        </View>
        <Text style={[styles.cardSubtext, { color: colors.textSecondary }]}>
          Avg. intake: {result.avgDailyCalories.toLocaleString()} kcal/day
        </Text>
      </View>

      {/* Floor warning */}
      {targets.floorApplied && targets.floorWarning && (
        <View style={[styles.warningBanner, { backgroundColor: Colors.warning + '22', borderColor: Colors.warning }]}>
          <Ionicons name="warning-outline" size={16} color={Colors.warning} />
          <Text style={[styles.warningText, { color: Colors.warning }]}>
            {targets.floorWarning}
          </Text>
        </View>
      )}

      {/* New recommended targets */}
      <View style={[styles.card, { backgroundColor: colors.background }]}>
        <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>New recommended target</Text>
        <Text style={[styles.newTarget, { color: colors.textPrimary }]}>
          {targets.calorieTarget.toLocaleString()} kcal/day
        </Text>
        <View style={styles.macroRow}>
          <MacroPill label="Protein" g={targets.macros.proteinG} color="#4A90D9" />
          <MacroPill label="Carbs" g={targets.macros.carbsG} color={Colors.warning} />
          <MacroPill label="Fat" g={targets.macros.fatG} color={Colors.error} />
        </View>
      </View>

      {/* How it works collapsible */}
      <TouchableOpacity
        style={styles.howItWorksToggle}
        onPress={onToggleHowItWorks}
        activeOpacity={0.7}
      >
        <Text style={[styles.howItWorksLabel, { color: colors.textSecondary }]}>
          How does this work?
        </Text>
        <Ionicons
          name={howItWorksOpen ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
      {howItWorksOpen && (
        <Text style={[styles.howItWorksBody, { color: colors.textSecondary }]}>
          Your estimated TDEE is calculated by comparing your average daily calorie intake
          to your actual weight change. If you ate 2,000 kcal/day and lost 1 lb/week, your
          TDEE must be ~2,500. Weight is smoothed to filter out water retention swings.
          The more days of data, the higher the confidence.
        </Text>
      )}

      {/* Action buttons */}
      <TouchableOpacity
        style={[styles.acceptButton, { backgroundColor: Colors.nutrition }]}
        onPress={onAccept}
        activeOpacity={0.7}
      >
        <Text style={styles.acceptButtonText}>Accept New Targets</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.keepButton, { borderColor: colors.border }]}
        onPress={onDismiss}
        activeOpacity={0.7}
      >
        <Text style={[styles.keepButtonText, { color: colors.textSecondary }]}>Keep Current Targets</Text>
      </TouchableOpacity>
    </>
  );
}

// ─── Progress state (not enough data) ────────────────────────────────────────

function ProgressContent({
  readiness,
  colors,
  onDismiss,
}: {
  readiness: DataReadiness | null;
  colors: ReturnType<typeof useTheme>['colors'];
  onDismiss: () => void;
}) {
  const daysWithData = readiness?.daysWithBothData ?? 0;
  const daysNeeded = readiness?.daysNeeded ?? 7;
  const progress = Math.min(daysWithData / daysNeeded, 1);

  return (
    <>
      <View style={[styles.card, { backgroundColor: colors.background }]}>
        <Ionicons name="barbell-outline" size={32} color={Colors.nutrition} style={styles.progressIcon} />
        <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>
          Building your baseline
        </Text>
        <Text style={[styles.progressSubtitle, { color: colors.textSecondary }]}>
          Log your weight and meals daily. After {daysNeeded} days, we'll estimate
          your real calorie burn.
        </Text>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[styles.progressFill, { backgroundColor: Colors.nutrition, width: `${progress * 100}%` as any }]}
          />
        </View>
        <Text style={[styles.progressCount, { color: colors.textSecondary }]}>
          {daysWithData} of {daysNeeded} days with both weight + food data
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.acceptButton, { backgroundColor: Colors.nutrition }]}
        onPress={onDismiss}
        activeOpacity={0.7}
      >
        <Text style={styles.acceptButtonText}>Got it</Text>
      </TouchableOpacity>
    </>
  );
}

// ─── Macro pill ───────────────────────────────────────────────────────────────

function MacroPill({ label, g, color }: { label: string; g: number; color: string }) {
  return (
    <View style={[styles.macroPill, { backgroundColor: color + '20' }]}>
      <Text style={[styles.macroPillValue, { color }]}>{g}g</Text>
      <Text style={[styles.macroPillLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600' },

  body: { padding: 16, paddingBottom: 40, gap: 12 },

  card: {
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  cardLabel: { fontSize: 13, fontWeight: '500' },
  cardSubtext: { fontSize: 12 },

  tdeeRow: { flexDirection: 'row', alignItems: 'flex-end' },
  tdeeNumber: { fontSize: 42, fontWeight: '300', lineHeight: 48 },
  tdeeUnit: { fontSize: 16, marginBottom: 6 },

  confidenceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  confidenceText: { fontSize: 12, fontWeight: '600' },

  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trendText: { fontSize: 18, fontWeight: '600' },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  warningText: { flex: 1, fontSize: 13, lineHeight: 18 },

  newTarget: { fontSize: 32, fontWeight: '300' },
  macroRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  macroPill: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
  },
  macroPillValue: { fontSize: 16, fontWeight: '600' },
  macroPillLabel: { fontSize: 11, fontWeight: '500' },

  howItWorksToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  howItWorksLabel: { fontSize: 13 },
  howItWorksBody: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  acceptButton: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  acceptButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  keepButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  keepButtonText: { fontSize: 15, fontWeight: '500' },

  progressIcon: { alignSelf: 'center', marginBottom: 4 },
  progressTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  progressSubtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  progressTrack: { height: 8, borderRadius: 4, marginTop: 8 },
  progressFill: { height: 8, borderRadius: 4 },
  progressCount: { fontSize: 13, textAlign: 'center' },
});
