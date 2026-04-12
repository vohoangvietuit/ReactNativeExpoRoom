# 09 — Testing Guide

---

## Testing Pyramid

```
        ┌─────────────────┐
        │   E2E  (10%)    │  Detox or Maestro — full device flows
        ├─────────────────┤
        │Integration (20%)│  Multi-slice, service + store, DataSync mock
        ├─────────────────┤
        │   Unit  (70%)   │  Slices, hooks, parsers, services in isolation
        └─────────────────┘
```

---

## Setup

**Framework:** Jest 29 + jest-expo + React Native Testing Library

```bash
# Run all tests
npx jest

# Watch mode
npx jest --watch

# Coverage report
npx jest --coverage

# Single file
npx jest src/features/auth/store/__tests__/authSlice.test.ts
```

### `jest.config.js` (apps/mobile)

```js
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      '(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*' +
      '|@react-navigation/.*|immer|@fitsync/.*' +
      '))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['./jest.setup.js'],
};
```

### `jest.setup.js`

```js
import '@testing-library/jest-native/extend-expect';
```

---

## Mocking Native Modules

### DataSync Module

The DataSync module calls native Kotlin code, which is unavailable in the Jest environment. Mock it at the module boundary:

```typescript
// __mocks__/@fitsync/datasync.ts  (or jest.mock() in test file)
export const recordEvent = jest.fn().mockResolvedValue('mock-event-id');
export const recordEventWithCorrelation = jest.fn().mockResolvedValue('mock-event-id');

export const getAllMembers = jest.fn().mockResolvedValue([]);
export const getAllSessions = jest.fn().mockResolvedValue([]);
export const getAllTodos = jest.fn().mockResolvedValue([]);
export const getActiveSession = jest.fn().mockResolvedValue(null);
export const getSyncStatus = jest.fn().mockResolvedValue({
  pendingCount: 0,
  deviceSyncedCount: 0,
  backendSyncedCount: 0,
  failedCount: 0,
  lastSyncAt: null,
  isWorkerScheduled: false,
});

export const addEventRecordedListener = jest.fn().mockReturnValue({ remove: jest.fn() });
export const addSyncStatusChangedListener = jest.fn().mockReturnValue({ remove: jest.fn() });
export const addDeviceFoundListener = jest.fn().mockReturnValue({ remove: jest.fn() });
export const addDeviceLostListener = jest.fn().mockReturnValue({ remove: jest.fn() });
export const addDeviceConnectionChangedListener = jest.fn().mockReturnValue({ remove: jest.fn() });
export const addConnectionRequestListener = jest.fn().mockReturnValue({ remove: jest.fn() });
```

```typescript
// In your test file:
jest.mock('@fitsync/datasync');
```

### NFC Module

```typescript
jest.mock('@fitsync/nfc', () => ({
  NfcReader: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(true),
    getStatus: jest.fn().mockResolvedValue({ isSupported: true, isEnabled: true }),
    scanForMemberCard: jest.fn().mockResolvedValue({
      success: true,
      tagId: 'ab:cd:ef:01',
      memberData: { memberId: 'm-001', name: 'Jane Smith' },
    }),
  })),
  useNfcReader: jest.fn().mockReturnValue({
    status: 'idle',
    lastScan: null,
    startScan: jest.fn(),
  }),
}));
```

### BLE Scale Module

```typescript
jest.mock('@fitsync/ble-scale', () => ({
  useScaleWeight: jest.fn().mockReturnValue({
    reading: null,
    status: 'idle',
  }),
}));
```

### expo-secure-store

```typescript
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));
```

---

## Redux Slice Testing Pattern

Test slices with a real `configureStore` — avoid testing reducers in isolation, test the whole thunk+reducer cycle:

