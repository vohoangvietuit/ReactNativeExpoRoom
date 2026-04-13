# FitSync

Offline-first, event-sourced body management Android app. React Native · Expo · Redux Toolkit · Room (SQLCipher) · NFC · BLE scales · Cross-tablet sync.

> **Full project reference:** [docs/PROJECT.md](docs/PROJECT.md)  
> **Blog-style walkthrough:** [docs/GUIDE.md](docs/GUIDE.md)

---

## 1. Init — One-Time Setup

**Prerequisites (install once):**

- **Node 20+** — `nvm install 20 && nvm use 20`
- **pnpm 10** — `npm install -g pnpm@10.20.0`
- **JDK 17** — via Android Studio or `sdk install java 17`
- **Android Studio** (API 35+) with emulator or USB device
- Shell profile must export `ANDROID_HOME` and `JAVA_HOME`

```bash
# Install all workspace dependencies (run from monorepo root)
pnpm install
```

> **After pulling new commits that rename or add packages**, always re-run `pnpm install` from the monorepo root to refresh symlinks in `node_modules`.

---

## 2. Start Dev Server (Emulator / Expo Go)

```bash
cd apps/mobile

npx expo start          # Expo dev server — press 'a' for Android emulator
npx expo start --clear  # Clear Metro cache and restart (use after dependency changes)
```

---

## 3. Build & Deploy to Android

### 3a. Debug build — emulator (fastest iteration)

```bash
cd apps/mobile

# One command: prebuild + Gradle build + install APK + start Metro
npx expo run:android
```

### 3b. Debug build — real device

Enable **USB Debugging** on your phone, connect via USB, then:

```bash
cd apps/mobile

# Verify device is detected
adb devices

# Build + install + start Metro on connected device
npx expo run:android --device
```

### 3c. Release build — real device (production testing, no Metro needed)

> Release bundles JS into the APK — the phone runs standalone with no dev server.

```bash
cd apps/mobile/android

# Build release APK
./gradlew assembleRelease

# Install on connected device
adb install -r app/build/outputs/apk/release/app-release.apk

# Launch the app
adb shell am start -n com.fitsync.mobile/.MainActivity
```

Or as a single Expo command (handles prebuild + Gradle + install):

```bash
cd apps/mobile
npx expo run:android --variant release
```

### 3d. Manual Gradle (full control / incremental builds)

```bash
cd apps/mobile

# Generate native project (first time or after config changes)
npx expo prebuild --platform android

# Build debug APK manually
cd android && ./gradlew assembleDebug

# Install and launch
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.fitsync.mobile/.MainActivity

# Start Metro in a separate terminal
cd .. && npx expo start --port 8081
```

### 3e. Check / reset ADB devices

```bash
adb devices                                          # list connected devices/emulators
adb kill-server && adb start-server && adb devices   # reset ADB if device not showing
```

---

## 4. Troubleshooting & Clean Builds

### Dependency / Metro resolution issues

If Metro throws `Unable to resolve "@fitsync/..."` after pulling new commits:

```bash
# From monorepo root — re-link all workspace packages
pnpm install

# Then restart Metro with cache cleared
cd apps/mobile && npx expo start --clear
```

### Full clean — Gradle + Metro + prebuild

Use this when builds fail with unexplained errors or after major dependency updates:

```bash
# 1. Clean Gradle build outputs
cd apps/mobile/android && ./gradlew clean

# 2. Clean and regenerate native project
cd ..
npx expo prebuild --platform android --clean

# 3. Clear Metro cache
npx expo start --clear

# 4. Full rebuild
cd android && ./gradlew assembleDebug
```

### Nuclear clean — wipe everything and start fresh

```bash
# From monorepo root

# 1. Remove all node_modules (monorepo root + all workspaces)
find . -name "node_modules" -type d -prune -exec rm -rf {} +

# 2. Remove pnpm lock file
rm -f pnpm-lock.yaml

# 3. Remove Metro + Expo caches
rm -rf apps/mobile/.expo
rm -rf apps/mobile/android/build
rm -rf apps/mobile/android/app/build

# 4. Reinstall all dependencies (regenerates lock file + symlinks)
pnpm install

# 5. Clean and regenerate native project
cd apps/mobile
npx expo prebuild --platform android --clean

# 6. Full rebuild
cd android && ./gradlew clean && ./gradlew assembleDebug
```

> **Windows (PowerShell alternative for step 1+2):**
>
> ```powershell
> Get-ChildItem -Recurse -Directory -Filter "node_modules" | Remove-Item -Recurse -Force
> Remove-Item pnpm-lock.yaml -ErrorAction SilentlyContinue
> ```

---

## 5. Tests

```bash
# Run all tests in mobile app
cd apps/mobile && npx jest

# Run all workspace tests (from monorepo root)
pnpm test

# Watch mode (re-runs on save)
cd apps/mobile && npx jest --watch

# Coverage report (targets: >80% all metrics)
cd apps/mobile && npx jest --coverage

# Coverage — text summary only
cd apps/mobile && npx jest --coverage --coverageReporters=text-summary

# Run a specific test file
cd apps/mobile && npx jest src/features/member/store/__tests__/memberSlice.test.ts

# Run tests matching a pattern (use pattern, not path, for files with parentheses)
cd apps/mobile && npx jest --testPathPattern "members.test" --no-coverage

# Shared package tests
cd packages/shared && npx jest
```

