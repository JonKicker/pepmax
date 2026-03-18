import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../../src/constants/theme';
import { getFoodByBarcode } from '../../../src/services/nutritionService';
import type { MealSlot } from '../../../src/types/nutrition';

export default function BarcodeScanScreen() {
  const router = useRouter();
  const { mealSlot } = useLocalSearchParams<{ mealSlot?: MealSlot }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [lookingUp, setLookingUp] = useState(false);
  const scanned = useRef(false);

  const handleScan = async ({ data: barcode }: { data: string }) => {
    if (scanned.current) return;
    scanned.current = true;
    setLookingUp(true);
    const result = await getFoodByBarcode(barcode);
    setLookingUp(false);
    if (result.error) {
      Alert.alert('Error', 'Could not look up barcode.', [
        { text: 'Try Again', onPress: () => { scanned.current = false; } },
      ]);
    } else if (!result.data) {
      Alert.alert('Not Found', 'No food found for this barcode.', [
        { text: 'Try Again', onPress: () => { scanned.current = false; } },
        { text: 'Manual Entry', onPress: () => router.replace(`/(tabs)/nutrition/manual-entry?mealSlot=${mealSlot ?? 'breakfast'}`) },
      ]);
    } else {
      router.push({
        pathname: '/(tabs)/nutrition/food-detail',
        params: { foodData: JSON.stringify(result.data), mealSlot, fromScan: 'true' },
      });
    }
  };

  if (permission === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.nutrition} />
      </View>
    );
  }

  if (!permission.granted && permission.canAskAgain) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>Camera access is needed to scan barcodes.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission.granted && !permission.canAskAgain) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>
          Camera permission was denied. Enable it in Settings to scan barcodes.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={() => Linking.openSettings()}>
          <Text style={styles.permissionBtnText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
        onBarcodeScanned={handleScan}
      />
      {/* Viewfinder overlay */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={[styles.viewfinder, { borderColor: Colors.nutrition }]} />
        <Text style={styles.hint}>Align barcode within the frame</Text>
      </View>
      {/* Looking up banner */}
      {lookingUp && (
        <View style={styles.banner}>
          <ActivityIndicator color="white" size="small" />
          <Text style={styles.bannerText}>Looking up barcode…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  permissionText: { fontSize: 15, textAlign: 'center', color: '#333' },
  permissionBtn: {
    backgroundColor: Colors.nutrition,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 10,
  },
  permissionBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  viewfinder: {
    width: 240,
    height: 160,
    borderWidth: 2,
    borderRadius: 12,
  },
  hint: { color: 'white', fontSize: 13, textAlign: 'center', opacity: 0.85 },
  banner: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  bannerText: { color: 'white', fontWeight: '600', fontSize: 14 },
});
