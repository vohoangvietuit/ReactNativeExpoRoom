import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import { useScaleWeight } from '@fitsync/ble-scale';
import * as DataSync from '@fitsync/datasync';
import { useAppSelector } from '../../../hooks/useStore';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

export default function WeighScreen() {
  // const activeSession = useAppSelector((s) => s.session.activeSession); // SESSION DISABLED
  const selectedMember = useAppSelector((s) => s.member.selectedMember);
  const {
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
  } = useScaleWeight();

  const [manualWeight, setManualWeight] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSaveWeight = useCallback(
    async (weight: number, source: 'manual' | 'scale', scaleDeviceId?: string) => {
      if (!selectedMember) return;
      const sessionId = 'no-session'; // SESSION DISABLED — replace with activeSession?.id when re-enabled
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
    [selectedMember],
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
          <View style={styles.scanButtonRow}>
            <TouchableOpacity
              style={[styles.button, styles.scanButton]}
              onPress={isScanning ? stopScan : () => startScan()}
            >
              <Text style={styles.buttonText}>{isScanning ? 'Stop Scan' : 'Scan Scales Only'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.scanAllButton]}
              onPress={isScanning ? stopScan : () => startScanAll()}
            >
              <Text style={styles.buttonText}>{isScanning ? 'Stop' : 'Scan All BLE'}</Text>
            </TouchableOpacity>
          </View>
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
            <Text style={styles.readingWeight}>
              {lastReading.weight} {lastReading.unit}
            </Text>
            <Text style={styles.readingStable}>{lastReading.stable ? 'Stable' : 'Unstable'}</Text>
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

      {/* DEV: Raw BLE device log — shown when startScanAll was used */}
      {allRawDevices.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Raw BLE Devices Found ({allRawDevices.length})</Text>
          <View style={styles.rawLogCard}>
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator
              style={styles.rawLogScroll}
            >
              <Text style={styles.rawLogText} selectable>
                {JSON.stringify(allRawDevices, null, 2)}
              </Text>
            </ScrollView>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.surface,
  },
  content: {
    padding: Spacing.three,
    paddingBottom: 40,
  },
  header: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
    marginBottom: Spacing.two,
  },
  memberName: {
    fontSize: FontSize.base,
    color: Colors.light.primary,
    marginBottom: Spacing.three,
  },
  warning: {
    color: Colors.light.warning,
    marginBottom: Spacing.three,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    marginBottom: Spacing.two,
  },
  connectedBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.successLight,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.two,
  },
  connectedText: {
    color: Colors.light.successDark,
    fontWeight: '600',
  },
  disconnectText: {
    color: Colors.light.danger,
  },
  button: {
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.md,
    padding: 14,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: Colors.light.success,
  },
  buttonText: {
    color: Colors.light.textOnPrimary,
    fontSize: FontSize.base,
    fontWeight: '600',
  },
  scaleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.card,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.two,
  },
  scaleName: {
    fontWeight: '600',
  },
  scaleRssi: {
    color: Colors.light.textMuted,
  },
  readingBox: {
    backgroundColor: Colors.light.card,
    padding: Spacing.three,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.three,
    alignItems: 'center',
  },
  readingWeight: {
    fontSize: FontSize.hero,
    fontWeight: 'bold',
  },
  readingStable: {
    fontSize: FontSize.body,
    color: Colors.light.success,
    marginBottom: Spacing.three,
  },
  manualRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  weightInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
    backgroundColor: Colors.light.card,
    fontSize: FontSize.base,
  },
  savedText: {
    color: Colors.light.success,
    textAlign: 'center',
    fontSize: FontSize.base,
    fontWeight: '600',
  },
  scanButtonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  scanButton: {
    flex: 1,
    backgroundColor: Colors.light.primary,
  },
  scanAllButton: {
    flex: 1,
    backgroundColor: Colors.light.purple,
  },
  rawLogCard: {
    backgroundColor: Colors.light.darkPanel,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
  },
  rawLogScroll: {
    maxHeight: 400,
  },
  rawLogText: {
    color: Colors.light.teal,
    fontFamily: 'monospace',
    fontSize: FontSize.xs,
    lineHeight: 17,
  },
});
