import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useNfcReader } from '@fitsync/nfc';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import { clearSelectedMember, identifyMemberByNfcThunk } from '../store/memberSlice';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

export default function MemberIdentifyScreen() {
  const dispatch = useAppDispatch();
  const { selectedMember, isIdentifyLoading, identifyError } = useAppSelector((s) => s.member);
  // const activeSession = useAppSelector((s) => s.session.activeSession); // SESSION DISABLED
  const { status, isScanning, scanTagId, cancel } = useNfcReader();
  const [lastTagId, setLastTagId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedMember) {
      console.log('[IdentifyMember] Member resolved from NFC:', {
        id: selectedMember.id,
        name: selectedMember.name,
        nfcCardId: selectedMember.nfcCardId,
      });
    }
  }, [selectedMember]);

  const handleScan = useCallback(async () => {
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

    setScanError(null);
    setLastTagId(null);
    dispatch(clearSelectedMember());

    console.log('[IdentifyMember] Starting NFC tag scan...');
    const result = await scanTagId();
    console.log('[IdentifyMember] Scan result:', JSON.stringify(result));

    if (result.success && result.tagId) {
      setLastTagId(result.tagId);
      const sessionId = 'no-session'; // SESSION DISABLED — replace with activeSession?.id when re-enabled
      console.log('[IdentifyMember] Looking up member by tagId:', result.tagId);
      dispatch(identifyMemberByNfcThunk({ nfcCardId: result.tagId, sessionId }));
    } else {
      setScanError(result.error ?? 'Scan failed');
    }
  }, [scanTagId, dispatch, status.isEnabled]);

  // SESSION DISABLED — early return guard removed; screen always renders
  // if (!activeSession) {
  //   return (
  //     <ScrollView style={styles.container} contentContainerStyle={styles.content}>
  //       <Text style={styles.header}>Member Identify</Text>
  //       <View style={styles.notFoundCard}>
  //         <Text style={styles.notFoundText}>No active session.</Text>
  //         <Text style={styles.notFoundHint}>Go to the Session tab to start one.</Text>
  //       </View>
  //     </ScrollView>
  //   );
  // }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Member Identify</Text>

      <View style={styles.nfcStatus}>
        <Text style={styles.statusText}>
          NFC:{' '}
          {status.isSupported
            ? status.isEnabled
              ? '✅ Ready'
              : '⚠️ Disabled'
            : '❌ Not Supported'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.scanButton, isScanning && styles.scanningButton]}
        onPress={isScanning ? cancel : handleScan}
        accessibilityLabel={isScanning ? 'Cancel NFC scan' : 'Scan NFC card'}
      >
        {isScanning ? (
          <>
            <ActivityIndicator color={Colors.light.textOnPrimary} />
            <Text style={styles.scanButtonText}>Scanning... Tap to Cancel</Text>
          </>
        ) : (
          <Text style={styles.scanButtonText}>📳 Scan NFC Card</Text>
        )}
      </TouchableOpacity>

      {scanError ? <Text style={styles.error}>{scanError}</Text> : null}
      {identifyError ? <Text style={styles.error}>{identifyError}</Text> : null}

      {isIdentifyLoading ? (
        <View style={styles.notFoundCard}>
          <ActivityIndicator />
          <Text style={styles.notFoundHint}>Looking up member…</Text>
        </View>
      ) : null}

      {lastTagId && !isIdentifyLoading && !selectedMember ? (
        <View style={styles.notFoundCard}>
          <Text style={styles.notFoundText}>⚠️ No matching member found.</Text>
          <Text style={styles.notFoundHint}>Tag UID: {lastTagId}</Text>
          <Text style={styles.notFoundHint}>Register this NFC card first.</Text>
        </View>
      ) : null}

      {selectedMember ? (
        <View style={styles.memberCard}>
          <View style={styles.memberCardHeader}>
            <Text style={styles.memberName}>{selectedMember.name}</Text>
            <TouchableOpacity
              onPress={() => {
                dispatch(clearSelectedMember());
                setLastTagId(null);
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
            <Text style={styles.memberDetail}>
              🏷️ Membership: {selectedMember.membershipNumber}
            </Text>
          ) : null}
          {selectedMember.currentWeight ? (
            <Text style={styles.memberDetail}>
              ⚖️ Last Weight: {selectedMember.currentWeight} kg
            </Text>
          ) : null}
          {selectedMember.nfcCardId ? (
            <Text style={styles.memberDetail}>📳 NFC UID: {selectedMember.nfcCardId}</Text>
          ) : null}
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
  },
  header: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
    marginBottom: Spacing.three,
  },
  nfcStatus: {
    backgroundColor: Colors.light.card,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.three,
  },
  statusText: {
    fontSize: FontSize.body,
    color: Colors.light.textTertiary,
  },
  noSessionBadge: {
    fontSize: FontSize.sm,
    color: Colors.light.warningDark,
    marginTop: Spacing.one,
  },
  scanButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.lg,
    padding: 20,
    alignItems: 'center',
    marginBottom: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  scanningButton: {
    backgroundColor: Colors.light.warning,
  },
  scanButtonText: {
    color: Colors.light.textOnPrimary,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  error: {
    color: Colors.light.danger,
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  memberCard: {
    backgroundColor: Colors.light.card,
    padding: Spacing.three,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.primary,
  },
  memberCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.two,
  },
  memberName: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    flex: 1,
  },
  clearButton: {
    fontSize: FontSize.caption,
    color: Colors.light.textMuted,
    fontWeight: '600',
    paddingLeft: Spacing.two,
  },
  memberDetail: {
    fontSize: FontSize.body,
    color: Colors.light.textTertiary,
    marginBottom: Spacing.one,
  },
  notFoundCard: {
    backgroundColor: Colors.light.warningLight,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: Spacing.three,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.warningAccent,
  },
  notFoundText: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.light.warningDark,
    marginBottom: Spacing.one,
  },
  notFoundHint: {
    fontSize: FontSize.sm,
    color: Colors.light.warningDark,
    fontFamily: 'monospace',
  },
});
