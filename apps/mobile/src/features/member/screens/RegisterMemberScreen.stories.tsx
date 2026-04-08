import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

// ─── Storybook Stories for RegisterMemberScreen ───────────────────────────────
// Self-contained UI previews — no Redux or NFC dependency.

export default {
  title: 'Features/Member/RegisterMemberScreen',
};

// ─── Stories ─────────────────────────────────────────────────────────────────

/** Default empty form with no active session warning */
export const EmptyForm = () => (
  <ScrollView style={s.scrollContainer} contentContainerStyle={s.content}>
    <View style={s.warningBox}>
      <Text style={s.warningText}>
        ⚠️ No active session — start a session first for proper event tracking.
      </Text>
    </View>
    <View style={s.card}>
      <Text style={s.cardTitle}>Member Details</Text>
      <Text style={s.label}>Name *</Text>
      <TextInput style={s.input} placeholder="Full name" editable={false} />
      <Text style={s.label}>Email</Text>
      <TextInput style={s.input} placeholder="email@example.com" editable={false} />
      <Text style={s.label}>Phone</Text>
      <TextInput style={s.input} placeholder="+1 234 567 8900" editable={false} />
      <Text style={s.label}>Membership Number</Text>
      <TextInput style={s.input} placeholder="XPW-00123" editable={false} />
    </View>
    <View style={s.card}>
      <Text style={s.cardTitle}>NFC Card (Optional)</Text>
      <Text style={s.nfcStatus}>NFC: ✅ Ready</Text>
      <TouchableOpacity style={s.nfcButton}>
        <Text style={s.nfcButtonText}>📳 Scan NFC Card</Text>
      </TouchableOpacity>
    </View>
    <TouchableOpacity style={s.primaryButton}>
      <Text style={s.primaryButtonText}>Register Member</Text>
    </TouchableOpacity>
  </ScrollView>
);

/** Form filled out, no NFC card */
export const FilledFormNoNfc = () => (
  <ScrollView style={s.scrollContainer} contentContainerStyle={s.content}>
    <View style={s.card}>
      <Text style={s.cardTitle}>Member Details</Text>
      <Text style={s.label}>Name *</Text>
      <TextInput style={s.input} value="Jane Smith" editable={false} />
      <Text style={s.label}>Email</Text>
      <TextInput style={s.input} value="jane@example.com" editable={false} />
      <Text style={s.label}>Phone</Text>
      <TextInput style={s.input} value="+1 234 567 8900" editable={false} />
      <Text style={s.label}>Membership Number</Text>
      <TextInput style={s.input} value="XPW-00123" editable={false} />
    </View>
    <View style={s.card}>
      <Text style={s.cardTitle}>NFC Card (Optional)</Text>
      <Text style={s.nfcStatus}>NFC: ✅ Ready</Text>
      <TouchableOpacity style={s.nfcButton}>
        <Text style={s.nfcButtonText}>📳 Scan NFC Card</Text>
      </TouchableOpacity>
    </View>
    <TouchableOpacity style={s.primaryButton}>
      <Text style={s.primaryButtonText}>Register Member</Text>
    </TouchableOpacity>
  </ScrollView>
);

/** Form with NFC card scanned and UID displayed */
export const WithNfcCard = () => (
  <ScrollView style={s.scrollContainer} contentContainerStyle={s.content}>
    <View style={s.card}>
      <Text style={s.cardTitle}>Member Details</Text>
      <Text style={s.label}>Name *</Text>
      <TextInput style={s.input} value="Jane Smith" editable={false} />
      <Text style={s.label}>Email</Text>
      <TextInput style={s.input} value="jane@example.com" editable={false} />
      <Text style={s.label}>Phone</Text>
      <TextInput style={s.input} value="+1 234 567 8900" editable={false} />
      <Text style={s.label}>Membership Number</Text>
      <TextInput style={s.input} value="XPW-00123" editable={false} />
    </View>
    <View style={s.card}>
      <Text style={s.cardTitle}>NFC Card (Optional)</Text>
      <Text style={s.nfcStatus}>NFC: ✅ Ready</Text>
      <View style={s.tagCard}>
        <View>
          <Text style={s.tagLabel}>Card UID:</Text>
          <Text style={s.tagValue}>NFC-ABC123DEF456</Text>
        </View>
        <Text style={s.removeTag}>Remove</Text>
      </View>
    </View>
    <TouchableOpacity style={s.primaryButton}>
      <Text style={s.primaryButtonText}>Register Member</Text>
    </TouchableOpacity>
  </ScrollView>
);

