/**
 * PeptideCard — today's doses with quick-log button.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DashboardCard } from './DashboardCard';
import { Colors } from '../../constants/theme';
import type { Theme } from '../../constants/theme';
import type { Dose } from '../../types/peptide';

type Props = {
  doses: Dose[];
  colors: Theme['colors'];
  error: boolean;
  onPress: () => void;
  onQuickLog: () => void;
};

export function PeptideCard({ doses, colors, error, onPress, onQuickLog }: Props) {
  return (
    <DashboardCard
      title="Today's Peptides"
      icon="eyedrop-outline"
      iconColor={Colors.peptide}
      onPress={onPress}
      colors={colors}
    >
      {error ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>Could not load today's doses.</Text>
      ) : doses.length === 0 ? (
        <View>
          <View style={{ alignItems: 'center', paddingVertical: 16, gap: 8 }}>
            <Ionicons name="eyedrop-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>No Doses Today</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>Log your first dose to start tracking</Text>
          </View>
          <TouchableOpacity
            style={[styles.quickLogBtn, { backgroundColor: Colors.peptide + '15', borderColor: Colors.peptide + '30' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onQuickLog();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={16} color={Colors.peptide} />
            <Text style={[styles.quickLogText, { color: Colors.peptide }]}>Log Dose</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {doses.map((dose, i) => (
            <View key={dose.id ?? i} style={[styles.doseRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.doseName, { color: colors.textPrimary }]}>{dose.peptideName}</Text>
              <Text style={[styles.doseAmount, { color: colors.textSecondary }]}>
                {dose.amount} {dose.unit}
              </Text>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.quickLogBtn, { backgroundColor: Colors.peptide + '15', borderColor: Colors.peptide + '30' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onQuickLog();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={16} color={Colors.peptide} />
            <Text style={[styles.quickLogText, { color: Colors.peptide }]}>Log Dose</Text>
          </TouchableOpacity>
        </View>
      )}
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 14, fontStyle: 'italic' },
  doseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  doseName: { fontSize: 14, fontWeight: '600' },
  doseAmount: { fontSize: 13 },
  quickLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  quickLogText: { fontSize: 14, fontWeight: '700' },
});
