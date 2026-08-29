import { useColorScheme } from 'react-native';

export const Colors = {
  // Brand
  primary: '#1B4F72',
  accent: '#2E86C1',

  // Module colors
  peptide: '#2E86C1',
  nutrition: '#27AE60',
  gym: '#8E44AD',
  cardio: '#E74C3C',
  body: '#00897B',

  // Extended palette
  teal: '#1ABC9C',
  social: '#8B5CF6',
  recovery: '#9B59B6',

  // Light mode
  light: {
    background: '#FFFFFF',
    surface: '#F4F6F7',
    textPrimary: '#1A1A2E',
    textSecondary: '#666666',
    border: '#D5D8DC',
    success: '#27AE60',
    glass: {
      heavy: 'rgba(255, 255, 255, 0.45)',
      subtle: 'rgba(255, 255, 255, 0.25)',
      border: 'rgba(255, 255, 255, 0.5)',
      shadow: 'rgba(0, 0, 0, 0.06)',
      gradientStart: '#eef2ff',
      gradientMid: '#f8f9ff',
      gradientEnd: '#ffffff',
    },
  },

  // Dark mode
  dark: {
    background: '#0A0A0F',
    surface: '#12121A',
    textPrimary: '#E8E8E8',
    textSecondary: '#8A8A9A',
    border: '#1E1E2A',
    success: '#2ECC71',
    glass: {
      heavy: 'rgba(255, 255, 255, 0.07)',
      subtle: 'rgba(255, 255, 255, 0.03)',
      border: 'rgba(255, 255, 255, 0.10)',
      shadow: 'rgba(0, 0, 0, 0.3)',
      gradientStart: '#111120',
      gradientMid: '#0D0D16',
      gradientEnd: '#0A0A0F',
    },
  },

  // Shared
  warning: '#E67E22',
  error: '#E74C3C',
  gold: '#FFD700',
} as const;

export type Theme = {
  dark: boolean;
  colors: {
    background: string;
    surface: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    primary: string;
    accent: string;
    peptide: string;
    nutrition: string;
    gym: string;
    cardio: string;
    body: string;
    gold: string;
    teal: string;
    social: string;
    recovery: string;
    glass: {
      heavy: string;
      subtle: string;
      border: string;
      shadow: string;
      gradientStart: string;
      gradientMid: string;
      gradientEnd: string;
    };
  };
};

function buildTheme(dark: boolean): Theme {
  const mode = dark ? Colors.dark : Colors.light;
  return {
    dark,
    colors: {
      ...mode,
      warning: Colors.warning,
      error: Colors.error,
      primary: Colors.primary,
      accent: Colors.accent,
      peptide: Colors.peptide,
      nutrition: Colors.nutrition,
      gym: Colors.gym,
      cardio: Colors.cardio,
      body: Colors.body,
      gold: Colors.gold,
      teal: Colors.teal,
      social: Colors.social,
      recovery: Colors.recovery,
      glass: mode.glass,
    },
  };
}

export const LightTheme = buildTheme(false);
export const DarkTheme = buildTheme(true);
