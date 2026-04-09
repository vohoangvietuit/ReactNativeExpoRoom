import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNfcReader } from '@xpw2/nfc';

// DEV TESTING: Dedicated NFC scan test screen.
// Shows raw JSON result on-screen after every scan attempt.
export default function NfcTestTab() {
  const { status, isScanning, scanForMemberCard, cancel } = useNfcReader();
  const [scanLog, setScanLog] = useState<string | null>(null);
  const [scanTime, setScanTime] = useState<string | null>(null);

  const handleScan = useCallback(async () => {
    setScanLog(null);
    const result = await scanForMemberCard();
    setScanTime(new Date().toISOString());
    setScanLog(JSON.stringify(result, null, 2));
    console.log('[NfcTest] Scan result:', JSON.stringify(result, null, 2));
  }, [scanForMemberCard]);

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
        onPress={isScanning ? cancel : handleScan}
        disabled={!status.isEnabled && !isScanning}
        accessibilityLabel={isScanning ? 'Cancel NFC scan' : 'Scan NFC tag'}
      >
        {isScanning ? (
          <View style={styles.scanningRow}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.scanButtonText}> Scanning... Tap to Cancel</Text>
          </View>
        ) : (
          <Text style={styles.scanButtonText}>📳 Scan NFC Tag</Text>
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
          <ScrollView
            style={styles.logScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            <Text style={styles.logText} selectable>
              {scanLog}
            </Text>
          </ScrollView>
        </View>
      ) : (
        <View style={styles.emptyLog}>
          <Text style={styles.emptyLogText}>Tap "Scan NFC Tag" to see raw JSON result here.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#555',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 12,
  },
  ok: { color: '#28a745' },
  err: { color: '#dc3545' },
  scanButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  scanningButton: {
    backgroundColor: '#ff9500',
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  logCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  logTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
  },
  logTime: {
    color: '#aaa',
    fontSize: 11,
  },
  clearButton: {
    color: '#ff6b6b',
    fontSize: 13,
    fontWeight: '600',
  },
  logScroll: {
    maxHeight: 400,
  },
  logText: {
    color: '#4ec9b0',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  emptyLog: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
  },
  emptyLogText: {
    color: '#999',
    textAlign: 'center',
    fontSize: 14,
  },
});

