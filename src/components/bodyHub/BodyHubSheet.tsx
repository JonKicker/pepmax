/**
 * Shared bottom sheet for Body Hub — slides up from bottom with spring animation.
 * Follows the SiteDetailSheet pattern: frozen content refs, backdrop tap-to-close.
 *
 * Reanimated migration (Phase 4): replaced RN Animated.spring with
 * react-native-reanimated withSpring, running on the UI thread via
 * useSharedValue + useAnimatedStyle.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';

type Props = {
  visible: boolean;
  onClose: () => void;
  height?: number;
  children: React.ReactNode;
};

const DEFAULT_HEIGHT = 320;

export default function BodyHubSheet({ visible, onClose, height = DEFAULT_HEIGHT, children }: Props) {
  const { colors } = useTheme();
  const translateY = useSharedValue(height);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Freeze children when visible, so content stays rendered during slide-out animation
  const frozenChildrenRef = useRef<React.ReactNode>(null);
  if (visible) {
    frozenChildrenRef.current = children;
  }

  // Spring depends on BOTH visible AND height so that height-prop changes
  // (e.g. muscles layer switching between score-mode and non-score-mode heights)
  // animate correctly without a stale toValue.
  useEffect(() => {
    translateY.value = withSpring(visible ? 0 : height, {
      damping: 18,
      stiffness: 120,
    });
  }, [visible, height, translateY]);

  // Don't render at all until we've had content at least once
  if (!frozenChildrenRef.current) return null;

  return (
    <>
      {/* Backdrop */}
      {visible && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      )}

      <Animated.View
        style={[
          styles.sheet,
          {
            height,
            backgroundColor: colors.surface,
          },
          animatedStyle,
        ]}
      >
        {/* Drag handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {frozenChildrenRef.current}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
});
