jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  StyleSheet: { create: (s) => s, absoluteFillObject: {} },
  Pressable: 'Pressable',
  View: 'View',
  Text: 'Text',
  ActivityIndicator: 'ActivityIndicator',
  Image: 'Image',
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const AnimView = ({children, ...props}) => React.createElement('View', props, children);
  AnimView.displayName = 'Animated.View';
  return {
    default: {
      View: AnimView,
      Text: ({children, ...props}) => React.createElement('Text', props, children),
    },
    useSharedValue: (v) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withSpring: (v) => v,
    withTiming: (v) => v,
    withRepeat: (v) => v,
    withSequence: (...args) => args[0],
    withDelay: (_d, v) => v,
    cancelAnimation: jest.fn(),
    Easing: { inOut: () => () => 0, ease: () => 0, out: () => () => 0, cubic: () => 0 },
    interpolateColor: jest.fn(() => '#000'),
    useDerivedValue: (fn) => ({ value: fn() }),
  };
});

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../hooks/useTheme', () => ({
  useTheme: () => ({
    dark: false,
    colors: { accent: '#2E86C1', primary: '#1B4F72', gold: '#FFD700', border: '#D5D8DC' },
  }),
}));
jest.mock('../hooks/useHaptic', () => ({ useHaptic: () => ({ trigger: jest.fn() }) }));

import React from 'react';
import { render } from '@testing-library/react-native';

// Test with a very basic component first
describe('diagnose', () => {
  it('renders basic Pressable with View child', () => {
    const el = React.createElement('Pressable', { accessibilityRole: 'switch' },
      React.createElement('View', null)
    );
    const { getByRole } = render(el);
    expect(getByRole('switch')).toBeTruthy();
  });

  it('renders with a function component child', () => {
    const AnimView = ({children, ...props}: any) => React.createElement('View', props, children);
    const el = React.createElement('Pressable', { accessibilityRole: 'switch' },
      React.createElement(AnimView, null)
    );
    const { getByRole } = render(el);
    expect(getByRole('switch')).toBeTruthy();
  });
});
