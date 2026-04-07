import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { AuthTokens, UserProfile } from '@xpw2/shared';
import * as authService from '../services/authService';

interface AuthState {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,
};

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const tokens = await authService.login(email, password);
    const user = await authService.getProfile();
    return { tokens, user };
  }
);

export const restoreSessionThunk = createAsyncThunk('auth/restoreSession', async () => {
  const tokens = await authService.getStoredTokens();
  if (!tokens) throw new Error('No stored session');
  const user = await authService.getProfile();
  return { tokens, user };
});

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  await authService.clearTokens();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tokens = action.payload.tokens;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? 'Login failed';
      })
      .addCase(restoreSessionThunk.fulfilled, (state, action) => {
        state.tokens = action.payload.tokens;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isInitialized = true;
      })
      .addCase(restoreSessionThunk.rejected, (state) => {
        state.isInitialized = true;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
