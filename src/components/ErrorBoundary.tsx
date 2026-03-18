/**
 * ErrorBoundary — catches unhandled React render errors.
 *
 * Reports to Sentry via captureException().
 * Theme-aware: functional wrapper passes colors to the class component,
 * since class components cannot use hooks directly.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, LightTheme, DarkTheme } from '../constants/theme';
import { useColorScheme } from 'react-native';
import { captureException } from '../services/errorReporting';

type Props = { children: React.ReactNode; colors: typeof LightTheme['colors'] };
type State = { hasError: boolean; error: Error | null };

class ErrorBoundaryInner extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Unhandled error:', error, info.componentStack);
    captureException(error, { componentStack: info.componentStack ?? '' });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { colors } = this.props;

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={56} color={Colors.error} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Something went wrong</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {this.state.error?.message ?? 'An unexpected error occurred.'}
        </Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => this.setState({ hasError: false, error: null })}
        >
          <Text style={styles.btnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? DarkTheme.colors : LightTheme.colors;
  return <ErrorBoundaryInner colors={colors}>{children}</ErrorBoundaryInner>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    marginTop: 8,
    backgroundColor: Colors.accent,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
