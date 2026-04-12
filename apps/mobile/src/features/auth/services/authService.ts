import * as SecureStore from 'expo-secure-store';
import type { AuthTokens, UserProfile } from '@fitsync/shared';

const ACCESS_TOKEN_KEY = 'fitsync_access_token';
const REFRESH_TOKEN_KEY = 'fitsync_refresh_token';

// Mock user for testing
const MOCK_USER: UserProfile = {
  id: 'consultant-001',
  email: 'consultant@fitsync.com',
  name: 'Test Consultant',
  role: 'consultant',
};

export async function login(email: string, password: string): Promise<AuthTokens> {
  // Mock login — replace with real API
  if (email === 'test@fitsync.com' && password === 'password') {
    const tokens: AuthTokens = {
      accessToken: `mock-access-${Date.now()}`,
      refreshToken: `mock-refresh-${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
    await storeTokens(tokens);
    return tokens;
  }
  throw new Error('Invalid credentials');
}

export async function refreshTokens(): Promise<AuthTokens> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) throw new Error('No refresh token');

  // Mock refresh
  const tokens: AuthTokens = {
    accessToken: `mock-access-${Date.now()}`,
    refreshToken: `mock-refresh-${Date.now()}`,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  };
  await storeTokens(tokens);
  return tokens;
}

export async function getProfile(): Promise<UserProfile> {
  return MOCK_USER;
}

export async function storeTokens(tokens: AuthTokens): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export async function getStoredTokens(): Promise<AuthTokens | null> {
  const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken, expiresAt: '' };
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
