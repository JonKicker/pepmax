import { useThemeContext } from '../contexts/ThemeContext';
import type { Theme } from '../constants/theme';

/**
 * Returns the current resolved Theme (light or dark).
 * Respects the user's explicit preference via ThemeContext.
 * All existing callsites (useTheme().colors.*) continue to work unchanged.
 */
export function useTheme(): Theme {
  return useThemeContext().theme;
}
