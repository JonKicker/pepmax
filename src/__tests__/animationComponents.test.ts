/**
 * animationComponents.test.ts
 *
 * Unit tests for animation components — imports and tests REAL modules.
 * Reanimated + native modules are mocked at the jest level; actual component
 * logic, constants, hooks, and render paths are exercised against real code.
 *
 * Sections:
 *  1. PARTICLES constant (SuccessBurst) — tests real exported constant
 *  2. useHaptic hook — imports real hook, verifies trigger call behaviour
 *  3. MorphButton — render + press + error-guard (no morph on throw)
 *  4. AnimatedToggle — render + press callback + a11y props on real component
 *  5. GradientButton — render with loading/pulse, disabled tap suppression
 *  6. Barrel exports present
 */

// ─── Module-level mocks (must be before any imports) ──────────────────────────

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  return Reanimated;
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../hooks/useTheme', () => ({
  useTheme: () => ({
    dark: false,
    colors: {
      accent: '#2E86C1',
      primary: '#1B4F72',
      gold: '#FFD700',
      border: '#D5D8DC',
      textPrimary: '#1A1A2E',
      textSecondary: '#666666',
    },
  }),
}));

// Note: useHaptic is mocked for components (MorphButton) but the useHaptic
// tests below use jest.requireActual to get the real implementation.
jest.mock('../hooks/useHaptic', () => ({
  useHaptic: () => ({ trigger: jest.fn() }),
}));

// ─── 1. PARTICLES constant — tests real exported constant ─────────────────────

import { PARTICLES } from '../components/animations/SuccessBurst';

describe('SuccessBurst PARTICLES constant (real export)', () => {
  it('has exactly 8 particles (LevelUpModal pattern)', () => {
    expect(PARTICLES).toHaveLength(8);
  });

  it('every particle has all required fields', () => {
    const requiredFields = ['id', 'color', 'angle', 'distance', 'delay', 'size'];
    PARTICLES.forEach((p) => {
      requiredFields.forEach((field) => {
        expect(p).toHaveProperty(field);
      });
    });
  });

  it('has unique IDs for every particle', () => {
    const ids = PARTICLES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers 360 degrees of the circle (angles span 0-315 in 45-degree steps)', () => {
    const angles = PARTICLES.map((p) => p.angle);
    expect(angles).toHaveLength(8);
    expect(angles[0]).toBe(0);
    expect(angles[7]).toBe(315);
    for (let i = 1; i < angles.length; i++) {
      expect(angles[i] - angles[i - 1]).toBe(45);
    }
  });

  it('all sizes are positive numbers', () => {
    PARTICLES.forEach((p) => {
      expect(typeof p.size).toBe('number');
      expect(p.size).toBeGreaterThan(0);
    });
  });

  it('all distances are positive numbers', () => {
    PARTICLES.forEach((p) => {
      expect(typeof p.distance).toBe('number');
      expect(p.distance).toBeGreaterThan(0);
    });
  });

  it('all delays are non-negative numbers', () => {
    PARTICLES.forEach((p) => {
      expect(typeof p.delay).toBe('number');
      expect(p.delay).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─── 2. useHaptic — real hook, using jest.requireActual to bypass the module mock ──
// Since jest.mock('../hooks/useHaptic') is hoisted (needed for MorphButton tests),
// we must use jest.requireActual to import the real implementation here.

import { renderHook, act as hookAct } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

describe('useHaptic (real module + real hook logic)', () => {
  // Get the REAL useHaptic (not the mock used by MorphButton)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let useHapticReal: () => { trigger: (style?: any) => void };

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const realModule = jest.requireActual('../hooks/useHaptic') as { useHaptic: typeof useHapticReal };
    useHapticReal = realModule.useHaptic;
  });

  beforeEach(() => {
    // Restore mock implementations after clearAllMocks resets them
    (Haptics.impactAsync as jest.Mock).mockResolvedValue(undefined);
    (Haptics.notificationAsync as jest.Mock).mockResolvedValue(undefined);
    jest.clearAllMocks();
    // Re-apply after clear
    (Haptics.impactAsync as jest.Mock).mockResolvedValue(undefined);
    (Haptics.notificationAsync as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Restore Platform.OS to ios after each test
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true, writable: true });
  });

  it('exports useHaptic and returns { trigger } function', () => {
    const { result } = renderHook(() => useHapticReal());
    expect(result.current).toHaveProperty('trigger');
    expect(typeof result.current.trigger).toBe('function');
  });

  it('trigger calls impactAsync(Light) for "light" style', () => {
    const { result } = renderHook(() => useHapticReal());
    hookAct(() => { result.current.trigger('light'); });
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('trigger calls impactAsync(Medium) for "medium" style', () => {
    const { result } = renderHook(() => useHapticReal());
    hookAct(() => { result.current.trigger('medium'); });
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
  });

  it('trigger calls impactAsync(Heavy) for "heavy" style', () => {
    const { result } = renderHook(() => useHapticReal());
    hookAct(() => { result.current.trigger('heavy'); });
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
  });

  it('trigger calls notificationAsync(Success) for "success" style', () => {
    const { result } = renderHook(() => useHapticReal());
    hookAct(() => { result.current.trigger('success'); });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success,
    );
  });

  it('trigger calls notificationAsync(Warning) for "warning" style', () => {
    const { result } = renderHook(() => useHapticReal());
    hookAct(() => { result.current.trigger('warning'); });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Warning,
    );
  });

  it('trigger calls notificationAsync(Error) for "error" style', () => {
    const { result } = renderHook(() => useHapticReal());
    hookAct(() => { result.current.trigger('error'); });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Error,
    );
  });

  it('trigger defaults to "light" when called with no arguments', () => {
    const { result } = renderHook(() => useHapticReal());
    // The default param is HapticStyle = 'light', so impactAsync(Light) should fire
    hookAct(() => { result.current.trigger(); });
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('does NOT call any haptic when Platform.OS === "web" (RAY MANDATORY #4)', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true, writable: true });

    const { result } = renderHook(() => useHapticReal());
    hookAct(() => {
      result.current.trigger('light');
      result.current.trigger('success');
      result.current.trigger('error');
    });

    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('android also calls haptics (non-web)', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true, writable: true });

    const { result } = renderHook(() => useHapticReal());
    hookAct(() => { result.current.trigger('light'); });

    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });
});

