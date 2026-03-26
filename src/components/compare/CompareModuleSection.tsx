/**
 * CompareModuleSection — collapsible section header for a compare module.
 *
 * Renders an Ionicons icon + title with an accent color underline.
 * Children should be CompareStatRow instances.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Props ────────────────────────────────────────────────────────────────────

type CompareModuleSectionProps = {
  title: string;
  accentColor: string;
  icon: string;
  children: React.ReactNode;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CompareModuleSection({
  title,
  accentColor,
  icon,
  children,
}: CompareModuleSectionProps) {
  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.header}>
        <Ionicons name={icon as any} size={18} color={accentColor} />
        <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
      </View>

      {/* Accent underline */}
      <View style={[styles.underline, { backgroundColor: accentColor }]} />

      {/* Stat rows */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  underline: {
    height: 2,
    borderRadius: 1,
    marginBottom: 8,
    opacity: 0.6,
  },
  content: {
    gap: 2,
  },
});
