import { configureStore } from '@reduxjs/toolkit';
import * as DataSync from '@fitsync/datasync';
import type { DeviceRecord, DeviceSyncInfo, DiscoveredDevice } from '@fitsync/datasync';
import devicesReducer, {
  addDiscoveredDevice,
  removeDiscoveredDevice,
  loadDevicesThunk,
  startDiscoveryThunk,
  stopDiscoveryThunk,
  startAdvertisingThunk,
  connectToDeviceThunk,
  loadSyncInfoThunk,
  loadDiscoveredDevicesThunk,
} from '../devicesSlice';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockDevice: DeviceRecord = {
  id: 'device-001',
  deviceName: 'PayDevice-1',
  nearbyEndpointId: 'endpoint-abc',
  role: 'pay',
  connectionStatus: 'connected',
  lastSeenAt: 1700000000000,
  isPaired: true,
  createdAt: 1699000000000,
};

const mockDevice2: DeviceRecord = {
  id: 'device-002',
  deviceName: 'WeighDevice-1',
  nearbyEndpointId: null,
  role: 'weigh',
  connectionStatus: 'disconnected',
  lastSeenAt: null,
  isPaired: false,
  createdAt: 1699000001000,
};

const mockDiscovered: DiscoveredDevice = {
  endpointId: 'endpoint-abc',
  endpointName: 'PayDevice-1',
  serviceId: 'com.fitsync.datasync',
};

const mockDiscovered2: DiscoveredDevice = {
  endpointId: 'endpoint-def',
  endpointName: 'WeighDevice-2',
  serviceId: 'com.fitsync.datasync',
};

const mockSyncInfo: DeviceSyncInfo = {
  connectedDeviceId: 'device-001',
  connectedDeviceName: 'PayDevice-1',
  isAdvertising: false,
  isDiscovering: true,
};

// ─── Store factory ────────────────────────────────────────────────────────────

