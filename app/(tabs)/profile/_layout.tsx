import { Stack } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';

export default function ProfileLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { color: colors.textPrimary },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy & Data' }} />
      <Stack.Screen name="export-data" options={{ title: 'Export My Data' }} />
      <Stack.Screen name="choose-username" options={{ title: 'Choose Username' }} />
      <Stack.Screen name="compare-privacy" options={{ title: 'Compare Privacy' }} />
      <Stack.Screen name="my-templates" options={{ title: 'My Templates' }} />
    </Stack>
  );
}
