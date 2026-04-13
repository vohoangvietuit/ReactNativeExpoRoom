import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { BadgeProps, BadgeVariant } from './types';

const VARIANT_COLORS_LIGHT: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: '#D1FAE5', text: '#065F46' },
  warning: { bg: '#FEF3C7', text: '#92400E' },
  error: { bg: '#FEE2E2', text: '#991B1B' },
  info: { bg: '#DBEAFE', text: '#1E40AF' },
};

const VARIANT_COLORS_DARK: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: '#064E3B', text: '#6EE7B7' },
  warning: { bg: '#78350F', text: '#FCD34D' },
  error: { bg: '#7F1D1D', text: '#FCA5A5' },
  info: { bg: '#1E3A5F', text: '#93C5FD' },
};

export const Badge: React.FC<BadgeProps> = React.memo(
  ({ label, variant, colorScheme = 'light' }) => {
    const colors =
      colorScheme === 'dark' ? VARIANT_COLORS_DARK[variant] : VARIANT_COLORS_LIGHT[variant];

    return (
      <View style={[styles.badge, { backgroundColor: colors.bg }]}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </View>
    );
  },
);

Badge.displayName = 'Badge';

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
