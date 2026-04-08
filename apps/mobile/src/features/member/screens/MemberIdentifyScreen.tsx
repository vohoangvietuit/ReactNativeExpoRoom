import React, { useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNfcReader } from '@xpw2/nfc';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import { clearSelectedMember, identifyMemberByNfcThunk } from '../store/memberSlice';

export default function MemberIdentifyScreen() {
  const dispatch = useAppDispatch();
  const { selectedMember } = useAppSelector((s) => s.member);
  const activeSession = useAppSelector((s) => s.session.activeSession);
  const { status, isScanning, lastResult, scanForMemberCard, cancel } = useNfcReader();

  // Log whenever selectedMember changes (identify result)
  useEffect(() => {
    if (selectedMember) {
      console.log('[IdentifyMember] Member resolved from NFC:', {
        id: selectedMember.id,
        name: selectedMember.name,
        email: selectedMember.email,
        nfcCardId: selectedMember.nfcCardId,
        currentWeight: selectedMember.currentWeight,
        membershipNumber: selectedMember.membershipNumber,
      });
    }
  }, [selectedMember]);

  const handleScan = useCallback(async () => {
    console.log('[IdentifyMember] Starting NFC scan...');
    const result = await scanForMemberCard();
    console.log('[IdentifyMember] Scan result:', JSON.stringify(result, null, 2));

    if (result.success) {
      // Prefer physical tag UID for lookup — falls back to NDEF memberId if no tagId
      const lookupKey = result.tagId ?? result.card?.memberId;
      console.log('[IdentifyMember] Looking up member by NFC key:', lookupKey, '(source: tagId)');
      if (lookupKey) {
        const sessionId = activeSession?.id ?? 'test-session';
        dispatch(identifyMemberByNfcThunk({ nfcCardId: lookupKey, sessionId }));
      } else {
        console.warn('[IdentifyMember] Scan succeeded but no tag ID or memberId found in result');
      }
    } else {
      console.warn('[IdentifyMember] Scan failed:', result.error);
    }
  }, [scanForMemberCard, dispatch, activeSession]);

  if (!activeSession) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Member Identify</Text>
        <View style={styles.noSession}>
          <Text style={styles.noSessionText}>No active session.</Text>
          <Text style={styles.noSessionHint}>Go to the Session tab to start one.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Member Identify</Text>

      <View style={styles.nfcStatus}>
        <Text style={styles.statusText}>
          NFC: {status.isSupported ? (status.isEnabled ? 'Ready' : 'Disabled') : 'Not Supported'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.scanButton, isScanning && styles.scanningButton]}
        onPress={isScanning ? cancel : handleScan}
        disabled={!status.isEnabled}
        accessibilityLabel={isScanning ? 'Cancel NFC scan' : 'Scan NFC card'}
      >
        {isScanning ? (
          <>
            <ActivityIndicator color="#fff" />
            <Text style={styles.scanButtonText}>Scanning... Tap to Cancel</Text>
          </>
        ) : (
          <Text style={styles.scanButtonText}>Scan NFC Card</Text>
        )}
      </TouchableOpacity>

      {lastResult && !lastResult.success ? (
        <Text style={styles.error}>{lastResult.error}</Text>
      ) : null}

      {lastResult && lastResult.success && !selectedMember ? (
        <View style={styles.notFoundCard}>
          <Text style={styles.notFoundText}>⚠️ Tag scanned but no matching member found.</Text>
          <Text style={styles.notFoundHint}>
            Tag UID: {lastResult.tagId ?? 'unknown'}
          </Text>
          <Text style={styles.notFoundHint}>Register this NFC card first.</Text>
        </View>
      ) : null}

      {selectedMember ? (
        <View style={styles.memberCard}>
          <View style={styles.memberCardHeader}>
            <Text style={styles.memberName}>{selectedMember.name}</Text>
            <TouchableOpacity
              onPress={() => {
                console.log('[IdentifyMember] Clearing selected member');
                dispatch(clearSelectedMember());
              }}
              accessibilityLabel="Clear member"
            >
              <Text style={styles.clearButton}>✕ Clear</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.memberDetail}>🪪 ID: {selectedMember.id}</Text>
          {selectedMember.email ? (
            <Text style={styles.memberDetail}>📧 Email: {selectedMember.email}</Text>
          ) : null}
          {selectedMember.phone ? (
            <Text style={styles.memberDetail}>📱 Phone: {selectedMember.phone}</Text>
          ) : null}
          {selectedMember.membershipNumber ? (
            <Text style={styles.memberDetail}>🏷️ Membership: {selectedMember.membershipNumber}</Text>
          ) : null}
          {selectedMember.currentWeight ? (
            <Text style={styles.memberDetail}>⚖️ Last Weight: {selectedMember.currentWeight} kg</Text>
          ) : null}
          {selectedMember.nfcCardId ? (
            <Text style={styles.memberDetail}>📳 NFC UID: {selectedMember.nfcCardId}</Text>
          ) : null}
        </View>
      ) : null}
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
    marginBottom: 16,
  },
  nfcStatus: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  scanButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  scanningButton: {
    backgroundColor: '#ff9500',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 12,
  },
  memberCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  memberCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  memberName: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  clearButton: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
    paddingLeft: 8,
  },
  memberDetail: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  notFoundCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  notFoundText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  notFoundHint: {
    fontSize: 12,
    color: '#856404',
    fontFamily: 'monospace',
  },
  noSession: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  noSessionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  noSessionHint: {
    fontSize: 14,
    color: '#888',
  },
});
