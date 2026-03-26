import React, { useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getExerciseMedia } from '../../services/exerciseMediaService';
import { Colors } from '../../constants/theme';

interface ExerciseGifPlayerProps {
  exerciseId: string;
  /** Background shown while the GIF loads and in the loading overlay. Defaults to the dark background color. */
  imageBackgroundColor?: string;
}

export default function ExerciseGifPlayer({
  exerciseId,
  imageBackgroundColor = Colors.dark.background,
}: ExerciseGifPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const media = getExerciseMedia(exerciseId);

  if (!media || hasError) {
    return (
      <View style={styles.fallback}>
        <Ionicons name="barbell-outline" size={48} color={Colors.gym} />
        <Text style={styles.fallbackText}>No demo available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: imageBackgroundColor }]}>
      <Image
        source={{ uri: media.gifUrl }}
        style={styles.gif}
        contentFit="contain"
        autoplay={true}
        cachePolicy="disk"
        onLoadStart={() => setLoading(true)}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setHasError(true);
        }}
      />
      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: imageBackgroundColor }]}>
          <ActivityIndicator size="large" color={Colors.gym} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    // backgroundColor applied inline via imageBackgroundColor prop
    marginBottom: 20,
  },
  gif: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor applied inline via imageBackgroundColor prop
  },
  fallback: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    backgroundColor: Colors.gym + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  fallbackText: {
    color: Colors.gym,
    fontSize: 14,
    fontWeight: '600',
  },
});
