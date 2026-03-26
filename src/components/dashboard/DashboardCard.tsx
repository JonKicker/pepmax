/**
 * DashboardCard — shared card wrapper for all dashboard sections.
 *
 * FIX 3: TouchableOpacity replaced with AnimatedPressable. Manual Haptics.impactAsync
 * removed — haptic is now delegated to AnimatedPressable's `haptic` prop to avoid
 * double haptic firing.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Theme } from '../../constants/theme';
import { GlassCard } from '../GlassCard';
import { AnimatedPressable } from '../AnimatedPressable';

type Props = {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  onPress?: () => void;
  children: React.ReactNode;
  colors: Theme['colors'];
};

export function DashboardCard({ title, icon, iconColor, onPress, children, colors }: Props) {
  const content = (
    <GlassCard intensity="heavy" style={{ marginBottom: 12 }} padding={16}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={18} color={iconColor} />
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
        {onPress && (
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={styles.chevron} />
        )}
      </View>
      {children}
    </GlassCard>
  );

  if (onPress) {
    return (
      <AnimatedPressable haptic onPress={onPress}>
        {content}
      </AnimatedPressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  chevron: {
    marginLeft: 'auto',
  },
});
