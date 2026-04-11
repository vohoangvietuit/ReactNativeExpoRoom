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
  loadPairedDevicesThunk,
  removePairedDeviceThunk,
  startAdvertisingThunk,
  stopAdvertisingThunk,
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
import * as DataSync from '@fitsync/datasync';

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
    pairedDevices,
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
  const [showDebugLog, setShowDebugLog] = useState(false);
  const [advertisingEnabled, setAdvertisingEnabled] = useState(false);
  const [deviceName, setDeviceName] = useState<string>('');
  const autoReconnectRef = useRef<Set<string>>(new Set());
  const advertisingEnabledRef = useRef(false);
  const [isReconnecting, setIsReconnecting] = useState<string | null>(null);

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
    dispatch(loadPairedDevicesThunk());
    dispatch(loadSyncInfoThunk());
    dispatch(loadSyncStatusThunk());
    dispatch(loadConnectedDevicesThunk());
    dispatch(loadDiscoveredDevicesThunk());

    DataSync.getDeviceName()
      .then(setDeviceName)
      .catch(() => {});

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
      dispatch(loadPairedDevicesThunk());
      if (event.connected) {
        dispatch(startOutboxThunk());
        dispatch(loadConnectedDevicesThunk());
        dispatch(loadDiscoveredDevicesThunk());
        // Stop both once connected — saves battery
        dispatch(stopDiscoveryThunk());
        dispatch(stopAdvertisingThunk());
        addLog('⚙️ Outbox started · ⏹ Advertising & Discovery stopped');
      } else {
        dispatch(loadConnectedDevicesThunk());
        dispatch(loadDiscoveredDevicesThunk());
        // On disconnect: auto-resume advertising if toggle was ON
        if (advertisingEnabledRef.current) {
          DataSync.getDeviceName()
            .then((name) => {
              dispatch(startAdvertisingThunk(name));
              addLog('📡 Advertising auto-resumed after disconnect');
            })
            .catch(() => {});
        }
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
        dispatch(loadPairedDevicesThunk());
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

  // ─── Connection Request: pairing handshake with verification code ─
  useEffect(() => {
    const requestSub = DataSync.addConnectionRequestListener(async (event) => {
      // Check if already paired — auto-accept silently
      const paired = pairedDevices.find(
        (p) =>
          (event.remoteDeviceId && p.id === event.remoteDeviceId) ||
          p.deviceName === event.endpointName,
      );

      if (paired) {
        await DataSync.acceptConnection(event.endpointId);
        addLog(`🔁 Auto-accepted paired device: ${event.endpointName}`);
        return;
      }

      if (event.isIncoming) {
        // Phone B (responder): user must confirm the code and explicitly accept/reject
        Alert.alert(
          'Pairing Request',
          `"${event.endpointName}" wants to pair.\n\nVerification code: ${event.authenticationDigits}\n\nConfirm this code matches on the other device.`,
          [
            {
              text: 'Reject',
              style: 'destructive',
              onPress: () => {
                DataSync.rejectConnection(event.endpointId);
                addLog(`❌ Rejected connection from ${event.endpointName}`);
              },
            },
            {
              text: 'Accept',
              onPress: () => {
                DataSync.acceptConnection(event.endpointId);
                addLog(`✅ Accepted connection from ${event.endpointName}`);
              },
            },
          ],
          { cancelable: false },
        );
      } else {
        // Phone A (initiator): passive — show the code so user can read it aloud to Phone B
        Alert.alert(
          'Connecting…',
          `Connecting to "${event.endpointName}"\n\nVerification code: ${event.authenticationDigits}\n\nConfirm this code appears on the other device.`,
          [{ text: 'OK' }],
        );
      }
    });

    return () => {
      requestSub.remove();
    };
  }, [pairedDevices, addLog]);

  // ─── Auto-reconnect: when paired device is discovered, connect ─
  useEffect(() => {
    if (pairedDevices.length === 0 || discoveredDevices.length === 0) return;

    for (const discovered of discoveredDevices) {
      const isPaired = pairedDevices.some(
        (p) =>
          (discovered.remoteDeviceId && p.id === discovered.remoteDeviceId) ||
          (p.deviceName === discovered.endpointName && p.isPaired),
      );
      const isAlreadyConnected = connectedDevices.some(
        (c) => c.endpointId === discovered.endpointId,
      );
      const isAttempting = autoReconnectRef.current.has(discovered.endpointId);

      if (isPaired && !isAlreadyConnected && !isAttempting && !isConnecting) {
        autoReconnectRef.current.add(discovered.endpointId);
        addLog(`🔁 Auto-reconnecting to ${discovered.endpointName}…`);
        DataSync.getDeviceName().then((name) => {
          dispatch(
            connectToDeviceThunk({
              deviceName: name,
              endpointId: discovered.endpointId,
            }),
          ).finally(() => {
            autoReconnectRef.current.delete(discovered.endpointId);
          });
        });
      }
    }
  }, [pairedDevices, discoveredDevices, connectedDevices, isConnecting, dispatch, addLog]);

  // ─── Auto-start advertising if paired devices exist ─────────
  const hasStartedAutoScan = useRef(false);
  useEffect(() => {
    if (hasStartedAutoScan.current) return;
    if (pairedDevices.length > 0 && connectedDevices.length === 0 && !syncInfo?.isAdvertising) {
      hasStartedAutoScan.current = true;
      addLog('🔁 Paired devices found — auto-starting advertising…');
      handleStartAdvertising();
    }
  }, [pairedDevices, connectedDevices.length, syncInfo?.isAdvertising]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleStartAdvertising = useCallback(async () => {
    dispatch(clearError());
    const granted = await requestNearbyPermissions();
    if (!granted) {
      addLog('⚠️ Permissions denied');
      Alert.alert(
        'Permissions Required',
        'Bluetooth and Nearby permissions are required for advertising.\n\nGo to Settings → Permissions and grant all required permissions.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    try {
      const name = deviceName || (await DataSync.getDeviceName());
      if (!deviceName) setDeviceName(name);
      addLog(`Starting advertising as "${name}"…`);
      const result = await dispatch(startAdvertisingThunk(name));
      if (startAdvertisingThunk.rejected.match(result)) {
        addLog(`❌ Advertising failed: ${result.error.message}`);
      } else {
        setAdvertisingEnabled(true);
        advertisingEnabledRef.current = true;
        addLog('📡 Advertising started');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog(`❌ Error: ${msg}`);
    }
  }, [dispatch, addLog, deviceName]);

  const handleStopAdvertising = useCallback(() => {
    dispatch(stopAdvertisingThunk());
    setAdvertisingEnabled(false);
    advertisingEnabledRef.current = false;
    addLog('📡 Advertising stopped');
  }, [dispatch, addLog]);

  const handleStartDiscovery = useCallback(async () => {
    dispatch(clearError());
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
    try {
      addLog('Starting discovery…');
      const result = await dispatch(startDiscoveryThunk());
      if (startDiscoveryThunk.rejected.match(result)) {
        addLog(`❌ Discovery failed: ${result.error.message}`);
      } else {
        addLog('🔍 Discovery started');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog(`❌ Error: ${msg}`);
    }
  }, [dispatch, addLog]);

  const handleStopDiscovery = useCallback(() => {
    dispatch(stopDiscoveryThunk());
    addLog('🔍 Discovery stopped');
  }, [dispatch, addLog]);

  const handleConnect = useCallback(
    async (endpointId: string, endpointName: string) => {
      addLog(`Connecting to ${endpointName}…`);
      const name = await DataSync.getDeviceName();
      dispatch(connectToDeviceThunk({ deviceName: name, endpointId }));
    },
    [dispatch, addLog],
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

  const handleRemovePaired = useCallback(
    (deviceId: string, deviceName: string) => {
      Alert.alert('Remove Paired Device', `Remove "${deviceName}" from paired devices?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            // Disconnect first if connected, then remove
            const endpoint = connectedDevices.find((c) => c.endpointName === deviceName);
            if (endpoint) {
              dispatch(disconnectDeviceThunk(endpoint.endpointId));
            }
            dispatch(removePairedDeviceThunk(deviceId));
            addLog(`🗑 Removed paired device: ${deviceName}`);
          },
        },
      ]);
    },
    [dispatch, addLog, connectedDevices],
  );

  const handleReconnect = useCallback(
    async (device: DataSync.DeviceRecord) => {
      setIsReconnecting(device.id);
      addLog(`🔁 Reconnecting to ${device.deviceName}…`);
      const granted = await requestNearbyPermissions();
      if (!granted) {
        setIsReconnecting(null);
        addLog('⚠️ Permissions denied');
        return;
      }
      try {
        const name = deviceName || (await DataSync.getDeviceName());
        if (!deviceName) setDeviceName(name);
        // Start advertising + discovery so we can find & be found
        await dispatch(startAdvertisingThunk(name));
        advertisingEnabledRef.current = true;
        setAdvertisingEnabled(true);
        await dispatch(startDiscoveryThunk());
        addLog('📡🔍 Advertising + Discovery started for reconnect');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        addLog(`❌ Reconnect error: ${msg}`);
      } finally {
        // Clear reconnecting state after a delay — auto-reconnect effect
        // will handle the actual connection when the device appears
        setTimeout(() => setIsReconnecting(null), 10000);
      }
    },
    [dispatch, addLog, deviceName],
  );

  // ─── Render helpers ────────────────────────────────────────────

  const hasConnections = connectedDevices.length > 0;

  const getPairedDeviceStatus = useCallback(
    (device: DataSync.DeviceRecord) => {
      // Match by name or by nearbyEndpointId (endpointId is ephemeral per session)
      const connected = connectedDevices.some(
        (c) =>
          c.endpointName === device.deviceName ||
          (device.nearbyEndpointId != null && c.endpointId === device.nearbyEndpointId),
      );
      if (connected) return 'connected';
      const discovering = discoveredDevices.some((d) => d.endpointName === device.deviceName);
      if (discovering) return 'nearby';
      return 'offline';
    },
    [connectedDevices, discoveredDevices],
  );

  // Filter discovered devices that are NOT already paired or connected (avoid duplicates)
  const connectedNames = new Set(connectedDevices.map((c) => c.endpointName));
  const pairedNames = new Set(pairedDevices.map((p) => p.deviceName));
  const unpairedDiscovered = discoveredDevices.filter(
    (d) => !pairedNames.has(d.endpointName) && !connectedNames.has(d.endpointName),
  );

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
        {hasConnections ? (
          <View style={[styles.statusBadge, styles.badgeConnected]}>
            <Text style={styles.badgeText}>🟢 {connectedDevices.length} Connected</Text>
          </View>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => dispatch(clearError())}>
            <Text style={styles.errorDismiss}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── Advertising (Visibility) ── */}
      <View style={[styles.section, syncInfo?.isAdvertising && styles.sectionActive]}>
        <Text style={styles.sectionTitle}>📡 Advertising (Visibility)</Text>
        {hasConnections ? (
          <Text style={styles.advertisingPaused}>
            Paused — connected to {connectedDevices[0].endpointName}
          </Text>
        ) : (
          <>
            <View style={styles.advertisingToggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  syncInfo?.isAdvertising ? styles.toggleButtonActive : styles.toggleButtonInactive,
                ]}
                onPress={syncInfo?.isAdvertising ? handleStopAdvertising : handleStartAdvertising}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    syncInfo?.isAdvertising
                      ? styles.toggleButtonTextActive
                      : styles.toggleButtonTextInactive,
                  ]}
                >
                  {syncInfo?.isAdvertising ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>
            {deviceName ? (
              <Text style={styles.deviceNameLabel}>My phone is: {deviceName}</Text>
            ) : null}
          </>
        )}
      </View>

      {/* ── Discovery (Search) ── */}
      {!hasConnections ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Search for Devices</Text>
          <View style={styles.buttonRow}>
            {isScanning ? (
              <TouchableOpacity
                style={[styles.button, styles.stopButton]}
                onPress={handleStopDiscovery}
              >
                <Text style={styles.buttonText}>Stop Searching</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.button} onPress={handleStartDiscovery}>
                <Text style={styles.buttonText}>Search for Devices</Text>
              </TouchableOpacity>
            )}
          </View>
          {isScanning ? <ActivityIndicator style={styles.spinner} /> : null}
        </View>
      ) : null}

      {/* ── Paired Devices (persisted) ── */}
      {pairedDevices.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Paired Devices</Text>
          {pairedDevices.map((device) => {
            const status = getPairedDeviceStatus(device);
            const isThisReconnecting = isReconnecting === device.id;
            return (
              <View key={device.id} style={styles.pairedItem}>
                <View style={styles.pairedInfo}>
                  <View style={styles.pairedNameRow}>
                    <View
                      style={[
                        styles.statusDot,
                        status === 'connected'
                          ? styles.dotConnected
                          : status === 'nearby'
                            ? styles.dotNearby
                            : styles.dotOffline,
                      ]}
                    />
                    <Text style={styles.pairedName}>{device.deviceName}</Text>
                  </View>
                  <Text style={styles.pairedStatus}>
                    {status === 'connected'
                      ? 'Connected'
                      : status === 'nearby'
                        ? 'Nearby — reconnecting…'
                        : isThisReconnecting
                          ? 'Searching…'
                          : 'Disconnected'}
                  </Text>
                </View>
                <View style={styles.pairedActions}>
                  {status === 'connected' ? (
                    <TouchableOpacity
                      style={styles.disconnectButton}
                      onPress={() => {
                        const endpoint = connectedDevices.find(
                          (c) =>
                            c.endpointName === device.deviceName ||
                            (device.nearbyEndpointId != null &&
                              c.endpointId === device.nearbyEndpointId),
                        );
                        if (endpoint) {
                          handleDisconnect(endpoint.endpointId, endpoint.endpointName);
                        }
                      }}
                    >
                      <Text style={styles.disconnectButtonText}>Disconnect</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      {status === 'offline' ? (
                        <TouchableOpacity
                          style={[
                            styles.reconnectButton,
                            isThisReconnecting && styles.reconnectButtonDisabled,
                          ]}
                          onPress={() => handleReconnect(device)}
                          disabled={isThisReconnecting}
                        >
                          {isThisReconnecting ? (
                            <ActivityIndicator size="small" color="#007AFF" />
                          ) : (
                            <Text style={styles.reconnectButtonText}>Reconnect</Text>
                          )}
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemovePaired(device.id, device.deviceName)}
                      >
                        <Text style={styles.removeButtonText}>Remove</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* ── Sync controls (when connected) ── */}
      {hasConnections ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔄 Sync</Text>
            {connectedDevices.length > 1 ? (
              <TouchableOpacity onPress={handleDisconnectAll}>
                <Text style={styles.disconnectAllText}>Disconnect All</Text>
              </TouchableOpacity>
            ) : null}
          </View>

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

          {/* Sync button */}
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

      {/* ── Discovered devices (unpaired only) ── */}
      <Text style={styles.sectionTitle}>Nearby Devices ({unpairedDiscovered.length})</Text>
      <FlatList
        data={unpairedDiscovered}
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
              ? 'Searching for nearby devices…'
              : hasConnections
                ? 'Connected — search paused.'
                : 'Tap "Search for Devices" to find nearby FitSync tablets.'}
          </Text>
        }
        ListFooterComponent={
          <View>
            {/* Debug log toggle */}
            <TouchableOpacity
              style={styles.debugToggle}
              onPress={() => setShowDebugLog((prev) => !prev)}
            >
              <Text style={styles.debugToggleText}>
                {showDebugLog ? '▼ Hide Debug Log' : '▶ Show Debug Log'}
              </Text>
            </TouchableOpacity>
            {showDebugLog ? (
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
            ) : null}
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
  badgeConnected: {
    backgroundColor: '#d4edda',
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
  sectionActive: {
    borderWidth: 1,
    borderColor: '#34c759',
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
  pairedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  pairedInfo: {
    flex: 1,
  },
  pairedNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pairedName: {
    fontSize: 15,
    fontWeight: '600',
  },
  pairedStatus: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
    marginLeft: 20,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotConnected: {
    backgroundColor: '#34c759',
  },
  dotNearby: {
    backgroundColor: '#f0ad4e',
  },
  dotOffline: {
    backgroundColor: '#ccc',
  },
  pairedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reconnectButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 80,
    alignItems: 'center',
  },
  reconnectButtonDisabled: {
    borderColor: '#ccc',
  },
  reconnectButtonText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  removeButtonText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
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
  advertisingToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  toggleButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleButtonActive: {
    backgroundColor: '#34c759',
    borderColor: '#34c759',
  },
  toggleButtonInactive: {
    backgroundColor: '#f8f8f8',
    borderColor: '#ccc',
  },
  toggleButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  toggleButtonTextInactive: {
    color: '#666',
  },
  advertisingPaused: {
    color: '#999',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
  deviceNameLabel: {
    color: '#666',
    fontSize: 13,
    marginTop: 8,
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
  debugToggle: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  debugToggleText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
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
