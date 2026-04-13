import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import { loginThunk, clearError } from '../store/authSlice';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

export default function LoginScreen() {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((s) => s.auth);
  const [email, setEmail] = useState('test@fitsync.com');
  const [password, setPassword] = useState('password');

  const handleLogin = () => {
    dispatch(clearError());
    dispatch(loginThunk({ email, password }));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FitSync</Text>
      <Text style={styles.subtitle}>Body Management System</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        accessibilityLabel="Email input"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        accessibilityLabel="Password input"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel="Login"
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.light.textOnPrimary} />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.hint}>Test: test@fitsync.com / password</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: Colors.light.surface,
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: FontSize.base,
    textAlign: 'center',
    color: Colors.light.textTertiary,
    marginBottom: Spacing.five,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    backgroundColor: Colors.light.card,
    fontSize: FontSize.base,
  },
  button: {
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.md,
    padding: 14,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonText: {
    color: Colors.light.textOnPrimary,
    fontSize: FontSize.base,
    fontWeight: '600',
  },
  error: {
    color: Colors.light.danger,
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  hint: {
    textAlign: 'center',
    color: Colors.light.textMuted,
    marginTop: Spacing.three,
    fontSize: FontSize.sm,
  },
});
