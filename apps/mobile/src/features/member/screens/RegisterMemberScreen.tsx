import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNfcReader } from '@fitsync/nfc';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import { registerMemberThunk } from '../store/memberSlice';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

export default function RegisterMemberScreen() {
  const dispatch = useAppDispatch();
  // const activeSession = useAppSelector((s) => s.session.activeSession); // SESSION DISABLED
  const { isRegisterLoading, registerError } = useAppSelector((s) => s.member);
  const { status, isScanning, readTagId, cancel } = useNfcReader();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [membershipNumber, setMembershipNumber] = useState('');
  const [scannedTagId, setScannedTagId] = useState<string | null>(null);
  const [registeredMemberId, setRegisteredMemberId] = useState<string | null>(null);

  const handleScanNfc = useCallback(async () => {
    console.log('[RegisterMember] Starting NFC tag scan for card UID...');
    const tagId = await readTagId();
    console.log('[RegisterMember] NFC scan result — tagId:', tagId);
    if (tagId) {
      setScannedTagId(tagId);
      console.log('[RegisterMember] Tag UID captured:', tagId);
    } else {
      console.warn('[RegisterMember] NFC scan returned no tag ID');
      Alert.alert('NFC Scan Failed', 'No tag detected. Hold the card closer and try again.');
    }
  }, [readTagId]);

  const handleRegister = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required.');
      return;
    }
    const sessionId = 'no-session'; // SESSION DISABLED — replace with activeSession?.id when re-enabled
    console.log('[RegisterMember] Submitting registration form:', {
      name: name.trim(),
      email: email.trim() || '(none)',
      phone: phone.trim() || '(none)',
      membershipNumber: membershipNumber.trim() || '(none)',
      nfcCardId: scannedTagId ?? '(none)',
      sessionId,
    });
    const result = await dispatch(
      registerMemberThunk({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        membershipNumber: membershipNumber.trim() || undefined,
        nfcCardId: scannedTagId ?? undefined,
        sessionId,
      }),
    );
    if (registerMemberThunk.fulfilled.match(result)) {
      console.log('[RegisterMember] Registration fulfilled:', result.payload);
      setRegisteredMemberId(result.payload.memberId);
    } else {
      console.error('[RegisterMember] Registration rejected:', result.error);
    }
  }, [name, email, phone, membershipNumber, scannedTagId, dispatch]);

  const handleReset = useCallback(() => {
    console.log('[RegisterMember] Form reset for new registration');
    setName('');
    setEmail('');
    setPhone('');
    setMembershipNumber('');
    setScannedTagId(null);
    setRegisteredMemberId(null);
  }, []);

  // ── Success view ──────────────────────────────────────────────────────
  if (registeredMemberId) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Member Registered!</Text>
        <Text style={styles.successId}>ID: {registeredMemberId}</Text>
        {scannedTagId ? (
          <Text style={styles.successNfc}>NFC Card UID: {scannedTagId}</Text>
        ) : (
          <Text style={styles.successNfc}>No NFC card linked</Text>
        )}
        <TouchableOpacity style={styles.primaryButton} onPress={handleReset}>
          <Text style={styles.primaryButtonText}>Register Another</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Registration form ─────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* SESSION DISABLED — no-session warning banner hidden */}
      {/* {!activeSession && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ No active session — start a session first for proper event tracking.
          </Text>
        </View>
      )} */}

      {/* ── Personal details ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Member Details</Text>

        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          autoCapitalize="words"
          returnKeyType="next"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 234 567 8900"
          keyboardType="phone-pad"
          returnKeyType="next"
        />

        <Text style={styles.label}>Membership Number</Text>
        <TextInput
          style={styles.input}
          value={membershipNumber}
          onChangeText={setMembershipNumber}
          placeholder="XPW-00123"
          autoCapitalize="characters"
          returnKeyType="done"
        />
      </View>

      {/* ── NFC card ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>NFC Card (Optional)</Text>
        <Text style={styles.nfcStatusText}>
          NFC:{' '}
          {status.isSupported
            ? status.isEnabled
              ? '✅ Ready'
              : '⚠️ Disabled — enable NFC in device settings'
            : '❌ Not supported on this device'}
        </Text>

        {scannedTagId ? (
          <View style={styles.tagCard}>
            <View>
              <Text style={styles.tagLabel}>Card UID:</Text>
              <Text style={styles.tagValue}>{scannedTagId}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                console.log('[RegisterMember] NFC tag removed from form, was:', scannedTagId);
                setScannedTagId(null);
              }}
              accessibilityLabel="Remove NFC card"
            >
              <Text style={styles.removeTag}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.nfcButton,
              (!status.isEnabled || isScanning) && styles.nfcButtonDisabled,
            ]}
            onPress={isScanning ? cancel : handleScanNfc}
            disabled={!status.isEnabled}
            accessibilityLabel={isScanning ? 'Cancel NFC scan' : 'Scan NFC card to link'}
          >
            {isScanning ? (
              <View style={styles.row}>
                <ActivityIndicator color={Colors.light.textOnPrimary} size="small" />
                <Text style={styles.nfcButtonText}> Scanning... Tap to Cancel</Text>
              </View>
            ) : (
              <Text style={styles.nfcButtonText}>📳 Scan NFC Card</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {registerError ? <Text style={styles.errorText}>⚠️ {registerError}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryButton, isRegisterLoading && styles.primaryButtonDisabled]}
        onPress={handleRegister}
        disabled={isRegisterLoading}
        accessibilityLabel="Register member"
      >
        {isRegisterLoading ? (
          <ActivityIndicator color={Colors.light.textOnPrimary} />
        ) : (
          <Text style={styles.primaryButtonText}>Register Member</Text>
        )}
      </TouchableOpacity>
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
  warningBox: {
    backgroundColor: Colors.light.warningLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.warningAccent,
  },
  warningText: {
    color: Colors.light.warningDark,
    fontSize: FontSize.caption,
  },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.three,
  },
  label: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.light.textTertiary,
    marginBottom: Spacing.one,
    marginTop: 10,
  },
  input: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
    fontSize: FontSize.md,
    color: Colors.light.text,
  },
  nfcStatusText: {
    fontSize: FontSize.caption,
    color: Colors.light.textTertiary,
    marginBottom: Spacing.three,
  },
  tagCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.successSurface,
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.light.successBorder,
  },
  tagLabel: {
    fontSize: FontSize.sm,
    color: Colors.light.textTertiary,
    marginBottom: Spacing.half,
  },
  tagValue: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.light.successText,
    fontFamily: 'monospace',
  },
  removeTag: {
    color: Colors.light.danger,
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  nfcButton: {
    backgroundColor: Colors.light.info,
    borderRadius: BorderRadius.md,
    padding: 14,
    alignItems: 'center',
  },
  nfcButtonDisabled: {
    backgroundColor: Colors.light.disabled,
  },
  nfcButtonText: {
    color: Colors.light.textOnPrimary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.light.danger,
    fontSize: FontSize.body,
    marginBottom: Spacing.three,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  primaryButtonDisabled: {
    backgroundColor: Colors.light.disabled,
  },
  primaryButtonText: {
    color: Colors.light.textOnPrimary,
    fontSize: FontSize.base,
    fontWeight: '700',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.five,
    backgroundColor: Colors.light.surface,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: Spacing.three,
  },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.light.successText,
    marginBottom: Spacing.two,
  },
  successId: {
    fontSize: FontSize.sm,
    color: Colors.light.textMuted,
    fontFamily: 'monospace',
    marginBottom: Spacing.one,
  },
  successNfc: {
    fontSize: FontSize.sm,
    color: Colors.light.textTertiary,
    fontFamily: 'monospace',
    marginBottom: Spacing.five,
  },
});
