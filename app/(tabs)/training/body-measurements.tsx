import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { useUnits } from '../../../src/hooks/useUnits';
import { Colors } from '../../../src/constants/theme';
import {
  getMeasurementHistory,
  deleteMeasurement,
} from '../../../src/services/bodyMeasurementService';
import type { BodyMeasurement } from '../../../src/types/bodyMeasurement';
import ProBadge from '../../../src/components/premium/ProBadge';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function MeasurementRow({
  item,
  onDelete,
  colors,
  formatWeight,
  formatLength,
}: {
  item: BodyMeasurement;
  onDelete: (id: string) => void;
  colors: ReturnType<typeof import('../../../src/hooks/useTheme').useTheme>['colors'];
  formatWeight: (kg: number) => string;
  formatLength: (cm: number) => string;
}) {
  const badges: string[] = [];
  if (item.weight != null) badges.push(formatWeight(item.weight));
  if (item.bodyFatPercent != null) badges.push(`${item.bodyFatPercent}% BF`);
  if (item.measurements.waist != null) badges.push(`Waist ${formatLength(item.measurements.waist)}`);

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.rowAccent, { backgroundColor: Colors.gym }]} />
      <View style={styles.rowBody}>
        <Text style={[styles.rowDate, { color: colors.textPrimary }]}>{formatDate(item.date)}</Text>
        <View style={styles.badgeRow}>
          {badges.map((b, i) => (
            <View key={i} style={[styles.badge, { backgroundColor: Colors.gym + '1A' }]}>
              <Text style={[styles.badgeText, { color: Colors.gym }]}>{b}</Text>
            </View>
          ))}
          {badges.length === 0 && (
            <Text style={[styles.noData, { color: colors.textSecondary }]}>No key stats</Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        onPress={() => {
          Alert.alert('Delete entry?', 'This will permanently remove this measurement.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => onDelete(item.id),
            },
          ]);
        }}
        style={styles.deleteBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.error} />
      </TouchableOpacity>
    </View>
  );
}

export default function BodyMeasurementsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { formatWeight, formatLength } = useUnits();

  const [entries, setEntries] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const result = await getMeasurementHistory();
    if (result.error) {
      setError('Failed to load measurements. Tap to retry.');
    } else {
      // Show newest first
      setEntries([...(result.data ?? [])].reverse());
    }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleDelete = async (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const entry = entries.find((e) => e.id === id);
    const result = await deleteMeasurement(id, entry?.photoUrl, entry?.photoThumbUrl);
    if (result.error) {
      Alert.alert('Delete failed', result.error.message);
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const latest = entries[0];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Summary card */}
      {latest && (
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.textSecondary }]}>Latest Entry</Text>
          <Text style={[styles.summaryDate, { color: colors.textPrimary }]}>{formatDate(latest.date)}</Text>
          <View style={styles.summaryStats}>
            {latest.weight != null && (
              <Text style={[styles.statItem, { color: colors.textPrimary }]}>
                {formatWeight(latest.weight)}
              </Text>
            )}
            {latest.bodyFatPercent != null && (
              <Text style={[styles.statItem, { color: colors.textPrimary }]}>
                {latest.bodyFatPercent}% BF
              </Text>
            )}
            {latest.measurements.waist != null && (
              <Text style={[styles.statItem, { color: colors.textPrimary }]}>
                Waist {formatLength(latest.measurements.waist)}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* CTA buttons */}
      <View style={styles.ctaRow}>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: Colors.gym }]}
          onPress={() => router.push('/(tabs)/training/log-measurement')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="white" />
          <Text style={styles.ctaBtnText}>Log Measurement</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: Colors.gym + '20', borderColor: Colors.gym + '40', borderWidth: 1 }]}
          onPress={() => router.push('/(tabs)/training/measurement-trends')}
          activeOpacity={0.85}
        >
          <Ionicons name="trending-up-outline" size={18} color={Colors.gym} />
          <Text style={[styles.ctaBtnText, { color: Colors.gym }]}>View Trends</Text>
          <ProBadge style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      {/* History list */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.gym} />
        </View>
      ) : error ? (
        <TouchableOpacity style={styles.centered} onPress={load}>
          <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
          <Text style={[styles.errorText, { color: Colors.error }]}>{error}</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="body-outline" size={52} color={Colors.gym + '80'} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No measurements yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Log your first measurement to start tracking progress.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <MeasurementRow
              item={item}
              onDelete={handleDelete}
              colors={colors}
              formatWeight={formatWeight}
              formatLength={formatLength}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorText: { fontSize: 14, marginTop: 8, textAlign: 'center' },

  summaryCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryDate: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  summaryStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  statItem: { fontSize: 15, fontWeight: '600' },

  ctaRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 8 },
  ctaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  ctaBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  list: { paddingHorizontal: 16, paddingBottom: 40 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  rowAccent: { width: 4, alignSelf: 'stretch' },
  rowBody: { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  rowDate: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  noData: { fontSize: 12, fontStyle: 'italic' },
  deleteBtn: { padding: 12 },

  emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
