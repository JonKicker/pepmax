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
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { getPeptides, deletePeptide } from '../../../src/services/peptideService';
import { FREQUENCY_LABELS } from '../../../src/types/peptide';
import type { Peptide } from '../../../src/types/peptide';

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
      <View style={[styles.actionRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: Colors.peptide }]}
          onPress={() => router.push('/(tabs)/peptides/history')}
        >
          <Ionicons name="time-outline" size={16} color={Colors.peptide} />
          <Text style={[styles.actionBtnText, { color: Colors.peptide }]}>Dose History</Text>
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
      </View>

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

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
