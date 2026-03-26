/**
 * Bottom sheet content for a tapped measurement point.
 * Shows: field name, latest value, trend, mini history, action button.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { LAYER_COLORS } from '../../types/bodyHub';
import type { MeasurementPointData } from '../../types/bodyHub';

type Props = {
  data: MeasurementPointData | null;
  onClose: () => void;
  onLogAll: () => void;
};

const TREND_TEXT: Record<string, string> = {
  up: 'Increasing',
  down: 'Decreasing',
  flat: 'Stable',
  none: 'No trend data',
};

const TREND_ICONS: Record<string, string> = {
  up: 'trending-up',
  down: 'trending-down',
  flat: 'remove-outline',
  none: 'help-circle-outline',
};

const TREND_COLORS: Record<string, string> = {
  up: '#22C55E',
  down: '#EF4444',
  flat: '#9CA3AF',
  none: '#9CA3AF',
};

export default function MeasurementDetailSheet({ data, onClose, onLogAll }: Props) {
  const { colors } = useTheme();

  if (!data) return null;

  const layerColor = LAYER_COLORS.measurements;
  const hasHistory = data.history.length > 0;

  const handleLogAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    onLogAll();
  };

  return (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.fieldName, { color: colors.textPrimary }]}>
          {data.label.replace('L ', 'Left ').replace('R ', 'Right ')}
        </Text>
        <View style={[styles.trendBadge, { backgroundColor: TREND_COLORS[data.trend] + '1A' }]}>
          <Ionicons
            name={TREND_ICONS[data.trend] as any}
            size={14}
            color={TREND_COLORS[data.trend]}
          />
          <Text style={[styles.trendText, { color: TREND_COLORS[data.trend] }]}>
            {TREND_TEXT[data.trend]}
          </Text>
        </View>
      </View>

      {/* Current value */}
      <View style={styles.valueRow}>
        <Text style={[styles.currentValue, { color: colors.textPrimary }]}>
          {data.latestValue != null ? `${data.latestValue.toFixed(1)} ${data.unit}` : 'No data'}
        </Text>
        {data.history.length >= 2 && (
          <Text style={[styles.delta, { color: colors.textSecondary }]}>
            {(() => {
              const diff = data.history[0].value - data.history[1].value;
              const sign = diff >= 0 ? '+' : '';
              return `${sign}${diff.toFixed(1)} ${data.unit} since last`;
            })()}
          </Text>
        )}
      </View>

      {/* Mini history list */}
      {hasHistory && (
        <View style={styles.historySection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Recent</Text>
          {data.history.slice(0, 5).map((entry, i) => (
            <View key={i} style={styles.historyRow}>
              <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <Text style={[styles.historyValue, { color: colors.textPrimary }]}>
                {entry.value.toFixed(1)} {data.unit}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: layerColor }]}
        onPress={handleLogAll}
        activeOpacity={0.7}
      >
        <Ionicons name="resize-outline" size={18} color="#FFFFFF" />
        <Text style={styles.actionBtnText}>Log All Measurements</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fieldName: {
    fontSize: 20,
    fontWeight: '700',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 13,
    fontWeight: '500',
  },

  valueRow: {
    marginBottom: 16,
  },
  currentValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 2,
  },
  delta: {
    fontSize: 13,
  },

  historySection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  historyDate: {
    fontSize: 13,
  },
  historyValue: {
    fontSize: 13,
    fontWeight: '500',
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
