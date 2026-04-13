import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { SpinnerProps } from './types';

const DEFAULT_COLOR = {
  light: '#3B82F6',
  dark: '#60A5FA',
};

export const Spinner: React.FC<SpinnerProps> = React.memo(
  ({ size = 'large', color, colorScheme = 'light' }) => {
    const indicatorColor = color ?? DEFAULT_COLOR[colorScheme];

    return (
      <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel="Loading">
        <ActivityIndicator size={size} color={indicatorColor} />
      </View>
    );
  },
);

Spinner.displayName = 'Spinner';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
