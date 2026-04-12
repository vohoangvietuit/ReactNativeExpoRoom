import { useCallback, useEffect, useRef, useState } from 'react';
import { BleScaleReader } from '../BleScaleReader';
import type { ScaleDevice, ScaleReading, RawBleDevice } from '../types';

export function useScaleWeight() {
  const readerRef = useRef<BleScaleReader>(new BleScaleReader());
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [discoveredScales, setDiscoveredScales] = useState<ScaleDevice[]>([]);
  const [allRawDevices, setAllRawDevices] = useState<RawBleDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<ScaleDevice | null>(null);
  const [lastReading, setLastReading] = useState<ScaleReading | null>(null);

  useEffect(() => {
    const reader = readerRef.current;

    reader.onScaleFound = (device) => {
      setDiscoveredScales((prev) => {
        const exists = prev.some((d) => d.id === device.id);
        return exists ? prev : [...prev, device];
      });
    };

    reader.onRawDeviceFound = (device) => {
      console.log('[BLE Raw]', JSON.stringify(device));
      setAllRawDevices((prev) => {
        const exists = prev.some((d) => d.id === device.id);
        return exists ? prev : [...prev, device];
      });
    };

    reader.onWeightReading = (reading) => {
      setLastReading(reading);
    };

    reader.onConnectionChanged = (connected) => {
      setIsConnected(connected);
      if (!connected) {
        setConnectedDevice(null);
      }
    };

    return () => {
      reader.destroy();
    };
  }, []);

  const startScan = useCallback((timeoutMs = 10000) => {
    setDiscoveredScales([]);
    setIsScanning(true);
    readerRef.current.startScan(timeoutMs);
    setTimeout(() => setIsScanning(false), timeoutMs);
  }, []);

  /** Scan all nearby BLE devices — no filter. Populates allRawDevices for debugging. */
  const startScanAll = useCallback((timeoutMs = 10000) => {
    setDiscoveredScales([]);
    setAllRawDevices([]);
    setIsScanning(true);
    readerRef.current.startScanAll(timeoutMs);
    setTimeout(() => setIsScanning(false), timeoutMs);
  }, []);

  const stopScan = useCallback(() => {
    readerRef.current.stopScan();
    setIsScanning(false);
  }, []);

  const connect = useCallback(async (deviceId: string) => {
    const success = await readerRef.current.connect(deviceId);
    if (success) {
      setConnectedDevice(readerRef.current.getConnectedDevice());
    }
    return success;
  }, []);

  const disconnect = useCallback(async () => {
    await readerRef.current.disconnect();
    setLastReading(null);
  }, []);

  return {
    isScanning,
    isConnected,
    discoveredScales,
    allRawDevices,
    connectedDevice,
    lastReading,
    startScan,
    startScanAll,
    stopScan,
    connect,
    disconnect,
  };
}
