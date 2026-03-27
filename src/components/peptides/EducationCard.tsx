/**
 * EducationCard — expandable section card used in the compound-detail / education hub screen.
 *
 * Tap the header to expand/collapse with a smooth LayoutAnimation.
 * Chevron rotates to indicate state. Haptic on toggle.
 * Uses GlassCard for consistent glassmorphic styling.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import { GlassCard } from '../GlassCard';
import { AnimatedPressable } from '../AnimatedPressable';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface EducationCardProps {
  title: string;
  icon?: string; // Ionicons name
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function EducationCard({
  title,
  icon,
  children,
  defaultExpanded = false,
}: EducationCardProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExpanded((prev) => !prev);
  };

  return (
    <GlassCard intensity="subtle" padding={0} accentColor={expanded ? Colors.peptide : undefined}>
      {/* Header row */}
      <AnimatedPressable
        onPress={handleToggle}
        scaleValue={0.98}
        style={styles.header}
      >
        {!!icon && (
          <Ionicons
            name={icon as any}
            size={18}
            color={Colors.peptide}
            style={styles.headerIcon}
          />
        )}
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
          {title}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textSecondary}
          style={styles.chevron}
        />
      </AnimatedPressable>

      {/* Collapsible content */}
      {expanded && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerIcon: {
    marginRight: 10,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  chevron: {
    marginLeft: 8,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
  },
});
