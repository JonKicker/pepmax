import { Stack } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';
import { ExercisePickerProvider } from '../../../src/contexts/ExercisePickerContext';

export default function TrainingLayout() {
  const { colors } = useTheme();
  return (
    <ExercisePickerProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { color: colors.textPrimary },
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Training' }} />
        <Stack.Screen name="log-workout" options={{ title: 'Log Workout' }} />
        <Stack.Screen name="exercises" options={{ title: 'Exercise Library' }} />
        <Stack.Screen name="exercise-detail" options={{ title: 'Exercise Detail' }} />
        <Stack.Screen name="exercise-form" options={{ title: 'Custom Exercise' }} />
        <Stack.Screen name="templates" options={{ title: 'Templates' }} />
        <Stack.Screen name="template-builder" options={{ title: 'Template Builder' }} />
        <Stack.Screen name="session-preview" options={{ title: 'Session Preview' }} />
        <Stack.Screen name="active-session" options={{ headerShown: false, headerBackButtonMenuEnabled: false, gestureEnabled: false }} />
        <Stack.Screen name="session-summary" options={{ title: 'Workout Summary' }} />
        <Stack.Screen name="history" options={{ title: 'Training History' }} />
        <Stack.Screen name="session-detail" options={{ title: 'Session Detail' }} />
        <Stack.Screen name="progress" options={{ title: 'Progress' }} />
        <Stack.Screen name="equipment-profiles" options={{ title: 'Equipment Profiles' }} />
        <Stack.Screen name="body-measurements" options={{ title: 'Body Measurements' }} />
        <Stack.Screen name="log-measurement" options={{ title: 'Log Measurement' }} />
        <Stack.Screen name="measurement-trends" options={{ title: 'Measurement Trends' }} />
      </Stack>
    </ExercisePickerProvider>
  );
}
