/**
 * BarCalcSection.tsx
 *
 * Renders the warm-up sets and plate calculator blocks for bar-based exercises,
 * along with toggle buttons to show/hide each section.
 *
 * NOTE: gymCalcStyles uses hardcoded colors from Colors.gym — dark mode is not
 * fully supported here; the toggle button active state relies on Colors.gym only.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';
import { WarmUpSets } from './WarmUpSets';
import { PlateCalculator } from './PlateCalculator';
import type { BarType } from '../../types/warmUp';

// ─── Props ───────────────────────────────────────────────────────────────────

interface BarCalcSectionProps {
  barType: BarType | null;
  firstSetWeight: number;
  weightUnit: 'lbs' | 'kg';
  gymSettings: { showWarmUp: boolean; showPlateCalc: boolean };
  toggleWarmUp: () => void;
  togglePlateCalc: () => void;
  colors: any;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BarCalcSection({
  barType,
  firstSetWeight,
  weightUnit,
  gymSettings,
  toggleWarmUp,
  togglePlateCalc,
  colors,
}: BarCalcSectionProps) {
  if (barType === null || firstSetWeight <= 0) return null;

  return (
    <View style={gymCalcStyles.calcWrapper}>
      {gymSettings.showWarmUp && (
        <WarmUpSets
          workingWeight={firstSetWeight}
          unit={weightUnit}
          barType={barType}
        />
      )}
      {gymSettings.showPlateCalc && (
        <PlateCalculator
          totalWeight={firstSetWeight}
          unit={weightUnit}
          barType={barType}
        />
      )}
      <View style={gymCalcStyles.toggleRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={toggleWarmUp}
          style={[
            gymCalcStyles.toggleBtn,
            { borderColor: colors.border },
            gymSettings.showWarmUp && gymCalcStyles.toggleBtnActive,
          ]}
        >
          <Text
            style={[
              gymCalcStyles.toggleText,
              { color: gymSettings.showWarmUp ? Colors.gym : colors.textSecondary },
            ]}
          >
            Warm-Up
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={togglePlateCalc}
          style={[
            gymCalcStyles.toggleBtn,
            { borderColor: colors.border },
            gymSettings.showPlateCalc && gymCalcStyles.toggleBtnActive,
          ]}
        >
          <Text
            style={[
              gymCalcStyles.toggleText,
              { color: gymSettings.showPlateCalc ? Colors.gym : colors.textSecondary },
            ]}
          >
            Plates
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const gymCalcStyles = StyleSheet.create({
  calcWrapper: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: Colors.gym + '15',
    borderColor: Colors.gym,
  } as const,
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
