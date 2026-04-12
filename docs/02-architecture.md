# 02 — Architecture

## Overview

FitSync is a four-layer, offline-first Android application. Every state change is recorded as an immutable event, stored locally in a SQLCipher-encrypted Room database, and eventually synchronized across devices and to the backend.

---

## Four-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 1 — React Native UI                                          │
│                                                                     │
│  expo-router screens │ Redux Toolkit store │ @fitsync/ui components   │
│  Feature-first: auth/ member/ session/ weigh/ devices/ todo/       │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ useDispatch / useSelector
┌───────────────────────────────▼─────────────────────────────────────┐
│  Layer 2 — Application Abstraction                                  │
│                                                                     │
│  IDataRepository interface │ Feature flags │ Offline-first logic   │
│  Redux async thunks call DataSync bridge methods                    │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ Expo Modules API (JS ↔ Kotlin)
┌───────────────────────────────▼─────────────────────────────────────┐
│  Layer 3 — Bridge Layer (@fitsync/datasync JS side)                   │
│                                                                     │
│  requireNativeModule('ExpoDataSync')                               │
│  AsyncFunction calls │ NativeEvent subscriptions                   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ Kotlin coroutines
┌───────────────────────────────▼─────────────────────────────────────┐
│  Layer 4 — Native Core (ExpoDataSyncModule.kt)                     │
│                                                                     │
│  DataSyncEngine │ Room + SQLCipher (SSOT)                          │
│  EventOutbox    │ NearbyManager (Google Nearby Connections)        │
│  WorkManager    │ BackendSyncManager                               │
│  KeystoreHelper │ NearbyPayloadHandler                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Write Path (UI → DB)

```
1. User action (e.g., weigh member)
2. React component dispatches Redux thunk
3. Thunk calls DataSync.recordEvent(eventType, payload)
4. JS bridge invokes ExpoDataSyncModule AsyncFunction
5. Kotlin coroutine writes EventEntity to Room (SSOT)
6. DataSyncEngine projects event into domain table (e.g., WeightRecordEntity)
7. OutboxEntity created with status = Pending
8. Bridge emits "onEventRecorded" back to JS
9. Redux state updated via returned data
```

### Read Path (DB → UI)

```
1. Redux thunk calls DataSync.queryMembers() / getSessions() / etc.
2. Bridge invokes Kotlin AsyncFunction with coroutine
3. Room DAO query returns entities
4. Entities serialized to JSON, returned to JS
5. Redux store updated, UI re-renders
```

### Sync Path (Outbox → Devices → Backend)

```
Outbox (Pending)
   │
   ├─► NearbyManager broadcasts to connected tablets
   │      └─► On ACK: OutboxEntry.status = DeviceSynced
   │
   └─► WorkManager SyncWorker (periodic / triggered)
          └─► BackendSyncManager.uploadBatch(entries)
                 └─► On success: OutboxEntry.status = BackendSynced
                     On failure: status = Failed, retryCount++
```

---

## SSOT Principle

The **Room database is the single source of truth**. React Native UI state is a projection of what is in Room:

- Redux store is a read cache populated on demand
- Events are immutable once written — never updated in place
- Domain tables (`members`, `weights`, etc.) are derived from the event log
- The UI never writes directly to domain tables — only through events

---

## Monorepo Structure

```
ReactNativeExpoRoom/
├── apps/
│   └── mobile/                    # Expo app (expo-router)
│       └── src/
│           ├── app/               # expo-router file-based routes
│           ├── features/          # Feature-first modules
│           │   ├── auth/          # Login, JWT, secure store
│           │   ├── member/        # Member CRUD, NFC identification
│           │   ├── session/       # Session lifecycle
│           │   ├── weigh/         # Weight recording (BLE scales)
│           │   ├── devices/       # Nearby device discovery
│           │   └── todo/          # Session notes / tasks
│           ├── components/        # Shared UI (uses @fitsync/ui)
│           ├── navigation/        # Typed React Navigation params
│           ├── hooks/             # Shared hooks
│           ├── services/          # API client, storage
│           └── store/             # Redux store root
│
├── packages/
│   ├── datasync/                  # CORE: Native Expo Module
│   │   ├── src/                   # TypeScript bridge + types
│   │   └── android/               # Kotlin: Room, Nearby, WorkManager
│   ├── shared/                    # TS types, event defs, constants
│   ├── nfc/                       # NFC card reader module
│   ├── ble-scale/                 # BLE scale reader module
│   ├── ui/                        # Shared React Native components
│   └── tsconfig/                  # Shared TypeScript configs
```

---

## Feature Module Structure

Each feature under `src/features/<name>/` follows this layout:

```
<feature>/
├── screens/        # Screen components (expo-router pages)
├── components/     # Feature-scoped UI components
├── hooks/          # Feature-scoped custom hooks
├── services/       # API / DataSync calls
├── store/          # Redux slice + selectors + thunks
├── types/          # Feature-specific TypeScript types
└── index.ts        # Barrel export
```

---

## Navigation

Expo Router provides file-based navigation under `apps/mobile/src/app/`:

```
app/
├── _layout.tsx         # Root layout (Redux Provider, auth gate)
├── login.tsx           # Public login screen
└── (tabs)/             # Tab group (requires auth)
    ├── _layout.tsx
    ├── index.tsx       # Session / home screen
    ├── members.tsx
    ├── weigh.tsx
    └── sync.tsx
```

Navigation is typed via React Navigation's typed params. See `src/navigation/` for param list definitions.
