import React, { useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import { loadSyncStatusThunk, triggerSyncThunk, schedulePeriodicSyncThunk, startOutboxThunk } from '../../sync/store/syncSlice';
import {
  loadActiveSessionThunk,
  startSessionThunk,
  endSessionThunk,
} from '../../session/store/sessionSlice';

export default function SessionScreen() {
  const dispatch = useAppDispatch();
  const { activeSession } = useAppSelector((s) => s.session);
  const { status: syncStatus } = useAppSelector((s) => s.sync);
  const { user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(loadActiveSessionThunk());
    dispatch(loadSyncStatusThunk());
  }, [dispatch]);

  const handleStartSession = useCallback(() => {
    dispatch(
      startSessionThunk({
        groupId: `group-${Math.random().toString(36).slice(2, 10)}`,
        consultantId: user?.id ?? 'unknown',
      }),
    ).then(() => {
      dispatch(loadActiveSessionThunk());
      dispatch(startOutboxThunk());
      dispatch(schedulePeriodicSyncThunk());
    });
  }, [dispatch, user]);

  const handleEndSession = useCallback(() => {
    if (!activeSession) return;
    dispatch(endSessionThunk(activeSession.id)).then(() => {
      dispatch(loadActiveSessionThunk());
    });
  }, [dispatch, activeSession]);

  const handleTriggerSync = useCallback(() => {
    dispatch(triggerSyncThunk());
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Session</Text>

      {activeSession ? (
        <View style={styles.sessionCard}>
          <Text style={styles.sessionStatus}>Active Session</Text>
          <Text style={styles.sessionId}>ID: {activeSession.id.slice(0, 8)}...</Text>
          <Text style={styles.sessionDetail}>Group: {activeSession.groupId}</Text>
          <Text style={styles.sessionDetail}>Members: {activeSession.memberCount}</Text>
          <Text style={styles.sessionDetail}>Events: {activeSession.eventCount}</Text>
          <TouchableOpacity style={[styles.button, styles.endButton]} onPress={handleEndSession}>
            <Text style={styles.buttonText}>End Session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleStartSession}>
          <Text style={styles.buttonText}>Start Session</Text>
        </TouchableOpacity>
      )}

      {/* Sync Status */}
      <View style={styles.syncCard}>
        <Text style={styles.sectionTitle}>Sync Status</Text>
        {syncStatus ? (
          <>
            <Text style={styles.syncDetail}>Pending: {syncStatus.pendingCount}</Text>
            <Text style={styles.syncDetail}>Device Synced: {syncStatus.deviceSyncedCount}</Text>
            <Text style={styles.syncDetail}>Backend Synced: {syncStatus.backendSyncedCount}</Text>
            <Text style={styles.syncDetail}>Failed: {syncStatus.failedCount}</Text>
            <Text style={styles.syncDetail}>
              Worker: {syncStatus.isWorkerScheduled ? 'Scheduled' : 'Not scheduled'}
            </Text>
          </>
        ) : (
          <Text style={styles.syncDetail}>Loading...</Text>
        )}
        <TouchableOpacity style={[styles.button, styles.syncButton]} onPress={handleTriggerSync}>
          <Text style={styles.buttonText}>Trigger Sync Now</Text>
        </TouchableOpacity>
      </View>
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
  sessionCard: {
    backgroundColor: '#d4edda',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sessionStatus: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 8,
  },
  sessionId: {
    color: '#155724',
    fontSize: 12,
    marginBottom: 8,
  },
  sessionDetail: {
    color: '#155724',
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  endButton: {
    backgroundColor: '#ff3b30',
  },
  syncButton: {
    backgroundColor: '#ff9500',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  syncCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  syncDetail: {
    color: '#666',
    marginBottom: 4,
  },
});
