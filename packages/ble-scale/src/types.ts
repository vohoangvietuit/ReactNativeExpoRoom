export interface ScaleReading {
  weight: number; // kg
  unit: 'kg' | 'lb' | 'st';
  stable: boolean;
  timestamp: string;
  deviceId: string;
  deviceName: string;
}

export interface ScaleDevice {
  id: string;
  name: string;
  rssi: number;
  isConnectable: boolean;
}

export interface ScaleStatus {
  isScanning: boolean;
  isConnected: boolean;
  connectedDevice: ScaleDevice | null;
  lastReading: ScaleReading | null;
}

/** Raw BLE advertisement — no filtering. Used for dev/debug scanning. */
export interface RawBleDevice {
  id: string;
  name: string | null;
  rssi: number | null;
  isConnectable: boolean | null;
  serviceUUIDs: string[] | null;
  manufacturerData: string | null;
}
