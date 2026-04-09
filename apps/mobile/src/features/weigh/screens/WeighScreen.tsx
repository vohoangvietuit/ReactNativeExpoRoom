import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useScaleWeight } from '@xpw2/ble-scale';
import * as DataSync from '@xpw2/datasync';
import { useAppSelector } from '../../../hooks/useStore';

export default function WeighScreen() {
  const activeSession = useAppSelector((s) => s.session.activeSession);
  const selectedMember = useAppSelector((s) => s.member.selectedMember);
  const {
    isScanning,
    isConnected,
    discoveredScales,
    connectedDevice,
    lastReading,
    startScan,
    stopScan,
    connect,
    disconnect,
  } = useScaleWeight();

  const [manualWeight, setManualWeight] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSaveWeight = useCallback(
    async (weight: number, source: 'manual' | 'scale', scaleDeviceId?: string) => {
      if (!selectedMember) return;
      const sessionId = activeSession?.id ?? 'test-session';
      await DataSync.recordEvent(
        'WeightRecorded',
        {
          recordId: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`,
          memberId: selectedMember.id,
          weight,
          source,
          scaleDeviceId,
        },
        sessionId,
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    [selectedMember, activeSession]
  );

  const handleManualSave = useCallback(() => {
    const w = parseFloat(manualWeight);
    if (isNaN(w) || w <= 0) return;
    handleSaveWeight(w, 'manual');
    setManualWeight('');
  }, [manualWeight, handleSaveWeight]);

  const handleScaleSave = useCallback(() => {
    if (!lastReading) return;
    handleSaveWeight(lastReading.weight, 'scale', lastReading.deviceId);
  }, [lastReading, handleSaveWeight]);

  // DEV TESTING: Session guard removed — uses 'test-session' fallback via handleSaveWeight.
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Weigh</Text>

      {selectedMember ? (
        <Text style={styles.memberName}>Member: {selectedMember.name}</Text>
      ) : (
        <Text style={styles.warning}>No member selected. Identify a member first.</Text>
      )}

      {/* Scale Reading */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BLE Scale</Text>

        {isConnected && connectedDevice ? (
          <View style={styles.connectedBox}>
            <Text style={styles.connectedText}>Connected: {connectedDevice.name}</Text>
            <TouchableOpacity onPress={disconnect}>
              <Text style={styles.disconnectText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={isScanning ? stopScan : () => startScan()}
          >
            <Text style={styles.buttonText}>{isScanning ? 'Stop Scan' : 'Scan for Scales'}</Text>
          </TouchableOpacity>
        )}

        {discoveredScales.map((scale) => (
          <TouchableOpacity
            key={scale.id}
            style={styles.scaleItem}
            onPress={() => connect(scale.id)}
          >
            <Text style={styles.scaleName}>{scale.name}</Text>
            <Text style={styles.scaleRssi}>RSSI: {scale.rssi}</Text>
          </TouchableOpacity>
        ))}

        {lastReading ? (
          <View style={styles.readingBox}>
            <Text style={styles.readingWeight}>{lastReading.weight} {lastReading.unit}</Text>
            <Text style={styles.readingStable}>
              {lastReading.stable ? 'Stable' : 'Unstable'}
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleScaleSave}
              disabled={!selectedMember}
            >
              <Text style={styles.buttonText}>Save Scale Reading</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* Manual Entry */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manual Entry</Text>
        <View style={styles.manualRow}>
          <TextInput
            style={styles.weightInput}
            placeholder="Weight (kg)"
            value={manualWeight}
            onChangeText={setManualWeight}
            keyboardType="decimal-pad"
            accessibilityLabel="Manual weight input"
          />
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleManualSave}
            disabled={!selectedMember}
          >
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      {saved ? <Text style={styles.savedText}>Weight saved!</Text> : null}
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
    marginBottom: 8,
  },
  memberName: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 16,
  },
  warning: {
    color: '#ff9500',
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  connectedBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  connectedText: {
    color: '#155724',
    fontWeight: '600',
  },
  disconnectText: {
    color: '#ff3b30',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#34c759',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scaleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  scaleName: {
    fontWeight: '600',
  },
  scaleRssi: {
    color: '#999',
  },
  readingBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  readingWeight: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  readingStable: {
    fontSize: 14,
    color: '#34c759',
    marginBottom: 12,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 8,
  },
  weightInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  savedText: {
    color: '#34c759',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});
