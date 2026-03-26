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
      <Stack.Screen name="compare" options={{ title: 'Compare' }} />
      <Stack.Screen name="share-preview" options={{ title: 'Share Preview' }} />
      <Stack.Screen name="body-hub" options={{ title: 'Body Hub' }} />
      <Stack.Screen name="social" options={{ title: 'Social' }} />
      <Stack.Screen name="friends" options={{ title: 'Friends' }} />
      <Stack.Screen name="friend-profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="friend-search" options={{ title: 'Find Friends' }} />
      <Stack.Screen name="crews" options={{ title: 'Crews' }} />
      <Stack.Screen name="crew-detail" options={{ title: 'Crew' }} />
      <Stack.Screen name="create-crew" options={{ title: 'Create Crew' }} />
      <Stack.Screen name="join-crew" options={{ title: 'Join Crew' }} />
      <Stack.Screen name="leaderboards" options={{ title: 'Leaderboards' }} />
      <Stack.Screen name="challenges" options={{ title: 'Challenges' }} />
      <Stack.Screen name="challenge-detail" options={{ title: 'Challenge' }} />
      <Stack.Screen name="create-duel" options={{ title: 'Create Duel' }} />
      <Stack.Screen name="duel-detail" options={{ title: 'Duel' }} />
      <Stack.Screen name="xp-hub" options={{ title: 'XP Hub' }} />
      <Stack.Screen name="trophy-case" options={{ title: 'Trophy Case' }} />
      <Stack.Screen name="consistency-detail" options={{ title: 'Consistency Trend' }} />
    </Stack>
  );
}
