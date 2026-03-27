/**
 * SupersetGroup.tsx
 *
 * Visual wrapper for grouped superset or circuit exercises.
 * Renders a colored left-border bracket with a group label badge,
 * then renders children inside it.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getGroupLabel } from '../../utils/supersetNavigation';
import { Colors } from '../../constants/theme';

// ─── Color palette (same as template-builder) ────────────────────────────────

const GROUP_PALETTE = [Colors.cardio, Colors.peptide, Colors.nutrition, Colors.gold, Colors.gym];

export function getGroupColor(groupNumber: number): string {
  return GROUP_PALETTE[groupNumber % GROUP_PALETTE.length];
}

// ─── SupersetGroup ────────────────────────────────────────────────────────────

export function SupersetGroup({
  groupNumber,
  circuitRounds,
  currentRound,
  colors,
  children,
}: {
  groupNumber: number;
  circuitRounds?: number;
  currentRound?: number;
  colors: any;
  children: React.ReactNode;
}) {
  const accentColor = getGroupColor(groupNumber);
  const label = getGroupLabel(groupNumber);

  const headerLabel =
    circuitRounds != null
      ? `Circuit ${label}${currentRound != null ? ` — Round ${currentRound}/${circuitRounds}` : ''}`
      : `Superset ${label}`;

  return (
    <View style={[groupStyles.container, { borderLeftColor: accentColor }]}>
      {/* Group label badge */}
      <View style={[groupStyles.labelBadge, { backgroundColor: accentColor + '20', borderColor: accentColor + '40' }]}>
        <Text style={[groupStyles.labelText, { color: accentColor }]}>
          {headerLabel}
        </Text>
      </View>

      {/* Exercise children */}
      {children}
    </View>
  );
}

const groupStyles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    marginLeft: 8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  labelBadge: {
    alignSelf: 'flex-start',
    marginLeft: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
