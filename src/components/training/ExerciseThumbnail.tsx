import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getExerciseMedia } from '../../services/exerciseMediaService';
import { Colors } from '../../constants/theme';

interface ExerciseThumbnailProps {
  exerciseId: string;
  size?: number;
  /** Background shown while the GIF loads. Defaults to the dark surface color. */
  imageBackgroundColor?: string;
}

export default function ExerciseThumbnail({
  exerciseId,
  size = 52,
  imageBackgroundColor = Colors.dark.surface,
}: ExerciseThumbnailProps) {
  const [hasError, setHasError] = useState(false);
  const media = getExerciseMedia(exerciseId);

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: 8,
  };

  if (!media || hasError) {
    return (
      <View style={[styles.placeholder, containerStyle]}>
        <Ionicons name="barbell-outline" size={size * 0.45} color={Colors.gym} />
      </View>
    );
  }

  return (
    <View style={[styles.imageWrapper, containerStyle, { backgroundColor: imageBackgroundColor }]}>
      <Image
        source={{ uri: media.thumbnailUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        // Disable animation so list shows static first frame
        autoplay={false}
        cachePolicy="disk"
        // recyclingKey lets expo-image reuse the image view cell in FlatList
        recyclingKey={exerciseId}
        onError={() => setHasError(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: Colors.gym + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    overflow: 'hidden',
    // backgroundColor is applied inline via the imageBackgroundColor prop
  },
});
