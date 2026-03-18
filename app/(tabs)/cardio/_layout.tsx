import { Stack } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';

export default function CardioLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { color: colors.textPrimary },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Cardio' }} />
      <Stack.Screen name="start-session" options={{ title: 'Start Session' }} />
      <Stack.Screen name="active-session" options={{ headerShown: false }} />
      <Stack.Screen name="session-summary" options={{ title: 'Session Summary' }} />
      <Stack.Screen name="session-detail" options={{ title: 'Session Detail' }} />
      <Stack.Screen name="progress" options={{ title: 'Progress' }} />
      <Stack.Screen name="history" options={{ title: 'History' }} />
      <Stack.Screen name="settings" options={{ title: 'Cardio Settings' }} />
    </Stack>
  );
}
