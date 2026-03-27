/**
 * DirectionArrow — an up/down/flat arrow indicator, color-coded by direction.
 *
 * improving → green up arrow
 * declining  → red down arrow
 * steady     → gray flat line
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

// ─── Props ────────────────────────────────────────────────────────────────────

type Direction = 'improving' | 'declining' | 'steady';

type Props = {
  direction: Direction;
  /** Optional label displayed next to the arrow. */
  label?: string;
  /** Font size for the label. Default: 13. */
  labelSize?: number;
  /** Text color from theme (used for steady). */
  textColor?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DirectionArrow({ direction, label, labelSize = 13, textColor }: Props) {
  const { colors } = useTheme();
  const resolvedTextColor = textColor ?? colors.textSecondary;

  const DIRECTION_CONFIG: Record<
    Direction,
    { icon: keyof typeof Ionicons.glyphMap; color: string }
  > = {
    improving: { icon: 'trending-up', color: colors.nutrition },
    declining: { icon: 'trending-down', color: colors.error },
    steady: { icon: 'remove', color: colors.warning },
  };

  const { icon, color } = DIRECTION_CONFIG[direction];
  const finalColor = direction === 'steady' ? resolvedTextColor : color;

  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={finalColor} />
      {label != null && (
        <Text style={[styles.label, { color: finalColor, fontSize: labelSize }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontWeight: '600',
  },
});
