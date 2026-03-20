/**
 * PremiumGate — wraps UI that requires a premium subscription.
 *
 * mode="blur"  → renders children with a semi-transparent overlay + lock icon. Tap opens paywall.
 * mode="hide"  → renders fallback (or nothing) when not premium.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePremium } from '../../contexts/PremiumContext';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';

type Props = {
  children: React.ReactNode;
  mode?: 'blur' | 'hide';
  fallback?: React.ReactNode;
  /** Remove borderRadius + overflow clipping — use when gating full-screen content. */
  fullScreen?: boolean;
};

export default function PremiumGate({ children, mode = 'blur', fallback, fullScreen = false }: Props) {
  const { isPremium } = usePremium();
  const { colors } = useTheme();
  const router = useRouter();

  if (isPremium) return <>{children}</>;

  if (mode === 'hide') return <>{fallback ?? null}</>;

  // Blur mode — show children with overlay
  const openPaywall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/go-pro');
  };

  return (
    <View style={[styles.wrapper, fullScreen && styles.wrapperFullScreen]}>
      <View style={styles.blurred} pointerEvents="none">
        {children}
      </View>
      <TouchableOpacity
        style={[styles.overlay, { backgroundColor: colors.background + 'DD' }, fullScreen && styles.overlayFullScreen]}
        onPress={openPaywall}
        activeOpacity={0.9}
      >
        <View style={[styles.lockCircle, { backgroundColor: Colors.gold + '20' }]}>
          <Ionicons name="lock-closed" size={22} color={Colors.gold} />
        </View>
        <Text style={[styles.lockText, { color: colors.textPrimary }]}>Premium Feature</Text>
        <Text style={[styles.unlockText, { color: Colors.accent }]}>Tap to unlock</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', overflow: 'hidden', borderRadius: 14 },
  wrapperFullScreen: { borderRadius: 0, overflow: 'visible' },
  blurred: { opacity: 0.3 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
  },
  overlayFullScreen: { borderRadius: 0 },
  lockCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  lockText: { fontSize: 15, fontWeight: '700' },
  unlockText: { fontSize: 13, fontWeight: '600' },
});