**Current coverage (mobile app):**

| Metric     | Coverage |
| ---------- | -------- |
| Statements | 95.98%   |
| Branches   | 85.29%   |
| Functions  | 98.85%   |
| Lines      | 96.26%   |

---

## 6. Storybook

Stories are auto-discovered from `src/**/*.stories.?(ts|tsx)`.

```bash
cd apps/mobile

# Start Storybook mode on Android device / emulator
pnpm storybook              # sets EXPO_PUBLIC_STORYBOOK_ENABLED=true, then press 'a'
pnpm storybook:android      # same + immediately targets Android

# Normal app (default)
pnpm start
```

> Storybook and the normal app share the same build — toggled by the `EXPO_PUBLIC_STORYBOOK_ENABLED` env flag in [index.js](apps/mobile/index.js).

Current stories:

| File                               | Stories                                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `MemberIdentifyScreen.stories.tsx` | NoSession, IdleReady, Scanning, MemberFound, MemberNotFound, NfcNotSupported, ScanError                                                     |
| `RegisterMemberScreen.stories.tsx` | EmptyForm, FilledFormNoNfc, WithNfcCard, NfcScanning, Submitting, WithError, RegistrationSuccess, RegistrationSuccessNoNfc, NfcNotSupported |

---

## 7. Adding New Packages

The monorepo has two kinds of packages under `packages/`:

| Type                                              | Examples                       | When to use                                |
| ------------------------------------------------- | ------------------------------ | ------------------------------------------ |
| **Native Expo Module** (JS + Kotlin/Swift bridge) | `datasync`, `nfc`, `ble-scale` | Needs Android/iOS native code              |
| **Pure JS/TS package**                            | `shared`, `ui`, `tsconfig`     | TypeScript types, utilities, UI components |

---

### 7a. New Native Expo Module (JS ↔ Kotlin bridge)

> Used for: `packages/datasync`, `packages/nfc`, `packages/ble-scale`.  
> These expose Kotlin/Android APIs (Room, NFC, BLE) to React Native via the Expo Modules API.

```bash
# From the monorepo root — scaffold a new local Expo module
npx create-expo-module@latest packages/my-module --local

# This generates:
#   packages/my-module/
#     expo-module.config.json   ← declares Android/iOS module class
#     package.json
#     src/index.ts              ← JS/TS API surface
#     android/src/main/java/... ← Kotlin module class
```

After scaffolding:

1. **Rename the package** in `packages/my-module/package.json`:

   ```json
   { "name": "@fitsync/my-module" }
   ```

2. **Add to `apps/mobile/package.json`** dependencies:

   ```json
   { "@fitsync/my-module": "workspace:*" }
   ```

3. **Update `tsconfig.json` extends** in the new package:

   ```json
   { "extends": "@fitsync/tsconfig/react-native.json" }
   ```

4. **Re-link workspaces:**

   ```bash
   pnpm install
   ```

5. **Regenerate native project** so Expo Autolinking picks up the new module:
   ```bash
   cd apps/mobile && npx expo prebuild --platform android
   ```

---

### 7b. New Pure JS/TS Package (no native code)

> Used for: `packages/shared` (types, events, constants), `packages/ui` (React Native components).

```bash
# From monorepo root
mkdir packages/my-package
cd packages/my-package

# Initialise package
npm init -y
```

Minimal `package.json`:

```json
{
  "name": "@fitsync/my-package",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "lint": "tsc --noEmit",
    "test": "jest"
  },
  "devDependencies": {
    "typescript": "~5.8.3"
  }
}
```

Add a `tsconfig.json`:

```json
{
  "extends": "@fitsync/tsconfig/react-native.json",
  "include": ["src"]
}
```

Create the entry point:

```bash
mkdir src && touch src/index.ts
```

Then wire it up:

```bash
# Add to apps/mobile/package.json dependencies:
#   "@fitsync/my-package": "workspace:*"

# From monorepo root — re-link
pnpm install
```

---

## 8. Docs

| File                                                         | Content                                                     |
| ------------------------------------------------------------ | ----------------------------------------------------------- |
| [docs/PROJECT.md](docs/PROJECT.md)                           | Full architecture, data model, tech stack, coding standards |
| [docs/GUIDE.md](docs/GUIDE.md)                               | Blog-style walkthrough from scratch                         |
| [docs/01-project-setup.md](docs/01-project-setup.md)         | Prerequisites, installation                                 |
| [docs/02-architecture.md](docs/02-architecture.md)           | 4-layer design, data flow                                   |
| [docs/03-datasync-module.md](docs/03-datasync-module.md)     | Room, SQLCipher, KSP                                        |
| [docs/04-event-model.md](docs/04-event-model.md)             | Event types, idempotency                                    |
| [docs/05-cross-tablet-sync.md](docs/05-cross-tablet-sync.md) | Nearby Connections                                          |
| [docs/07-nfc-scales.md](docs/07-nfc-scales.md)               | NFC + BLE scale integration                                 |
| [docs/08-auth-security.md](docs/08-auth-security.md)         | JWT, encryption, keystore                                   |
| [docs/09-testing-guide.md](docs/09-testing-guide.md)         | Testing pyramid, mocking                                    |

---

**Target:** Samsung S25 Ultra (arm64-v8a) · **License:** Proprietary — FitSync Fitness Solutions
