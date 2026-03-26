/**
 * photo-detail — full-resolution photo viewer.
 *
 * Params: { date, pose }
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { getPhotoEntry } from '../../../src/services/progressPhotoService';
import type { PhotoPose, ProgressPhotoEntry } from '../../../src/types/bodyTracking';

export default function PhotoDetailScreen() {
  const { colors } = useTheme();
  const { date, pose } = useLocalSearchParams<{ date: string; pose: PhotoPose }>();
  const [entry, setEntry] = useState<ProgressPhotoEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!date) return;
    getPhotoEntry(date).then((result) => {
      if (!result.error && result.data) {
        setEntry(result.data);
      }
      setLoading(false);
    });
  }, [date]);

  const imageUrl = pose && entry ? entry.poses[pose]?.fullUrl : null;

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.body} />
      </View>
    );
  }

  if (!imageUrl) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Photo not available.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { flex: 1, width: '100%' },
});
