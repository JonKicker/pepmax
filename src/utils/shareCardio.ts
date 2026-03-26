import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import type { RefObject } from 'react';
import type { View } from 'react-native';

/** Capture a View ref to a temp PNG file. Returns the file URI. */
export async function captureShareCard(ref: RefObject<View | null>): Promise<string> {
  const uri = await captureRef(ref, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
  });
  return uri;
}

/** Share an image URI via the native share sheet. */
export async function shareImage(uri: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    dialogTitle: 'Share your workout',
  });
}

/**
 * Save an image URI to the device photo library.
 * Requests permission if not already granted.
 */
export async function saveToPhotos(
  uri: string
): Promise<{ saved: boolean; permissionDenied: boolean }> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    return { saved: false, permissionDenied: true };
  }
  await MediaLibrary.saveToLibraryAsync(uri);
  return { saved: true, permissionDenied: false };
}
