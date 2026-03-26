/**
 * PoseOverlay — semi-transparent body outline as a pose guide for the camera.
 *
 * Uses simple View-based shapes (no SVG dependency). Shows front/side/back outlines.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { PhotoPose } from '../../types/bodyTracking';

type Props = {
  pose: PhotoPose;
};

const POSE_LABELS: Record<PhotoPose, { title: string; instruction: string }> = {
  front: { title: 'Front', instruction: 'Stand facing the camera' },
  side: { title: 'Side', instruction: 'Turn to your left side' },
  back: { title: 'Back', instruction: 'Turn around' },
};

export default function PoseOverlay({ pose }: Props) {
  const { title, instruction } = POSE_LABELS[pose];

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Guide outline */}
      <View style={styles.outline}>
        {/* Head */}
        <View style={[styles.head, pose === 'side' && styles.headSide]} />
        {/* Torso */}
        <View style={[styles.torso, pose === 'side' && styles.torsoSide]} />
        {/* Legs */}
        <View style={styles.legs}>
          <View style={[styles.leg, pose === 'side' && styles.legSide]} />
          {pose !== 'side' && <View style={styles.legGap} />}
          <View style={[styles.leg, pose === 'side' && styles.legSide]} />
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.labelContainer}>
        <Text style={styles.poseTitle}>{title}</Text>
        <Text style={styles.instruction}>{instruction}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outline: {
    alignItems: 'center',
    opacity: 0.3,
  },
  head: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#fff',
    marginBottom: 4,
  },
  headSide: {
    width: 50,
    height: 56,
    borderRadius: 25,
  },
  torso: {
    width: 100,
    height: 140,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 8,
  },
  torsoSide: {
    width: 55,
  },
  legs: {
    flexDirection: 'row',
    marginTop: 2,
  },
  leg: {
    width: 40,
    height: 140,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 6,
  },
  legSide: {
    width: 45,
  },
  legGap: {
    width: 12,
  },
  labelContainer: {
    position: 'absolute',
    bottom: 160,
    alignItems: 'center',
  },
  poseTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  instruction: {
    color: '#fff',
    fontSize: 16,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
