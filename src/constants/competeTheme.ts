import { Colors } from './theme';

// ─── Arena color palette (theme-aware) ───────────────────────────────────────

export function arenaColors(dark: boolean) {
  return dark
    ? {
        gradientStart: '#08081A',
        gradientMid: '#0C0C1E',
        gradientEnd: '#0F0F22',
        cardFill: 'rgba(255, 255, 255, 0.06)',
        cardBorder: 'rgba(255, 255, 255, 0.12)',
        sectionText: '#9A9AB0', // 5.4:1 on #0A0A1A — passes WCAG AA
      }
    : {
        gradientStart: '#E8E8F4',
        gradientMid: '#F0F0FA',
        gradientEnd: '#F5F5FF',
        cardFill: 'rgba(0, 0, 0, 0.04)',
        cardBorder: 'rgba(0, 0, 0, 0.10)',
        sectionText: '#555566', // 5.5:1 on #F0F0FA — passes WCAG AA
      };
}

// ─── Glow colors for arena cards (same in both modes) ────────────────────────

export const ARENA_GLOW = {
  gold: Colors.gold,        // XP, achievements
  purple: Colors.social,    // PVP, duels
  green: Colors.nutrition,  // quests, streaks
  red: Colors.cardio,       // challenges, urgent
  accent: Colors.accent,    // general
} as const;

// ─── Factory: arena card style with optional colored glow border ──────────────

export function arenaCardStyle(dark: boolean, glowColor?: string) {
  const a = arenaColors(dark);
  return {
    backgroundColor: a.cardFill,
    borderWidth: 1,
    borderColor: glowColor ? glowColor + '44' : a.cardBorder,
    borderRadius: 14,
    // Subtle shadow glow on dark mode only
    ...(dark && glowColor
      ? {
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 4,
        }
      : {}),
  };
}
