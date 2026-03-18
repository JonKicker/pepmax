/**
 * OnboardingChecklist — first-time experience guiding users through each module.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/theme';
import type { Theme } from '../../constants/theme';
import type { DashboardData } from '../../types/dashboard';

type Props = {
  data: DashboardData;
  colors: Theme['colors'];
  onDismiss: () => void;
};

type ChecklistItem = {
  id: string;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  route: string;
  isComplete: (data: DashboardData) => boolean;
};

const CHECKLIST: ChecklistItem[] = [
  {
    id: 'peptide',
    title: 'Set up a peptide',
    icon: 'eyedrop-outline',
    color: Colors.peptide,
    route: '/(tabs)/peptides',
    isComplete: (d) => (d.doses?.length ?? 0) > 0,
  },
  {
    id: 'nutrition',
    title: 'Log a meal',
    icon: 'nutrition-outline',
    color: Colors.nutrition,
    route: '/(tabs)/nutrition',
    isComplete: (d) => (d.totals?.calories ?? 0) > 0,
  },
  {
    id: 'training',
    title: 'Complete a workout',
    icon: 'barbell-outline',
    color: Colors.gym,
    route: '/(tabs)/training',
    isComplete: (d) => (d.recentSessions?.length ?? 0) > 0,
  },
  {
    id: 'cardio',
    title: 'Start a cardio session',
    icon: 'heart-outline',
    color: Colors.cardio,
    route: '/(tabs)/cardio',
    isComplete: (d) => (d.recentCardio?.length ?? 0) > 0,
  },
  {
    id: 'weight',
    title: 'Log body weight',
    icon: 'scale-outline',
    color: Colors.accent,
    route: '', // handled by parent's weight modal
    isComplete: (d) => (d.recentWeights?.length ?? 0) > 0,
  },
];

export function OnboardingChecklist({ data, colors, onDismiss }: Props) {
  const router = useRouter();
  const completedCount = CHECKLIST.filter((item) => item.isComplete(data)).length;
  const allComplete = completedCount === CHECKLIST.length;

  // Auto-dismiss when all complete
  React.useEffect(() => {
    if (allComplete) {
      onDismiss();
    }
  }, [allComplete, onDismiss]);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Ionicons name="rocket-outline" size={18} color={Colors.accent} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Get Started</Text>
        <Text style={[styles.progress, { color: colors.textSecondary }]}>
          {completedCount}/{CHECKLIST.length}
        </Text>
      </View>

      {CHECKLIST.map((item) => {
        const done = item.isComplete(data);
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.row, { borderTopColor: colors.border }]}
            onPress={() => {
              if (!done && item.route) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(item.route as any);
              }
            }}
            activeOpacity={done ? 1 : 0.7}
          >
            <Ionicons
              name={done ? 'checkmark-circle' : (item.icon as any)}
              size={20}
              color={done ? colors.success : item.color}
            />
            <Text
              style={[
                styles.itemText,
                { color: done ? colors.textSecondary : colors.textPrimary },
                done && styles.done,
              ]}
            >
              {item.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: { fontSize: 15, fontWeight: '700', flex: 1 },
  progress: { fontSize: 13, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  itemText: { fontSize: 14, fontWeight: '500' },
  done: { textDecorationLine: 'line-through' },
});
