import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useNfcReader } from '@fitsync/nfc';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

// DEV TESTING: Dedicated NFC scan test screen.
// Shows raw JSON result on-screen after every scan attempt.
export default function NfcTestTab() {
  const { status, isScanning, scanTagId, cancel } = useNfcReader();
  const [scanLog, setScanLog] = useState<string | null>(null);
  const [scanTime, setScanTime] = useState<string | null>(null);

  const handleScanTagId = useCallback(async () => {
    if (!status.isEnabled) {
      Alert.alert('NFC is Disabled', 'Turn on NFC in device settings to scan tags.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => Linking.sendIntent('android.settings.NFC_SETTINGS'),
        },
      ]);
      return;
    }
    setScanLog(null);
    const result = await scanTagId();
    setScanTime(new Date().toISOString());
    setScanLog(JSON.stringify(result, null, 2));
    console.log('[NfcTest] Tag ID scan:', JSON.stringify(result));
  }, [scanTagId, status.isEnabled]);

  const handleClear = useCallback(() => {
    setScanLog(null);
    setScanTime(null);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>NFC Test</Text>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>NFC Supported:</Text>
        <Text style={[styles.statusValue, status.isSupported ? styles.ok : styles.err]}>
          {status.isSupported ? 'YES' : 'NO'}
        </Text>
        <Text style={styles.statusLabel}>NFC Enabled:</Text>
        <Text style={[styles.statusValue, status.isEnabled ? styles.ok : styles.err]}>
          {status.isEnabled ? 'YES' : 'NO'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.scanButton, isScanning && styles.scanningButton]}
        onPress={isScanning ? cancel : handleScanTagId}
        accessibilityLabel={isScanning ? 'Cancel NFC scan' : 'Scan NFC tag ID'}
      >
        {isScanning ? (
          <View style={styles.scanningRow}>
            <ActivityIndicator color={Colors.light.textOnPrimary} />
            <Text style={styles.scanButtonText}> Scanning... Tap to Cancel</Text>
          </View>
        ) : (
          <Text style={styles.scanButtonText}>📳 Scan Tag ID</Text>
        )}
      </TouchableOpacity>

      {scanLog ? (
        <View style={styles.logCard}>
          <View style={styles.logHeader}>
            <Text style={styles.logTitle}>Scan Result</Text>
            <Text style={styles.logTime}>{scanTime}</Text>
            <TouchableOpacity onPress={handleClear} accessibilityLabel="Clear log">
              <Text style={styles.clearButton}>✕ Clear</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.logScroll} nestedScrollEnabled showsVerticalScrollIndicator>
            <Text style={styles.logText} selectable>
              {scanLog}
            </Text>
          </ScrollView>
        </View>
      ) : (
        <View style={styles.emptyLog}>
          <Text style={styles.emptyLogText}>Tap "Scan Tag ID" to see raw result here.</Text>
        </View>
      )}
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
  },
  header: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
    marginBottom: Spacing.three,
  },
  statusCard: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: Spacing.three,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: FontSize.body,
    color: Colors.light.textTertiary,
  },
  statusValue: {
    fontSize: FontSize.body,
    fontWeight: '700',
    marginRight: 12,
  },
  ok: { color: Colors.light.success },
  err: { color: Colors.light.danger },
  scanButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  scanningButton: {
    backgroundColor: Colors.light.warning,
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanButtonText: {
    color: Colors.light.textOnPrimary,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  logCard: {
    backgroundColor: Colors.light.darkPanel,
    borderRadius: BorderRadius.lg,
    padding: 12,
    marginBottom: Spacing.three,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  logTitle: {
    color: Colors.light.textOnPrimary,
    fontWeight: '700',
    fontSize: FontSize.body,
    flex: 1,
  },
  logTime: {
    color: Colors.light.textMuted,
    fontSize: FontSize.xs,
  },
  clearButton: {
    color: Colors.light.danger,
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
  logScroll: {
    maxHeight: 400,
  },
  logText: {
    color: Colors.light.teal,
    fontFamily: 'monospace',
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  emptyLog: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.four,
    alignItems: 'center',
  },
  emptyLogText: {
    color: Colors.light.textMuted,
    textAlign: 'center',
    fontSize: FontSize.body,
  },
});
