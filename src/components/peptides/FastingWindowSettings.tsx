/**
 * FastingWindowSettings — inline configuration form for a peptide's
 * per-injection fasting window.
 *
 * Renders two numeric steppers (pre / post) and a notification toggle.
 * Calls onSave with the validated window on every change.
 * Purely controlled — parent owns the state.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import type { PeptideFastingWindow } from '../../types/peptideFasting';
import { clampPeptideFastingMinutes, PEPTIDE_FASTING_MAX_MINUTES } from '../../utils/peptideFasting';
import type { Theme } from '../../constants/theme';

type Props = {
  value: PeptideFastingWindow;
  onChange: (updated: PeptideFastingWindow) => void;
  colors: Theme['colors'];
};

// Step increments for the steppers
const STEP_OPTIONS = [0, 15, 30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480];

/** Round a minutes value to the nearest step in STEP_OPTIONS. */
function snapToStep(minutes: number): number {
  return STEP_OPTIONS.reduce((prev, curr) =>
    Math.abs(curr - minutes) < Math.abs(prev - minutes) ? curr : prev,
  );
}

function nextStep(current: number, direction: 1 | -1): number {
  const idx = STEP_OPTIONS.indexOf(snapToStep(current));
  const next = idx + direction;
  if (next < 0) return STEP_OPTIONS[0]!;
  if (next >= STEP_OPTIONS.length) return STEP_OPTIONS[STEP_OPTIONS.length - 1]!;
  return STEP_OPTIONS[next]!;
}

function formatMinutes(mins: number): string {
  if (mins === 0) return 'None';
  if (mins < 60) return `${mins} min`;
  const h = mins / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hr`;
}

export function FastingWindowSettings({ value, onChange, colors }: Props) {
  const update = (patch: Partial<PeptideFastingWindow>) => {
    const next: PeptideFastingWindow = {
      ...value,
      ...patch,
      preInjectionMinutes: clampPeptideFastingMinutes(
        patch.preInjectionMinutes ?? value.preInjectionMinutes,
      ),
      postInjectionMinutes: clampPeptideFastingMinutes(
        patch.postInjectionMinutes ?? value.postInjectionMinutes,
      ),
    };
    onChange(next);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>FASTING WINDOW</Text>

      {/* Pre-injection stepper */}
      <View style={styles.row}>
        <View style={styles.rowLabel}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Before injection</Text>
          <Text style={[styles.sublabel, { color: colors.textSecondary }]}>
            Fast before administering
          </Text>
        </View>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={[styles.stepBtn, { borderColor: colors.border }]}
            onPress={() =>
              update({ preInjectionMinutes: nextStep(value.preInjectionMinutes, -1) })
            }
          >
            <Ionicons name="remove" size={18} color={Colors.peptide} />
          </TouchableOpacity>
          <Text style={[styles.stepValue, { color: colors.textPrimary }]}>
            {formatMinutes(value.preInjectionMinutes)}
          </Text>
          <TouchableOpacity
            style={[styles.stepBtn, { borderColor: colors.border }]}
            onPress={() =>
              update({ preInjectionMinutes: nextStep(value.preInjectionMinutes, 1) })
            }
          >
            <Ionicons name="add" size={18} color={Colors.peptide} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Post-injection stepper */}
      <View style={[styles.row, styles.rowDivider, { borderTopColor: colors.border }]}>
        <View style={styles.rowLabel}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>After injection</Text>
          <Text style={[styles.sublabel, { color: colors.textSecondary }]}>
            Continue fasting after dose
          </Text>
        </View>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={[styles.stepBtn, { borderColor: colors.border }]}
            onPress={() =>
              update({ postInjectionMinutes: nextStep(value.postInjectionMinutes, -1) })
            }
          >
            <Ionicons name="remove" size={18} color={Colors.peptide} />
          </TouchableOpacity>
          <Text style={[styles.stepValue, { color: colors.textPrimary }]}>
            {formatMinutes(value.postInjectionMinutes)}
          </Text>
          <TouchableOpacity
            style={[styles.stepBtn, { borderColor: colors.border }]}
            onPress={() =>
              update({ postInjectionMinutes: nextStep(value.postInjectionMinutes, 1) })
            }
          >
            <Ionicons name="add" size={18} color={Colors.peptide} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Notify toggle — only shown when post window > 0 */}
      {value.postInjectionMinutes > 0 && (
        <View style={[styles.row, styles.rowDivider, { borderTopColor: colors.border }]}>
          <View style={styles.rowLabel}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Notify when window ends
            </Text>
            <Text style={[styles.sublabel, { color: colors.textSecondary }]}>
              Alert when eating is allowed
            </Text>
          </View>
          <Switch
            value={value.notifyWhenWindowEnds}
            onValueChange={(v) => update({ notifyWhenWindowEnds: v })}
            trackColor={{ true: Colors.peptide }}
            thumbColor="white"
          />
        </View>
      )}

      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Max {PEPTIDE_FASTING_MAX_MINUTES / 60} hours per side
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { flex: 1, marginRight: 12 },
  label: { fontSize: 14, fontWeight: '500' },
  sublabel: { fontSize: 12, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { fontSize: 14, fontWeight: '600', minWidth: 48, textAlign: 'center' },
  hint: { fontSize: 11, marginTop: 8 },
});
