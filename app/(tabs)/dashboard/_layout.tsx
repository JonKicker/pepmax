import { Stack } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';

export default function DashboardLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { color: colors.textPrimary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="settings" options={{ title: 'Dashboard Settings' }} />
      <Stack.Screen name="body-tracking" options={{ title: 'Body Tracking' }} />
      <Stack.Screen name="progress-camera" options={{ title: 'Progress Photos', headerShown: false }} />
      <Stack.Screen name="photo-comparison" options={{ title: 'Compare' }} />
      <Stack.Screen name="photo-detail" options={{ title: 'Photo' }} />
      <Stack.Screen name="morning-check-in" options={{ title: 'Morning Check-In' }} />
      <Stack.Screen name="recovery-detail" options={{ title: 'Recovery Score' }} />
      <Stack.Screen name="community" options={{ title: 'Community Library' }} />
      <Stack.Screen name="template-detail" options={{ title: 'Template' }} />
    </Stack>
  );
}
