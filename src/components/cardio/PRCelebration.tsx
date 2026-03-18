import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { formatPace, formatDistance, formatDuration } from '../../utils/cardio';
import type { CardioPR, DistanceUnit } from '../../types/cardio';

const PR_LABELS: Record<string, string> = {
  fastestPace: 'Fastest Pace',
  fastestSplit: 'Fastest Split',
  longestDistance: 'Longest Distance',
  longestDuration: 'Longest Duration',
  mostCalories: 'Most Calories',
  mostElevation: 'Most Elevation',
};

function formatPRValue(pr: CardioPR, unit: DistanceUnit): string {
  switch (pr.metric) {
    case 'fastestPace':
    case 'fastestSplit':
      return formatPace(pr.value, unit);
    case 'longestDistance':
      return formatDistance(pr.value, unit);
    case 'longestDuration':
      return formatDuration(pr.value);
    case 'mostCalories':
      return `${Math.round(pr.value)} kcal`;
    case 'mostElevation':
      return `${Math.round(pr.value)} m`;
    default:
      return String(pr.value);
  }
}

type Props = {
  pr: CardioPR | null;
  distanceUnit: DistanceUnit;
  onDismiss: () => void;
};

export default function PRCelebration({ pr, distanceUnit, onDismiss }: Props) {
  useEffect(() => {
    if (pr) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [pr]);

  if (!pr) return null;

  return (
    <Modal visible transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onDismiss}>
        <View style={styles.card}>
          <View style={styles.trophyWrap}>
            <Ionicons name="trophy" size={48} color="#FFD700" />
          </View>
          <Text style={styles.title}>New Personal Best!</Text>
          <Text style={styles.metric}>{PR_LABELS[pr.metric] ?? pr.metric}</Text>
          <Text style={styles.value}>{formatPRValue(pr, distanceUnit)}</Text>
          {pr.previousValue != null && (
            <Text style={styles.previous}>
              Previous: {formatPRValue({ ...pr, value: pr.previousValue }, distanceUnit)}
            </Text>
          )}
          <Text style={styles.dismiss}>Tap to dismiss</Text>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  trophyWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD70020',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  metric: {
    color: '#E8E8E8',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  value: {
    color: 'white',
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 8,
  },
  previous: {
    color: '#A0A0A0',
    fontSize: 13,
    marginBottom: 16,
  },
  dismiss: {
    color: '#666',
    fontSize: 12,
  },
});
