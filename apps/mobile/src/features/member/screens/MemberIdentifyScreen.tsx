import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNfcReader } from '@xpw2/nfc';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import { identifyMemberByNfcThunk } from '../store/memberSlice';

export default function MemberIdentifyScreen() {
  const dispatch = useAppDispatch();
  const { selectedMember } = useAppSelector((s) => s.member);
  const activeSession = useAppSelector((s) => s.session.activeSession);
  const { status, isScanning, lastResult, scanForMemberCard, cancel } = useNfcReader();

  const handleScan = useCallback(async () => {
    const result = await scanForMemberCard();
    if (result.success && result.card) {
      const sessionId = activeSession?.id ?? 'test-session';
      dispatch(identifyMemberByNfcThunk({ nfcCardId: result.card.memberId, sessionId }));
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

      {selectedMember ? (
        <View style={styles.memberCard}>
          <Text style={styles.memberName}>{selectedMember.name}</Text>
          <Text style={styles.memberDetail}>ID: {selectedMember.id}</Text>
          {selectedMember.email ? (
            <Text style={styles.memberDetail}>Email: {selectedMember.email}</Text>
          ) : null}
          {selectedMember.currentWeight ? (
            <Text style={styles.memberDetail}>Weight: {selectedMember.currentWeight} kg</Text>
          ) : null}
          {selectedMember.membershipNumber ? (
            <Text style={styles.memberDetail}>Membership: {selectedMember.membershipNumber}</Text>
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
  memberName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  memberDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
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
