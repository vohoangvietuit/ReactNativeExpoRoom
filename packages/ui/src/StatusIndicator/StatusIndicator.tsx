import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';
import type { StatusIndicatorProps, StatusType } from './types';

const STATUS_DOT_COLORS: Record<StatusType, string> = {
  connected: '#22C55E',
  syncing: '#3B82F6',
  offline: '#9CA3AF',
  error: '#EF4444',
};

const STATUS_DEFAULT_LABELS: Record<StatusType, string> = {
  connected: 'Connected',
  syncing: 'Syncing',
  offline: 'Offline',
  error: 'Error',
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = React.memo(
  ({ status, label, colorScheme = 'light' }) => {
    const theme = Colors[colorScheme];
    const dotColor = STATUS_DOT_COLORS[status];
    const displayLabel = label ?? STATUS_DEFAULT_LABELS[status];

    return (
      <View
        style={styles.container}
        accessibilityRole="text"
        accessibilityLabel={`Status: ${displayLabel}`}
      >
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text style={[styles.label, { color: theme.textSecondary }]}>{displayLabel}</Text>
      </View>
    );
  },
);

StatusIndicator.displayName = 'StatusIndicator';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
});
