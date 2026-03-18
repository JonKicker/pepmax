/**
 * usePremiumGate — imperative premium check for button presses.
 *
 * Usage:
 *   const { gate } = usePremiumGate();
 *   const handleExport = () => { if (!gate()) return; doExport(); };
 */
import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { usePremium } from '../contexts/PremiumContext';

export function usePremiumGate() {
  const { isPremium } = usePremium();
  const router = useRouter();

  const gate = useCallback((): boolean => {
    if (isPremium) return true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/paywall');
    return false;
  }, [isPremium, router]);

  return { isPremium, gate };
}
