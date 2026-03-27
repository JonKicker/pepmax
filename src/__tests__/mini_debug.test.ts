jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  StyleSheet: {
    create: (s) => s,
    absoluteFillObject: {},
    flatten: (style) => {
      if (style == null) return undefined;
      if (Array.isArray(style)) return style.reduce((a, s) => ({...a, ...(s && typeof s === 'object' ? s : {})}), {});
      if (typeof style === 'object') return style;
      return undefined;
    },
  },
  Pressable: 'Pressable',
  View: 'View',
  Text: 'Text',
  ActivityIndicator: 'ActivityIndicator',
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  return {
    default: {
      View: ({children, ...p}) => React.createElement('View', p, children),
      Text: ({children, ...p}) => React.createElement('Text', p, children),
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
jest.mock('../hooks/useTheme', () => ({ useTheme: () => ({ dark: false, colors: { accent: '#2E86C1', primary: '#1B4F72', gold: '#FFD700', border: '#D5D8DC' }}) }));
jest.mock('../hooks/useHaptic', () => ({ useHaptic: () => ({ trigger: jest.fn() }) }));

import React from 'react';
import { render } from '@testing-library/react-native';
import { AnimatedToggle } from '../components/animations/AnimatedToggle';

describe('debug render AnimatedToggle', () => {
  it('renders AnimatedToggle with render()', () => {
    try {
      const { getByRole } = render(React.createElement(AnimatedToggle, { value: false, onValueChange: jest.fn() }));
      console.log('SUCCESS - found role:', getByRole('switch'));
    } catch(e) {
      console.error('ERROR:', e.message);
      // Print the react tree if possible
    }
  });
});
