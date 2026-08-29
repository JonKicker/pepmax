import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  PanResponder,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useInventory } from '../../../src/hooks/useInventory';
import { deleteInventoryItem } from '../../../src/services/inventoryService';
import AddInventoryItemModal from '../../../src/components/peptides/AddInventoryItemModal';
import type { EnrichedInventoryItem } from '../../../src/hooks/useInventory';
import type { InventoryItem } from '../../../src/types/inventory';

// ─── Status colors ────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  ok: '#34C759',
  warning: '#FF9500',
  low: '#FF3B30',
};

// ─── Swipeable inventory card ─────────────────────────────────────────────────

function SwipeableInventoryCard({
  item,
  onEdit,
  onDelete,
  colors,
}: {
  item: EnrichedInventoryItem;
  onEdit: (item: EnrichedInventoryItem) => void;
  onDelete: (id: string) => void;
  colors: ReturnType<typeof import('../../../src/hooks/useTheme').useTheme>['colors'];
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);
  const SWIPE_THRESHOLD = 60;
  const DELETE_WIDTH = 72;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(Math.max(g.dx, -DELETE_WIDTH));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD) {
          Animated.spring(translateX, { toValue: -DELETE_WIDTH, useNativeDriver: true }).start();
          isOpen.current = true;
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          isOpen.current = false;
        }
      },
    }),
  ).current;

  const handleDeletePress = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    isOpen.current = false;
    onDelete(item.id);
  };

  const statusColor = STATUS_COLORS[item.stockStatus];
  const progressPct =
    item.totalAmount > 0
      ? Math.min(item.remainingAmount / item.totalAmount, 1)
      : 0;

  const daysLabel =
    item.daysUntilEmpty !== null
      ? `${Math.round(item.daysUntilEmpty)}d left`
      : 'Usage unknown';

  const totalRemaining = item.remainingAmount + item.quantity * item.totalAmount;

  return (
    <View style={styles.swipeContainer}>
      {/* Delete button */}
      <View style={[styles.deleteAction, { width: DELETE_WIDTH }]}>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeletePress}>
          <Ionicons name="trash" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Card */}
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => onEdit(item)}
        >
          {/* Status accent */}
          <View style={[styles.cardAccent, { backgroundColor: statusColor }]} />

          <View style={styles.cardBody}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
                <Text style={[styles.badgeText, { color: statusColor }]}>{daysLabel}</Text>
              </View>
            </View>

            {item.linkedCompoundName && (
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                {item.linkedCompoundName}
              </Text>
            )}

            {item.type === 'compound' && (
              <>
                <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { backgroundColor: statusColor, width: `${Math.round(progressPct * 100)}%` as `${number}%` },
                    ]}
                  />
                </View>
                <Text style={[styles.cardDetail, { color: colors.textSecondary }]}>
                  {Math.round(totalRemaining * 100) / 100} {item.unit} remaining
                  {item.quantity > 0 ? ` · ${item.quantity} sealed` : ''}
                </Text>
              </>
            )}

            {item.type === 'supply' && (
              <Text style={[styles.cardDetail, { color: colors.textSecondary }]}>
                {item.remainingAmount} {item.unit} remaining
                {item.dailyConsumption > 0 ? ` · ~${Math.round(item.dailyConsumption * 7)}/week` : ''}
              </Text>
            )}

            {item.stockStatus === 'low' && (
              <View style={[styles.lowStockBadge, { backgroundColor: STATUS_COLORS.low + '15' }]}>
                <Ionicons name="warning-outline" size={12} color={STATUS_COLORS.low} />
                <Text style={[styles.lowStockText, { color: STATUS_COLORS.low }]}>Low Stock</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ colors }: { colors: ReturnType<typeof import('../../../src/hooks/useTheme').useTheme>['colors'] }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="cube-outline" size={52} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        Track your peptide supply
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Tap + to add inventory items
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const { colors } = useTheme();
  const { compounds, supplies, loading, error, refresh } = useInventory();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'compound' | 'supply'>('compound');
  const [editItem, setEditItem] = useState<InventoryItem | undefined>(undefined);

  const openAddSheet = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Compound (Vial/Pen)', 'Supply (Syringes, Swabs…)'],
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) { setEditItem(undefined); setModalMode('compound'); setModalVisible(true); }
          if (idx === 2) { setEditItem(undefined); setModalMode('supply'); setModalVisible(true); }
        },
      );
    } else {
      // Android: Alert as action sheet substitute
      Alert.alert('Add Inventory', 'What type of item?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Compound (Vial/Pen)',
          onPress: () => { setEditItem(undefined); setModalMode('compound'); setModalVisible(true); },
        },
        {
          text: 'Supply (Syringes, Swabs…)',
          onPress: () => { setEditItem(undefined); setModalMode('supply'); setModalVisible(true); },
        },
      ]);
    }
  };

  const handleEdit = (item: EnrichedInventoryItem) => {
    setEditItem(item);
    setModalMode(item.type);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Item', 'Remove this inventory item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await deleteInventoryItem(id);
          refresh();
        },
      },
    ]);
  };

  const hasItems = compounds.length > 0 || supplies.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.peptide} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
        </View>
      ) : !hasItems ? (
        <EmptyState colors={colors} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {compounds.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>COMPOUNDS</Text>
              {compounds.map((item) => (
                <SwipeableInventoryCard
                  key={item.id}
                  item={item}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  colors={colors}
                />
              ))}
            </>
          )}

          {supplies.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: compounds.length > 0 ? 24 : 0 }]}>
                SUPPLIES
              </Text>
              {supplies.map((item) => (
                <SwipeableInventoryCard
                  key={item.id}
                  item={item}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  colors={colors}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: Colors.peptide }]}
        onPress={openAddSheet}
        activeOpacity={0.7}
      >
        <View style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="add" size={30} color="white" />
        </View>
      </TouchableOpacity>

      <AddInventoryItemModal
        visible={modalVisible}
        mode={modalMode}
        editItem={editItem}
        onClose={() => setModalVisible(false)}
        onSaved={refresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 15 },
  scroll: { padding: 16, paddingBottom: 100 },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  swipeContainer: { position: 'relative', marginBottom: 10 },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#FF3B30',
  },
  deleteBtn: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardName: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  cardSub: { fontSize: 12, marginBottom: 8 },
  cardDetail: { fontSize: 12, marginTop: 6 },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  lowStockText: { fontSize: 11, fontWeight: '700' },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },

  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
