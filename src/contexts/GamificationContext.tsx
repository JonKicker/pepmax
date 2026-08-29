/**
 * GamificationContext — global provider for XP toast and level-up modal.
 *
 * Placement: inside AuthProvider (needs auth) but outside PremiumProvider.
 * The provider renders XPToast and LevelUpModal as siblings to children so
 * they overlay every screen in the app without needing portal hacks.
 *
 * Usage (from any hook or component):
 *   const { showXPToast, showLevelUpModal } = useGamificationUI();
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from 'react';
import { XPToast } from '../components/gamification/XPToast';
import { LevelUpModal } from '../components/gamification/LevelUpModal';
import type { ToastItem } from '../components/gamification/XPToast';
import { useCelebration } from '../hooks/useCelebration';
import { dailyQuest } from '../utils/celebrationPresets';

type GamificationUIContextType = {
  showXPToast: (amount: number, source: string) => void;
  showLevelUpModal: (level: number, totalXP: number) => void;
};

const GamificationUIContext = createContext<GamificationUIContextType>({
  showXPToast: () => {},
  showLevelUpModal: (_level: number, _totalXP: number) => {},
});

export function useGamificationUI(): GamificationUIContextType {
  return useContext(GamificationUIContext);
}

let toastIdCounter = 0;

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const [toastQueue, setToastQueue] = useState<ToastItem[]>([]);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
  const [levelUpTotalXP, setLevelUpTotalXP] = useState<number>(0);

  const { triggerCelebration } = useCelebration();

  const showXPToast = useCallback((amount: number, source: string) => {
    if (amount <= 0) return;
    const item: ToastItem = {
      id: String(++toastIdCounter),
      amount,
      source,
    };
    setToastQueue((prev) => [...prev, item]);
  }, []);

  const showLevelUpModal = useCallback((level: number, totalXP: number) => {
    setLevelUpLevel(level);
    setLevelUpTotalXP(totalXP);
    triggerCelebration(dailyQuest({ title: `Level ${level}!`, subtitle: 'Keep it up!' }));
  }, [triggerCelebration]);

  // Called by XPToast when its animation completes.
  // Removes the head of the queue so the next item can animate.
  const handleToastDismissed = useCallback(() => {
    setToastQueue((prev) => prev.slice(1));
  }, []);

  const currentToast = toastQueue[0] ?? null;

  return (
    <GamificationUIContext.Provider value={{ showXPToast, showLevelUpModal }}>
      {children}
      <XPToast item={currentToast} onDismissed={handleToastDismissed} />
      <LevelUpModal
        level={levelUpLevel}
        totalXP={levelUpTotalXP}
        onDismiss={() => setLevelUpLevel(null)}
      />
    </GamificationUIContext.Provider>
  );
}
