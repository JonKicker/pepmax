import { Stack } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';
import { arenaColors } from '../../../src/constants/competeTheme';

export default function CompeteLayout() {
  const { colors, dark } = useTheme();
  const arena = arenaColors(dark);
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: arena.gradientStart },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { color: colors.textPrimary },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Compete' }} />
      <Stack.Screen name="xp-hub" options={{ title: 'XP Hub' }} />
      <Stack.Screen name="trophy-case" options={{ title: 'Trophy Case' }} />
      <Stack.Screen name="leaderboards" options={{ title: 'Leaderboards' }} />
      <Stack.Screen name="challenges" options={{ title: 'Challenges' }} />
      <Stack.Screen name="challenge-detail" options={{ title: 'Challenge' }} />
      <Stack.Screen name="create-duel" options={{ title: 'Create Duel' }} />
      <Stack.Screen name="duel-detail" options={{ title: 'Duel' }} />
      <Stack.Screen name="social" options={{ title: 'Social' }} />
      <Stack.Screen name="friends" options={{ title: 'Friends' }} />
      <Stack.Screen name="friend-profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="friend-search" options={{ title: 'Find Friends' }} />
      <Stack.Screen name="crews" options={{ title: 'Crews' }} />
      <Stack.Screen name="crew-detail" options={{ title: 'Crew' }} />
      <Stack.Screen name="create-crew" options={{ title: 'Create Crew' }} />
      <Stack.Screen name="join-crew" options={{ title: 'Join Crew' }} />
      <Stack.Screen name="compare" options={{ title: 'Compare' }} />
      <Stack.Screen name="share-preview" options={{ title: 'Share Preview' }} />
    </Stack>
  );
}
