import { Stack } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';

export default function PeptidesLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: Colors.peptide,
        headerTitleStyle: { color: colors.textPrimary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Peptide Library' }} />
      <Stack.Screen
        name="peptide-form"
        options={{ title: 'Add Peptide', presentation: 'modal' }}
      />
      <Stack.Screen name="log-dose" options={{ title: 'Log Dose' }} />
      <Stack.Screen name="history" options={{ title: 'Dose History' }} />
      <Stack.Screen name="recon-calculator" options={{ title: 'Recon Calculator' }} />
      <Stack.Screen name="half-life-timeline" options={{ title: 'Activity Timeline' }} />
      <Stack.Screen name="cycle-planner" options={{ title: 'Plan Cycle' }} />
      <Stack.Screen name="inventory" options={{ title: 'Inventory' }} />
      <Stack.Screen name="progress" options={{ title: 'Dose Trends' }} />
      <Stack.Screen name="compound-library" options={{ title: 'Compound Library' }} />
      <Stack.Screen name="compound-detail" options={{ title: 'Compound Detail' }} />
    </Stack>
  );
}