/** NFC scanning in progress */
export const NfcScanning = () => (
  <ScrollView style={s.scrollContainer} contentContainerStyle={s.content}>
    <View style={s.card}>
      <Text style={s.cardTitle}>Member Details</Text>
      <Text style={s.label}>Name *</Text>
      <TextInput style={s.input} value="Jane Smith" editable={false} />
      <Text style={s.label}>Email</Text>
      <TextInput style={s.input} value="jane@example.com" editable={false} />
    </View>
    <View style={s.card}>
      <Text style={s.cardTitle}>NFC Card (Optional)</Text>
      <Text style={s.nfcStatus}>NFC: ✅ Ready</Text>
      <TouchableOpacity style={[s.nfcButton, s.nfcButtonDisabled]}>
        <View style={s.row}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={s.nfcButtonText}> Scanning... Tap to Cancel</Text>
        </View>
      </TouchableOpacity>
    </View>
    <TouchableOpacity style={s.primaryButton}>
      <Text style={s.primaryButtonText}>Register Member</Text>
    </TouchableOpacity>
  </ScrollView>
);

/** Registration in progress (loading spinner) */
export const Submitting = () => (
  <ScrollView style={s.scrollContainer} contentContainerStyle={s.content}>
    <View style={s.card}>
      <Text style={s.cardTitle}>Member Details</Text>
      <Text style={s.label}>Name *</Text>
      <TextInput style={s.input} value="Jane Smith" editable={false} />
    </View>
    <TouchableOpacity style={[s.primaryButton, { backgroundColor: '#BDBDBD' }]} disabled>
      <ActivityIndicator color="#fff" />
    </TouchableOpacity>
  </ScrollView>
);

/** Registration error */
export const WithError = () => (
  <ScrollView style={s.scrollContainer} contentContainerStyle={s.content}>
    <View style={s.card}>
      <Text style={s.cardTitle}>Member Details</Text>
      <Text style={s.label}>Name *</Text>
      <TextInput style={s.input} value="Jane Smith" editable={false} />
    </View>
    <Text style={s.errorText}>⚠️ DB write failed — please try again</Text>
    <TouchableOpacity style={s.primaryButton}>
      <Text style={s.primaryButtonText}>Register Member</Text>
    </TouchableOpacity>
  </ScrollView>
);

/** Success screen after registration */
export const RegistrationSuccess = () => (
  <View style={s.successContainer}>
    <Text style={s.successIcon}>✅</Text>
    <Text style={s.successTitle}>Member Registered!</Text>
    <Text style={s.successId}>ID: member_1712577600000_abc1234</Text>
    <Text style={s.successNfc}>NFC Card UID: NFC-ABC123DEF456</Text>
    <TouchableOpacity style={s.primaryButton}>
      <Text style={s.primaryButtonText}>Register Another</Text>
    </TouchableOpacity>
  </View>
);

/** Success screen without NFC card */
export const RegistrationSuccessNoNfc = () => (
  <View style={s.successContainer}>
    <Text style={s.successIcon}>✅</Text>
    <Text style={s.successTitle}>Member Registered!</Text>
    <Text style={s.successId}>ID: member_1712577600000_xyz9876</Text>
    <Text style={s.successNfc}>No NFC card linked</Text>
    <TouchableOpacity style={s.primaryButton}>
      <Text style={s.primaryButtonText}>Register Another</Text>
    </TouchableOpacity>
  </View>
);

/** NFC not supported on device */
export const NfcNotSupported = () => (
  <ScrollView style={s.scrollContainer} contentContainerStyle={s.content}>
    <View style={s.card}>
      <Text style={s.cardTitle}>Member Details</Text>
      <Text style={s.label}>Name *</Text>
      <TextInput style={s.input} placeholder="Full name" editable={false} />
    </View>
    <View style={s.card}>
      <Text style={s.cardTitle}>NFC Card (Optional)</Text>
      <Text style={s.nfcStatus}>NFC: ❌ Not supported on this device</Text>
      <TouchableOpacity style={[s.nfcButton, s.nfcButtonDisabled]} disabled>
        <Text style={s.nfcButtonText}>📳 Scan NFC Card</Text>
      </TouchableOpacity>
    </View>
    <TouchableOpacity style={s.primaryButton}>
      <Text style={s.primaryButtonText}>Register Member</Text>
    </TouchableOpacity>
  </ScrollView>
);

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  warningBox: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  warningText: { color: '#856404', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
  },
  nfcStatus: { fontSize: 13, color: '#666', marginBottom: 12 },
  nfcButton: { backgroundColor: '#5C6BC0', borderRadius: 8, padding: 14, alignItems: 'center' },
  nfcButtonDisabled: { backgroundColor: '#BDBDBD' },
  nfcButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center' },
  tagCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  tagLabel: { fontSize: 12, color: '#555', marginBottom: 2 },
  tagValue: { fontSize: 14, fontWeight: '700', color: '#2E7D32', fontFamily: 'monospace' },
  removeTag: { color: '#D32F2F', fontSize: 14, fontWeight: '600' },
  errorText: { color: '#D32F2F', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
  },
  successIcon: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#2E7D32', marginBottom: 8 },
  successId: { fontSize: 12, color: '#777', fontFamily: 'monospace', marginBottom: 4 },
  successNfc: { fontSize: 12, color: '#555', fontFamily: 'monospace', marginBottom: 32 },
});
