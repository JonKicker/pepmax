/**
 * BeaconToggle — toggle shown on start-session when safety contacts exist.
 * Only visible for outdoor (non-swim, non-indoor) sessions.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

type Props = {
  value: boolean;
  onToggle: () => void;
  contactCount: number;
  colors: any;
};

export default function BeaconToggle({ value, onToggle, contactCount, colors }: Props) {
  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: value ? Colors.cardio : colors.border }]}>
      <View style={styles.left}>
        <Ionicons
          name="radio-outline"
          size={20}
          color={value ? Colors.cardio : colors.textSecondary}
          style={styles.icon}
        />
        <View style={styles.labelWrap}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Safety Beacon</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            Share live location with {contactCount} contact{contactCount !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
        <View style={[styles.track, { backgroundColor: value ? Colors.cardio : '#ccc' }]}>
          <View style={[styles.thumb, { left: value ? 20 : 2 }]} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  icon: { marginRight: 10 },
  labelWrap: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
  track: { width: 44, height: 26, borderRadius: 13, position: 'relative' },
  thumb: {
    position: 'absolute',
    top: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
  },
});
