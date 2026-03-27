---
name: pepmax-ui-ux
description: "Comprehensive UI/UX playbook for PepMax — enforces a dark-premium Whoop-inspired design language across all screens. Use this skill whenever building new screens, components, dashboard cards, modals, or any visual element in PepMax. Also use when the user asks to polish, redesign, fix spacing, improve animations, upgrade the look, or mentions anything about UI, UX, design, styling, theming, or visual quality. Even if the user just says 'make it look better' or 'this screen feels off' — this skill should trigger."
---

# PepMax UI/UX Playbook

You are building PepMax, a premium wellness app. The target aesthetic is **Whoop meets Apple Health** — dark, data-dense, confidence-inspiring. Every screen should feel like it belongs in a $30/month subscription app.

## Design Philosophy

PepMax uses a **dark-first glassmorphic** design language. Surfaces are layered translucent panels over deep gradient backgrounds. Data is the hero — large numbers, vivid accent colors, minimal chrome. The app should feel like a cockpit for your body: powerful but calm, information-rich but never cluttered.

Three principles guide every decision:

1. **Data forward** — the most important number on any screen should be readable from arm's length. Supporting context lives in secondary typography. Decorative elements earn their pixels or get cut.
2. **Depth through glass** — surfaces communicate hierarchy via blur intensity and opacity, not hard borders or drastic color shifts. Cards float above the background; modals float above cards.
3. **Motion with purpose** — animation serves orientation (where did I come from, where am I going) and feedback (my tap registered). Never animate just to animate.

---

## Token System

All colors come from `useTheme()`. Never hardcode hex values outside of `theme.ts`.

### Module Accent Colors
Each feature domain has a branded accent. Use these for icons, accent bars, charts, and active states within that module:

| Module | Token | Hex | Usage |
|--------|-------|-----|-------|
| Peptides | `colors.peptide` | #2E86C1 | Dose cards, injection maps, half-life charts |
| Nutrition | `colors.nutrition` | #27AE60 | Calorie rings, macro bars, meal cards |
| Training | `colors.gym` | #8E44AD | PR badges, set logs, exercise cards |
| Cardio | `colors.cardio` | #E74C3C | Route maps, HR zones, pace charts |
| Body | `colors.body` | #00897B | Weight trends, measurement cards |
| Brand | `colors.primary` | #1B4F72 | Navigation, primary buttons, app chrome |

### Semantic Colors
| Token | Purpose |
|-------|---------|
| `colors.success` | Positive deltas, completed states |
| `colors.warning` | Caution zones, approaching limits |
| `colors.error` | Negative deltas, destructive actions |
| `colors.gold` | Achievements, PRs, XP rewards |

### Glass Layers
The glass system creates depth. Use `GlassCard` with intensity variants — don't manually compose blur + overlay.

| Intensity | When to use |
|-----------|-------------|
| `heavy` | Primary content cards (dashboard cards, detail panels) |
| `subtle` | Secondary surfaces (list items, nested cards, chips) |

### Spacing Scale
Stick to multiples of 4. The standard set:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight gaps (icon-to-label inline) |
| sm | 8px | Chip gaps, compact lists |
| md | 12px | Default content padding, card gaps |
| lg | 16px | Card padding, section margins |
| xl | 20px | Screen horizontal padding |
| 2xl | 24px | Section spacing on detail screens |

---

## Component Patterns

### Screen Wrapper
Every screen uses `GlassBackground` as its root. Content scrolls inside it.

```
<GlassBackground>
  <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
    {/* screen content */}
  </ScrollView>
</GlassBackground>
```

### Dashboard Cards
Use `DashboardCard` for all dashboard modules. It provides the standard header (icon + title + chevron) and wraps children in a `GlassCard intensity="heavy"`.

```
<DashboardCard
  title="Training"
  icon="barbell-outline"
  iconColor={Colors.gym}
  colors={colors}
  onPress={navigateToDetail}
>
  {/* card body */}
</DashboardCard>
```

