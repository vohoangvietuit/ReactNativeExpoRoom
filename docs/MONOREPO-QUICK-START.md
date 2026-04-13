# pnpm Monorepo · Create from Scratch Guide

> Step-by-step guide to building this exact monorepo pattern. Covers every CLI command, every manual config file, and how all the pieces connect.

---

## 1. What This Monorepo Contains

**FitSync** — an offline-first Android tablet app built as a **pnpm + Turborepo monorepo**.

| Layer                | Tech                                               |
| -------------------- | -------------------------------------------------- |
| JS / React Native    | Expo · expo-router · Redux Toolkit · TypeScript    |
| Bridge (JS ↔ Kotlin) | Expo Modules API (`AsyncFunction … Coroutine { }`) |
| Native Android       | Room 2.7.1 · SQLCipher · WorkManager · Nearby      |

---

## 2. Repo Structure

```
ReactNativeExpoRoom/
├── apps/
│   └── mobile/          ← Expo RN app (screens, Redux, navigation)
│       ├── src/
│       │   ├── app/         expo-router routes
│       │   ├── features/    feature-first: auth/ session/ member/ …
│       │   ├── store/       Redux slices
│       │   └── components/  shared UI re-exports
│       └── plugins/
│           └── withKspPlugin.js   ← Expo config plugin: injects KSP at prebuild
│
├── packages/
│   ├── tsconfig/        ← Shared TypeScript configs (base.json, react-native.json)
│   ├── shared/          ← Pure TS: domain types, event definitions, constants
│   ├── ui/              ← Shared React Native component library + theme tokens
│   ├── datasync/        ← Expo Module (Kotlin + Room + WorkManager + Nearby)
│   ├── nfc/             ← Expo Module (NFC card reader)
│   └── ble-scale/       ← Expo Module (BLE weight scale reader)
│
├── .npmrc               ← node-linker=hoisted (required for React Native)
├── pnpm-workspace.yaml  ← declares apps/* and packages/* as workspaces
└── turbo.json           ← Turborepo task pipeline
```

---

## 3. CLI vs Manual — What Needs a Command vs What You Create By Hand

> **The most important thing to understand before starting.** Only a handful of CLI tools exist. Almost all config files must be created manually.

### What a CLI creates for you

| Action                        | Command                                                    | What it generates                                                              |
| ----------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Init root `package.json`      | `pnpm init`                                                | Bare `package.json` (you edit it)                                              |
| Create a React Native app     | `npx create-expo-app@latest apps/mobile`                   | Full Expo app with `app.json`, dependencies, `src/`, metro config              |
| Create an Expo Module package | `npx create-expo-module@latest packages/my-module --local` | Kotlin stub, `expo-module.config.json`, `src/index.ts`, `android/build.gradle` |
| Init any package              | `pnpm init` (inside the package folder)                    | Bare `package.json` — nothing else                                             |
| Add a dependency              | `pnpm add <pkg> --workspace`                               | Updates `package.json` only                                                    |

### What you must create manually (no CLI)

| File                                       | Where                | Purpose                                                       |
| ------------------------------------------ | -------------------- | ------------------------------------------------------------- |
| `pnpm-workspace.yaml`                      | root                 | Declares which folders are workspaces                         |
| `.npmrc`                                   | root                 | `node-linker=hoisted` — required for Metro/RN                 |
| `turbo.json`                               | root                 | Task pipeline (build → test → lint order)                     |
| `packages/tsconfig/base.json`              | packages/tsconfig/   | Shared strict TS settings                                     |
| `packages/tsconfig/react-native.json`      | packages/tsconfig/   | Adds JSX + RN types on top of base                            |
| `packages/tsconfig/package.json`           | packages/tsconfig/   | Marks package as `@fitsync/tsconfig`                          |
| `tsconfig.json` (per package)              | each package         | Extends `@fitsync/tsconfig/...`                               |
| `tsconfig.json` (root)                     | root                 | Project references for IDE support                            |
| `apps/mobile/plugins/withKspPlugin.js`     | apps/mobile/plugins/ | Expo config plugin — injects KSP classpath into Android build |
| `expo-module.config.json` (edit after CLI) | each Expo module     | Points to the correct Kotlin class name                       |
| `package.json` edits (peerDeps, exports)   | each package         | Manual after `pnpm init`                                      |

---

## 4. Phase 1 — Root Scaffold

```bash
mkdir my-monorepo && cd my-monorepo
pnpm init
```

Then create these 3 files by hand:

