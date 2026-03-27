/**
 * DuelResultScreen — victory/defeat/draw reveal screen.
 *
 * Win:  winner's side expands, "VICTORY" springs in, celebration fires.
 * Loss: winner's side expands, your side dims, "DEFEAT" fades in, "REVENGE" glows.
 * Tie:  both sides pulse simultaneously, "DRAW" centered.
 *
 * useReducedMotion: static layout, no expand/pulse/spring.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useCelebration } from '../../hooks/useCelebration';
import { duelWin } from '../../utils/celebrationPresets';
import { RankBadge } from './RankBadge';
import { RANK_TIERS_V2 } from '../../utils/rankTierV2';
import type { RankTierV2 } from '../../types/rankV2';

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BG_COLOR = '#0F0F1A';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#A0A0B8';
const ACCENT = '#6C5CE7';
const SURFACE = '#1E1E2E';
const BORDER = '#2E2E42';
const GOLD = '#FFD700';
const VICTORY_COLOR = '#00B894';
const DEFEAT_COLOR = '#636E72';
const AUTO_COMPLETE_MS = 4000;

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  winner: 'challenger' | 'opponent' | 'tie';
  challengerName: string;
  opponentName: string;
  challengerTier: RankTierV2;
  opponentTier: RankTierV2;
  challengerValue: number;
  opponentValue: number;
  unit: string;
  isMe: 'challenger' | 'opponent';
  onComplete: () => void;
  onRevenge?: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTierColor(tier: RankTierV2): string {
  return RANK_TIERS_V2.find((t) => t.tier === tier)?.color ?? '#FFFFFF';
}

function getTierInfo(tier: RankTierV2) {
  return RANK_TIERS_V2.find((t) => t.tier === tier) ?? RANK_TIERS_V2[0];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DuelResultScreen({
  winner,
  challengerName,
  opponentName,
  challengerTier,
  opponentTier,
  challengerValue,
  opponentValue,
  unit,
  isMe,
  onComplete,
  onRevenge,
}: Props) {
  const reducedMotion = useReducedMotion();
  const { triggerCelebration } = useCelebration();
  const dismissed = useRef(false);

  const iWon = winner !== 'tie' && winner === isMe;
  const iLost = winner !== 'tie' && winner !== isMe;
  const isTie = winner === 'tie';

  const winnerSide = winner === 'tie' ? null : winner;

  // Animation shared values
  const challengerFlex = useSharedValue(1);
  const opponentFlex = useSharedValue(1);
  const challengerOpacity = useSharedValue(1);
  const opponentOpacity = useSharedValue(1);
  const resultTextScale = useSharedValue(0);
  const resultTextOpacity = useSharedValue(0);
  const revengeScale = useSharedValue(1);

  function dismiss() {
    if (!dismissed.current) {
      dismissed.current = true;
      onComplete();
    }
  }

  useEffect(() => {
    const timerHandle = setTimeout(() => dismiss(), AUTO_COMPLETE_MS);

    if (reducedMotion) {
      // Static: show everything immediately
      resultTextScale.value = 1;
      resultTextOpacity.value = 1;
      revengeScale.value = 1;
      return () => clearTimeout(timerHandle);
    }

    if (iWon) {
      // My side expands, theirs shrinks
      const myFlex = isMe === 'challenger' ? challengerFlex : opponentFlex;
      const theirFlex = isMe === 'challenger' ? opponentFlex : challengerFlex;
      const theirOpacity = isMe === 'challenger' ? opponentOpacity : challengerOpacity;

      myFlex.value = withSpring(1.6, { damping: 14, stiffness: 80 });
      theirFlex.value = withSpring(0.4, { damping: 14, stiffness: 80 });
      theirOpacity.value = withTiming(0.4, { duration: 600 });

      // VICTORY text springs in
      resultTextOpacity.value = withTiming(1, { duration: 400 });
      resultTextScale.value = withSpring(1, { damping: 12, stiffness: 120 });

      // Trigger celebration
      triggerCelebration(
        duelWin({
          title: 'VICTORY!',
          subtitle: 'You crushed them.',
          accentColor: VICTORY_COLOR,
        }),
      );

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } else if (iLost) {
      // Winner's side expands, my side dims
      const winnerFlex = winnerSide === 'challenger' ? challengerFlex : opponentFlex;
      const myFlex = winnerSide === 'challenger' ? opponentFlex : challengerFlex;
      const myOpacity = winnerSide === 'challenger' ? opponentOpacity : challengerOpacity;

      winnerFlex.value = withSpring(1.6, { damping: 14, stiffness: 80 });
      myFlex.value = withSpring(0.4, { damping: 14, stiffness: 80 });
      myOpacity.value = withTiming(0.4, { duration: 600 });

      // DEFEAT text fades in — no spring, simple withTiming
      resultTextOpacity.value = withTiming(1, { duration: 500 });
      resultTextScale.value = withTiming(1, { duration: 500 });

      // Revenge button glow pulse
      revengeScale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }
    } else {
      // Tie: both sides pulse simultaneously
      challengerFlex.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 700 }),
          withTiming(1, { duration: 700 }),
        ),
        3,
        true,
      );
      opponentFlex.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 700 }),
          withTiming(1, { duration: 700 }),
        ),
        3,
        true,
      );

      resultTextOpacity.value = withTiming(1, { duration: 400 });
      resultTextScale.value = withSpring(1, { damping: 14, stiffness: 100 });
    }

    return () => clearTimeout(timerHandle);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const challengerPanelStyle = useAnimatedStyle(() => ({
    flex: challengerFlex.value,
    opacity: challengerOpacity.value,
  }));

  const opponentPanelStyle = useAnimatedStyle(() => ({
    flex: opponentFlex.value,
    opacity: opponentOpacity.value,
  }));

  const resultTextStyle = useAnimatedStyle(() => ({
    opacity: resultTextOpacity.value,
    transform: [{ scale: resultTextScale.value }],
  }));

  const revengeBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: revengeScale.value }],
  }));

  const resultLabel = iWon ? 'VICTORY' : iLost ? 'DEFEAT' : 'DRAW';
  const resultColor = iWon ? VICTORY_COLOR : iLost ? DEFEAT_COLOR : GOLD;

  const challengerColor = getTierColor(challengerTier);
  const opponentColor = getTierColor(opponentTier);

  const isChallengerWinner = winner === 'challenger';
  const isOpponentWinner = winner === 'opponent';

  return (
    <View style={styles.container}>
      {/* Two-panel layout */}
      <View style={styles.panelsRow}>
        {/* Challenger panel */}
        <Animated.View
          style={[
            styles.panel,
            { backgroundColor: challengerColor + '15' },
            challengerPanelStyle,
          ]}
        >
          <View style={styles.panelContent}>
            <RankBadge
              tier={challengerTier}
              size="lg"
              glow={isChallengerWinner}
            />
            <Text style={styles.panelName} numberOfLines={1}>
              {challengerName}
            </Text>
            {isMe === 'challenger' && (
              <Text style={[styles.youLabel, { color: ACCENT }]}>YOU</Text>
            )}
            <Text
              style={[
                styles.valueText,
                { color: isChallengerWinner ? GOLD : TEXT_SECONDARY },
              ]}
            >
              {challengerValue} {unit}
            </Text>
          </View>
        </Animated.View>

        {/* Opponent panel */}
        <Animated.View
          style={[
            styles.panel,
            { backgroundColor: opponentColor + '15' },
            opponentPanelStyle,
          ]}
        >
          <View style={styles.panelContent}>
            <RankBadge
              tier={opponentTier}
              size="lg"
              glow={isOpponentWinner}
            />
            <Text style={styles.panelName} numberOfLines={1}>
              {opponentName}
            </Text>
            {isMe === 'opponent' && (
              <Text style={[styles.youLabel, { color: ACCENT }]}>YOU</Text>
            )}
            <Text
              style={[
                styles.valueText,
                { color: isOpponentWinner ? GOLD : TEXT_SECONDARY },
              ]}
            >
              {opponentValue} {unit}
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Result overlay */}
      <View style={styles.resultOverlay} pointerEvents="none">
        <Animated.Text
          style={[styles.resultText, { color: resultColor }, resultTextStyle]}
          accessibilityRole="header"
        >
          {resultLabel}
        </Animated.Text>
      </View>

      {/* Bottom CTAs */}
      <View style={styles.ctaRow}>
        {iLost && onRevenge && (
          <Animated.View style={revengeBtnStyle}>
            <TouchableOpacity
              style={styles.revengeButton}
              onPress={onRevenge}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Challenge to a revenge duel"
            >
              <Text style={styles.revengeButtonText}>REVENGE</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={dismiss}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={iWon ? 'Claim victory and close' : isTie ? 'Accept draw and close' : 'Continue'}
        >
          <Text style={styles.closeButtonText}>
            {iWon ? 'Claim Victory' : isTie ? 'Draw — OK' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: BG_COLOR,
  },
  panelsRow: {
    flex: 1,
    flexDirection: 'row',
  },
  panel: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 0,
  },
  panelContent: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  panelName: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  youLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  valueText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  resultOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
  },
  ctaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 48,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: SURFACE + 'CC',
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  revengeButton: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  revengeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  closeButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
});
