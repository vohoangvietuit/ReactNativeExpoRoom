import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MemberIdentifyScreen from '@/features/member/screens/MemberIdentifyScreen';
import RegisterMemberScreen from '@/features/member/screens/RegisterMemberScreen';

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
    backgroundColor: '#f5f5f5',
  },
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: '#E8E8E8',
    margin: 12,
    marginBottom: 4,
    borderRadius: 10,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  segmentTextActive: {
    color: '#007AFF',
  },
});