**`pnpm-workspace.yaml`** — tells pnpm which folders contain packages:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**`.npmrc`** — required so Metro bundler can find `react-native` at the root `node_modules/`:

```
node-linker=hoisted
```

**`turbo.json`** — defines task cascade order across all packages:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["build/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "cache": false
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "persistent": true,
      "cache": false
    }
  }
}
```

Edit **root `package.json`** to add Turborepo, shared devDependencies, and resolution overrides:

```json
{
  "name": "my-monorepo",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @myapp/mobile expo start",
    "android": "pnpm --filter @myapp/mobile expo run:android",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.5.0",
    "typescript": "~5.8.3"
  },
  "resolutions": {
    "react": "19.2.0",
    "react-native": "0.83.4"
  },
  "packageManager": "pnpm@10.20.0",
  "engines": { "node": ">=20.0.0" }
}
```

> **Why `resolutions`?** This pins `react` and `react-native` to one version across the entire monorepo. Without this, different packages can resolve different versions and cause runtime conflicts.

---

## 5. Phase 2 — Shared TypeScript Configs Package

This package has no runtime code — it only provides `tsconfig` presets that all other packages extend. Create it **before** any other package, because every other `tsconfig.json` will reference it.

```bash
mkdir -p packages/tsconfig
```

Create these 3 files manually:

**`packages/tsconfig/package.json`**:

```json
{
  "name": "@myapp/tsconfig",
  "version": "0.0.1",
  "private": true,
  "files": ["base.json", "react-native.json"]
}
```

**`packages/tsconfig/base.json`** — strict TypeScript for pure TS packages:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ESNext",
    "lib": ["ESNext"]
  }
}
```

