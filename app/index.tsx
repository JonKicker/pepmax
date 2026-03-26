/**
 * Entry point for Expo Router.
 * This screen matches the root "/" route. AuthGuard in _layout.tsx
 * immediately redirects away from here based on auth state — this
 * just needs to exist so Expo Router doesn't throw "unmatched route".
 */
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