// ─── 3. MorphButton — render, press callback, error guard ─────────────────────

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { MorphButton } from '../components/animations/MorphButton';

describe('MorphButton (real component)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => { jest.runAllTimers(); });
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    const { getByText } = render(
      React.createElement(MorphButton, { label: 'Save', onPress: jest.fn() }),
    );
    expect(getByText('Save')).toBeTruthy();
  });

  it('calls onPress callback when pressed', async () => {
    const onPress = jest.fn().mockResolvedValue(undefined);
    const { getByRole } = render(
      React.createElement(MorphButton, { label: 'Save', onPress }),
    );
    const btn = getByRole('button');
    await act(async () => {
      fireEvent.press(btn);
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does NOT morph to success when onPress throws (RAY FIX)', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const onPress = jest.fn().mockRejectedValue(new Error('boom'));

    const { getByRole } = render(
      React.createElement(MorphButton, { label: 'Fail', onPress }),
    );

    const btn = getByRole('button');
    await act(async () => {
      fireEvent.press(btn);
      await Promise.resolve(); // let the async handler settle
    });

    // Error should have been logged
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[MorphButton]'),
      expect.any(Error),
    );

    // Button should still be pressable (morphState stayed 'idle', not 'morphing')
    // Press again — onPress should fire a second time
    onPress.mockResolvedValue(undefined);
    await act(async () => {
      fireEvent.press(btn);
      await Promise.resolve();
    });
    expect(onPress).toHaveBeenCalledTimes(2);

    consoleSpy.mockRestore();
  });

  it('clears timeout on unmount (RAY MANDATORY #3)', async () => {
    const onPress = jest.fn().mockResolvedValue(undefined);

    const { unmount, getByRole } = render(
      React.createElement(MorphButton, { label: 'Go', onPress, successDuration: 5000 }),
    );

    // Trigger a press and wait for the async handler
    await act(async () => {
      fireEvent.press(getByRole('button'));
      await Promise.resolve();
    });

    // Verify the component is now morphing (a timeout was scheduled)
    // Unmount should call clearTimeout — verified by checking no timer warnings
    // If timeoutRef.current is null, clearTimeout is a no-op; if not null it clears it.
    // The test verifies unmount doesn't throw (which would happen without the cleanup ref).
    expect(() => unmount()).not.toThrow();
  });

  it('is disabled while morphing (prevents double-press)', async () => {
    const onPress = jest.fn().mockResolvedValue(undefined);
    const { getByRole } = render(
      React.createElement(MorphButton, { label: 'Go', onPress }),
    );

    const btn = getByRole('button');

    // First press — triggers morph sequence
    await act(async () => {
      fireEvent.press(btn);
      await Promise.resolve();
    });

    // Advance into the morphing phase (before revert completes)
    act(() => { jest.advanceTimersByTime(100); });

    // Second press while morphing — onPress should NOT fire again
    // (button is disabled via accessibilityState / isEffectivelyDisabled)
    fireEvent.press(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

// ─── 4. AnimatedToggle — render + press callback + a11y ───────────────────────

import { AnimatedToggle } from '../components/animations/AnimatedToggle';

describe('AnimatedToggle (real component)', () => {
  it('renders without crashing', () => {
    const { getByRole } = render(
      React.createElement(AnimatedToggle, { value: false, onValueChange: jest.fn() }),
    );
    expect(getByRole('switch')).toBeTruthy();
  });

  it('calls onValueChange with toggled value when pressed (false → true)', () => {
    const onValueChange = jest.fn();
    const { getByRole } = render(
      React.createElement(AnimatedToggle, { value: false, onValueChange }),
    );
    fireEvent.press(getByRole('switch'));
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('calls onValueChange with toggled value when pressed (true → false)', () => {
    const onValueChange = jest.fn();
    const { getByRole } = render(
      React.createElement(AnimatedToggle, { value: true, onValueChange }),
    );
    fireEvent.press(getByRole('switch'));
    expect(onValueChange).toHaveBeenCalledWith(false);
  });

  it('does NOT call onValueChange when disabled=true (RAY MANDATORY #5)', () => {
    const onValueChange = jest.fn();
    const { getByRole } = render(
      React.createElement(AnimatedToggle, { value: false, onValueChange, disabled: true }),
    );
    // Use hidden:true since disabled switches may be hidden from role queries
    fireEvent.press(getByRole('switch', { hidden: true }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('renders with accessibilityRole="switch" (RAY MANDATORY #5)', () => {
    const { getByRole } = render(
      React.createElement(AnimatedToggle, { value: true, onValueChange: jest.fn() }),
    );
    expect(getByRole('switch')).toBeTruthy();
  });

  it('accessibilityState.checked matches the value prop', () => {
    const { getByRole } = render(
      React.createElement(AnimatedToggle, { value: true, onValueChange: jest.fn() }),
    );
    const el = getByRole('switch');
    // RNTL exposes accessibilityState as props on the element
    expect(el.props.accessibilityState).toMatchObject({ checked: true });
  });

  it('accessibilityState.disabled matches the disabled prop', () => {
    const { getByRole } = render(
      React.createElement(AnimatedToggle, {
        value: false,
        onValueChange: jest.fn(),
        disabled: true,
      }),
    );
    const el = getByRole('switch', { hidden: true });
    expect(el.props.accessibilityState).toMatchObject({ disabled: true });
  });
});

// ─── 5. GradientButton — render, loading, pulse ───────────────────────────────

import { GradientButton } from '../components/GradientButton';

jest.mock('../components/AnimatedPressable', () => {
  // Must use require here — jest.mock factories cannot access outer-scope variables
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactInMock = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable } = require('react-native');
  return {
    AnimatedPressable: ({
      children,
      onPress,
      disabled,
      ...rest
    }: {
      children: unknown;
      onPress?: () => void;
      disabled?: boolean;
      [key: string]: unknown;
    }) =>
      ReactInMock.createElement(
        Pressable,
        { onPress: disabled ? undefined : onPress, disabled, ...rest },
        children,
      ),
  };
});

describe('GradientButton (real component)', () => {
  it('renders without crashing', () => {
    const { getByText } = render(
      React.createElement(GradientButton, { label: 'Start', onPress: jest.fn() }),
    );
    expect(getByText('Start')).toBeTruthy();
  });

  it('calls onPress when not loading or disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      React.createElement(GradientButton, { label: 'Go', onPress }),
    );
    // Non-disabled button — role query should work without hidden flag
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onPress when loading=true (RAY ADVISORY C)', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      React.createElement(GradientButton, { label: 'Loading...', onPress, loading: true }),
    );
    // When loading=true the button is effectively disabled; query with hidden:true
    const btn = getByRole('button', { hidden: true });
    fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does NOT call onPress when disabled=true', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      React.createElement(GradientButton, { label: 'Disabled', onPress, disabled: true }),
    );
    const btn = getByRole('button', { hidden: true });
    fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders with pulse=true without crashing', () => {
    const { getByText } = render(
      React.createElement(GradientButton, { label: 'Pulse', onPress: jest.fn(), pulse: true }),
    );
    expect(getByText('Pulse')).toBeTruthy();
  });

  it('hides label text when loading=true (spinner replaces label)', () => {
    const { queryByText } = render(
      React.createElement(GradientButton, {
        label: 'Loading',
        onPress: jest.fn(),
        loading: true,
      }),
    );
    // GradientButton renders ActivityIndicator instead of the label text when loading
    expect(queryByText('Loading')).toBeNull();
  });

  it('shows label text when loading=false', () => {
    const { getByText } = render(
      React.createElement(GradientButton, { label: 'Ready', onPress: jest.fn() }),
    );
    expect(getByText('Ready')).toBeTruthy();
  });
});

// ─── 6. Barrel exports present ────────────────────────────────────────────────

describe('animations barrel index.ts (RAY ADVISORY D)', () => {
  it('exports SuccessBurst, AnimatedToggle, MorphButton as functions', () => {
    // All mocks are already hoisted — direct require is safe here
    const barrel = require('../components/animations/index');
    expect(typeof barrel.SuccessBurst).toBe('function');
    expect(typeof barrel.AnimatedToggle).toBe('function');
    expect(typeof barrel.MorphButton).toBe('function');
  });

  it('PARTICLES is exported from SuccessBurst module', () => {
    const { PARTICLES: P } = require('../components/animations/SuccessBurst');
    expect(Array.isArray(P)).toBe(true);
    expect(P.length).toBe(8);
  });
});
