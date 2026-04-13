import React, { useCallback } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors } from '../theme/colors';
import type { InputProps } from './types';

export const Input: React.FC<InputProps> = React.memo(
  ({
    label,
    value,
    onChangeText,
    placeholder,
    error,
    secureTextEntry = false,
    accessibilityLabel,
    colorScheme = 'light',
  }) => {
    const theme = Colors[colorScheme];

    const handleChangeText = useCallback(
      (text: string) => {
        onChangeText(text);
      },
      [onChangeText],
    );

    return (
      <View style={styles.container}>
        {label !== undefined && (
          <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
        )}
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundElement,
              color: theme.text,
              borderColor: error !== undefined ? '#EF4444' : 'transparent',
            },
          ]}
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={secureTextEntry}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ selected: false }}
        />
        {error !== undefined && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  },
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 44,
    borderWidth: 1,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: '#EF4444',
  },
});