```typescript
// authSlice.test.ts
import { configureStore } from '@reduxjs/toolkit';
import * as authService from '../../services/authService';
import authReducer, { loginThunk, logoutThunk } from '../authSlice';

// Mock the service layer
jest.mock('../../services/authService');
const mockedLogin = authService.login as jest.MockedFunction<typeof authService.login>;
const mockedGetProfile = authService.getProfile as jest.MockedFunction<
  typeof authService.getProfile
>;

function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

describe('authSlice', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sets isAuthenticated on successful login', async () => {
    mockedLogin.mockResolvedValue(mockTokens);
    mockedGetProfile.mockResolvedValue(mockUser);

    const store = makeStore();
    await store.dispatch(loginThunk({ email: 'test@fitsync.com', password: 'password' }));

    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(store.getState().auth.user).toEqual(mockUser);
    expect(store.getState().auth.isLoading).toBe(false);
  });

  it('sets error on failed login', async () => {
    mockedLogin.mockRejectedValue(new Error('Invalid credentials'));

    const store = makeStore();
    await store.dispatch(loginThunk({ email: 'bad@email.com', password: 'wrong' }));

    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.error).toBe('Invalid credentials');
  });

  it('clears state on logout', async () => {
    const store = makeStore();
    // Pre-populate state by logging in first...
    await store.dispatch(logoutThunk());
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });
});
```

---

## Service Testing Pattern

Test services against their concrete logic; mock only external I/O:

```typescript
// authService.test.ts
import * as SecureStore from 'expo-secure-store';
import { storeTokens, getStoredTokens, clearTokens } from '../authService';

jest.mock('expo-secure-store');

const mockSet = SecureStore.setItemAsync as jest.Mock;
const mockGet = SecureStore.getItemAsync as jest.Mock;
const mockDelete = SecureStore.deleteItemAsync as jest.Mock;

describe('authService', () => {
  it('storeTokens — writes both tokens to secure store', async () => {
    await storeTokens({ accessToken: 'acc', refreshToken: 'ref', expiresAt: '' });
    expect(mockSet).toHaveBeenCalledWith('fitsync_access_token', 'acc');
    expect(mockSet).toHaveBeenCalledWith('fitsync_refresh_token', 'ref');
  });

  it('getStoredTokens — returns null when nothing stored', async () => {
    mockGet.mockResolvedValue(null);
    const result = await getStoredTokens();
    expect(result).toBeNull();
  });

  it('clearTokens — deletes both keys', async () => {
    await clearTokens();
    expect(mockDelete).toHaveBeenCalledWith('fitsync_access_token');
    expect(mockDelete).toHaveBeenCalledWith('fitsync_refresh_token');
  });
});
```

---

## Component / Hook Testing Pattern

```typescript
// useNfcReader.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useNfcReader } from '@fitsync/nfc';

jest.mock('@fitsync/nfc');

it('starts in idle status', () => {
  const { result } = renderHook(() => useNfcReader());
  expect(result.current.status).toBe('idle');
});
```

```tsx
// LoginScreen.test.tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { makeStore } from '@/store';
import LoginScreen from '../LoginScreen';

it('shows error message on bad credentials', async () => {
  const { getByPlaceholderText, getByText } = render(
    <Provider store={makeStore()}>
      <LoginScreen />
    </Provider>,
  );

  fireEvent.changeText(getByPlaceholderText('Email'), 'bad@email.com');
  fireEvent.changeText(getByPlaceholderText('Password'), 'wrong');
  fireEvent.press(getByText('Sign In'));

  await waitFor(() => {
    expect(getByText('Invalid credentials')).toBeTruthy();
  });
});
```

---

## Testing Shared Package (`packages/shared`)

```bash
cd packages/shared
pnpm test
```

Pure TypeScript — no RN dependencies, no mocking needed:

```typescript
// packages/shared/src/__tests__/events.test.ts
import { EVENT_TYPES, OUTBOX_STATUS } from '../events';

describe('EVENT_TYPES', () => {
  it('contains all expected event types', () => {
    expect(EVENT_TYPES.WEIGHT_RECORDED).toBe('WeightRecorded');
    expect(Object.keys(EVENT_TYPES)).toHaveLength(10);
  });
});
```

---

## Coverage Targets

| Area                                       | Target                |
| ------------------------------------------ | --------------------- |
| Redux slices (reducers + thunks)           | 90%+                  |
| Service layer (authService, etc.)          | 85%+                  |
| Utility parsers (weightParser, ndefParser) | 95%+                  |
| Custom hooks                               | 80%+                  |
| Screen components                          | 60%+ (critical paths) |
