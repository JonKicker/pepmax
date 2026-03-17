import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { Colors } from '../../src/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    title: 'Track Your Peptides',
    description: 'Peptide tracking with reminders and side effect logging.',
    color: Colors.peptide,
    icon: 'eyedrop' as const,
  },
  {
    title: 'Master Your Nutrition',
    description: 'Log meals, track calories and macros against daily targets.',
    color: Colors.nutrition,
    icon: 'nutrition' as const,
  },
  {
    title: 'Crush Your Training',
    description: 'Log workouts with sets/reps/weight, track PRs, GPS cardio.',
    color: Colors.gym,
    icon: 'barbell' as const,
  },
];

const TIMING = { duration: 350, easing: Easing.out(Easing.cubic) };

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  function goToSlide(index: number) {
    translateX.value = withTiming(-index * SCREEN_WIDTH, TIMING);
    setCurrentIndex(index);
  }

  function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < SLIDES.length - 1) {
      goToSlide(currentIndex + 1);
    }
  }

  function handleSkip() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    goToSlide(SLIDES.length - 1);
  }

  function handleGetStarted() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(auth)/sign-up');
  }

  function handleLogIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(auth)/log-in');
  }

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Skip button */}
      <View style={styles.topBar}>
        {!isLast ? (
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipBtn} />
        )}
      </View>

      {/* Slides */}
      <View style={styles.slideWindow}>
        <Animated.View style={[{ width: SCREEN_WIDTH * SLIDES.length, flexDirection: 'row' }, animatedStyle]}>
          {SLIDES.map((slide) => (
            <View key={slide.title} style={[styles.slide, { width: SCREEN_WIDTH }]}>
              <View style={[styles.iconCircle, { backgroundColor: slide.color + '20' }]}>
                <Ionicons name={slide.icon} size={64} color={slide.color} />
              </View>
              <Text style={[styles.slideTitle, { color: colors.textPrimary }]}>
                {slide.title}
              </Text>
              <Text style={[styles.slideDesc, { color: colors.textSecondary }]}>
                {slide.description}
              </Text>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i === currentIndex ? SLIDES[currentIndex].color : colors.border,
                width: i === currentIndex ? 20 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Bottom actions */}
      <View style={styles.actions}>
        {isLast ? (
          <>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: Colors.accent }]}
              onPress={handleGetStarted}
            >
              <Text style={styles.primaryBtnText}>Get Started</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogIn} style={styles.secondaryBtn}>
              <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
                Already have an account?{' '}
                <Text style={{ color: Colors.accent }}>Log In</Text>
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: SLIDES[currentIndex].color }]}
            onPress={handleNext}
          >
            <Text style={styles.primaryBtnText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { height: 52, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 24 },
  skipBtn: { padding: 8 },
  skipText: { fontSize: 15 },
  slideWindow: { flex: 1, overflow: 'hidden' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 20 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  slideTitle: { fontSize: 26, fontWeight: '700', textAlign: 'center' },
  slideDesc: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 20 },
  dot: { height: 8, borderRadius: 4 },
  actions: { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  primaryBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { alignItems: 'center', paddingVertical: 8 },
  secondaryBtnText: { fontSize: 14 },
});
