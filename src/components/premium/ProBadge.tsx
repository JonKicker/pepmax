import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/theme';

type Props = { style?: ViewStyle };

export default function ProBadge({ style }: Props) {
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.text}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: 0.5,
  },
});
