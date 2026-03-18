import * as Location from 'expo-location';

export async function requestLocationPermission(): Promise<'granted' | 'denied' | 'settings'> {
  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (!canAskAgain) return 'settings';
  return 'denied';
}
