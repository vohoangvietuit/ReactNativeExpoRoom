# 01 — Project Setup

> For a step-by-step guide to creating this monorepo from scratch (all CLI commands + manual config files), see [MONOREPO-QUICK-START.md](./MONOREPO-QUICK-START.md).

## Prerequisites

| Tool        | Minimum Version | Notes                         |
| ----------- | --------------- | ----------------------------- |
| Node.js     | 20+             | Use nvm or fnm                |
| pnpm        | 10.20.0+        | `npm i -g pnpm`               |
| JDK         | 17              | Required for Android build    |
| Android SDK | API 35          | Install via Android Studio    |
| Android NDK | 27.1+           | For native module compilation |

### Environment Variables

```bash
export JAVA_HOME=/path/to/jdk-17
export ANDROID_HOME=$HOME/Library/Android/sdk   # macOS
# Windows: %LOCALAPPDATA%\Android\Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

---

## Installation

Clone and install from the **workspace root**:

```bash
git clone <repo-url> ReactNativeExpoRoom
cd ReactNativeExpoRoom
pnpm install
```

> pnpm resolves all workspace packages (`apps/mobile`, `packages/*`) in a single pass.  
> The `.npmrc` sets `node-linker=hoisted` so React Native can find native deps at `node_modules/`.

---

## Key Config Files

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### `turbo.json`

Turborepo pipeline — tasks cascade through the dependency graph:

```json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["build/**"] },
    "test": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
```

### `.npmrc`

```
node-linker=hoisted
```

Required because React Native's Metro bundler and native modules expect packages to live at the root `node_modules/`.

### Linting

No `.eslintrc` file is needed. `apps/mobile` uses `expo lint`, which invokes the Expo ESLint preset automatically. To run it:

```bash
cd apps/mobile && pnpm lint
# or via Turborepo from root:
turbo run lint
```

---

## Dev Server

```bash
# Start Metro bundler
cd apps/mobile
pnpm start          # or: npx expo start

# Open on a connected Android device
pnpm android        # or: npx expo run:android
```

---

## Android Build

### Prebuild (generates native Android project from Expo config)

```bash
cd apps/mobile
npx expo prebuild --platform android --clean
```

> `--clean` wipes the `android/` folder and regenerates it. Config plugins run at this step.

### Gradle Build

```bash
cd apps/mobile/android
./gradlew assembleDebug        # debug APK
./gradlew assembleRelease      # release APK (requires signing config)
```

---

## Config Plugin: `withKspPlugin.js`

Located at `apps/mobile/plugins/withKspPlugin.js`. It runs during `expo prebuild` and:

1. **Adds KSP + Kotlin Serialization classpath** to the root `android/build.gradle`:

```groovy
classpath('com.google.devtools.ksp:com.google.devtools.ksp.gradle.plugin:2.1.20-2.0.1')
classpath('org.jetbrains.kotlin:kotlin-serialization:2.1.20')
```

2. **Restricts ABI** to `arm64-v8a` via `gradle.properties`:

```properties
reactNativeArchitectures=arm64-v8a
```

This dramatically reduces build time and APK size for device testing.

Referenced in `apps/mobile/app.json`:

```json
{
  "expo": {
    "plugins": ["./plugins/withKspPlugin"]
  }
}
```

---

## Troubleshooting

### KSP Classpath Not Found

**Symptom:** `Could not find com.google.devtools.ksp:...`

**Fix:** Run `expo prebuild --clean` to regenerate `android/build.gradle` with the plugin-injected classpath. Do **not** manually edit `android/` — it is generated.

### Disk Space Errors During Gradle Build

Gradle caches can consume 10–20 GB. Clear them:

```bash
rm -rf ~/.gradle/caches
rm -rf apps/mobile/android/.gradle
rm -rf apps/mobile/android/build
```

Then rebuild:

```bash
cd apps/mobile/android && ./gradlew assembleDebug
```

### `arm64-v8a` Architecture

The plugin locks builds to `arm64-v8a` only. If you need to build for an emulator (x86_64), temporarily override:

```bash
# In apps/mobile/android/gradle.properties:
reactNativeArchitectures=x86_64,arm64-v8a
```

Do not commit this change.

### KSP Version Mismatch

KSP must match the exact Kotlin version. Current versions:

| Package | Version      |
| ------- | ------------ |
| Kotlin  | 2.1.20       |
| KSP     | 2.1.20-2.0.1 |

If you update Kotlin, update KSP in `withKspPlugin.js` to match.
