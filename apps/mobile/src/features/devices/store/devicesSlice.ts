import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as DataSync from '@fitsync/datasync';
import type {
  DeviceRecord,
  DeviceSyncInfo,
  DiscoveredDevice,
  ConnectedDevice,
  SyncStatus,
} from '@fitsync/datasync';

interface DevicesState {
  devices: DeviceRecord[];
  pairedDevices: DeviceRecord[];
  discoveredDevices: DiscoveredDevice[];
  connectedDevices: ConnectedDevice[];
  syncInfo: DeviceSyncInfo | null;
  syncStatus: SyncStatus | null;
  isScanning: boolean;
  isConnecting: string | null; // endpointId being connected
  isSyncing: boolean;
  error: string | null;
  lastSyncResult: string | null;
}

const initialState: DevicesState = {
  devices: [],
  pairedDevices: [],
  discoveredDevices: [],
  connectedDevices: [],
  syncInfo: null,
  syncStatus: null,
  isScanning: false,
  isConnecting: null,
  isSyncing: false,
  error: null,
  lastSyncResult: null,
};

export const loadDevicesThunk = createAsyncThunk('devices/loadAll', async () => {
  return DataSync.getAllDevices();
});

export const startAdvertisingThunk = createAsyncThunk(
  'devices/startAdvertising',
  async (deviceName: string) => {
    await DataSync.startAdvertising(deviceName);
  },
);

export const startDiscoveryThunk = createAsyncThunk('devices/startDiscovery', async () => {
  await DataSync.startDiscovery();
});

export const stopDiscoveryThunk = createAsyncThunk('devices/stopDiscovery', async () => {
  await DataSync.stopDiscovery();
});

export const stopAdvertisingThunk = createAsyncThunk('devices/stopAdvertising', async () => {
  await DataSync.stopAdvertising();
});

export const connectToDeviceThunk = createAsyncThunk(
  'devices/connect',
  async ({ deviceName, endpointId }: { deviceName: string; endpointId: string }) => {
    await DataSync.connectToDevice(deviceName, endpointId);
    return endpointId;
  },
);

export const disconnectDeviceThunk = createAsyncThunk(
  'devices/disconnect',
  async (endpointId: string) => {
    await DataSync.disconnectDevice(endpointId);
    return endpointId;
  },
);

export const disconnectAllThunk = createAsyncThunk('devices/disconnectAll', async () => {
  await DataSync.disconnectAll();
});

export const loadSyncInfoThunk = createAsyncThunk('devices/loadSyncInfo', async () => {
  return DataSync.getDeviceSyncInfo();
});

export const loadDiscoveredDevicesThunk = createAsyncThunk('devices/loadDiscovered', async () => {
  return DataSync.getDiscoveredDevices();
});

export const loadConnectedDevicesThunk = createAsyncThunk('devices/loadConnected', async () => {
  return DataSync.getConnectedDevices();
});

export const triggerDeviceSyncThunk = createAsyncThunk('devices/triggerSync', async () => {
  const result = await DataSync.triggerSync();
  return result;
});

export const startOutboxThunk = createAsyncThunk('devices/startOutbox', async () => {
  await DataSync.startOutboxProcessing();
});

export const loadSyncStatusThunk = createAsyncThunk('devices/loadSyncStatus', async () => {
  return DataSync.getSyncStatus();
});

export const loadPairedDevicesThunk = createAsyncThunk('devices/loadPaired', async () => {
  return DataSync.getPairedDevices();
});

export const removePairedDeviceThunk = createAsyncThunk(
  'devices/removePaired',
  async (deviceId: string) => {
    await DataSync.removePairedDevice(deviceId);
    return deviceId;
  },
);