function makeStore(discoveredDevices: DiscoveredDevice[] = []) {
  return configureStore({
    reducer: { devices: devicesReducer },
    preloadedState: {
      devices: {
        devices: [],
        pairedDevices: [],
        discoveredDevices,
        connectedDevices: [],
        syncInfo: null,
        syncStatus: null,
        isScanning: false,
        isConnecting: null,
        isSyncing: false,
        error: null,
        lastSyncResult: null,
      },
    },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('devicesSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Initial state ────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('should have empty devices, no scanning, no syncInfo, no error', () => {
      const store = makeStore();
      const state = store.getState().devices;

      expect(state.devices).toEqual([]);
      expect(state.discoveredDevices).toEqual([]);
      expect(state.syncInfo).toBeNull();
      expect(state.isScanning).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  // ── addDiscoveredDevice ───────────────────────────────────────────────────

  describe('addDiscoveredDevice', () => {
    it('should add a device to discoveredDevices', () => {
      const store = makeStore();

      store.dispatch(addDiscoveredDevice(mockDiscovered));

      expect(store.getState().devices.discoveredDevices).toHaveLength(1);
      expect(store.getState().devices.discoveredDevices[0]).toEqual(mockDiscovered);
    });

    it('should not add duplicate devices with the same endpointId', () => {
      const store = makeStore([mockDiscovered]);

      store.dispatch(addDiscoveredDevice(mockDiscovered));

      expect(store.getState().devices.discoveredDevices).toHaveLength(1);
    });

    it('should add multiple distinct devices', () => {
      const store = makeStore();

      store.dispatch(addDiscoveredDevice(mockDiscovered));
      store.dispatch(addDiscoveredDevice(mockDiscovered2));

      expect(store.getState().devices.discoveredDevices).toHaveLength(2);
    });
  });

  // ── removeDiscoveredDevice ────────────────────────────────────────────────

  describe('removeDiscoveredDevice', () => {
    it('should remove a device by endpointId', () => {
      const store = makeStore([mockDiscovered, mockDiscovered2]);

      store.dispatch(removeDiscoveredDevice('endpoint-abc'));

      const discovered = store.getState().devices.discoveredDevices;
      expect(discovered).toHaveLength(1);
      expect(discovered[0].endpointId).toBe('endpoint-def');
    });

    it('should be a no-op when endpointId does not match', () => {
      const store = makeStore([mockDiscovered]);

      store.dispatch(removeDiscoveredDevice('endpoint-nonexistent'));

      expect(store.getState().devices.discoveredDevices).toHaveLength(1);
    });

    it('should result in empty array when last device is removed', () => {
      const store = makeStore([mockDiscovered]);

      store.dispatch(removeDiscoveredDevice('endpoint-abc'));

      expect(store.getState().devices.discoveredDevices).toEqual([]);
    });
  });

  // ── loadDevicesThunk ──────────────────────────────────────────────────────

  describe('loadDevicesThunk', () => {
    it('should populate devices on fulfilled', async () => {
      (DataSync.getAllDevices as jest.Mock).mockResolvedValue([mockDevice, mockDevice2]);
      const store = makeStore();

      await store.dispatch(loadDevicesThunk());

      const state = store.getState().devices;
      expect(state.devices).toHaveLength(2);
      expect(state.devices[0].id).toBe('device-001');
    });

    it('should set devices to empty array when none returned', async () => {
      (DataSync.getAllDevices as jest.Mock).mockResolvedValue([]);
      const store = makeStore();

      await store.dispatch(loadDevicesThunk());

      expect(store.getState().devices.devices).toEqual([]);
    });
  });

  // ── startDiscoveryThunk ───────────────────────────────────────────────────

  describe('startDiscoveryThunk', () => {
    it('should set isScanning to true while pending', () => {
      (DataSync.startDiscovery as jest.Mock).mockReturnValue(new Promise(() => {}));
      const store = makeStore();

      store.dispatch(startDiscoveryThunk());

      expect(store.getState().devices.isScanning).toBe(true);
    });

    it('should keep isScanning true on fulfilled', async () => {
      (DataSync.startDiscovery as jest.Mock).mockResolvedValue(undefined);
      const store = makeStore();

      await store.dispatch(startDiscoveryThunk());

      expect(store.getState().devices.isScanning).toBe(true);
    });

    it('should call DataSync.startDiscovery once', async () => {
      (DataSync.startDiscovery as jest.Mock).mockResolvedValue(undefined);
      const store = makeStore();

      await store.dispatch(startDiscoveryThunk());

      expect(DataSync.startDiscovery).toHaveBeenCalledTimes(1);
    });
  });

  // ── stopDiscoveryThunk ────────────────────────────────────────────────────

  describe('stopDiscoveryThunk', () => {
    it('should set isScanning to false on fulfilled', async () => {
      (DataSync.stopDiscovery as jest.Mock).mockResolvedValue(undefined);
      const store = configureStore({
        reducer: { devices: devicesReducer },
        preloadedState: {
          devices: {
            devices: [],
            discoveredDevices: [],
            syncInfo: null,
            isScanning: true,
            error: null,
          },
        },
      });

      await store.dispatch(stopDiscoveryThunk());

      expect(store.getState().devices.isScanning).toBe(false);
    });
  });

  // ── loadSyncInfoThunk ─────────────────────────────────────────────────────

  describe('loadSyncInfoThunk', () => {
    it('should set syncInfo on fulfilled', async () => {
      (DataSync.getDeviceSyncInfo as jest.Mock).mockResolvedValue(mockSyncInfo);
      const store = makeStore();

      await store.dispatch(loadSyncInfoThunk());

      expect(store.getState().devices.syncInfo).toEqual(mockSyncInfo);
    });
  });

  // ── startAdvertisingThunk ─────────────────────────────────────────────────

  describe('startAdvertisingThunk', () => {
    it('should call DataSync.startAdvertising with device name', async () => {
      (DataSync.startAdvertising as jest.Mock).mockResolvedValue(undefined);
      const store = makeStore();

      await store.dispatch(startAdvertisingThunk('PayDevice-1'));

      expect(DataSync.startAdvertising).toHaveBeenCalledWith('PayDevice-1');
    });
  });

  // ── connectToDeviceThunk ──────────────────────────────────────────────────

  describe('connectToDeviceThunk', () => {
    it('should call DataSync.connectToDevice with correct args', async () => {
      (DataSync.connectToDevice as jest.Mock).mockResolvedValue(undefined);
      const store = makeStore();

      await store.dispatch(
        connectToDeviceThunk({ deviceName: 'PayDevice-1', endpointId: 'endpoint-abc' }),
      );

      expect(DataSync.connectToDevice).toHaveBeenCalledWith('PayDevice-1', 'endpoint-abc');
    });
  });

  // ── loadDiscoveredDevicesThunk ────────────────────────────────────────────

  describe('loadDiscoveredDevicesThunk', () => {
    it('should populate discoveredDevices on fulfilled', async () => {
      (DataSync.getDiscoveredDevices as jest.Mock).mockResolvedValue([
        mockDiscovered,
        mockDiscovered2,
      ]);
      const store = makeStore();

      await store.dispatch(loadDiscoveredDevicesThunk());

      expect(store.getState().devices.discoveredDevices).toHaveLength(2);
    });
  });
});
