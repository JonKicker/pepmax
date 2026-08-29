import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useHalfLifeTimeline } from '../../../src/hooks/useHalfLifeTimeline';
import type { TimelineRange } from '../../../src/hooks/useHalfLifeTimeline';
import HalfLifeTimelineChart from '../../../src/components/peptides/HalfLifeTimelineChart';
import LogSideEffectModal from '../../../src/components/peptides/LogSideEffectModal';

export default function HalfLifeTimelineScreen() {
  const { colors } = useTheme();
  const [range, setRange] = useState<TimelineRange>('14d');
  const [refreshKey, setRefreshKey] = useState(0);
  const { series, sideEffects, loading, error, yMax } = useHalfLifeTimeline(range, refreshKey);
  const [showLogSideEffect, setShowLogSideEffect] = useState(false);

  useEffect(() => {
    if (error) Alert.alert('Error', error);
  }, [error]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.peptide} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <HalfLifeTimelineChart
          series={series}
          sideEffects={sideEffects}
          range={range}
          onRangeChange={setRange}
          yMax={yMax}
        />

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Curves show estimated blood levels based on half-life data. Actual levels
            vary by individual, route, and formulation.
          </Text>
        </View>
      </ScrollView>

      {/* FAB — Log Side Effect */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: Colors.peptide }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowLogSideEffect(true);
        }}
        activeOpacity={0.7}
      >
        <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="add" size={28} color="white" />
        </View>
        <Text style={styles.fabLabel}>Side Effect</Text>
      </TouchableOpacity>

      <LogSideEffectModal
        visible={showLogSideEffect}
        onClose={() => setShowLogSideEffect(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 120 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    margin: 16,
    padding: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },

  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  fabLabel: { color: 'white', fontWeight: '700', fontSize: 14 },
});
