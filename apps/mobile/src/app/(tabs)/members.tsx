import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MemberIdentifyScreen from '@/features/member/screens/MemberIdentifyScreen';
import RegisterMemberScreen from '@/features/member/screens/RegisterMemberScreen';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

type MemberMode = 'identify' | 'register';

export default function MembersTab() {
  const [mode, setMode] = useState<MemberMode>('identify');

  return (
    <View style={styles.container}>
      {/* ── Segment control ── */}
      <View style={styles.segmentBar}>
        <TouchableOpacity
          style={[styles.segment, mode === 'identify' && styles.segmentActive]}
          onPress={() => setMode('identify')}
          accessibilityLabel="Switch to Identify mode"
        >
          <Text style={[styles.segmentText, mode === 'identify' && styles.segmentTextActive]}>
            📳 Identify
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, mode === 'register' && styles.segmentActive]}
          onPress={() => setMode('register')}
          accessibilityLabel="Switch to Register mode"
        >
          <Text style={[styles.segmentText, mode === 'register' && styles.segmentTextActive]}>
            ➕ Register
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'identify' ? <MemberIdentifyScreen /> : <RegisterMemberScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.surface,
  },
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundElement,
    margin: Spacing.three,
    marginBottom: Spacing.one,
    borderRadius: BorderRadius.lg,
    padding: Spacing.one,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  segmentActive: {
    backgroundColor: Colors.light.card,
    shadowColor: Colors.light.text,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  segmentTextActive: {
    color: Colors.light.primary,
  },
});
