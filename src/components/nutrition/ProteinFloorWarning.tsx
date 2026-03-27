/**
 * ProteinFloorWarning — inline warning shown when logged protein is below
 * the GLP-1 protein floor.
 *
 * Appears below the macro bars when:
 *   1. GLP-1 is active
 *   2. Protein logged today is below the calculated floor
 *
 * Designed to be concise and actionable — not alarming. GLP-1 users already
 * experience enough anxiety around eating; the tone is encouraging, not
 * punishing.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import type { Theme } from '../../constants/theme';

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  currentProteinG: number;
  floorG: number;
  colors: Theme['colors'];
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ProteinFloorWarning({ currentProteinG, floorG, colors }: Props): React.ReactElement | null {
  const remaining = floorG - currentProteinG;

  // Don't render if already meeting the floor
  if (remaining <= 0) return null;

  const severity = remaining > floorG * 0.5 ? 'high' : 'low';
  const iconColor = severity === 'high' ? Colors.warning : Colors.nutrition;
  const borderColor = severity === 'high' ? Colors.warning + '44' : Colors.nutrition + '44';
  const bgColor = severity === 'high' ? Colors.warning + '12' : Colors.nutrition + '12';

  return (
    <View
      style={[styles.container, { backgroundColor: bgColor, borderColor }]}
      accessibilityRole="alert"
      accessibilityLabel={`Protein floor warning: ${remaining}g below GLP-1 minimum`}
    >
      <Ionicons name="warning-outline" size={15} color={iconColor} style={styles.icon} />
      <Text style={[styles.text, { color: colors.textPrimary }]}>
        <Text style={{ fontWeight: '700', color: iconColor }}>+{remaining}g protein needed</Text>
        {' '}to hit your GLP-1 floor ({floorG}g). Prioritise protein at your next meal.
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  icon: {
    marginTop: 1,
  },
  text: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
});
