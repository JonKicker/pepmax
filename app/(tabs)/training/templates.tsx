import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  PanResponder,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import {
  getTemplates,
  deleteTemplate,
  seedStarterTemplates,
} from '../../../src/services/templateService';
import type { WorkoutTemplate } from '../../../src/types/template';

const DELETE_WIDTH = 80;

// ─── Muscle group dot colors ──────────────────────────────────────────────────

const MUSCLE_DOT_COLORS: Record<string, string> = {
  Chest: '#E74C3C',
  Back: '#2E86C1',
  Shoulders: '#F39C12',
  Biceps: '#8E44AD',
  Triceps: '#9B59B6',
  Forearms: '#95A5A6',
  Quads: '#27AE60',
  Hamstrings: '#2ECC71',
  Glutes: '#1ABC9C',
  Calves: '#16A085',
  Core: '#E67E22',
  'Full Body': '#3498DB',
};

// ─── Swipeable template card ──────────────────────────────────────────────────

function SwipeableTemplateCard({
  template,
  onDelete,
  onPress,
  colors,
}: {
  template: WorkoutTemplate;
  onDelete: (id: string) => void;
  onPress: (id: string) => void;
  colors: any;
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

  const duration = template.estimatedDuration ?? 0;

  return (
    <View style={styles.swipeWrapper}>
      <View style={[styles.deleteBackground, { width: DELETE_WIDTH }]}>
        <TouchableOpacity
          onPress={() => { close(); onDelete(template.id); }}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={20} color="white" />
          <Text style={styles.deleteBtnLabel}>Delete</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={() => {
            if (isOpen.current) { close(); return; }
            onPress(template.id);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.cardAccent, { backgroundColor: template.color || Colors.gym }]} />
            <View style={styles.cardBody}>
              <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
                {template.name}
              </Text>
              <View style={styles.cardMeta}>
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {template.exercises.length} exercise{template.exercises.length !== 1 ? 's' : ''}
                </Text>
                {duration > 0 && (
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {' '}· ~{duration} min
                  </Text>
                )}
              </View>
              {template.muscleGroups && template.muscleGroups.length > 0 && (
                <View style={styles.dotsRow}>
                  {template.muscleGroups.map((mg) => (
                    <View
                      key={mg}
                      style={[styles.muscleDot, { backgroundColor: MUSCLE_DOT_COLORS[mg] || Colors.gym }]}
                    />
                  ))}
                  <Text style={[styles.muscleText, { color: colors.textSecondary }]}>
                    {template.muscleGroups.join(', ')}
                  </Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TemplatesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const seeded = useRef(false);

  const load = useCallback(async () => {
    if (!seeded.current) {
      seeded.current = true;
      await seedStarterTemplates();
    }
    const result = await getTemplates();
    if (!result.error) {
      setTemplates(result.data);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleDelete = (id: string) => {
    Alert.alert('Delete template?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          const result = await deleteTemplate(id);
          if (!result.error) {
            setTemplates((prev) => prev.filter((t) => t.id !== id));
          }
        },
      },
    ]);
  };

  const handlePress = (id: string) => {
    router.push({
      pathname: '/(tabs)/training/template-builder',
      params: { templateId: id },
    });
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.gym} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, templates.length === 0 && styles.listEmpty]}
        renderItem={({ item }) => (
          <View style={styles.templateRow}>
            <SwipeableTemplateCard
              template={item}
              onDelete={handleDelete}
              onPress={handlePress}
              colors={colors}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, { backgroundColor: Colors.gym + '1A' }]}>
              <Ionicons name="clipboard-outline" size={52} color={Colors.gym} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No templates yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Create your first workout template to get started!
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: Colors.gym }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/(tabs)/training/template-builder');
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },
  listEmpty: { flex: 1 },

  templateRow: { position: 'relative' },


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
  cardName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 13 },
  dotsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  muscleDot: { width: 8, height: 8, borderRadius: 4 },
  muscleText: { fontSize: 12, marginLeft: 4 },

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
