import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  withSpring,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { Colors } from '../../src/constants/theme';
import { GlassBackground } from '../../src/components/GlassBackground';
import { GlassCard } from '../../src/components/GlassCard';
import { GradientButton } from '../../src/components/GradientButton';

// --- Slide data ---

type FeatureItem = { icon: React.ComponentProps<typeof Ionicons>['name']; label: string };
type CardBlock = { title: string; color: string; features: FeatureItem[] };

type Slide =
  | { kind: 'hero' }
  | { kind: 'cards'; tint: string; cards: CardBlock[] }
  | { kind: 'cta' };

const SLIDES: Slide[] = [
  { kind: 'hero' },
  {
    kind: 'cards',
    tint: Colors.peptide,
    cards: [
      {
        title: 'Peptides',
        color: Colors.peptide,
        features: [
          { icon: 'calendar-outline', label: 'Cycle planning' },
          { icon: 'notifications-outline', label: 'Dose reminders' },
          { icon: 'body-outline', label: 'Site rotation map' },
        ],
      },
      {
        title: 'Nutrition',
        color: Colors.nutrition,
        features: [
          { icon: 'barcode-outline', label: 'Barcode scanner' },
          { icon: 'pizza-outline', label: 'Macro tracking' },
          { icon: 'trending-up-outline', label: 'Adaptive TDEE' },
        ],
      },
    ],
  },
  {
    kind: 'cards',
    tint: Colors.gym,
    cards: [
      {
        title: 'Training',
        color: Colors.gym,
        features: [
          { icon: 'barbell-outline', label: 'Workout templates' },
          { icon: 'trophy-outline', label: 'PR tracking' },
          { icon: 'calculator-outline', label: 'Plate calculator' },
        ],
      },
      {
        title: 'Cardio',
        color: Colors.cardio,
        features: [
          { icon: 'map-outline', label: 'GPS routes' },
          { icon: 'heart-outline', label: 'Heart rate zones' },
          { icon: 'shield-checkmark-outline', label: 'Safety Beacon' },
        ],
      },
    ],
  },
  {
    kind: 'cards',
    tint: Colors.body,
    cards: [
      {
        title: 'Body & Recovery',
        color: Colors.body,
        features: [
          { icon: 'pulse-outline', label: 'Recovery Score 0-100' },
          { icon: 'camera-outline', label: 'Progress photos' },
          { icon: 'body-outline', label: 'Body measurements' },
        ],
      },
      {
        title: 'Smart Insights',
        color: Colors.recovery,
        features: [
          { icon: 'bulb-outline', label: 'AI-powered coaching' },
          { icon: 'analytics-outline', label: 'Trend analysis' },
          { icon: 'ribbon-outline', label: 'Consistency streaks' },
        ],
      },
    ],
  },
  { kind: 'cta' },
];

const TOTAL = SLIDES.length;

// --- Sub-components ---

function HeroSlide({ width, colors }: { width: number; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={[styles.slideRoot, { width }]} accessibilityLabel="Slide 1 of 5: Welcome to PepMax">
      {/* decorative orbs */}
      <View style={[styles.orb, styles.orbTL, { backgroundColor: Colors.accent }]} />
      <View style={[styles.orb, styles.orbBR, { backgroundColor: Colors.peptide }]} />

      <View style={styles.heroBadge}>
        <Ionicons name="fitness-outline" size={36} color={Colors.accent} />
      </View>
      <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Welcome to PepMax</Text>
      <Text style={[styles.heroTagline, { color: colors.textSecondary }]}>Your Complete Wellness{'\n'}Command Center</Text>
      <View style={styles.heroModuleRow}>
        {[
          { color: Colors.peptide, icon: 'eyedrop-outline' as const },
          { color: Colors.nutrition, icon: 'nutrition-outline' as const },
          { color: Colors.gym, icon: 'barbell-outline' as const },
          { color: Colors.cardio, icon: 'bicycle-outline' as const },
          { color: Colors.body, icon: 'body-outline' as const },
        ].map((m) => (
          <View key={m.color} style={[styles.heroDot, { backgroundColor: m.color + '30' }]}>
            <Ionicons name={m.icon} size={18} color={m.color} />
          </View>
        ))}
      </View>
    </View>
  );
}

