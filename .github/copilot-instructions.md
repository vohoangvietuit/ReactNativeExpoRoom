# GitHub Copilot Instructions

**FitSync** — Offline-first event-driven body management Android app  
**Expo** · **TypeScript** · **Redux Toolkit** · **React Navigation** · **React Native Testing Library**

---

## Architecture

4-layer architecture with DataSync engine as SSOT:

```
Layer 1 — React Native UI (screens, Redux, expo-router navigation)
Layer 2 — Application Abstraction (IDataRepository, feature flags)
Layer 3 — Bridge Layer (Expo Modules API — JS ↔ Kotlin)
Layer 4 — Native Core (Room+SQLCipher, WorkManager, Nearby, NFC, BLE)
```

## Monorepo (pnpm + Turborepo)

```
apps/mobile/           # Main Expo app
packages/datasync/     # CORE: Room + SQLCipher + Nearby + WorkManager
packages/shared/       # TS types, event definitions, constants
packages/nfc/          # NFC card reader module
packages/ble-scale/    # BLE scale reader module
packages/ui/           # Shared UI components (Button, Card, Input, Badge, etc.)
packages/tsconfig/     # Shared TS configs
```

---

## Build & Test

```bash
pnpm install                            # Install all workspaces
npx expo start                          # Dev server (press a for Android)
npx expo prebuild --platform android    # Generate native project
npx expo run:android                    # Native Android build
cd apps/mobile && npx jest              # Run mobile tests (69 tests)
cd packages/shared && npx jest          # Run shared tests (30 tests)
npx jest --coverage                     # Coverage report
```

### Android Native Build
```bash
cd apps/mobile/android && ./gradlew assembleDebug
```
- Config plugin `withKspPlugin.js` auto-injects KSP + serialization classpath
- Architecture restricted to `arm64-v8a` (Samsung S25 Ultra target)
- Room 2.7.1, Kotlin 2.1.20, KSP 2.1.20-2.0.1

---

## Agents

Use specialized agents in `.github/agents/` for domain tasks:

| Agent              | When to Use                                                   |
| ------------------ | ------------------------------------------------------------- |
| **Coding_Agent**   | Writing or refactoring components, hooks, screens, slices     |
| **Planning_Agent** | Breaking down a feature into tasks before implementation      |
| **Review_Agent**   | Auditing code for bugs, architecture violations, security     |
| **Testing_Agent**  | Generating or auditing unit, integration, and E2E tests       |

---

## Coding Rules

All rules live in `.github/instructions/` and auto-apply to `*.ts`, `*.tsx`, `*.js`, `*.jsx`:

| File                                     | Scope                                                        |
| ---------------------------------------- | ------------------------------------------------------------ |
| `react-core.instructions.md`             | Components, hooks, Redux, touch handling, forms              |
| `react-typescript.instructions.md`       | Interfaces, prop typing, generics, strict mode               |
| `react-archiecture.instructions.md`      | Feature-first layout, navigation, barrel exports             |
| `react-performance.instructions.md`      | FlatList, memoization, image optimization, bundle size       |
| `react-testing-security.instructions.md` | Testing pyramid, Testing Library, MSW, OWASP                 |
| `figma.instructions.md`                  | Figma MCP integration, design-to-code, asset handling        |

---

## Project Structure

Feature-first architecture in `apps/mobile/src/`:

```
src/
  app/             # expo-router routes ((tabs)/index, devices, members, todos, weigh, login)
  features/        # Feature modules (auth/, session/, member/, devices/, sync/, todo/, weigh/)
    <feature>/
      screens/     # Screen components
      components/  # Feature-scoped UI
      hooks/       # Feature-scoped hooks
      services/    # Feature API calls
      store/       # Redux slice + thunks
      types/       # Feature types
  components/      # Shared UI (themed-text, themed-view, animated-icon)
  hooks/           # Shared hooks (useStore, use-theme)
  store/           # Redux store config (auth, session, todo, devices, member, sync slices)
  constants/       # Theme (Colors, Fonts, Spacing)
```

---

## DataSync Patterns

- **Event-driven**: All state changes recorded as immutable events via `DataSync.recordEvent()`
- **Outbox pattern**: Pending → DeviceSynced → BackendSynced
- **Coroutine bridge**: `AsyncFunction("name") Coroutine { ... }` for suspend Kotlin calls
- **10 event types**: SessionStarted/Ended, MemberRegistered/Identified, PaymentRecorded, WeightRecorded, AwardGranted, TodoCreated/Updated/Deleted

---

## Guardrails

- No class components — functional only
- No inline styles — `StyleSheet.create()` always
- No `any` without justification comment
- No `react-dom` or HTML/web-only APIs
- No new global state for local UI concerns
- No new third-party libraries without flagging for approval
- No skipping test coverage for thunks, hooks, or form validation
- All DataSync AsyncFunction bodies with suspend calls must use `Coroutine` infix