**`packages/tsconfig/react-native.json`** — extends base, adds JSX + React Native types:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "types": ["react-native", "jest"],
    "lib": ["ESNext"],
    "module": "ESNext",
    "target": "ESNext"
  }
}
```

No `pnpm install` needed yet — this package is simply referenced by path in other `tsconfig.json` files.

---

## 6. Phase 3 — Create the React Native App

```bash
npx create-expo-app@latest apps/mobile
```

This CLI generates the full Expo project. Then make these manual edits:

**1. Rename it in `apps/mobile/package.json`:**

```json
{
  "name": "@myapp/mobile",
  ...
}
```

**2. Remove Expo project init boilerplate** (not relevant to production):

- `apps/mobile/scripts/reset-project.js` — delete it + remove the `"reset-project"` script entry
- `apps/mobile/assets/images/expo-logo.png`, `react-logo.png`, etc. — replace with your own assets

**3. Create `apps/mobile/tsconfig.json`** — extend the shared config:

```json
{
  "extends": "@myapp/tsconfig/react-native.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.d.ts", "expo-env.d.ts"]
}
```

**4. Create the root `tsconfig.json`** for IDE project references:

```json
{
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": true
  },
  "references": [
    { "path": "packages/shared" },
    { "path": "packages/ui" },
    { "path": "apps/mobile" }
  ],
  "files": []
}
```

**5. Link workspace packages** — add to `apps/mobile/package.json` dependencies:

```json
{
  "dependencies": {
    "@myapp/shared": "workspace:*",
    "@myapp/ui": "workspace:*",
    "@myapp/datasync": "workspace:*"
  }
}
```

```bash
# From the monorepo root — links all workspace packages
pnpm install
```

---

## 7. Phase 4 — Create a Pure TypeScript Package (`@myapp/shared`)

Use this pattern for packages that contain only TypeScript — types, constants, utilities, event definitions. No native code, no JSX.

```bash
mkdir -p packages/shared/src
cd packages/shared
pnpm init
```

**Manually edit `packages/shared/package.json`:**

```json
{
  "name": "@myapp/shared",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "lint": "tsc --noEmit",
    "test": "jest",
    "clean": "rm -rf build"
  },
  "devDependencies": {
    "@myapp/tsconfig": "workspace:*",
    "@types/jest": "^29.5.14",
    "typescript": "~5.8.3"
  }
}
```

**Create `packages/shared/tsconfig.json`:**

```json
{
  "extends": "@myapp/tsconfig/base.json",
  "include": ["src"]
}
```

**Create `packages/shared/src/index.ts`** — your barrel export:

```typescript
export * from './domain';
export * from './events';
export * from './constants';
```

```bash
# From monorepo root — resolves the new workspace:* ref in shared's devDeps
pnpm install
```

---

## 8. Phase 5 — Create a React Native UI Package (`@myapp/ui`)

Use this pattern for packages that contain React Native components, theme tokens, and shared hooks. The key difference from `shared` is:

- `peerDependencies` instead of `dependencies` for `react` and `react-native`
- `react-native.json` tsconfig preset instead of `base.json`
- `exports` map for sub-path imports like `@myapp/ui/theme`

```bash
mkdir -p packages/ui/src
cd packages/ui
pnpm init
```

**Manually edit `packages/ui/package.json`:**

```json
{
  "name": "@myapp/ui",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./theme": "./src/theme/index.ts",
    "./hooks": "./src/hooks/index.ts"
  },
  "scripts": {
    "lint": "tsc --noEmit",
    "clean": "rm -rf build"
  },
  "peerDependencies": {
    "react": "*",
    "react-native": "*"
  },
  "devDependencies": {
    "@myapp/tsconfig": "workspace:*",
    "typescript": "~5.8.3"
  }
}
```

**Create `packages/ui/tsconfig.json`:**

```json
{
  "extends": "@myapp/tsconfig/react-native.json",
  "compilerOptions": {
    "outDir": "build",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

> **Why `peerDependencies`?** The mobile app already installs `react` and `react-native`. If `ui` listed them as regular `dependencies`, you'd get two copies — causing the "Invalid hook call" error. `peerDependencies` tells pnpm "use whatever version the app has."

**Typical folder layout for `packages/ui/src/`:**

```
src/
  index.ts           ← barrel export of everything
  theme/
    colors.ts        ← ColorScheme tokens (light + dark)
    typography.ts    ← Fonts, FontSize scale
    spacing.ts       ← Spacing, BorderRadius
    index.ts
  hooks/
    useTheme.ts      ← useColorScheme() → theme object
    index.ts
  Button/
    Button.tsx
    index.ts
  Card/
    Card.tsx
    index.ts
  Input/
    Input.tsx
    index.ts
```

```bash
pnpm install
```

---

## 9. Phase 6 — Create an Expo Module Package (JS ↔ Kotlin Bridge)

Use this pattern when you need Android native code: database access, BLE, NFC, sensors, etc. The Expo Modules API is the bridge between JavaScript and Kotlin.

### Step 1 — Scaffold with CLI

```bash
# Run from the monorepo ROOT (not inside packages/)
npx create-expo-module@latest packages/my-module --local
```

This generates:

```
packages/my-module/
  expo-module.config.json   ← auto-generated, needs editing
  package.json              ← needs editing
  src/
    MyModuleModule.ts       ← auto-generated TS stub
    index.ts
  android/
    build.gradle            ← base Android config
    src/main/java/expo/modules/mymodule/
      MyModuleModule.kt     ← Kotlin module stub
```

### Step 2 — Edit the generated files

**`packages/my-module/expo-module.config.json`** — update the Kotlin class path:

```json
{
  "platforms": ["android"],
  "android": {
    "modules": ["expo.modules.mymodule.MyModuleModule"]
  }
}
```

**`packages/my-module/package.json`** — rename and add peerDeps:

```json
{
  "name": "@myapp/my-module",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "lint": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "*",
    "react-native": "*"
  },
  "devDependencies": {
    "@myapp/tsconfig": "workspace:*",
    "typescript": "~5.8.3"
  }
}
```

**Create `packages/my-module/tsconfig.json`:**

```json
{
  "extends": "@myapp/tsconfig/react-native.json",
  "include": ["src"]
}
```

### Step 3 — Write the Kotlin module

Replace the stub in `packages/my-module/android/src/main/java/expo/modules/mymodule/MyModuleModule.kt`:

```kotlin
package expo.modules.mymodule

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.functions.Coroutine

class MyModuleModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MyModule")

    // All suspend function calls MUST use Coroutine { } infix
    AsyncFunction("getData") Coroutine { ->
      mapOf("result" to "hello from Kotlin")
    }

    // Emit events back to JS
    Events("onDataChanged")
  }
}
```

> **Critical rule:** Any `AsyncFunction` body that calls a `suspend` function must use `Coroutine { }` infix. Without it, the call blocks the JS thread and the app will hang.

### Step 4 — Write the TypeScript wrapper

Replace `packages/my-module/src/index.ts`:

```typescript
import { requireNativeModule } from 'expo-modules-core';

const MyModuleNative = requireNativeModule('MyModule');

export const MyModule = {
  getData: (): Promise<{ result: string }> => MyModuleNative.getData(),
};
```

### Step 5 — If using Room (database): add the KSP config plugin

Room uses Kotlin Symbol Processing to generate DAO code at compile time. You need a config plugin to inject the KSP classpath during `expo prebuild`.

**Create `apps/mobile/plugins/withKspPlugin.js`:**

```javascript
const { withProjectBuildGradle, withGradleProperties } = require('expo/config-plugins');

function withKspPlugin(config) {
  // Inject KSP + serialization into root android/build.gradle
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let contents = config.modResults.contents;
      if (!contents.includes('com.google.devtools.ksp')) {
        contents = contents.replace(
          "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')",
          "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')\n" +
            "    classpath('com.google.devtools.ksp:com.google.devtools.ksp.gradle.plugin:2.1.20-2.0.1')\n" +
            "    classpath('org.jetbrains.kotlin:kotlin-serialization:2.1.20')",
        );
      }
      config.modResults.contents = contents;
    }
    return config;
  });

  // Lock to arm64-v8a (device builds only)
  config = withGradleProperties(config, (config) => {
    const props = config.modResults;
    const archProp = props.find(
      (p) => p.type === 'property' && p.key === 'reactNativeArchitectures',
    );
    if (archProp) archProp.value = 'arm64-v8a';
    return config;
  });

  return config;
}

module.exports = withKspPlugin;
```

**Register the plugin in `apps/mobile/app.json`:**

```json
{
  "expo": {
    "plugins": ["./plugins/withKspPlugin"]
  }
}
```

### Step 6 — Link and regenerate

```bash
# Add to apps/mobile/package.json dependencies:
# "@myapp/my-module": "workspace:*"

# From monorepo root
pnpm install

# Regenerate Android project so Expo autolinking picks up the new Kotlin module
cd apps/mobile
npx expo prebuild --platform android --clean
```

---

## 10. How Packages Connect — The Full Link Chain

Understanding this chain prevents the most common "package not found" and "module not found" errors.

```
pnpm-workspace.yaml
  └─ declares packages/ui, packages/shared, etc. as workspace packages

apps/mobile/package.json
  └─ "@myapp/ui": "workspace:*"   ← workspace protocol
       │
       ▼
pnpm install
  └─ creates: node_modules/@myapp/ui → ../../packages/ui  (symlink)

Metro bundler (TypeScript / JS resolution)
  └─ import { Button } from '@myapp/ui'
       │
       ▼
  resolves to: packages/ui/src/index.ts   (via "main" field in package.json)

expo prebuild (Android native resolution)
  └─ scans node_modules/ for expo-module.config.json
       │
       ▼
  finds: node_modules/@myapp/my-module/expo-module.config.json
       │
       ▼
  auto-generates: ExpoModulesPackageList.java
    → registers: MyModuleModule.kt in the APK

Turborepo (build task order)
  └─ turbo run build
       │
       ▼
  reads "dependsOn": ["^build"]
       │
       ▼
  builds shared → ui → mobile (in correct dependency order)
```

### Workspace dependency graph

```
apps/mobile
  ├── @myapp/shared    (pure TS types)
  ├── @myapp/ui        (RN components + theme)
  ├── @myapp/datasync  (Expo Module: Room)
  ├── @myapp/nfc       (Expo Module: NFC)
  └── @myapp/ble-scale (Expo Module: BLE)

@myapp/ui
  └── @myapp/tsconfig  (devDep: TS config preset)

@myapp/shared
  └── @myapp/tsconfig  (devDep: TS config preset)
```

---

## 11. TypeScript Config Inheritance Chain

No `.eslintrc` file is needed in this project — `expo lint` (run via `pnpm lint` in `apps/mobile`) uses the Expo ESLint preset automatically.

The TypeScript config inheritance looks like this:

```
packages/tsconfig/base.json           ← strict settings, no JSX
    └─ packages/tsconfig/react-native.json  ← adds jsx: react-jsx, RN types
           ├─ packages/ui/tsconfig.json
           ├─ packages/nfc/tsconfig.json
           ├─ packages/ble-scale/tsconfig.json
           └─ apps/mobile/tsconfig.json     ← adds paths: { "@/*": ["./src/*"] }

packages/tsconfig/base.json
    └─ packages/shared/tsconfig.json        ← pure TS, no JSX needed
```

Each package's `tsconfig.json` is minimal — just one `extends` line plus `include`:

```json
{
  "extends": "@myapp/tsconfig/react-native.json",
  "include": ["src"]
}
```

The root `tsconfig.json` exists only so IDE tooling (VS Code, language servers) can understand the whole project at once via TypeScript project references. It has no effect on compilation.

---

## 12. Expo Modules API — JS ↔ Kotlin Pattern Reference

### Kotlin side

```kotlin
class ExpoDataSyncModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DataSync")

    // Async call that returns a value (use Coroutine for suspend fns)
    AsyncFunction("recordEvent") Coroutine { payload: String ->
      engine.recordEvent(Json.decodeFromString(payload))
    }

    // Push real-time event to JS
    Events("onSyncStatusChanged")
  }
}
```

### TypeScript side

```typescript
import { requireNativeModule, EventEmitter } from 'expo-modules-core';

const DataSyncNative = requireNativeModule('DataSync');
const emitter = new EventEmitter(DataSyncNative);

export const DataSync = {
  recordEvent: (payload: object) => DataSyncNative.recordEvent(JSON.stringify(payload)),

  addSyncListener: (handler: (status: SyncStatus) => void) =>
    emitter.addListener('onSyncStatusChanged', handler),
};
```

### Usage in a Redux thunk

```typescript
export const recordWeightThunk = createAsyncThunk('weigh/record', async (data: WeightPayload) => {
  const eventId = await DataSync.recordEvent({ type: 'WeightRecorded', ...data });
  return eventId;
});
```

---

## 13. Quick Command Reference

```bash
# From monorepo root
pnpm install                              # install + link all workspaces
turbo run build                           # build all packages in dependency order
turbo run test                            # test all packages
turbo run lint                            # lint all packages
turbo run typecheck                       # type-check all packages

# Mobile app
cd apps/mobile
npx expo start                            # Metro dev server (press 'a' for Android)
npx expo start --clear                    # Metro with cache cleared
npx expo prebuild --platform android      # generate android/ from Expo config
npx expo prebuild --platform android --clean  # wipe + regenerate android/
npx expo run:android                      # debug build — install on connected device/emulator
npx expo run:android --variant release    # release build — bundles JS into APK, no Metro needed
npx jest                                  # run tests
npx jest --coverage                       # run tests with coverage report

# Gradle (direct, faster for incremental builds)
cd apps/mobile/android
./gradlew assembleDebug                   # debug APK
./gradlew assembleRelease                 # release APK
./gradlew clean                           # wipe build outputs
```

> **`--variant release` explained:**
>
> |                         | `run:android` (debug)             | `run:android --variant release`                          |
> | ----------------------- | --------------------------------- | -------------------------------------------------------- |
> | JS bundled into APK?    | No — loaded from Metro at runtime | Yes — `index.android.bundle` embedded                    |
> | Requires running Metro? | Yes                               | No — app is fully standalone                             |
> | Minified / optimised?   | No                                | Yes                                                      |
> | Use case                | Day-to-day development            | Testing production behaviour on a real device            |
> | Signing                 | Debug keystore (auto)             | Requires a release keystore configured in `build.gradle` |
>
> Under the hood it runs `expo prebuild` (if `android/` is missing) then calls `./gradlew assembleRelease` and installs the APK via `adb`. The equivalent manual steps are:
>
> ```bash
> cd apps/mobile/android
> ./gradlew assembleRelease
> adb install -r app/build/outputs/apk/release/app-release.apk
> adb shell am start -n com.fitsync.mobile/.MainActivity
> ```

---

## 14. Gotchas

| Problem                                   | Cause                                        | Fix                                                                                                |
| ----------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Unable to resolve "@myapp/..."` in Metro | pnpm symlink missing                         | Run `pnpm install` from monorepo root, then `npx expo start --clear`                               |
| KSP classpath not found during Gradle     | `withKspPlugin.js` not registered            | Check `app.json` has `"plugins": ["./plugins/withKspPlugin"]`                                      |
| `AsyncFunction` hangs app                 | Calling a suspend fn without `Coroutine { }` | Wrap every suspend call: `AsyncFunction("x") Coroutine { → ... }`                                  |
| Room compile error after adding entity    | Entity not registered in `@Database`         | Add class to `entities = [...]` array and bump `version`                                           |
| `Invalid hook call`                       | Multiple copies of `react`                   | Add `resolutions` in root `package.json` to pin to one version                                     |
| ABI mismatch on emulator                  | `arm64-v8a` only build                       | Temporarily set `reactNativeArchitectures=x86_64,arm64-v8a` in `gradle.properties` (do not commit) |
| KSP version mismatch                      | Kotlin + KSP versions out of sync            | KSP version must exactly match Kotlin: `2.1.20` → `2.1.20-2.0.1`                                   |
| Package not picked up by Expo autolinking | Missing `expo-module.config.json`            | Ensure file exists and `modules` array points to correct Kotlin package path                       |
