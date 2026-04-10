import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  Linking,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import {
  loadDevicesThunk,
  startAdvertisingThunk,
  startDiscoveryThunk,
  stopDiscoveryThunk,
  connectToDeviceThunk,
  disconnectDeviceThunk,
  disconnectAllThunk,
  loadSyncInfoThunk,
  loadSyncStatusThunk,
  loadDiscoveredDevicesThunk,
  loadConnectedDevicesThunk,
  triggerDeviceSyncThunk,
  startOutboxThunk,
  updateConnectionStatus,
  removeDiscoveredDevice,
  clearError,
} from '../store/devicesSlice';
import * as DataSync from '@xpw2/datasync';

const NEARBY_PERMISSIONS = [
  PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
  PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
  PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  'android.permission.NEARBY_WIFI_DEVICES',
] as const;

async function requestNearbyPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const results = await PermissionsAndroid.requestMultiple([...NEARBY_PERMISSIONS]);
  return Object.values(results).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
}

export default function DevicesScreen() {
  const dispatch = useAppDispatch();
  const {
    discoveredDevices,
    connectedDevices,
    syncInfo,
    syncStatus,
    isScanning,
    isConnecting,
    isSyncing,
    error,
    lastSyncResult,
  } = useAppSelector((s) => s.devices);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [logs, setLogs] = useState<string[]>([]);
  const [autoSync, setAutoSync] = useState(true);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLogs((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 80));
  }, []);

  // ─── Bootstrap: load state + subscribe to events ──────────────
  useEffect(() => {
    dispatch(loadDevicesThunk());
    dispatch(loadSyncInfoThunk());
    dispatch(loadSyncStatusThunk());
    dispatch(loadConnectedDevicesThunk());
    dispatch(loadDiscoveredDevicesThunk());

    addLog('Screen mounted — loading state…');

    const deviceFoundSub = DataSync.addDeviceFoundListener((event) => {
      addLog(`📶 Device found: ${event.endpointName} (${event.endpointId})`);
      dispatch(loadDiscoveredDevicesThunk());
    });

    const deviceLostSub = DataSync.addDeviceLostListener((event) => {
      addLog(`❌ Device lost: ${event.endpointId}`);
      dispatch(removeDiscoveredDevice(event.endpointId));
    });

    const connectionSub = DataSync.addDeviceConnectionChangedListener((event) => {
      addLog(`${event.connected ? '🟢 Connected' : '🔴 Disconnected'}: ${event.endpointId}`);
      dispatch(
        updateConnectionStatus({
          endpointId: event.endpointId,
          connected: event.connected,
        }),
      );
      dispatch(loadSyncInfoThunk());
      if (event.connected) {
        // Auto-start outbox processing when a device connects
        dispatch(startOutboxThunk());
        addLog('⚙️ Started outbox processing');
      }
    });

    const syncSub = DataSync.addSyncStatusChangedListener((event) => {
      addLog(
        `🔄 Sync status: ${event.type}${event.acceptedEvents != null ? ` (${event.acceptedEvents} events)` : ''}`,
      );
      dispatch(loadSyncInfoThunk());
      dispatch(loadSyncStatusThunk());
    });

    // Re-check state when app comes back to foreground
    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        dispatch(loadSyncInfoThunk());
        dispatch(loadConnectedDevicesThunk());
        dispatch(loadDiscoveredDevicesThunk());
      }
      appStateRef.current = nextState;
    });

    return () => {
      deviceFoundSub.remove();
      deviceLostSub.remove();
      connectionSub.remove();
      syncSub.remove();
      appStateSub.remove();
    };
  }, [dispatch, addLog]);

  // ─── Auto-sync: trigger sync immediately on new local events ──
  useEffect(() => {
    if (!autoSync) return;

    const eventSub = DataSync.addEventRecordedListener((event) => {
      addLog(`⚡ Auto-sync: new ${event.eventType} → syncing…`);
      dispatch(triggerDeviceSyncThunk()).then((result) => {
        if (triggerDeviceSyncThunk.fulfilled.match(result)) {
          addLog(`✅ ${result.payload}`);
          dispatch(loadSyncStatusThunk());
        }
      });
    });

    return () => {
      eventSub.remove();
    };
  }, [autoSync, dispatch, addLog]);

  // ─── Handlers ─────────────────────────────────────────────────

  const handleStartScan = useCallback(async () => {
    dispatch(clearError());
    addLog('Requesting Nearby permissions…');
    const granted = await requestNearbyPermissions();
    if (!granted) {
      addLog('⚠️ Permissions denied');
      Alert.alert(
        'Permissions Required',
        'Location, Bluetooth, and Nearby Wi-Fi permissions are required to discover nearby phones.\n\nGo to Settings → Permissions and grant all required permissions.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    addLog('✅ Permissions granted');
    try {
      const name = await DataSync.getDeviceName();
      addLog(`Starting advertising as "${name}"…`);
      const advResult = await dispatch(startAdvertisingThunk(name));
      if (startAdvertisingThunk.rejected.match(advResult)) {
        addLog(`❌ Advertising failed: ${advResult.error.message}`);
      } else {
        addLog('📡 Advertising started');
      }
      addLog('Starting discovery…');
      const discResult = await dispatch(startDiscoveryThunk());
      if (startDiscoveryThunk.rejected.match(discResult)) {
        addLog(`❌ Discovery failed: ${discResult.error.message}`);
      } else {
        addLog('🔍 Discovery started');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog(`❌ Error: ${msg}`);
      console.error('[Devices] Failed to start scan:', e);
    }
  }, [dispatch, addLog]);

  const handleStopScan = useCallback(() => {
    dispatch(stopDiscoveryThunk());
    DataSync.stopAdvertising();
  }, [dispatch]);

  const handleConnect = useCallback(
    async (endpointId: string, endpointName: string) => {
      Alert.alert(
        'Connect to Device',
        `Connect to "${endpointName}"?\n\nBoth devices must have this app open for sync to work.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Connect',
            onPress: async () => {
              const name = await DataSync.getDeviceName();
              dispatch(connectToDeviceThunk({ deviceName: name, endpointId }));
            },
          },
        ],
      );
    },
    [dispatch],
  );

  const handleDisconnect = useCallback(
    (endpointId: string, endpointName: string) => {
      Alert.alert('Disconnect', `Disconnect from "${endpointName}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => dispatch(disconnectDeviceThunk(endpointId)),
        },
      ]);
    },
    [dispatch],
  );

  const handleSync = useCallback(() => {
    if (connectedDevices.length === 0) {
      Alert.alert('No Connected Devices', 'Connect to a device first before syncing.');
      return;
    }
    addLog(`🔄 Syncing… (${syncStatus?.pendingCount ?? '?'} pending events)`);
    dispatch(triggerDeviceSyncThunk()).then((result) => {
      if (triggerDeviceSyncThunk.fulfilled.match(result)) {
        addLog(`✅ ${result.payload}`);
        dispatch(loadSyncStatusThunk());
      }
    });
  }, [dispatch, connectedDevices.length, syncStatus?.pendingCount, addLog]);

  const handleDisconnectAll = useCallback(() => {
    if (connectedDevices.length === 0) return;
    Alert.alert('Disconnect All', 'Disconnect from all devices?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect All',
        style: 'destructive',
        onPress: () => dispatch(disconnectAllThunk()),
      },
    ]);
  }, [dispatch, connectedDevices.length]);

  // ─── Render ───────────────────────────────────────────────────

  const hasConnections = connectedDevices.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Devices & Sync</Text>

      {/* ── Status indicators ── */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusBadge,
            syncInfo?.isAdvertising ? styles.badgeActive : styles.badgeInactive,
          ]}
        >
          <Text style={styles.badgeText}>
            {syncInfo?.isAdvertising ? '📡 Advertising' : '📡 Off'}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            syncInfo?.isDiscovering ? styles.badgeActive : styles.badgeInactive,
          ]}
        >
          <Text style={styles.badgeText}>
            {syncInfo?.isDiscovering ? '🔍 Discovering' : '🔍 Off'}
          </Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => dispatch(clearError())}>
            <Text style={styles.errorDismiss}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── Connected devices ── */}
      {hasConnections ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✅ Connected ({connectedDevices.length})</Text>
            {connectedDevices.length > 1 ? (
              <TouchableOpacity onPress={handleDisconnectAll}>
                <Text style={styles.disconnectAllText}>Disconnect All</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {connectedDevices.map((device) => (
            <View key={device.endpointId} style={styles.connectedItem}>
              <View style={styles.connectedInfo}>
                <Text style={styles.connectedName}>{device.endpointName}</Text>
                <Text style={styles.connectedId}>{device.endpointId}</Text>
              </View>
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={() => handleDisconnect(device.endpointId, device.endpointName)}
              >
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Auto-sync toggle */}
          <TouchableOpacity
            style={[styles.autoSyncToggle, autoSync && styles.autoSyncActive]}
            onPress={() => {
              setAutoSync((prev) => !prev);
              addLog(autoSync ? '⏸ Auto-sync disabled' : '▶️ Auto-sync enabled');
            }}
          >
            <Text style={styles.autoSyncText}>
              {autoSync ? '⚡ Auto-Sync ON' : '⏸ Auto-Sync OFF'}
            </Text>
          </TouchableOpacity>

          {/* Sync status breakdown */}
          {syncStatus != null ? (
            <View style={styles.syncStatusRow}>
              <Text style={styles.syncStatusItem}>
                <Text style={styles.syncStatusLabel}>Pending </Text>
                <Text style={styles.syncStatusValue}>{syncStatus.pendingCount}</Text>
              </Text>
              <Text style={styles.syncStatusItem}>
                <Text style={styles.syncStatusLabel}>Synced </Text>
                <Text style={styles.syncStatusValue}>{syncStatus.deviceSyncedCount}</Text>
              </Text>
              <Text style={styles.syncStatusItem}>
                <Text style={styles.syncStatusLabel}>Failed </Text>
                <Text
                  style={[
                    styles.syncStatusValue,
                    syncStatus.failedCount > 0 && styles.syncStatusFailed,
                  ]}
                >
                  {syncStatus.failedCount}
                </Text>
              </Text>
            </View>
          ) : null}

          {/* Sync button — only shows when connected */}
          <TouchableOpacity
            style={[styles.syncButton, isSyncing && styles.syncingButton]}
            onPress={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <View style={styles.syncRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.syncButtonText}> Syncing…</Text>
              </View>
            ) : (
              <Text style={styles.syncButtonText}>
                🔄 Sync Now
                {syncStatus != null && syncStatus.pendingCount > 0
                  ? ` (${syncStatus.pendingCount} events)`
                  : ''}
              </Text>
            )}
          </TouchableOpacity>

          {lastSyncResult ? (
            <Text
              style={[
                styles.syncResult,
                lastSyncResult.startsWith('Sent') && styles.syncResultSuccess,
              ]}
            >
              {lastSyncResult}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* ── Scan controls ── */}
      <View style={styles.buttonRow}>
        {isScanning ? (
          <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={handleStopScan}>
            <Text style={styles.buttonText}>Stop Scanning</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleStartScan}>
            <Text style={styles.buttonText}>Scan for Devices</Text>
          </TouchableOpacity>
        )}
      </View>

      {isScanning ? <ActivityIndicator style={styles.spinner} /> : null}

      {/* ── Discovered devices ── */}
      <Text style={styles.sectionTitle}>Nearby Devices ({discoveredDevices.length})</Text>
      <FlatList
        data={discoveredDevices}
        keyExtractor={(item) => item.endpointId}
        renderItem={({ item }) => {
          const isThisConnecting = isConnecting === item.endpointId;
          const isAlreadyConnected = connectedDevices.some((d) => d.endpointId === item.endpointId);
          return (
            <TouchableOpacity
              style={[styles.deviceItem, isAlreadyConnected && styles.deviceConnected]}
              onPress={() =>
                isAlreadyConnected
                  ? handleDisconnect(item.endpointId, item.endpointName)
                  : handleConnect(item.endpointId, item.endpointName)
              }
              disabled={isThisConnecting}
            >
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{item.endpointName}</Text>
                <Text style={styles.deviceId}>{item.endpointId}</Text>
              </View>
              {isThisConnecting ? (
                <ActivityIndicator size="small" />
              ) : isAlreadyConnected ? (
                <Text style={styles.connectedBadgeText}>Connected</Text>
              ) : (
                <Text style={styles.connectText}>Connect</Text>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {isScanning
              ? 'Scanning for nearby devices…'
              : 'Tap "Scan for Devices" to find nearby XPW2 tablets.'}
          </Text>
        }
        ListFooterComponent={
          <View style={styles.logPanel}>
            <View style={styles.logHeader}>
              <Text style={styles.logTitle}>📝 Debug Log</Text>
              <TouchableOpacity onPress={() => setLogs([])}>
                <Text style={styles.logClear}>Clear</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.logBody}>
              {logs.length === 0 ? (
                <Text style={styles.logEmpty}>No logs yet</Text>
              ) : (
                logs.map((line, i) => (
                  <Text key={i} style={styles.logLine}>
                    {line}
                  </Text>
                ))
              )}
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeActive: {
    backgroundColor: '#d4edda',
  },
  badgeInactive: {
    backgroundColor: '#e9ecef',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#f8d7da',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#721c24',
    flex: 1,
    fontSize: 13,
  },
  errorDismiss: {
    color: '#721c24',
    fontWeight: 'bold',
    fontSize: 16,
    paddingLeft: 8,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  disconnectAllText: {
    color: '#ff3b30',
    fontSize: 13,
    fontWeight: '600',
  },
  connectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  connectedInfo: {
    flex: 1,
  },
  connectedName: {
    fontSize: 15,
    fontWeight: '600',
  },
  connectedId: {
    color: '#999',
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  disconnectButton: {
    borderWidth: 1,
    borderColor: '#ff3b30',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  disconnectButtonText: {
    color: '#ff3b30',
    fontSize: 12,
    fontWeight: '600',
  },
  syncButton: {
    backgroundColor: '#34c759',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  syncingButton: {
    backgroundColor: '#a8d8b9',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  syncResult: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  syncResultSuccess: {
    color: '#1a7f3c',
    fontWeight: '600',
  },
  syncStatusRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  syncStatusItem: {
    fontSize: 12,
  },
  syncStatusLabel: {
    color: '#999',
  },
  syncStatusValue: {
    color: '#333',
    fontWeight: '600',
  },
  syncStatusFailed: {
    color: '#ff3b30',
  },
  autoSyncToggle: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#f8f8f8',
  },
  autoSyncActive: {
    borderColor: '#007AFF',
    backgroundColor: '#e8f0fe',
  },
  autoSyncText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  buttonRow: {
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#ff3b30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  spinner: {
    marginVertical: 8,
  },
  deviceItem: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceConnected: {
    borderWidth: 1,
    borderColor: '#34c759',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
  },
  deviceId: {
    color: '#999',
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  connectText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  connectedBadgeText: {
    color: '#34c759',
    fontWeight: '600',
    fontSize: 13,
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    marginTop: 16,
    lineHeight: 20,
  },
  logPanel: {
    marginTop: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
    maxHeight: 200,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#2a2a2a',
  },
  logTitle: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600',
  },
  logClear: {
    color: '#888',
    fontSize: 11,
  },
  logScroll: {
    padding: 8,
  },
  logBody: {
    padding: 8,
  },
  logEmpty: {
    color: '#555',
    fontSize: 11,
    fontStyle: 'italic',
  },
  logLine: {
    color: '#a8d8a8',
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});
