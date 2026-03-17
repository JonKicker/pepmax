# Plan 01 — Project Scaffold & Navigation Shell

**Status:** Built — awaiting Ray review
**Date:** 2026-03-16
**Author:** Bob

---

## Bob → Ray Handoff

**What I'm proposing:** Review the completed navigation scaffold and theme system for PepMax before any feature work begins.

**Plan summary:**
- Created Expo SDK 55 project with TypeScript and expo-router v4 (file-based routing)
- Configured `expo-router/entry` as main entry point; removed old `App.tsx` / `index.ts`
- Set `userInterfaceStyle: automatic` and `scheme: pepmax` in app.json
- Built a 5-tab layout (Dashboard, Nutrition, Training, Peptides, Profile) using `(tabs)/_layout.tsx`
- Each tab has its own Stack navigator for future sub-screens
- Created theme system at `src/constants/theme.ts` with full light/dark color tokens
- Created `src/hooks/useTheme.ts` — reads `useColorScheme()`, returns typed Theme object
- All placeholder screens reference theme tokens only (no hardcoded colors)
- TypeScript: 0 errors (`npx tsc --noEmit` clean)

**Files affected:**
```
app/_layout.tsx                          ← root Stack, StatusBar
app/(tabs)/_layout.tsx                   ← Tabs with Ionicons, theme-aware tab bar
app/(tabs)/dashboard/_layout.tsx + index.tsx
app/(tabs)/nutrition/_layout.tsx + index.tsx
app/(tabs)/training/_layout.tsx + index.tsx
app/(tabs)/peptides/_layout.tsx + index.tsx
app/(tabs)/profile/_layout.tsx + index.tsx
src/constants/theme.ts                   ← all color tokens
src/hooks/useTheme.ts                    ← useColorScheme() wrapper
app.json                                 ← scheme, userInterfaceStyle: automatic
package.json                             ← main: expo-router/entry
```

**Packages installed:**
- `expo-router ~55.0.5`
- `expo-haptics ~55.0.8`
- `expo-constants ~55.0.7`
- `expo-linking ~55.0.7`
- `react-native-safe-area-context ~5.6.2`
- `react-native-screens ~4.23.0`
- `@expo/vector-icons ^15.0.2` (Ionicons for tab icons)

**Security considerations I've thought about:**
- No user data, auth, or network calls yet — this is purely a navigation/UI shell
- No hardcoded secrets or API keys anywhere
- No third-party analytics or tracking added

**Architectural decisions:**
- Chose expo-router over manual React Navigation setup for file-based routing consistency
- `useTheme()` hook returns a full typed `Theme` object rather than exposing raw `useColorScheme()` — components never need to know about dark/light internally
- Color tokens defined once in `theme.ts`, never duplicated in components
- Each tab's Stack navigator is isolated — tabs cannot accidentally share navigation state

**Ready for review.**
