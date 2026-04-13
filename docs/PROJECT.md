# FitSync — Project Reference

Full technical reference for the FitSync offline-first event-driven body management app.

> For day-to-day commands see [README.md](../README.md). For a step-by-step monorepo creation guide see [MONOREPO-QUICK-START.md](./MONOREPO-QUICK-START.md).

---

## App Overview

FitSync is an enterprise-grade Android tablet app for group fitness/wellness sessions. Key capabilities:

- **Event-Driven Architecture** — All state changes are immutable events stored in Room DB
- **Offline-First** — Full functionality without internet; syncs automatically when connected
- **Cross-Tablet Collaboration** — Real-time event exchange via Google Nearby Connections (Wi-Fi Direct / BLE)
- **Encrypted Storage** — SQLCipher-encrypted Room database, keys stored in Android Keystore
- **Member Identification** — NFC card scanning + digital member registration and search
- **Weight Tracking** — BLE wireless scale integration with IEEE 11073 data parsing
- **Reliable Sync** — Outbox pattern with WorkManager background scheduling and exponential backoff

---

## How to Use the App

### Login

Open the app and sign in. For local development use:

- **Email:** `test@fitsync.com`
- **Password:** `password`

Your session token is stored securely in Android Keystore via `expo-secure-store` and restored automatically on app restart.

### Tab 1 — Session (Home)

| Action              | How                                                                           |
| ------------------- | ----------------------------------------------------------------------------- |
| Start a session     | Tap **Start Session** — creates a `SessionStarted` event                      |
| View active session | Session ID, group, member count and event count shown live                    |
| View sync status    | Colour-coded card showing Pending / DeviceSynced / BackendSynced counts       |
| Trigger manual sync | Tap **Trigger Sync Now** — pushes pending events to other tablets and backend |
| End a session       | Tap **End Session** — records a `SessionEnded` event                          |

### Tab 2 — Members

| Action                  | How                                                                      |
| ----------------------- | ------------------------------------------------------------------------ |
| Switch modes            | Toggle between **Identify** and **Register** tabs at the top             |
| Scan NFC card           | In Identify mode — tap **Scan NFC Card** and hold card to back of tablet |
| Register member         | In Register mode — fill form + optionally scan an NFC card to link       |
| Clear identified member | Tap **✕ Clear** to reset the identified member card                      |

### Tab 3 — Weigh

| Action            | How                                                    |
| ----------------- | ------------------------------------------------------ |
| Connect BLE scale | Tap **Scan for Scales** → select a discovered scale    |
| Record weight     | Step on scale → tap **Save Scale Reading** when stable |
| Manual entry      | Enter weight in kg field and tap **Save**              |

### Tab 4 — Devices

| Action          | How                                              |
| --------------- | ------------------------------------------------ |
| Start discovery | Tap **Scan for Devices**                         |
| Connect         | Tap a discovered device from the list            |
| View sync info  | Shows last sync time and event counts per device |

### Tab 5 — Todos

Todos are a shared task list that syncs across all connected tablets. Useful for testing the cross-tablet sync pipeline end-to-end.

### Understanding Sync Status

| Status            | Meaning                                           |
| ----------------- | ------------------------------------------------- |
| **Pending**       | Recorded locally, not yet sent                    |
| **DeviceSynced**  | Sent to at least one nearby tablet (ACK received) |
| **BackendSynced** | Uploaded to the backend server                    |
| **Failed**        | Max retries exceeded — will retry next cycle      |

Background sync runs every **15 minutes** via WorkManager.

---

## Architecture

### 4-Layer Design

```
Layer 1 — React Native UI
├── Screens (screens/), Redux state (store/), Navigation (expo-router)
├── Shared components (components/), hooks (hooks/), services (services/)
└── Feature modules (features/<name>/)

Layer 2 — Application Abstraction
├── IDataRepository interface
├── Feature flags
└── Offline-first routing logic

Layer 3 — Bridge Layer
├── Expo Modules API
├── AsyncFunction / Events
└── JS ↔ Kotlin serialization

Layer 4 — Native Core
├── DataSync Engine SSOT (Kotlin)
├── Room Database + SQLCipher
├── WorkManager background sync
├── Google Nearby P2P connections
├── NFC card reading (Kotlin + JS bridge)
└── BLE weight scale integration
```

