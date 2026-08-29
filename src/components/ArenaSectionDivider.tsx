import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/theme';

export function ArenaSectionDivider() {
  return (
    <LinearGradient
      colors={[
        Colors.gold + '00',
        Colors.gold + '40',
        Colors.social + '40',
        Colors.social + '00',
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.divider}
    />
  );
}

const styles = StyleSheet.create({
  divider: { height: 1, marginVertical: 8 },
});
