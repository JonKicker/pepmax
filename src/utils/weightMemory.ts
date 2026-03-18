import AsyncStorage from '@react-native-async-storage/async-storage';

type WeightEntry = { weight: number; unit: 'lbs' | 'kg' };

const KEY_PREFIX = '@weight_memory_';

export async function getLastWeight(exerciseId: string): Promise<WeightEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(`${KEY_PREFIX}${exerciseId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setLastWeight(
  exerciseId: string,
  weight: number,
  unit: 'lbs' | 'kg',
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${KEY_PREFIX}${exerciseId}`,
      JSON.stringify({ weight, unit }),
    );
  } catch {
    // Silent fail — non-critical convenience feature.
  }
}