### Monorepo Structure

```
ReactNativeExpoRoom/
├── apps/
│   └── mobile/                 # Main Expo app (React Native)
│
├── packages/
│   ├── datasync/               # CORE: Expo Module (Kotlin + TS)
│   ├── shared/                 # TypeScript types & constants
│   ├── nfc/                    # NFC reader module (Kotlin + TS)
│   ├── ble-scale/              # BLE scale reader module (Kotlin + TS)
│   ├── ui/                     # Shared UI components
│   └── tsconfig/               # Shared TypeScript configs
│
├── docs/                       # Complete documentation
├── .github/
│   ├── instructions/           # Coding rules (8 files)
│   └── agents/                 # Specialized Copilot agents (4)
│
└── pnpm-workspace.yaml         # Monorepo config
```

### Feature-First Directory Structure

```
apps/mobile/src/
├── app/                    # expo-router routes
│   ├── (tabs)/
│   │   ├── index.tsx       # Session home
│   │   ├── members.tsx     # Member identify / register
│   │   ├── devices.tsx     # Cross-tablet devices
│   │   ├── todos.tsx       # Sync test todos
│   │   └── weigh.tsx       # Weight measurement
│   └── login.tsx           # Auth entry point
│
├── features/               # 7 feature modules
│   ├── auth/               # JWT login, token management
│   ├── session/            # Group session lifecycle
│   ├── member/             # NFC identification, registration
│   ├── devices/            # Cross-tablet sync
│   ├── sync/               # Outbox status
│   ├── todo/               # CRUD + sync testing
│   └── weigh/              # Weight recording
│
├── components/             # Shared UI
├── hooks/                  # useStore, use-theme
├── constants/              # Colors, Fonts, Spacing
└── store/                  # Redux store setup
```

---

## Data Model

### Event Types (10 Total)

All state changes are recorded as immutable events — domain tables are projections:

```typescript
SessionStarted | SessionEnded;
MemberRegistered | MemberIdentified;
PaymentRecorded;
WeightRecorded;
AwardGranted;
TodoCreated | TodoUpdated | TodoDeleted;
```

Each event includes: `eventId` (UUID), `deviceId`, `sessionId`, `payload`, `idempotencyKey`, `correlationId`.

### Outbox Pattern

```
Pending → DeviceSynced → BackendSynced
        ↓
     Failed (exponential backoff retry via WorkManager)
```

---

## Tech Stack

| Layer         | Technology              | Version      |
| ------------- | ----------------------- | ------------ |
| JavaScript/TS | TypeScript              | 5.9.2        |
| React         | React Native            | 0.83.4       |
| Framework     | Expo                    | 55.0         |
| Routing       | expo-router             | 55.0         |
| State         | Redux Toolkit           | 2.8.0        |
| Testing       | Jest + jest-expo        | 29.7 / 55.0  |
| Storybook     | @storybook/react-native | 8.6          |
| Kotlin        | Kotlin                  | 2.1.20       |
| Compiler      | KSP                     | 2.1.20-2.0.1 |
| Database      | Room                    | 2.7.1        |
| Encryption    | SQLCipher               | 4.5.4        |
| Sync          | Nearby API              | 19.3.0       |
| Background    | WorkManager             | 2.10.0       |
| Build         | Gradle                  | 9.0          |

---

## UI Components

Shared component library in `packages/ui/`:

- **Button** — Primary, secondary, danger, ghost variants
- **Card** — Container with shadow/elevation
- **Input** — Text field with label, error state
- **Badge** — Status indicators (success, warning, error, info)
- **ListItem** — Pressable list items with icons
- **StatusIndicator** — Connection/sync status (connected, syncing, offline, error)
- **Spinner** — Loading indicator

All components support light/dark themes via `colorScheme` prop.

---

## Security

- **SQLCipher** — All data encrypted at rest with 256-bit AES
- **Android Keystore** — Encryption key stored in secure hardware keystore
- **JWT Auth** — SecureStore token management, refresh token rotation
- **Event Integrity** — Idempotency keys prevent duplicate processing
- **Cross-Tablet Auth** — Device certificates for Nearby connection handshake

