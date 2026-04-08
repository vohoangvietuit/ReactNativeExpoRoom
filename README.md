# XPW2

Offline-first, event-sourced body management Android app. React Native · Expo · Redux Toolkit · Room (SQLCipher) · NFC · BLE scales · Cross-tablet sync.

> **Full project reference:** [docs/PROJECT.md](docs/PROJECT.md)  
> **Blog-style walkthrough:** [docs/GUIDE.md](docs/GUIDE.md)

---

## 1. Init — One-Time Setup

```bash
# Node 20+
nvm install 20 && nvm use 20

# pnpm
npm install -g pnpm@10.20.0

# All workspace dependencies
pnpm install
```

Also required: **JDK 17**, **Android Studio** (API 35+), `ANDROID_HOME` and `JAVA_HOME` set in your shell profile.

---

## 2. Start Dev Server

```bash
cd apps/mobile

npx expo start         # Expo dev server (press 'a' for Android emulator)
npx expo start --clear # Clear Metro cache and restart
```

---

## 3. Deploy to Real Device (Android)

Connect your phone via USB with USB Debugging enabled, then:

### Debug build (fastest for iteration)

```bash
# Option A — one command: prebuild + install + start Metro
cd apps/mobile
npx expo run:android
(npx expo run:android --variant release)

# Option B — manual Gradle (full control / incremental)
cd apps/mobile
npx expo prebuild --platform android          # generate native project (first time)
cd android && ./gradlew assembleDebug         # build APK
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.xpw2.mobile/.MainActivity
cd .. && npx expo start --port 8081           # start Metro in separate terminal
```

### Release build (production testing on device)

```bash
cd apps/mobile/android

./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
adb shell am start -n com.xpw2.mobile/.MainActivity
```

> Release builds run without Metro — the JS bundle is embedded in the APK.

### Check connected devices

```bash
adb devices                       # list connected devices/emulators
adb kill-server && adb start-server && adb devices   # reset if not showing
```

### Clean and rebuild from scratch

```bash
cd apps/mobile/android && ./gradlew clean
cd .. && npx expo prebuild --platform android --clean
cd android && ./gradlew assembleDebug
```

---

## 4. Tests

```bash
# Run all tests in mobile app
cd apps/mobile && npx jest

# Run all workspace tests
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

| Metric | Coverage |
|---|---|
| Statements | 95.98% |
| Branches | 85.29% |
| Functions | 98.85% |
| Lines | 96.26% |

---

## 5. Storybook

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

| File | Stories |
|---|---|
| `MemberIdentifyScreen.stories.tsx` | NoSession, IdleReady, Scanning, MemberFound, MemberNotFound, NfcNotSupported, ScanError |
| `RegisterMemberScreen.stories.tsx` | EmptyForm, FilledFormNoNfc, WithNfcCard, NfcScanning, Submitting, WithError, RegistrationSuccess, RegistrationSuccessNoNfc, NfcNotSupported |

---

## 6. Docs

| File | Content |
|---|---|
| [docs/PROJECT.md](docs/PROJECT.md) | Full architecture, data model, tech stack, coding standards |
| [docs/GUIDE.md](docs/GUIDE.md) | Blog-style walkthrough from scratch |
| [docs/01-project-setup.md](docs/01-project-setup.md) | Prerequisites, installation |
| [docs/02-architecture.md](docs/02-architecture.md) | 4-layer design, data flow |
| [docs/03-datasync-module.md](docs/03-datasync-module.md) | Room, SQLCipher, KSP |
| [docs/04-event-model.md](docs/04-event-model.md) | Event types, idempotency |
| [docs/05-cross-tablet-sync.md](docs/05-cross-tablet-sync.md) | Nearby Connections |
| [docs/07-nfc-scales.md](docs/07-nfc-scales.md) | NFC + BLE scale integration |
| [docs/08-auth-security.md](docs/08-auth-security.md) | JWT, encryption, keystore |
| [docs/09-testing-guide.md](docs/09-testing-guide.md) | Testing pyramid, mocking |

---

**Target:** Samsung S25 Ultra (arm64-v8a) · **License:** Proprietary — XPW2 Fitness Solutions
