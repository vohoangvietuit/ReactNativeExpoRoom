import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import type { ButtonProps } from './types';

export const Button: React.FC<ButtonProps> = React.memo(
  ({
    title,
    onPress,
    variant = 'primary',
    disabled = false,
    loading = false,
    accessibilityLabel,
    colorScheme = 'light',
    style,
  }) => {
    const theme = Colors[colorScheme];

    const handlePress = useCallback(() => {
      if (!disabled && !loading) {
        onPress();
      }
    }, [disabled, loading, onPress]);

    const containerStyle = [
      styles.base,
      variant === 'primary' && { backgroundColor: '#3B82F6' },
      variant === 'secondary' && { backgroundColor: theme.backgroundElement },
      variant === 'danger' && { backgroundColor: '#EF4444' },
      variant === 'ghost' && styles.ghost,
      (disabled || loading) && styles.disabled,
      style,
    ];

    const textColor = variant === 'primary' || variant === 'danger' ? '#ffffff' : theme.text;

    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={handlePress}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityState={{ disabled: disabled || loading }}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' || variant === 'danger' ? '#ffffff' : theme.text}
          />
        ) : (
          <Text style={[styles.label, { color: textColor }]}>{title}</Text>
        )}
      </TouchableOpacity>
    );
  },
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
