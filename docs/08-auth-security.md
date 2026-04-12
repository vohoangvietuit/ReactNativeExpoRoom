# 08 — Auth & Security

---

## JWT Authentication Flow

**Library:** `expo-secure-store@15.0.0`

The auth flow is handled by `apps/mobile/src/features/auth/`:

```
1. User submits login form (email + password)
2. authSlice.login thunk calls authService.login()
3. Server validates credentials, returns { accessToken, refreshToken, expiresAt }
4. Tokens stored in expo-secure-store (device keychain / keystore)
5. Redux state: { isAuthenticated: true, user: UserProfile }
6. expo-router redirects to (tabs)/ group
```

### Token Storage (`authService.ts`)

```typescript
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY  = 'fitsync_access_token';
const REFRESH_TOKEN_KEY = 'fitsync_refresh_token';

export async function storeTokens(tokens: AuthTokens): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY,  tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export async function getStoredTokens(): Promise<AuthTokens | null> {
  const accessToken  = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken, expiresAt: '' };
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
```

**`expo-secure-store` security guarantees:**
- **Android:** Stored in Android Keystore — hardware-backed on supported devices
- Values are never stored in plain text or SharedPreferences
- Access requires the app's own package signature

### Token Refresh

```typescript
export async function refreshTokens(): Promise<AuthTokens> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) throw new Error('No refresh token');

  // Call refresh endpoint, store new tokens
  const tokens = await api.refresh(refreshToken);
  await storeTokens(tokens);
  return tokens;
}
```

The Redux auth slice's middleware intercepts 401 responses and calls `refreshTokens()` before retrying.

### Mock Auth Service

During development, credentials `test@fitsync.com / password` return mock tokens:

```typescript
if (email === 'test@fitsync.com' && password === 'password') {
  return {
    accessToken:  `mock-access-${Date.now()}`,
    refreshToken: `mock-refresh-${Date.now()}`,
    expiresAt:    new Date(Date.now() + 3600000).toISOString(),
  };
}
throw new Error('Invalid credentials');
```

Replace this block with a real `fetch`/`axios` call to your auth API endpoint.

---

## SQLCipher Database Encryption

The local Room database (`fitsync.db`) is encrypted with SQLCipher 4.5.4.

**Cipher:** AES-256-CBC (SQLCipher default)  
**Key derivation:** PBKDF2-HMAC-SHA512, 256-bit key

The raw encryption passphrase is a **32-byte random value** — not a user password — so brute-force is infeasible.

For the full passphrase management implementation, see [03-datasync-module.md — Android Keystore Passphrase Management](./03-datasync-module.md#android-keystore-passphrase-management).

---

## Android Keystore Integration

```
SecureRandom (32 bytes)
       │
       ▼
Base64 encode
       │
       ▼
EncryptedSharedPreferences
  └── key encryption:   AES256-SIV (Android Keystore)
  └── value encryption: AES256-GCM (Android Keystore)
       │
       ▼
Stored on device — hardware-backed on Pixel/Samsung Knox etc.
```

**`KeystoreHelper.getOrCreatePassphrase()`** is called once per process lifecycle inside `AppDatabase.getInstance()`. The result is passed directly to `SupportFactory(passphrase)` and not stored in memory beyond that call.

---

## Navigation Auth Guard

```tsx
// apps/mobile/src/app/_layout.tsx
export default function RootLayout() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const segments         = useSegments();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(tabs)';
    if (!isAuthenticated && inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated && !inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments]);

  return <Stack />;
}
```

---

## OWASP Top 10 — Mobile Controls Applied

| Risk | Control |
|------|---------|
| M1 Improper Platform Usage | Expo SecureStore + Android Keystore for all secrets |
| M2 Insecure Data Storage | SQLCipher AES-256 for local DB; no plaintext credentials on disk |
| M3 Insecure Communication | HTTPS enforced; `android:usesCleartextTraffic="false"` in manifest |
| M4 Insecure Authentication | JWT with refresh tokens; tokens stored in secure enclave |
| M5 Insufficient Cryptography | 32-byte random passphrase; AES-256; no custom crypto |
| M9 Reverse Engineering | ProGuard/R8 minification enabled in release builds |

---

## Security Checklist for Production Deployment

- [ ] Replace mock auth with real API endpoint
- [ ] Set `android:debuggable="false"` in release build (Gradle does this automatically)
- [ ] Configure ProGuard rules for release APK
- [ ] Enable certificate pinning for API calls
- [ ] Rotate mock credentials from source code
- [ ] Enable Play Integrity API for device attestation (anti-tamper)
