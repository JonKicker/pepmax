/**
 * PRCelebration — overlay shown when a personal record is broken.
 *
 * Gold banner slides down from top + subtle confetti particles.
 * Auto-dismisses after 3 seconds.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CONFETTI_COUNT = 20;
const BANNER_DURATION = 3000;
const CONFETTI_DURATION = 2000;

const CONFETTI_COLORS = ['#FFD700', '#FFA500', '#FF6347', '#8E44AD', '#2E86C1', '#27AE60'];

type Props = {
  visible: boolean;
  details: string[];
  onDismiss: () => void;
};

function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const startX = Math.random() * SCREEN_WIDTH;
  const size = 6 + Math.random() * 6;

  useEffect(() => {
    const drift = (Math.random() - 0.5) * 80;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 300 + Math.random() * 200,
        duration: CONFETTI_DURATION,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: drift,
        duration: CONFETTI_DURATION,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: CONFETTI_DURATION,
        delay: delay + CONFETTI_DURATION * 0.6,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: 3 + Math.random() * 5,
        duration: CONFETTI_DURATION,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, translateY, translateX, opacity, rotate]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.confetti,
        {
          left: startX,
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: Math.random() > 0.5 ? size / 2 : 2,
          opacity,
          transform: [{ translateY }, { translateX }, { rotate: spin }],
        },
      ]}
    />
  );
}

export default function PRCelebration({ visible, details, onDismiss }: Props) {
  const bannerY = useRef(new Animated.Value(-120)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      // Slide banner in
      Animated.parallel([
        Animated.spring(bannerY, { toValue: 0, useNativeDriver: true, tension: 60, friction: 8 }),
        Animated.timing(bannerOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      // Auto-dismiss
      dismissTimer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(bannerY, { toValue: -120, duration: 300, useNativeDriver: true }),
          Animated.timing(bannerOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => onDismiss());
      }, BANNER_DURATION);
    }

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [visible, bannerY, bannerOpacity, onDismiss]);

  if (!visible) return null;

  const displayDetail = details[0] ?? 'New Personal Record!';

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Confetti */}
      {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
        <ConfettiParticle
          key={i}
          delay={i * 40}
          color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
        />
      ))}

      {/* Banner */}
      <Animated.View
        style={[
          styles.banner,
          { transform: [{ translateY: bannerY }], opacity: bannerOpacity },
        ]}
      >
        <Ionicons name="trophy" size={22} color="#1A1A2E" style={styles.trophy} />
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>NEW PR!</Text>
          <Text style={styles.bannerDetail} numberOfLines={1}>{displayDetail}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  banner: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  trophy: { marginRight: 12 },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 18, fontWeight: '900', color: '#1A1A2E' },
  bannerDetail: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginTop: 2 },
  confetti: {
    position: 'absolute',
    top: 0,
  },
});
