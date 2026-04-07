import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { useColorScheme, View, ActivityIndicator } from 'react-native';
import { Provider } from 'react-redux';
import { Stack } from 'expo-router';
import { store } from '@/store';
import { useAppDispatch, useAppSelector } from '@/hooks/useStore';
import { restoreSessionThunk } from '@/features/auth/store/authSlice';

function RootNavigator() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isInitialized } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(restoreSessionThunk());
  }, [dispatch]);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="(tabs)" />
      ) : (
        <Stack.Screen name="login" />
      )}
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <Provider store={store}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootNavigator />
      </ThemeProvider>
    </Provider>
  );
}
