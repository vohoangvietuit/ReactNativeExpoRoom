import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';

// ─── Storybook Stories for Member Feature ─────────────────────────────────────
// These stories are self-contained UI previews of each screen state.
// They do NOT depend on Redux or NFC — all state is mocked inline.
// To use: install @storybook/react-native, register in .storybook/main.ts.

// ─── Helpers ─────────────────────────────────────────────────────────────────

const COLORS = {
  primary: '#007AFF',
  orange: '#ff9500',
  green: '#2E7D32',
  red: '#D32F2F',
  warning: '#FFC107',
  bg: '#f5f5f5',
  white: '#fff',
};

// ─── MemberIdentifyScreen Stories ────────────────────────────────────────────

export default {
  title: 'Features/Member/MemberIdentifyScreen',
};

/** No session started yet — prompts to go to Session tab */
export const NoSession = () => (
  <View style={s.container}>
    <Text style={s.header}>Member Identify</Text>
    <View style={s.center}>
      <Text style={s.title}>No active session.</Text>
      <Text style={s.subtitle}>Go to the Session tab to start one.</Text>
    </View>
  </View>
);

/** NFC ready, idle state — waiting for user to scan */
export const IdleReady = () => (
  <View style={s.container}>
    <Text style={s.header}>Member Identify</Text>
    <View style={s.card}>
      <Text style={s.detail}>NFC: Ready</Text>
    </View>
    <TouchableOpacity style={s.scanBtn}>
      <Text style={s.scanBtnText}>Scan NFC Card</Text>
    </TouchableOpacity>
  </View>
);

/** NFC scanning in progress */
export const Scanning = () => (
  <View style={s.container}>
    <Text style={s.header}>Member Identify</Text>
    <View style={s.card}>
      <Text style={s.detail}>NFC: Ready</Text>
    </View>
    <TouchableOpacity style={[s.scanBtn, { backgroundColor: COLORS.orange }]}>
      <View style={s.row}>
        <ActivityIndicator color="#fff" />
        <Text style={s.scanBtnText}> Scanning... Tap to Cancel</Text>
      </View>
    </TouchableOpacity>
  </View>
);

/** Scan succeeded, member found and displayed */
export const MemberFound = () => (
  <View style={s.container}>
    <Text style={s.header}>Member Identify</Text>
    <View style={s.card}>
      <Text style={s.detail}>NFC: Ready</Text>
    </View>
    <TouchableOpacity style={s.scanBtn}>
      <Text style={s.scanBtnText}>Scan NFC Card</Text>
    </TouchableOpacity>
    <View style={s.memberCard}>
      <View style={s.memberHeader}>
        <Text style={s.memberName}>Jane Smith</Text>
        <Text style={s.clearBtn}>✕ Clear</Text>
      </View>
      <Text style={s.detail}>🪪 ID: member-001</Text>
      <Text style={s.detail}>📧 Email: jane@example.com</Text>
      <Text style={s.detail}>📱 Phone: +1234567890</Text>
      <Text style={s.detail}>🏷️ Membership: XPW-00123</Text>
      <Text style={s.detail}>⚖️ Last Weight: 72.5 kg</Text>
      <Text style={s.detail}>📳 NFC UID: NFC-ABC123</Text>
    </View>
  </View>
);

/** Scan succeeded but no matching member in database */
export const MemberNotFound = () => (
  <View style={s.container}>
    <Text style={s.header}>Member Identify</Text>
    <View style={s.card}>
      <Text style={s.detail}>NFC: Ready</Text>
    </View>
    <TouchableOpacity style={s.scanBtn}>
      <Text style={s.scanBtnText}>Scan NFC Card</Text>
    </TouchableOpacity>
    <View style={s.notFoundCard}>
      <Text style={s.notFoundTitle}>⚠️ Tag scanned but no matching member found.</Text>
      <Text style={s.notFoundHint}>Tag UID: UNKNOWN-TAG-XYZ</Text>
      <Text style={s.notFoundHint}>Register this NFC card first.</Text>
    </View>
  </View>
);

/** NFC not supported on device */
export const NfcNotSupported = () => (
  <View style={s.container}>
    <Text style={s.header}>Member Identify</Text>
    <View style={s.card}>
      <Text style={s.detail}>NFC: Not Supported</Text>
    </View>
    <TouchableOpacity style={[s.scanBtn, { backgroundColor: '#BDBDBD' }]} disabled>
      <Text style={s.scanBtnText}>Scan NFC Card</Text>
    </TouchableOpacity>
  </View>
);

/** Scan error state */
export const ScanError = () => (
  <View style={s.container}>
    <Text style={s.header}>Member Identify</Text>
    <View style={s.card}>
      <Text style={s.detail}>NFC: Ready</Text>
    </View>
    <TouchableOpacity style={s.scanBtn}>
      <Text style={s.scanBtnText}>Scan NFC Card</Text>
    </TouchableOpacity>
    <Text style={s.error}>Tag does not contain valid member data</Text>
  </View>
);

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '600', color: '#333' },
  subtitle: { fontSize: 14, color: '#888' },
  card: { backgroundColor: COLORS.white, padding: 12, borderRadius: 8, marginBottom: 16 },
  detail: { fontSize: 14, color: '#555', marginBottom: 4 },
  scanBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  scanBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center' },
  memberCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  memberName: { fontSize: 20, fontWeight: 'bold', flex: 1 },
  clearBtn: { fontSize: 13, color: '#888', fontWeight: '600', paddingLeft: 8 },
  notFoundCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  notFoundTitle: { fontSize: 14, fontWeight: '600', color: '#856404', marginBottom: 4 },
  notFoundHint: { fontSize: 12, color: '#856404', fontFamily: 'monospace' },
  error: { color: 'red', textAlign: 'center', marginBottom: 12 },
});
