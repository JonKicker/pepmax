/**
 * CompareBattle — head-to-head stat comparison that feels like a fighting game.
 *
 * Animation sequence (useReducedMotion → static display):
 * 1. VS header slides in
 * 2. Stats reveal one-by-one (400ms delay between each)
 *    - Label fades in centered
 *    - Your value slides from left, theirs from right
 *    - Winner: gold highlight (border glow + scale 1.05), loser: opacity 0.6
 * 3. Running score counter updates with each stat
 * 4. Overall WINNER banner after all stats
 * 5. CTAs: "Challenge to Duel" + "Close"
 *
 * Haptics: selectionAsync on each stat reveal, notificationAsync(Success) on winner.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { RankBadge } from './RankBadge';
import { RANK_TIERS_V2 } from '../../utils/rankTierV2';
import {
  determineStatWinner,
  calculateOverallWinner,
} from '../../utils/compareFormatters';
import type { RankTierV2 } from '../../types/rankV2';

// ─── Constants ────────────────────────────────────────────────────────────────

const BG_COLOR = '#0F0F1A';
const SURFACE = '#1E1E2E';
const BORDER = '#2E2E42';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#A0A0B8';
const ACCENT = '#6C5CE7';
const GOLD_COLOR = '#FFD700';
const WIN_COLOR = '#00B894';
const STAT_DELAY_MS = 400;

// ─── Stat row type ────────────────────────────────────────────────────────────

type StatConfig = {
  label: string;
  myValue: number;
  theirValue: number;
  unit: string;
  higherIsBetter: boolean;
};

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  myName: string;
  theirName: string;
  myTier: RankTierV2;
  theirTier: RankTierV2;
  stats: StatConfig[];
  onChallenge?: () => void;
  onDismiss: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTierColor(tier: RankTierV2): string {
  return RANK_TIERS_V2.find((t) => t.tier === tier)?.color ?? '#FFFFFF';
}

function formatStatValue(value: number, unit: string): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M ${unit}`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k ${unit}`;
  return `${Math.round(value)} ${unit}`;
}

function fireSelection(): void {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => {});
}

function fireSuccess(): void {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

// ─── StatRevealRow ────────────────────────────────────────────────────────────

type StatRevealRowProps = {
  stat: StatConfig;
  winner: 'me' | 'them' | 'tie';
  visible: boolean;
  reducedMotion: boolean;
};

function StatRevealRow({ stat, winner, visible, reducedMotion }: StatRevealRowProps) {
  const labelOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const myTranslateX = useSharedValue(reducedMotion ? 0 : -40);
  const theirTranslateX = useSharedValue(reducedMotion ? 0 : 40);
  const myOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const theirOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const myScale = useSharedValue(1);
  const theirScale = useSharedValue(1);

  useEffect(() => {
    if (!visible) return;

    if (reducedMotion) {
      // Static: everything visible immediately, apply winner styling
      myScale.value = winner === 'me' ? 1.05 : 1;
      theirScale.value = winner === 'them' ? 1.05 : 1;
      myOpacity.value = winner === 'them' ? 0.6 : 1;
      theirOpacity.value = winner === 'me' ? 0.6 : 1;
      return;
    }

    // Animated reveal
    labelOpacity.value = withTiming(1, { duration: 300 });
    myTranslateX.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) });
    myOpacity.value = withTiming(1, { duration: 300 });
    theirTranslateX.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) });
    theirOpacity.value = withTiming(1, { duration: 300 });

    // Winner/loser scaling with short delay — cleaned up on unmount
    const highlightTimer = setTimeout(() => {
      if (winner === 'me') {
        myScale.value = withSpring(1.05, { damping: 14, stiffness: 160 });
        theirOpacity.value = withTiming(0.6, { duration: 300 });
      } else if (winner === 'them') {
        theirScale.value = withSpring(1.05, { damping: 14, stiffness: 160 });
        myOpacity.value = withTiming(0.6, { duration: 300 });
      }
    }, 350);

    return () => clearTimeout(highlightTimer);
  }, [visible, reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.value }));
  const myStyle = useAnimatedStyle(() => ({
    opacity: myOpacity.value,
    transform: [{ translateX: myTranslateX.value }, { scale: myScale.value }],
  }));
  const theirStyle = useAnimatedStyle(() => ({
    opacity: theirOpacity.value,
    transform: [{ translateX: theirTranslateX.value }, { scale: theirScale.value }],
  }));

  const myIsWinner = winner === 'me';
  const theirIsWinner = winner === 'them';

  if (!visible) return null;

  const winnerDesc =
    winner === 'me' ? 'you win this stat' : winner === 'them' ? 'they win this stat' : 'tied';

  return (
    <View
      style={styles.statRow}
      accessibilityLabel={`${stat.label}: you ${formatStatValue(stat.myValue, stat.unit)} vs them ${formatStatValue(stat.theirValue, stat.unit)}, ${winnerDesc}`}
    >
      {/* Label */}
      <Animated.Text style={[styles.statLabel, labelStyle]}>
        {stat.label}
      </Animated.Text>

      {/* Values row */}
      <View style={styles.statValuesRow}>
        {/* My value */}
        <Animated.View
          style={[
            styles.statValueBox,
            myIsWinner && styles.winnerValueBox,
            myStyle,
          ]}
        >
          <Text style={[styles.statValueText, { color: myIsWinner ? GOLD_COLOR : TEXT_PRIMARY }]}>
            {formatStatValue(stat.myValue, stat.unit)}
          </Text>
        </Animated.View>

        {/* Center divider */}
        <Text style={styles.statVsDivider}>vs</Text>

        {/* Their value */}
        <Animated.View
          style={[
            styles.statValueBox,
            theirIsWinner && styles.winnerValueBox,
            theirStyle,
          ]}
        >
          <Text style={[styles.statValueText, { color: theirIsWinner ? GOLD_COLOR : TEXT_PRIMARY }]}>
            {formatStatValue(stat.theirValue, stat.unit)}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CompareBattle({
  myName,
  theirName,
  myTier,
  theirTier,
  stats,
  onChallenge,
  onDismiss,
}: Props) {
  const reducedMotion = useReducedMotion();

  // Header animation
  const headerTranslateY = useSharedValue(reducedMotion ? 0 : -40);
  const headerOpacity = useSharedValue(reducedMotion ? 1 : 0);

  // Track which stats are visible
  const [visibleCount, setVisibleCount] = useState(reducedMotion ? stats.length : 0);
  const [score, setScore] = useState({ me: 0, them: 0 });
  const [showWinner, setShowWinner] = useState(reducedMotion);
  const revealedRef = useRef(0);

  // Memory-leak guards: track mounted state and all pending timers
  const mountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  // Compute per-stat winners
  const statWinners: Array<'me' | 'them' | 'tie'> = stats.map((s) =>
    determineStatWinner(s.myValue, s.theirValue, s.higherIsBetter),
  );

  const overallResult = calculateOverallWinner(statWinners);

  const winnerBannerOpacity = useSharedValue(0);
  const winnerBannerScale = useSharedValue(0.8);

  useEffect(() => {
    if (reducedMotion) {
      // Static: show everything
      const { myWins, theirWins } = calculateOverallWinner(statWinners);
      setScore({ me: myWins, them: theirWins });
      setVisibleCount(stats.length);
      winnerBannerOpacity.value = 1;
      winnerBannerScale.value = 1;
      return;
    }

    // Animate header in
    headerTranslateY.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) });
    headerOpacity.value = withTiming(1, { duration: 350 });

    // Reveal stats one by one
    let currentMe = 0;
    let currentThem = 0;

    const revealNext = (index: number) => {
      if (!mountedRef.current) return;

      if (index >= stats.length) {
        // All stats shown — reveal winner
        const winnerTimer = setTimeout(() => {
          if (!mountedRef.current) return;
          setShowWinner(true);
          winnerBannerOpacity.value = withTiming(1, { duration: 400 });
          winnerBannerScale.value = withSpring(1, { damping: 14, stiffness: 100 });
          fireSuccess();
        }, 300);
        timersRef.current.push(winnerTimer);
        return;
      }

      setVisibleCount(index + 1);
      fireSelection();

      // Update score
      const w = statWinners[index];
      if (w === 'me') currentMe++;
      if (w === 'them') currentThem++;
      setScore({ me: currentMe, them: currentThem });

      revealedRef.current = index + 1;

      const nextTimer = setTimeout(() => revealNext(index + 1), STAT_DELAY_MS);
      timersRef.current.push(nextTimer);
    };

    // Start after header animation settles
    const startTimer = setTimeout(() => revealNext(0), 400);
    timersRef.current.push(startTimer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const winnerBannerStyle = useAnimatedStyle(() => ({
    opacity: winnerBannerOpacity.value,
    transform: [{ scale: winnerBannerScale.value }],
  }));

  const myColor = getTierColor(myTier);
  const theirColor = getTierColor(theirTier);

  const overallWinnerLabel =
    overallResult.winner === 'me'
      ? `${myName} WINS`
      : overallResult.winner === 'them'
      ? `${theirName} WINS`
      : 'DRAW';

  const overallWinnerColor =
    overallResult.winner === 'me'
      ? WIN_COLOR
      : overallResult.winner === 'them'
      ? theirColor
      : GOLD_COLOR;

  return (
    <View style={styles.container}>
      {/* VS Header */}
      <Animated.View style={[styles.header, headerStyle]}>
        <View style={styles.headerPlayer}>
          <RankBadge tier={myTier} size="sm" />
          <Text style={[styles.headerName, { color: myColor }]} numberOfLines={1}>
            {myName}
          </Text>
        </View>

        <View style={styles.scoreBox}>
          <Text style={styles.scoreText}>
            <Text style={{ color: myColor }}>{score.me}</Text>
            <Text style={{ color: TEXT_SECONDARY }}> — </Text>
            <Text style={{ color: theirColor }}>{score.them}</Text>
          </Text>
          <Text style={styles.vsSmall}>VS</Text>
        </View>

        <View style={[styles.headerPlayer, styles.headerPlayerRight]}>
          <Text style={[styles.headerName, { color: theirColor }]} numberOfLines={1}>
            {theirName}
          </Text>
          <RankBadge tier={theirTier} size="sm" />
        </View>
      </Animated.View>

      {/* Stats list */}
      <ScrollView
        style={styles.statsList}
        contentContainerStyle={styles.statsContent}
        showsVerticalScrollIndicator={false}
      >
        {stats.map((stat, i) => (
          <StatRevealRow
            key={stat.label}
            stat={stat}
            winner={statWinners[i]}
            visible={i < visibleCount}
            reducedMotion={reducedMotion}
          />
        ))}

        {/* Overall winner banner */}
        {showWinner && (
          <Animated.View style={[styles.winnerBanner, winnerBannerStyle]}>
            <Text style={[styles.winnerBannerText, { color: overallWinnerColor }]}>
              {overallWinnerLabel}
            </Text>
            <Text style={styles.winnerSubText}>
              {overallResult.myWins}–{overallResult.theirWins}
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* CTAs */}
      <View style={styles.ctaRow}>
        {onChallenge && (
          <TouchableOpacity
            style={styles.challengeButton}
            onPress={onChallenge}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Challenge to a duel"
          >
            <Text style={styles.challengeButtonText}>Challenge to Duel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onDismiss}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Close comparison"
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 8,
  },
  headerPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  headerPlayerRight: {
    justifyContent: 'flex-end',
  },
  headerName: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  scoreBox: {
    alignItems: 'center',
    gap: 2,
    minWidth: 60,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '900',
  },
  vsSmall: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  statsList: {
    flex: 1,
  },
  statsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statRow: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statLabel: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  statValuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statValueBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  winnerValueBox: {
    borderColor: GOLD_COLOR + '66',
    backgroundColor: GOLD_COLOR + '0D',
  },
  statValueText: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  statVsDivider: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    width: 24,
    textAlign: 'center',
  },
  winnerBanner: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 20,
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  winnerBannerText: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
  },
  winnerSubText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '600',
  },
  ctaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: SURFACE,
  },
  challengeButton: {
    flex: 1,
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  challengeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  closeButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  closeButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '600',
  },
});
