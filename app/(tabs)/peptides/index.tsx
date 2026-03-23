import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Animated,
  PanResponder,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { getPeptides, deletePeptide, addPeptideFromPreset } from '../../../src/services/peptideService';
import { FREQUENCY_LABELS } from '../../../src/types/peptide';
import type { Peptide } from '../../../src/types/peptide';
import PresetBrowser from '../../../src/components/peptides/PresetBrowser';
import type { Compound } from '../../../src/data/compoundDatabase';
import { useCycleStatus } from '../../../src/hooks/useCycleStatus';
import type { ActiveCycleInfo } from '../../../src/hooks/useCycleStatus';

// ─── Active cycle card ────────────────────────────────────────────────────────

function ActiveCycleCard({
  info,
  colors,
}: {
  info: ActiveCycleInfo;
  colors: ReturnType<typeof import('../../../src/hooks/useTheme').useTheme>['colors'];
}) {
  const { cycle, currentWeek, totalWeeks, currentDose, missedCount, completedCount, totalPlanned, nextDoseDate } = info;
  const progressPct = totalPlanned > 0 ? completedCount / totalPlanned : 0;

  function fmtDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <View style={[cycleCardStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[cycleCardStyles.accent, { backgroundColor: Colors.peptide }]} />
      <View style={cycleCardStyles.body}>
        <View style={cycleCardStyles.titleRow}>
          <Text style={[cycleCardStyles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {cycle.compoundName}
          </Text>
          <View style={[cycleCardStyles.badge, { backgroundColor: Colors.peptide + '1A' }]}>
            <Text style={[cycleCardStyles.badgeText, { color: Colors.peptide }]}>Active</Text>
          </View>
        </View>
        <Text style={[cycleCardStyles.detail, { color: colors.textSecondary }]}>
          Week {currentWeek}{totalWeeks ? ` of ${totalWeeks}` : ''} · Current dose: {currentDose} {cycle.unit}
        </Text>
        <View style={[cycleCardStyles.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              cycleCardStyles.progressFill,
              {
                backgroundColor: Colors.peptide,
                width: `${Math.min(progressPct * 100, 100)}%` as `${number}%`,
              },
            ]}
          />
        </View>
        <View style={cycleCardStyles.statsRow}>
          <Text style={[cycleCardStyles.statText, { color: colors.textSecondary }]}>
            {completedCount}/{totalPlanned} logged
          </Text>
          {missedCount > 0 && (
            <Text style={cycleCardStyles.missedText}>{missedCount} missed</Text>
          )}
          {nextDoseDate && (
            <Text style={[cycleCardStyles.statText, { color: colors.textSecondary }]}>
              Next: {fmtDate(nextDoseDate)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const cycleCardStyles = StyleSheet.create({
  card: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, marginHorizontal: 16, marginTop: 10, overflow: 'hidden' },
  accent: { width: 4 },
  body: { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '700', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  detail: { fontSize: 13, marginBottom: 8 },
  progressTrack: { height: 4, borderRadius: 2, marginBottom: 6 },
  progressFill: { height: 4, borderRadius: 2 },
  statsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  statText: { fontSize: 12 },
  missedText: { fontSize: 12, fontWeight: '600', color: '#E67E22' },
});

// ─── Swipeable card ──────────────────────────────────────────────────────────

const DELETE_WIDTH = 80;

function SwipeableCard({
  peptide,
  onEdit,
  onDelete,
  colors,
}: {
  peptide: Peptide;
  onEdit: (p: Peptide) => void;
  onDelete: (id: string, name: string) => void;
  colors: ReturnType<typeof import('../../../src/hooks/useTheme').useTheme>['colors'];
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const close = useCallback(() => {
    isOpen.current = false;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5,
      onPanResponderMove: (_, { dx }) => {
        if (!isOpen.current) {
          if (dx < 0) translateX.setValue(Math.max(dx, -DELETE_WIDTH));
        } else {
          translateX.setValue(Math.min(0, dx - DELETE_WIDTH));
        }
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (!isOpen.current && (dx < -DELETE_WIDTH / 2 || vx < -0.3)) {
          isOpen.current = true;
          Animated.spring(translateX, { toValue: -DELETE_WIDTH, useNativeDriver: true }).start();
        } else {
          isOpen.current = false;
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const handleDelete = () => {
    close();
    onDelete(peptide.id, peptide.name);
  };

  return (
    <View style={styles.swipeWrapper}>
      {/* Delete action revealed underneath */}
      <View style={[styles.deleteBackground, { width: DELETE_WIDTH }]}>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={20} color="white" />
          <Text style={styles.deleteBtnLabel}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* The swipeable card surface */}
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <TouchableOpacity
          onPress={() => {
            if (isOpen.current) {
              close();
            } else {
              onEdit(peptide);
            }
          }}
          activeOpacity={0.85}
        >
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.cardAccent, { backgroundColor: Colors.peptide }]} />
            <View style={styles.cardBody}>
              <Text style={[styles.cardName, { color: colors.textPrimary }]}>{peptide.name}</Text>
              <View style={styles.cardBadgeRow}>
                <View style={styles.badge}>
                  <Text style={[styles.badgeText, { color: Colors.peptide }]}>
                    {peptide.defaultDose} {peptide.unit}
                  </Text>
                </View>
                <View style={[styles.badge, { marginLeft: 6 }]}>
                  <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                    {FREQUENCY_LABELS[peptide.frequency]}
                  </Text>
                </View>
                {!!peptide.category && (
                  <View style={[styles.badge, { marginLeft: 6 }]}>
                    <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                      {peptide.category}
                    </Text>
                  </View>
                )}
                {!!peptide.route && (
                  <View style={[styles.badge, { marginLeft: 6 }]}>
                    <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                      {peptide.route}
                    </Text>
                  </View>
                )}
              </View>
              {!!peptide.notes && (
                <Text style={[styles.cardNotes, { color: colors.textSecondary }]} numberOfLines={1}>
                  {peptide.notes}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginRight: 12 }} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({
  colors,
}: {
  colors: ReturnType<typeof import('../../../src/hooks/useTheme').useTheme>['colors'];
}) {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: Colors.peptide + '1A' }]}>
        <Ionicons name="eyedrop-outline" size={52} color={Colors.peptide} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No peptides yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Tap + to add your first one.
      </Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function PeptidesScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [peptides, setPeptides] = useState<Peptide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [presetModalVisible, setPresetModalVisible] = useState(false);
  const { activeCycles } = useCycleStatus();

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setLoadError(null);
    const result = await getPeptides();
    if (result.error) {
      setLoadError('Failed to load peptides. Pull down to retry.');
    } else {
      setPeptides(result.data ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  };

  // Reload every time this tab is focused (e.g. after adding/editing a peptide)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const handleDelete = (id: string, name: string) => {
    Alert.alert(`Delete ${name}?`, "This won't delete your logged doses.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          const result = await deletePeptide(id);
          if (result.error) {
            Alert.alert('Delete failed', 'Could not delete peptide. Please try again.');
            return;
          }
          setPeptides((prev) => prev.filter((p) => p.id !== id));
        },
      },
    ]);
  };

  const handleEdit = (peptide: Peptide) => {
    router.push({ pathname: '/(tabs)/peptides/peptide-form', params: { id: peptide.id } });
  };

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/peptides/peptide-form');
  };

  const handleAddPreset = async (preset: Compound, dose: number) => {
    setPresetModalVisible(false);
    const result = await addPeptideFromPreset(preset, dose);
    if (result.error) {
      Alert.alert('Error', 'Could not add compound. Please try again.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    load();
  };

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
      {/* Quick-action row */}
      <View style={[styles.actionRowWrapper, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionRow}
        >
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: Colors.peptide }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/peptides/cycle-planner');
            }}
          >
            <Ionicons name="calendar-outline" size={16} color={Colors.peptide} />
            <Text style={[styles.actionBtnText, { color: Colors.peptide }]}>Plan Cycle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: Colors.peptide }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPresetModalVisible(true);
            }}
          >
            <Ionicons name="flask-outline" size={16} color={Colors.peptide} />
            <Text style={[styles.actionBtnText, { color: Colors.peptide }]}>Browse Presets</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: Colors.peptide }]}
            onPress={() => router.push('/(tabs)/peptides/history')}
          >
            <Ionicons name="time-outline" size={16} color={Colors.peptide} />
            <Text style={[styles.actionBtnText, { color: Colors.peptide }]}>Dose History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: Colors.peptide }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/peptides/half-life-timeline');
            }}
          >
            <Ionicons name="pulse-outline" size={16} color={Colors.peptide} />
            <Text style={[styles.actionBtnText, { color: Colors.peptide }]}>Blood Levels</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: Colors.peptide }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/peptides/recon-calculator');
            }}
          >
            <Ionicons name="calculator-outline" size={16} color={Colors.peptide} />
            <Text style={[styles.actionBtnText, { color: Colors.peptide }]}>Calculator</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: Colors.peptide }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/peptides/inventory');
            }}
          >
            <Ionicons name="cube-outline" size={16} color={Colors.peptide} />
            <Text style={[styles.actionBtnText, { color: Colors.peptide }]}>Inventory</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.logDoseBtn]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/peptides/log-dose');
            }}
          >
            <Ionicons name="add-circle" size={16} color="white" />
            <Text style={styles.logDoseBtnText}>Log Dose</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {activeCycles.length > 0 && (
        <View style={{ paddingBottom: 4 }}>
          {activeCycles.map((info) => (
            <ActiveCycleCard key={info.cycle.id} info={info} colors={colors} />
          ))}
        </View>
      )}

      <FlatList
        data={peptides}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, peptides.length === 0 && styles.listEmpty]}
        ListEmptyComponent={<EmptyState colors={colors} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.peptide} />
        }
        renderItem={({ item }) => (
          <SwipeableCard peptide={item} onEdit={handleEdit} onDelete={handleDelete} colors={colors} />
        )}
      />

      {/* Floating action button */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: Colors.peptide }]} onPress={handleAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      <PresetBrowser
        visible={presetModalVisible}
        onClose={() => setPresetModalVisible(false)}
        onAdd={handleAddPreset}
        existingPeptideNames={peptides.map((p) => p.name)}
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

  actionRowWrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
  logDoseBtn: {
    marginLeft: 'auto',
    backgroundColor: Colors.peptide,
    borderColor: Colors.peptide,
  },
  logDoseBtnText: { fontSize: 14, fontWeight: '600', color: 'white' },

  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },
  listEmpty: { flex: 1 },

  // Swipeable card
  swipeWrapper: { marginBottom: 10, borderRadius: 12, overflow: 'hidden' },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.error,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: { alignItems: 'center', justifyContent: 'center', padding: 14 },
  deleteBtnLabel: { color: 'white', fontSize: 10, marginTop: 2, fontWeight: '600' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  cardBody: { flex: 1, paddingVertical: 14, paddingHorizontal: 14 },
  cardName: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  cardBadgeRow: { flexDirection: 'row', alignItems: 'center' },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: Colors.peptide + '1A',
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardNotes: { fontSize: 12, marginTop: 5 },

  // Empty state
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
});