const devicesSlice = createSlice({
  name: 'devices',
  initialState,
  reducers: {
    addDiscoveredDevice(state, action: PayloadAction<DiscoveredDevice>) {
      const exists = state.discoveredDevices.some(
        (d) => d.endpointId === action.payload.endpointId,
      );
      if (!exists) {
        state.discoveredDevices.push(action.payload);
      }
    },
    removeDiscoveredDevice(state, action: PayloadAction<string>) {
      state.discoveredDevices = state.discoveredDevices.filter(
        (d) => d.endpointId !== action.payload,
      );
    },
    updateConnectionStatus(
      state,
      action: PayloadAction<{ endpointId: string; connected: boolean }>,
    ) {
      if (action.payload.connected) {
        const name =
          state.discoveredDevices.find((d) => d.endpointId === action.payload.endpointId)
            ?.endpointName ?? action.payload.endpointId;

        // Deduplicate connected list by both endpointId AND name
        // (Nearby assigns new endpointId each session for same physical device)
        state.connectedDevices = state.connectedDevices.filter(
          (d) => d.endpointId !== action.payload.endpointId && d.endpointName !== name,
        );
        state.connectedDevices.push({
          endpointId: action.payload.endpointId,
          endpointName: name,
        });

        // Remove from discovered — it's now connected, not "nearby"
        state.discoveredDevices = state.discoveredDevices.filter(
          (d) => d.endpointId !== action.payload.endpointId && d.endpointName !== name,
        );
      } else {
        state.connectedDevices = state.connectedDevices.filter(
          (d) => d.endpointId !== action.payload.endpointId,
        );
      }
      state.isConnecting = null;
    },
    clearError(state) {
      state.error = null;
    },
    clearSyncResult(state) {
      state.lastSyncResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDevicesThunk.fulfilled, (state, action) => {
        state.devices = action.payload;
      })
      .addCase(startDiscoveryThunk.pending, (state) => {
        state.isScanning = true;
        state.error = null;
      })
      .addCase(startDiscoveryThunk.fulfilled, (state) => {
        state.isScanning = true;
        if (state.syncInfo) {
          state.syncInfo.isDiscovering = true;
        } else {
          state.syncInfo = {
            connectedDeviceId: null,
            connectedDeviceName: null,
            isAdvertising: false,
            isDiscovering: true,
          };
        }
      })
      .addCase(startDiscoveryThunk.rejected, (state, action) => {
        state.isScanning = false;
        state.error = action.error.message ?? 'Failed to start discovery';
      })
      .addCase(connectToDeviceThunk.pending, (state, action) => {
        state.isConnecting = action.meta.arg.endpointId;
        state.error = null;
      })
      .addCase(connectToDeviceThunk.fulfilled, (state) => {
        // Connection result handled by updateConnectionStatus via listener
      })
      .addCase(connectToDeviceThunk.rejected, (state, action) => {
        state.isConnecting = null;
        state.error = action.error.message ?? 'Connection failed';
      })
      .addCase(disconnectDeviceThunk.fulfilled, (state, action) => {
        state.connectedDevices = state.connectedDevices.filter(
          (d) => d.endpointId !== action.payload,
        );
      })
      .addCase(disconnectAllThunk.fulfilled, (state) => {
        state.connectedDevices = [];
      })
      .addCase(startAdvertisingThunk.fulfilled, (state) => {
        if (state.syncInfo) {
          state.syncInfo.isAdvertising = true;
        } else {
          state.syncInfo = {
            connectedDeviceId: null,
            connectedDeviceName: null,
            isAdvertising: true,
            isDiscovering: false,
          };
        }
      })
      .addCase(startAdvertisingThunk.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to start advertising';
      })
      .addCase(stopDiscoveryThunk.fulfilled, (state) => {
        state.isScanning = false;
        if (state.syncInfo) {
          state.syncInfo.isDiscovering = false;
        }
      })
      .addCase(stopAdvertisingThunk.fulfilled, (state) => {
        if (state.syncInfo) {
          state.syncInfo.isAdvertising = false;
        }
      })
      .addCase(stopAdvertisingThunk.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to stop advertising';
      })
      .addCase(loadSyncInfoThunk.fulfilled, (state, action) => {
        state.syncInfo = action.payload;
      })
      .addCase(loadDiscoveredDevicesThunk.fulfilled, (state, action) => {
        // Deduplicate by endpointName (keep first seen) and exclude already-connected
        const connectedNames = new Set(state.connectedDevices.map((c) => c.endpointName));
        const seen = new Set<string>();
        state.discoveredDevices = action.payload.filter((d) => {
          if (connectedNames.has(d.endpointName) || seen.has(d.endpointName)) return false;
          seen.add(d.endpointName);
          return true;
        });
      })
      .addCase(loadConnectedDevicesThunk.fulfilled, (state, action) => {
        // Deduplicate connected by endpointName (keep latest = last wins)
        const byName = new Map<string, ConnectedDevice>();
        for (const d of action.payload) {
          byName.set(d.endpointName, d);
        }
        state.connectedDevices = Array.from(byName.values());
        // Also clean discovered of any newly-connected devices
        const connectedNames = new Set(byName.keys());
        state.discoveredDevices = state.discoveredDevices.filter(
          (d) => !connectedNames.has(d.endpointName),
        );
      })
      .addCase(triggerDeviceSyncThunk.pending, (state) => {
        state.isSyncing = true;
        state.error = null;
      })
      .addCase(triggerDeviceSyncThunk.fulfilled, (state, action) => {
        state.isSyncing = false;
        state.lastSyncResult = action.payload;
      })
      .addCase(triggerDeviceSyncThunk.rejected, (state, action) => {
        state.isSyncing = false;
        state.error = action.error.message ?? 'Sync failed';
      })
      .addCase(loadSyncStatusThunk.fulfilled, (state, action) => {
        state.syncStatus = action.payload;
      })
      .addCase(loadPairedDevicesThunk.fulfilled, (state, action) => {
        state.pairedDevices = action.payload;
      })
      .addCase(removePairedDeviceThunk.fulfilled, (state, action) => {
        state.pairedDevices = state.pairedDevices.filter((d) => d.id !== action.payload);
      });
  },
});

export const {
  addDiscoveredDevice,
  removeDiscoveredDevice,
  updateConnectionStatus,
  clearError,
  clearSyncResult,
} = devicesSlice.actions;
export default devicesSlice.reducer;
