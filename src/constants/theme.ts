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

  // Light mode
  light: {
    background: '#FFFFFF',
    surface: '#F4F6F7',
    textPrimary: '#1A1A2E',
    textSecondary: '#666666',
    border: '#D5D8DC',
    success: '#27AE60',
  },

  // Dark mode
  dark: {
    background: '#121212',
    surface: '#1E1E1E',
    textPrimary: '#E8E8E8',
    textSecondary: '#A0A0A0',
    border: '#333333',
    success: '#2ECC71',
  },

  // Shared
  warning: '#E67E22',
  error: '#E74C3C',
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
    },
  };
}

export const LightTheme = buildTheme(false);
export const DarkTheme = buildTheme(true);
