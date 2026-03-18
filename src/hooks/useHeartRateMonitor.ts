import { useState, useRef, useCallback, useEffect } from 'react';

// BLE is only available in a custom dev client, not Expo Go.
// We detect availability by attempting to require the module at runtime.
// react-native-ble-plx is intentionally NOT in package.json — it requires
// native linking. To enable BLE: install the package and rebuild the dev client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let BleManagerClass: any = null;
let bleAvailable = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ble = require('react-native-ble-plx');
  BleManagerClass = ble.BleManager;
  bleAvailable = true;
} catch {
  // Expo Go or package not installed — manual HR entry only
}

// Bluetooth GATT HR service / characteristic UUIDs (full 128-bit form)
const HR_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
const HR_CHAR_UUID    = '00002a37-0000-1000-8000-00805f9b34fb';

// Ray condition: bounded reconnect — max 3 attempts, exponential backoff
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAYS_MS = [1000, 2000, 4000];

/** Parse BLE HR Measurement characteristic (GATT spec 0x2A37).
 *  Byte 0 flags: bit 0 = 0 → uint8 HR at byte 1; bit 0 = 1 → uint16 LE at bytes 1-2.
 */
function parseHRValue(base64Value: string): number {
  const binary = atob(base64Value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const isUint16 = (bytes[0] & 0x01) !== 0;
  if (isUint16) {
    return (bytes[1] ?? 0) | ((bytes[2] ?? 0) << 8); // little-endian uint16
  }
  return bytes[1] ?? 0;
}

export function useHeartRateMonitor(savedDeviceId?: string) {
  const [isAvailable] = useState(bleAvailable);
  const [scanning, setScanning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [currentBpm, setCurrentBpm] = useState(0);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const managerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deviceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscriptionRef = useRef<any>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const cleanup = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    if (deviceRef.current) {
      deviceRef.current.cancelConnection().catch(() => {});
      deviceRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    managerRef.current?.stopDeviceScan();
  }, []);

  useEffect(() => {
    if (!bleAvailable) return;
    managerRef.current = new BleManagerClass();
    return () => {
      mountedRef.current = false;
      cleanup();
      managerRef.current?.destroy();
    };
  }, [cleanup]);

  const subscribeToHR = useCallback(async (device: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!mountedRef.current) return;
    try {
      await device.discoverAllServicesAndCharacteristics();
      const sub = device.monitorCharacteristicForService(
        HR_SERVICE_UUID,
        HR_CHAR_UUID,
        (error: any, characteristic: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (error || !characteristic?.value || !mountedRef.current) return;
          const bpm = parseHRValue(characteristic.value);
          if (bpm > 0 && bpm <= 300) {
            setCurrentBpm(bpm);
          }
        }
      );
      subscriptionRef.current = sub;
    } catch {
      // Service or characteristic not found — device is not a valid HR monitor
      if (mountedRef.current) setConnected(false);
    }
  }, []);

  // Forward declaration needed for mutual recursion with attemptReconnect
  const connectToDeviceRef = useRef<((id: string) => Promise<void>) | undefined>(undefined);

  const attemptReconnect = useCallback((deviceId: string) => {
    if (reconnectCountRef.current >= MAX_RECONNECT_ATTEMPTS) return;
    const delay = RECONNECT_DELAYS_MS[reconnectCountRef.current] ?? 4000;
    reconnectCountRef.current += 1;
    reconnectTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      connectToDeviceRef.current?.(deviceId);
    }, delay);
  }, []);

  const connectToDevice = useCallback(async (deviceId: string) => {
    if (!bleAvailable || !managerRef.current || !mountedRef.current) return;
    try {
      const device = await managerRef.current.connectToDevice(deviceId);
      if (!mountedRef.current) {
        device.cancelConnection().catch(() => {});
        return;
      }
      deviceRef.current = device;
      reconnectCountRef.current = 0;
      setConnected(true);
      setDeviceName(device.name ?? 'HR Monitor');
      setConnectedDeviceId(deviceId);

      device.onDisconnected((_err: any, _dev: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!mountedRef.current) return;
        setConnected(false);
        setCurrentBpm(0);
        deviceRef.current = null;
        attemptReconnect(deviceId);
      });

      await subscribeToHR(device);
    } catch {
      if (mountedRef.current) setConnected(false);
    }
  }, [subscribeToHR, attemptReconnect]);

  // Keep ref in sync for mutual recursion
  useEffect(() => { connectToDeviceRef.current = connectToDevice; }, [connectToDevice]);

  // Auto-reconnect to saved device on mount
  useEffect(() => {
    if (!bleAvailable || !savedDeviceId) return;
    // Small delay to ensure BleManager is initialised
    const timer = setTimeout(() => {
      if (mountedRef.current) connectToDevice(savedDeviceId);
    }, 500);
    return () => clearTimeout(timer);
  }, [savedDeviceId, connectToDevice]);

  const startScan = useCallback(() => {
    if (!bleAvailable || !managerRef.current || scanning) return;
    // Clear any previous scan timeout to prevent double-tap accumulation
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    setScanning(true);
    reconnectCountRef.current = 0;
    managerRef.current.startDeviceScan(
      [HR_SERVICE_UUID],
      null,
      (error: any, device: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!mountedRef.current) return;
        if (error) { setScanning(false); return; }
        if (device?.name || device?.localName) {
          managerRef.current.stopDeviceScan();
          setScanning(false);
          connectToDevice(device.id);
        }
      }
    );
    // Auto-stop scan after 30 seconds to prevent battery drain
    scanTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      managerRef.current?.stopDeviceScan();
      setScanning(false);
      scanTimeoutRef.current = null;
    }, 30000);
  }, [scanning, connectToDevice]);

  const stopScan = useCallback(() => {
    managerRef.current?.stopDeviceScan();
    setScanning(false);
  }, []);

  const disconnect = useCallback(() => {
    // Prevent auto-reconnect by maxing out the counter
    reconnectCountRef.current = MAX_RECONNECT_ATTEMPTS;
    cleanup();
    setConnected(false);
    setCurrentBpm(0);
    setConnectedDeviceId(null);
    setDeviceName(null);
  }, [cleanup]);

  return {
    isAvailable,
    scanning,
    connected,
    deviceName,
    currentBpm,
    connectedDeviceId,
    startScan,
    stopScan,
    disconnect,
  };
}
