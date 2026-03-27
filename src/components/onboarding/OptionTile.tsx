/**
 * OptionTile — reusable selection tile used across all quiz steps.
 *
 * Supports:
 * - single-select (accessibilityRole="radio")
 * - multi-select  (accessibilityRole="checkbox")
 * - icon + label layout
 * - selected state: accent border + subtle accent background glow
 * - Haptic feedback on press (handled by caller, or pass onPress directly)
 */
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

type Props = {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  selected: boolean;
  onPress: () => void;
  /** 'checkbox' for multi-select, 'radio' for single-select */
  mode?: 'checkbox' | 'radio';
  /** Override accent color for goal-specific colours */
  accentColor?: string;
  /** Extra style overrides for the outer tile */
  style?: object;
};

export default function OptionTile({
  label,
  description,
  icon,
  selected,
  onPress,
  mode = 'radio',
  accentColor,
  style,
}: Props) {
  const { colors } = useTheme();
  const accent = accentColor ?? Colors.accent;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole={mode}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={[
        styles.tile,
        {
          borderColor: selected ? accent : colors.border,
          backgroundColor: selected ? accent + '18' : colors.surface,
        },
        style,
      ]}
    >
      {/* Left icon area */}
      {icon && <View style={styles.iconWrap}>{icon}</View>}

      {/* Text */}
      <View style={styles.textWrap}>
        <Text
          style={[styles.label, { color: colors.textPrimary }]}
          numberOfLines={2}
        >
          {label}
        </Text>
        {description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>
        ) : null}
      </View>

      {/* Indicator dot / checkbox */}
      <View
        style={[
          styles.indicator,
          mode === 'checkbox' ? styles.checkboxShape : styles.radioShape,
          {
            borderColor: selected ? accent : colors.border,
            backgroundColor: selected ? accent : 'transparent',
          },
        ]}
      >
        {selected && (
          <Text style={styles.checkMark}>{mode === 'checkbox' ? '✓' : '●'}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
    minHeight: 60,
  },
  iconWrap: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  indicator: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  checkboxShape: {
    borderRadius: 6,
  },
  radioShape: {
    borderRadius: 11,
  },
  checkMark: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
});
