import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';

type Props = {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  /** Replaces the right side entirely (e.g. a Switch or SegmentedControl) */
  rightElement?: React.ReactNode;
  onPress?: () => void;
  /** Red label — use for destructive actions */
  dangerous?: boolean;
  /** Disable interaction */
  disabled?: boolean;
  /** Show a separator below this row (default false) */
  separator?: boolean;
};

export function SettingsRow({
  icon,
  label,
  value,
  rightElement,
  onPress,
  dangerous = false,
  disabled = false,
  separator = false,
}: Props) {
  const { colors } = useTheme();
  const labelColor = dangerous ? Colors.error : colors.textPrimary;

  const content = (
    <View style={[styles.row, separator && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      {icon && (
        <Ionicons
          name={icon}
          size={20}
          color={dangerous ? Colors.error : colors.textSecondary}
          style={styles.icon}
        />
      )}
      <Text style={[styles.label, { color: labelColor }, disabled && styles.disabled]}>
        {label}
      </Text>
      <View style={styles.right}>
        {rightElement ?? (
          <>
            {value !== undefined && (
              <Text style={[styles.value, { color: colors.textSecondary }]} numberOfLines={1}>
                {value}
              </Text>
            )}
            {onPress && (
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            )}
          </>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    minHeight: 50,
  },
  icon: { marginRight: 12 },
  label: { flex: 1, fontSize: 15 },
  disabled: { opacity: 0.4 },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '55%',
  },
  value: { fontSize: 14 },
});
