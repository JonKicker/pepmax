import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { getDoses, deleteDose, getPeptides } from '../../../src/services/peptideService';
import { INJECTION_SITE_LABELS, MOOD_EMOJIS } from '../../../src/types/peptide';
import type { Dose, Peptide } from '../../../src/types/peptide';

// ─── Dose card ────────────────────────────────────────────────────────────────

function DoseCard({
  dose,
  onDelete,
  colors,
}: {
  dose: Dose;
  onDelete: (id: string, name: string) => void;
  colors: ReturnType<typeof import('../../../src/hooks/useTheme').useTheme>['colors'];
}) {
  const ts = dose.timestamp?.toDate?.() ?? new Date();
  const timeStr = ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dateStr = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <View style={[styles.doseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.doseAccent, { backgroundColor: Colors.peptide }]} />
      <View style={styles.doseBody}>
        <View style={styles.doseTopRow}>
          <Text style={[styles.doseName, { color: colors.textPrimary }]}>{dose.peptideName}</Text>
          <Text style={[styles.doseTime, { color: colors.textSecondary }]}>
            {dateStr} · {timeStr}
          </Text>
        </View>
        <View style={styles.doseMeta}>
          <View style={styles.doseBadge}>
            <Text style={[styles.doseBadgeText, { color: Colors.peptide }]}>
              {dose.amount} {dose.unit}
            </Text>
          </View>
          <Text style={[styles.doseSite, { color: colors.textSecondary }]}>
            {INJECTION_SITE_LABELS[dose.site]}
            {dose.site === 'other' && dose.siteOther ? ` (${dose.siteOther})` : ''}
          </Text>
          <Text style={styles.doseMoodEmoji}>{MOOD_EMOJIS[dose.mood] ?? '😐'}</Text>
        </View>
        {!!dose.notes && (
          <Text style={[styles.doseNotes, { color: colors.textSecondary }]} numberOfLines={1}>
            {dose.notes}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteIconBtn}
        onPress={() => onDelete(dose.id, dose.peptideName)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={17} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  colors,
  filtered,
}: {
  colors: ReturnType<typeof import('../../../src/hooks/useTheme').useTheme>['colors'];
  filtered: boolean;
}) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="time-outline" size={52} color={colors.textSecondary} style={{ opacity: 0.4 }} />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {filtered ? 'No doses found for that peptide.' : 'No doses logged yet.'}
      </Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function DoseHistoryScreen() {
  const { colors } = useTheme();

  const [doses, setDoses] = useState<Dose[]>([]);
  const [peptides, setPeptides] = useState<Peptide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterPeptideId, setFilterPeptideId] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setLoadError(null);
    const [dosesResult, peptidesResult] = await Promise.all([
      getDoses(filterPeptideId ? { peptideId: filterPeptideId } : undefined),
      getPeptides(),
    ]);
    if (dosesResult.error) {
      setLoadError('Failed to load dose history. Pull down to retry.');
    } else {
      setDoses(dosesResult.data ?? []);
    }
    if (peptidesResult.data) setPeptides(peptidesResult.data);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [filterPeptideId])
  );

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete dose?', `Remove this ${name} dose from history.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          const result = await deleteDose(id);
          if (result.error) {
            Alert.alert('Delete failed', 'Could not delete dose. Please try again.');
            return;
          }
          setDoses((prev) => prev.filter((d) => d.id !== id));
        },
      },
    ]);
  };

  const filterLabel = filterPeptideId
    ? (peptides.find((p) => p.id === filterPeptideId)?.name ?? 'Unknown')
    : 'All Peptides';

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.peptide} size="large" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{loadError}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: Colors.peptide }]}
          onPress={() => load()}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Filter bar */}
      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowFilter((v) => !v)}
        >
          <Ionicons name="filter-outline" size={15} color={Colors.peptide} />
          <Text style={[styles.filterBtnText, { color: colors.textPrimary }]}>{filterLabel}</Text>
          <Ionicons name={showFilter ? 'chevron-up' : 'chevron-down'} size={15} color={colors.textSecondary} />
        </TouchableOpacity>

        {filterPeptideId && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => setFilterPeptideId(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter dropdown */}
      {showFilter && (
        <View style={[styles.filterDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.filterItem, { borderBottomColor: colors.border }]}
            onPress={() => { setFilterPeptideId(null); setShowFilter(false); }}
          >
            <Text style={[styles.filterItemText, { color: !filterPeptideId ? Colors.peptide : colors.textPrimary }]}>
              All Peptides
            </Text>
            {!filterPeptideId && <Ionicons name="checkmark" size={16} color={Colors.peptide} />}
          </TouchableOpacity>
          {peptides.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.filterItem, { borderBottomColor: colors.border }]}
              onPress={() => { setFilterPeptideId(p.id); setShowFilter(false); }}
            >
              <Text style={[styles.filterItemText, { color: filterPeptideId === p.id ? Colors.peptide : colors.textPrimary }]}>
                {p.name}
              </Text>
              {filterPeptideId === p.id && <Ionicons name="checkmark" size={16} color={Colors.peptide} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Dose count */}
      {doses.length > 0 && (
        <Text style={[styles.countLabel, { color: colors.textSecondary }]}>
          {doses.length} {doses.length === 1 ? 'dose' : 'doses'}
        </Text>
      )}

      <FlatList
        data={doses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, doses.length === 0 && styles.listEmpty]}
        ListEmptyComponent={<EmptyState colors={colors} filtered={!!filterPeptideId} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.peptide} />
        }
        renderItem={({ item }) => (
          <DoseCard dose={item} onDelete={handleDelete} colors={colors} />
        )}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 15, textAlign: 'center', marginTop: 16, marginBottom: 24, lineHeight: 22 },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
  },
  filterBtnText: { fontSize: 14, fontWeight: '500', flex: 1 },
  clearBtn: { padding: 2 },

  filterDropdown: {
    marginHorizontal: 16,
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 10,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterItemText: { fontSize: 15 },

  countLabel: { fontSize: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2 },

  list: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 40 },
  listEmpty: { flex: 1 },

  // Dose card
  doseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  doseAccent: { width: 4, alignSelf: 'stretch' },
  doseBody: { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  doseTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  doseName: { fontSize: 15, fontWeight: '700', flex: 1 },
  doseTime: { fontSize: 12, marginLeft: 8 },
  doseMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: Colors.peptide + '1A',
  },
  doseBadgeText: { fontSize: 12, fontWeight: '600' },
  doseSite: { fontSize: 12, flex: 1 },
  doseMoodEmoji: { fontSize: 18 },
  doseNotes: { fontSize: 12, marginTop: 5 },
  deleteIconBtn: { padding: 14 },

  // Empty
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 15, textAlign: 'center', marginTop: 14, lineHeight: 22 },
});
