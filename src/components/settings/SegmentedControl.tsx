import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';

type Props = {
  /** Display labels for each segment */
  options: string[];
  /** Values that correspond 1:1 to options */
  values: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
};

export function SegmentedControl({ options, values, selectedValue, onValueChange }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderColor: colors.border }]}>
      {options.map((option, i) => {
        const value = values[i];
        const selected = value === selectedValue;
        return (
          <TouchableOpacity
            key={value}
            style={[
              styles.segment,
              selected && { backgroundColor: Colors.accent },
            ]}
            onPress={() => onValueChange(value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