function CardsSlide({ slide, width, index, colors }: { slide: Extract<Slide, { kind: 'cards' }>; width: number; index: number; colors: ReturnType<typeof useTheme>['colors'] }) {
  const titles = ['Track & Optimize', 'Train & Move', 'Measure & Recover'];
  const subs = [
    'Peptides + Nutrition',
    'Strength + Cardio',
    'Dashboard + Body Hub',
  ];
  const label = `Slide ${index + 1} of 5: ${titles[index - 1]}`;

  return (
    <View style={[styles.slideRoot, { width }]} accessibilityLabel={label}>
      <LinearGradient
        colors={[slide.tint + '22', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />
      <View style={[styles.orb, styles.orbTR, { backgroundColor: slide.tint }]} />

      <Text style={[styles.slideHeading, { color: colors.textPrimary }]}>{titles[index - 1]}</Text>
      <Text style={[styles.slideSub, { color: colors.textSecondary }]}>{subs[index - 1]}</Text>

      <View style={styles.cardsColumn}>
        {slide.cards.map((card) => (
          <GlassCard
            key={card.title}
            intensity="subtle"
            accentColor={card.color}
            padding={12}
            style={styles.featureCard}
          >
            <Text style={[styles.cardTitle, { color: card.color }]}>{card.title}</Text>
            <View style={styles.featureList}>
              {card.features.map((f) => (
                <View key={f.label} style={styles.featureRow}>
                  <Ionicons name={f.icon} size={14} color={card.color} style={styles.featureIcon} />
                  <Text style={[styles.featureLabel, { color: colors.textPrimary }]}>{f.label}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        ))}
      </View>
    </View>
  );
}

function CTASlide({ width, onGetStarted, onLogIn, colors }: { width: number; onGetStarted: () => void; onLogIn: () => void; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={[styles.slideRoot, { width }]} accessibilityLabel="Slide 5 of 5: Your Journey Starts Here">
      <View style={[styles.orb, styles.orbCenter, { backgroundColor: Colors.gold }]} />

      <View style={styles.ctaBadge}>
        <Ionicons name="rocket-outline" size={40} color={Colors.gold} />
      </View>
      <Text style={[styles.ctaTitle, { color: colors.textPrimary }]}>Your Journey{'\n'}Starts Here</Text>
      <Text style={[styles.ctaSub, { color: colors.textSecondary }]}>XP rewards, Apple Watch sync,{'\n'}community challenges & more.</Text>

      <View style={styles.ctaChips}>
        {[
          { icon: 'star-outline' as const, label: 'XP & Achievements' },
          { icon: 'watch-outline' as const, label: 'Apple Watch' },
          { icon: 'people-outline' as const, label: 'Community' },
        ].map((c) => (
          <View key={c.label} style={styles.ctaChip}>
            <Ionicons name={c.icon} size={14} color={Colors.gold} />
            <Text style={[styles.ctaChipText, { color: colors.textSecondary }]}>{c.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.ctaActions}>
        <GradientButton
          label="Get Started"
          onPress={onGetStarted}
          colors={[Colors.accent, Colors.primary]}
          icon="arrow-forward-outline"
          style={styles.ctaBtn}
        />
        <TouchableOpacity onPress={onLogIn} style={styles.logInRow} accessibilityRole="button" accessibilityLabel="Log In">
          <Text style={[styles.logInText, { color: colors.textSecondary }]}>
            Already have an account?{' '}
            <Text style={styles.logInAccent}>Log In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --- Animated dot ---

function Dot({ index, scrollX, width }: { index: number; scrollX: SharedValue<number>; width: number }) {
  const colors = [Colors.primary, Colors.peptide, Colors.gym, Colors.body, Colors.gold];
  const activeColor = colors[index] ?? Colors.accent;

  const dotStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const dotWidth = interpolate(scrollX.value, inputRange, [8, 20, 8], 'clamp');
    const opacity = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], 'clamp');
    return { width: withSpring(dotWidth, { damping: 12, stiffness: 180 }), opacity };
  });

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: activeColor }, dotStyle]}
      accessibilityLabel={`Page ${index + 1} of ${TOTAL}`}
    />
  );
}

// --- Main screen ---

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  }, [width]);

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollRef.current?.scrollTo({ x: (TOTAL - 1) * width, animated: true });
    // currentIndex is updated by onMomentumScrollEnd after the animation completes,
    // avoiding a brief UI desync where Skip disappears before the scroll finishes.
  }, [width]);

  const handleGetStarted = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(auth)/sign-up');
  }, [router]);

  const handleLogIn = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(auth)/log-in');
  }, [router]);

  const isLast = currentIndex === TOTAL - 1;

  return (
    <GlassBackground>
      <SafeAreaView style={styles.safe}>
        {/* Top bar: Skip button */}
        <View style={styles.topBar}>
          {!isLast ? (
            <TouchableOpacity
              onPress={handleSkip}
              style={styles.skipBtn}
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding"
            >
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.skipBtn} />
          )}
        </View>

        {/* Paginated carousel */}
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={scrollHandler}
          onMomentumScrollEnd={handleMomentumEnd}
          style={styles.scrollView}
          accessibilityLabel="Onboarding carousel"
        >
          {SLIDES.map((slide, i) => {
            if (slide.kind === 'hero') {
              return <HeroSlide key="hero" width={width} colors={colors} />;
            }
            if (slide.kind === 'cta') {
              return (
                <CTASlide
                  key="cta"
                  width={width}
                  onGetStarted={handleGetStarted}
                  onLogIn={handleLogIn}
                  colors={colors}
                />
              );
            }
            return <CardsSlide key={i} slide={slide} width={width} index={i} colors={colors} />;
          })}
        </Animated.ScrollView>

        {/* Dot indicators */}
        <View style={styles.dots} accessibilityLabel="Carousel progress indicators">
          {SLIDES.map((_, i) => (
            <Dot key={i} index={i} scrollX={scrollX} width={width} />
          ))}
        </View>
      </SafeAreaView>
    </GlassBackground>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { height: 48, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 24 },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 4, minWidth: 44, alignItems: 'flex-end' },
  skipText: { fontSize: 15, fontWeight: '500' },

  scrollView: { flex: 1 },

  slideRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 8, overflow: 'hidden' },
  // Decorative orbs — plain Views, no BlurView
  orb: { position: 'absolute', borderRadius: 999, opacity: 0.12 },
  orbTL: { width: 200, height: 200, top: -60, left: -60 },
  orbBR: { width: 160, height: 160, bottom: -40, right: -40 },
  orbTR: { width: 180, height: 180, top: -50, right: -50 },
  orbCenter: { width: 260, height: 260, top: '10%', alignSelf: 'center' },

  heroBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroTagline: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 10,
    marginBottom: 28,
  },
  heroModuleRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heroDot: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  slideHeading: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  slideSub: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  cardsColumn: { width: '100%', gap: 10 },
  featureCard: { width: '100%' },
  cardTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
  featureList: { gap: 5 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 4 },
  featureIcon: {},
  featureLabel: { fontSize: 13, flex: 1 },

  ctaBadge: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: Colors.gold + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  ctaSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 20,
  },
  ctaChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 },
  ctaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.gold + '18',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.gold + '30',
  },
  ctaChipText: { fontSize: 12, fontWeight: '500' },
  ctaActions: { width: '100%', gap: 12 },
  ctaBtn: { width: '100%' },
  logInRow: { alignItems: 'center', paddingVertical: 8 },
  logInText: { fontSize: 14 },
  logInAccent: { color: Colors.accent, fontWeight: '600' },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  dot: { height: 8, borderRadius: 4 },
});
