import '@/global.css';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React from 'react';
import { useColorScheme } from 'react-native';
import { Provider } from 'react-redux';
import { Stack } from 'expo-router';
import { store } from '@/store';

// DEV TESTING MODE: Auth/session bypassed — always shows tabs for NFC/BLE/Sync testing.
// Restore auth guard before production by re-enabling RootNavigator with restoreSessionThunk.

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <Provider store={store}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </ThemeProvider>
    </Provider>
  );
}
