import { useColorScheme } from 'react-native';
import { LightTheme, DarkTheme, Theme } from '../constants/theme';

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DarkTheme : LightTheme;
}