### Cards Outside Dashboard
For non-dashboard cards (list items, detail sections), use `GlassCard` directly:

```
<GlassCard intensity="subtle" style={{ marginBottom: 8 }}>
  {/* content */}
</GlassCard>
```

### Modals and Bottom Sheets
Modals should use a darker overlay (`rgba(0,0,0,0.6)`) with a `GlassCard intensity="heavy"` as the sheet surface. Round top corners at 20px. Include a drag handle bar (40x4, centered, `colors.border`, borderRadius 2).

### Loading States
Use `SkeletonLoader` for content placeholders. Match the skeleton shape to the content it replaces — don't use generic rectangles for everything.

### Empty States
Center vertically. Use a large (48px) muted Ionicon, a bold headline, a secondary description, and an action button. Keep copy encouraging, not apologetic.

---

## Typography Hierarchy

The app uses system fonts with weight-based hierarchy. No custom font families.

| Role | Size | Weight | Token |
|------|------|--------|-------|
| Hero number | 32-36px | 800 | `colors.textPrimary` |
| Screen title | 20px | 700 | `colors.textPrimary` |
| Card title | 15px | 700 | `colors.textPrimary` |
| Body | 14px | 400 | `colors.textPrimary` |
| Caption | 13px | 400 | `colors.textSecondary` |
| Micro label | 11px | 600 | `colors.textSecondary` |
| Delta/change | 13px | 700 | `colors.success` or `colors.error` |

Guidelines:
- Hero numbers (scores, totals, PRs) should be the largest element on their card. Use the module accent color or zone color, not textPrimary.
- Never use more than 3 font sizes on a single card.
- Line height should be ~1.4x font size for body text, tighter (1.1x) for hero numbers.

---

## Animation Patterns

All animations use `react-native-reanimated`. Respect `AccessibilityInfo.isReduceMotionEnabled` — if true, skip non-essential animation.

### Entrance Animations
Stagger card entrances on screens with multiple cards (dashboard). Pattern:

```typescript
// Each card gets increasing delay
const delay = index * 80; // 80ms stagger
const translateY = useSharedValue(20);
const opacity = useSharedValue(0);

useEffect(() => {
  translateY.value = withDelay(delay, withTiming(0, { duration: 350 }));
  opacity.value = withDelay(delay, withTiming(1, { duration: 350 }));
}, []);
```

### Feedback Animations
- **Button press**: `withSpring` scale to 0.96, spring back on release (damping: 15, stiffness: 150)
- **Haptics**: `Haptics.impactAsync(ImpactFeedbackStyle.Light)` on card taps, `Medium` on toggles, `Heavy` on destructive actions
- **Success**: Scale pop (1 -> 1.15 -> 1) with `withSequence` + optional confetti for PRs/achievements

### Transitions
- **Screen push**: Default Expo Router slide. Don't override unless the screen is a modal.
- **Modal present**: Slide up from bottom with spring (damping: 20, stiffness: 200)
- **Shared elements**: Use `sharedTransitionTag` for elements that persist across screens (e.g., exercise thumbnail in list -> detail)

### Chart Animations
- Animate chart data on mount with `withTiming` (duration: 600, easing: Easing.out(Easing.cubic))
- When data updates, animate from old values to new (not from zero)

---

## Interaction Guidelines

### Touch Targets
- Minimum 44x44pt for all tappable elements (Apple HIG)
- Add 8px spacing between adjacent touch targets
- Use `activeOpacity={0.7}` on `TouchableOpacity` throughout

### Pull to Refresh
Use on any screen with server-fetched data. Match the refresh indicator color to the module accent.

### Swipe Actions
Reserve swipe-to-delete for list items (sets, logged foods, doses). Use red background with trash icon. Confirm destructive actions with an alert.

### Scroll Behavior
- Dashboard: vertical scroll with sticky section headers if needed
- Lists: FlatList with `ItemSeparatorComponent` (1px `colors.border`)
- Detail screens: ScrollView with generous bottom padding (40px) for safe area

