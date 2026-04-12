import { configureStore } from '@reduxjs/toolkit';
import type { AuthTokens, UserProfile } from '@fitsync/shared';
import * as authService from '../../services/authService';
import authReducer, {
  loginThunk,
  logoutThunk,
  restoreSessionThunk,
  clearError,
} from '../authSlice';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockTokens: AuthTokens = {
  accessToken: 'access-abc',
  refreshToken: 'refresh-abc',
  expiresAt: '2026-12-31T00:00:00.000Z',
};

const mockUser: UserProfile = {
  id: 'consultant-001',
  email: 'consultant@fitsync.com',
  name: 'Test Consultant',
  role: 'consultant',
};

// ─── Store factory ────────────────────────────────────────────────────────────

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer },
  });
}

// ─── Mock authService ─────────────────────────────────────────────────────────

jest.mock('../../services/authService');

const mockedLogin = authService.login as jest.MockedFunction<typeof authService.login>;
const mockedGetProfile = authService.getProfile as jest.MockedFunction<
  typeof authService.getProfile
>;
const mockedGetStoredTokens = authService.getStoredTokens as jest.MockedFunction<
  typeof authService.getStoredTokens
>;
const mockedClearTokens = authService.clearTokens as jest.MockedFunction<
  typeof authService.clearTokens
>;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('authSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Initial state ────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('should have no user, no tokens, not authenticated, not loading', () => {
      const store = makeStore();
      const state = store.getState().auth;

      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  // ── clearError ────────────────────────────────────────────────────────────

  describe('clearError action', () => {
    it('should clear the error field', () => {
      const store = configureStore({
        reducer: { auth: authReducer },
        preloadedState: {
          auth: {
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Something went wrong',
          },
        },
      });

      store.dispatch(clearError());

      expect(store.getState().auth.error).toBeNull();
    });

    it('should be a no-op when error is already null', () => {
      const store = makeStore();
      store.dispatch(clearError());

      expect(store.getState().auth.error).toBeNull();
    });
  });

  // ── loginThunk ────────────────────────────────────────────────────────────

  describe('loginThunk', () => {
    it('should set isLoading true and clear error while pending', async () => {
      mockedLogin.mockReturnValue(new Promise(() => {}));
      const store = makeStore();

      store.dispatch(loginThunk({ email: 'test@fitsync.com', password: 'password' }));

      const state = store.getState().auth;
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set user, tokens, and isAuthenticated on fulfilled', async () => {
      mockedLogin.mockResolvedValue(mockTokens);
      mockedGetProfile.mockResolvedValue(mockUser);
      const store = makeStore();

      await store.dispatch(loginThunk({ email: 'test@fitsync.com', password: 'password' }));

      const state = store.getState().auth;
      expect(state.isLoading).toBe(false);
      expect(state.tokens).toEqual(mockTokens);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set error and clear loading on rejected', async () => {
      mockedLogin.mockRejectedValue(new Error('Invalid credentials'));
      const store = makeStore();

      await store.dispatch(loginThunk({ email: 'bad@fitsync.com', password: 'wrong' }));

      const state = store.getState().auth;
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid credentials');
    });

    it('should use fallback error message when none is provided', async () => {
      mockedLogin.mockRejectedValue({});
      const store = makeStore();

      await store.dispatch(loginThunk({ email: 'x@x.com', password: 'x' }));

      expect(store.getState().auth.error).toBe('Login failed');
    });
  });

  // ── logoutThunk ───────────────────────────────────────────────────────────

  describe('logoutThunk', () => {
    it('should clear user, tokens, and isAuthenticated on fulfilled', async () => {
      mockedClearTokens.mockResolvedValue(undefined);

      const store = configureStore({
        reducer: { auth: authReducer },
        preloadedState: {
          auth: {
            user: mockUser,
            tokens: mockTokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      });

      await store.dispatch(logoutThunk());

      const state = store.getState().auth;
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should call authService.clearTokens', async () => {
      mockedClearTokens.mockResolvedValue(undefined);
      const store = makeStore();

      await store.dispatch(logoutThunk());

      expect(mockedClearTokens).toHaveBeenCalledTimes(1);
    });
  });

  // ── restoreSessionThunk ───────────────────────────────────────────────────

  describe('restoreSessionThunk', () => {
    it('should restore user and tokens when stored tokens exist', async () => {
      mockedGetStoredTokens.mockResolvedValue(mockTokens);
      mockedGetProfile.mockResolvedValue(mockUser);
      const store = makeStore();

      await store.dispatch(restoreSessionThunk());

      const state = store.getState().auth;
      expect(state.tokens).toEqual(mockTokens);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should not update state when no stored tokens found', async () => {
      mockedGetStoredTokens.mockResolvedValue(null);
      const store = makeStore();

      await store.dispatch(restoreSessionThunk());

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(false);
      expect(state.tokens).toBeNull();
    });
  });
});