See [08-auth-security.md](./08-auth-security.md) for full details.

---

## Coding Standards

Rules live in `.github/instructions/` and auto-apply to all `*.ts/tsx/js/jsx` files:

| File                                     | Scope                                    |
| ---------------------------------------- | ---------------------------------------- |
| `react-core.instructions.md`             | Components, hooks, Redux, touch handling |
| `react-typescript.instructions.md`       | Interfaces, generics, strict mode        |
| `react-archiecture.instructions.md`      | Feature-first layout, barrel exports     |
| `react-performance.instructions.md`      | FlatList, memoization, bundle size       |
| `react-testing-security.instructions.md` | Testing pyramid, OWASP                   |
| `datasync.instructions.md`               | Kotlin bridge, event model               |

**Key principles:**

- Functional components only — no class components
- `StyleSheet.create()` for all styles — no inline styles
- No `any` without justification comment
- Test coverage for thunks, hooks, and form validation
- `AsyncFunction("name") Coroutine { ... }` for suspend Kotlin calls
- Events as SSOT — never write to Room directly

---

## GitHub Copilot Agents

Specialized agents in `.github/agents/`:

| Agent              | When to Use                                               |
| ------------------ | --------------------------------------------------------- |
| **Coding_Agent**   | Writing or refactoring components, hooks, screens, slices |
| **Planning_Agent** | Breaking down a feature before implementation             |
| **Review_Agent**   | Auditing code for bugs, architecture violations, security |
| **Testing_Agent**  | Generating or auditing unit, integration, and E2E tests   |

---

## Troubleshooting

### KSP Classpath Error

If you see `com.google.devtools.ksp plugin not found`:

```bash
# The config plugin plugins/withKspPlugin.js auto-injects KSP.
# If not working, manually add to apps/mobile/android/build.gradle buildscript:
classpath('com.google.devtools.ksp:com.google.devtools.ksp.gradle.plugin:2.1.20-2.0.1')
classpath('org.jetbrains.kotlin:kotlin-serialization:2.1.20')
```

### Room KSP Errors (`unexpected jvm signature V`)

```
✓ Room 2.7.1 required (not 2.6.1)
✓ Kotlin 2.1.20, KSP 2.1.20-2.0.1 compatible
✓ Check packages/datasync/android/build.gradle:
  apply plugin: 'com.google.devtools.ksp'
  kspAndroid 'androidx.room:room-compiler:2.7.1'
```

### Emulator Not Detected

```bash
adb kill-server && adb start-server && adb devices
```

### Disk Space (Build Uses 3–5 GB)

```bash
# Clean Gradle caches
cd apps/mobile/android && ./gradlew clean

# arm64-v8a only — already set in gradle.properties
reactNativeArchitectures=arm64-v8a
```

---

## Documentation Index

| File                                                 | Content                                                               |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| [01-project-setup.md](./01-project-setup.md)         | Prerequisites, installation, configuration                            |
| [02-architecture.md](./02-architecture.md)           | 4-layer design, data flow                                             |
| [03-datasync-module.md](./03-datasync-module.md)     | Room, SQLCipher, KSP setup                                            |
| [04-event-model.md](./04-event-model.md)             | Event envelope, idempotency, all 10 types                             |
| [05-cross-tablet-sync.md](./05-cross-tablet-sync.md) | Nearby Connections, device discovery                                  |
| [06-backend-sync.md](./06-backend-sync.md)           | WorkManager, batch upload, retry logic                                |
| [07-nfc-scales.md](./07-nfc-scales.md)               | NFC reading, BLE scale parsing                                        |
| [08-auth-security.md](./08-auth-security.md)         | JWT, encryption, keystore                                             |
| [09-testing-guide.md](./09-testing-guide.md)         | Jest, mocking, testing pyramid                                        |
| [10-ui-components.md](./10-ui-components.md)         | Shared UI components, usage                                           |
| [MONOREPO-QUICK-START.md](./MONOREPO-QUICK-START.md) | Create the monorepo from scratch — CLI commands + manual config files |

---

**Target Device:** Samsung S25 Ultra (arm64-v8a)  
**Build Status:** ✅ Android APK builds successfully (~82 MB, ~3m 32s)  
**License:** Proprietary — FitSync Fitness Solutions