---

## Chart & Data Visualization

Use `victory-native` for charts and `react-native-svg` for custom gauges.

### Color Usage in Charts
- Single-metric charts: use the module accent color
- Multi-metric charts: use module accents for each metric, with 0.2 opacity fill
- Background grid lines: `colors.border` at 0.5 opacity
- Axis labels: `colors.textSecondary` at 11px

### Chart Types by Data
| Data shape | Chart type | Example |
|-----------|-----------|---------|
| Single score 0-100 | Circular gauge (`ScoreGauge`) | Recovery score |
| Time series | Line chart with area fill | Weight trend, HR over session |
| Comparison | Horizontal bar | Macro breakdown, zone time |
| Distribution | Stacked bar | Heart rate zones |
| Ranking | Vertical bar | Leaderboard scores |
| Multi-axis comparison | Radar chart | Compare screen |

### Chart Polish Checklist
- [ ] Animated on mount
- [ ] Axis labels use `colors.textSecondary`
- [ ] Grid lines are subtle (`colors.border`, 0.5 opacity)
- [ ] Touch interaction shows tooltip with exact value
- [ ] Empty state when no data (don't render empty axes)

---

## Dark Mode Excellence

Dark mode is the primary experience. Light mode must work but dark gets polish priority.

### Dark Mode Rules
- Never use pure black (#000000) for surfaces — use `colors.background` (#121212) or `colors.surface` (#1E1E1E)
- Text on dark surfaces should be #E8E8E8 (not pure white — reduces eye strain)
- Module accent colors should be slightly more saturated in dark mode for vibrancy
- Shadows are heavier in dark mode (`colors.glass.shadow` handles this)
- Images and illustrations should have dark-compatible variants or overlay treatment

### Light Mode Rules
- Keep glass effects visible but subtle — heavy blur can look washed out in light mode
- Borders are lighter (`colors.border` handles this) — don't add extra borders
- Card shadows should be very soft (the glass system handles this)

---

## Pre-Delivery Checklist

Run through this before considering any screen complete:

### Visual Quality
- [ ] All colors from `useTheme()` — zero hardcoded hex
- [ ] Glass cards at correct intensity (heavy for primary, subtle for secondary)
- [ ] Typography follows hierarchy (max 3 sizes per card)
- [ ] Hero numbers are prominent and use accent/zone colors
- [ ] Spacing uses 4px grid
- [ ] Screen wrapped in `GlassBackground`

### Interaction
- [ ] All tappable areas >= 44x44pt
- [ ] Haptic feedback on meaningful taps
- [ ] Loading states use `SkeletonLoader` (matched to content shape)
- [ ] Empty states are helpful (icon + headline + CTA)
- [ ] Pull-to-refresh on data-fetching screens

### Animation
- [ ] Card entrance stagger on list/dashboard screens
- [ ] Charts animate on mount
- [ ] Reduced motion respected
- [ ] No animation purely for decoration

### Dark/Light Mode
- [ ] Tested in both modes
- [ ] No hardcoded colors that break in opposite mode
- [ ] Glass effects visible in both modes
- [ ] Text contrast passes (textPrimary on surface is always readable)

### Accessibility
- [ ] Contrast ratio >= 4.5:1 for text, 3:1 for large text
- [ ] `accessibilityLabel` on icon-only buttons
- [ ] `accessibilityRole` on interactive elements
- [ ] Screen reader can navigate all content

---

## Screen Templates

When building a new screen, start from the closest template and adapt. See `references/screen-templates.md` for full templates covering:
- **Dashboard card** — module summary for the main dashboard
- **List screen** — searchable/filterable item list
- **Detail screen** — single-item deep dive with charts
- **Form screen** — data entry (logging, check-ins)
- **Settings screen** — grouped rows with toggles/navigation
- **Modal** — bottom sheet for quick actions

Read that file when you need a complete starting structure for a new screen.
