# 04 — Event Model

XPW2 is an event-sourced system. Every state change is recorded as an immutable **event** before any side effects are applied. The Room database stores the full event log; domain tables are projections derived from it.

---

## Event Envelope

Every event shares this structure, defined in `packages/shared/src/events.ts`:

```typescript
export interface EventEnvelope {
  eventId: string; // UUID v4 — globally unique
  deviceId: string; // Android ANDROID_ID of the issuing tablet
  sessionId: string; // Current session UUID
  eventType: EventType;
  occurredAt: string; // ISO 8601 timestamp
  payload: Record<string, unknown>; // Event-specific data
  idempotencyKey: string; // Deduplication key (see below)
  correlationId: string; // Tracing key (see below)
}
```

### Room Storage

Events are stored in the `events` table. `payload` is stored as a JSON string. Timestamps are stored as epoch milliseconds (`Long`) for efficient range queries.

---

## Idempotency Key

The `idempotencyKey` ensures that the same real-world action is never recorded twice, even if the event is transmitted multiple times across devices.

**Generation pattern (Kotlin — `DataSyncEngine.kt`):**

```kotlin
// Generated inside DataSyncEngine.recordEvent()
val idempotencyKey = "$deviceId:$eventId"   // stable, globally unique
```

Each local event receives a fresh UUID `eventId`, making `deviceId:eventId` globally unique. Remote events received from peer tablets preserve their original `idempotencyKey`.

**Deduplication at insert:**

```kotlin
// DataSyncEngine.recordRemoteEvent()
val existing = db.eventDao().getByIdempotencyKey(event.idempotencyKey)
if (existing != null) return false  // already have this event — skip
```

The engine checks for an existing row by `idempotencyKey` before inserting remote events. If the key was seen before, the insert and outbox enqueue are both skipped.

---

## Correlation ID

The `correlationId` links related events for distributed tracing. Examples:

| Scenario                                      | correlationId              |
| --------------------------------------------- | -------------------------- |
| Member identified then weighed in same flow   | Same UUID for both events  |
| Payment recorded in response to session start | Session's correlationId    |
| Independent standalone action                 | New UUID (same as eventId) |

This allows reconstructing cause-and-effect chains across devices and time.

---

## Event Types and Payloads

### `SessionStarted`

```typescript
interface SessionStartedPayload {
  groupId: string;
  consultantId: string;
  startedAt: string; // ISO 8601
}
```

### `SessionEnded`

```typescript
interface SessionEndedPayload {
  endedAt: string;
  memberCount: number;
  eventCount: number;
}
```

### `MemberRegistered`

```typescript
interface MemberRegisteredPayload {
  memberId: string;
  name: string;
  email?: string;
  nfcCardId?: string; // UID of the NFC card linked to this member
}
```

### `MemberIdentified`

```typescript
interface MemberIdentifiedPayload {
  memberId: string;
  method: 'nfc' | 'search' | 'digital_card';
  nfcCardId?: string;
}
```

### `PaymentRecorded`

```typescript
interface PaymentRecordedPayload {
  paymentId: string;
  memberId: string;
  amount: number;
  currency: string; // ISO 4217, e.g., "GBP"
  type: 'cash' | 'card' | 'online';
}
```

### `WeightRecorded`

```typescript
interface WeightRecordedPayload {
  recordId: string;
  memberId: string;
  weight: number; // kg, 1 decimal
  previousWeight?: number;
  change?: number; // weight - previousWeight
  source: 'manual' | 'scale';
  scaleDeviceId?: string;
}
```

### `AwardGranted`

```typescript
interface AwardGrantedPayload {
  awardId: string;
  memberId: string;
  type: AwardType; // 'first_week' | 'weight_loss_5' | 'target_reached' | ...
  description: string;
  grantedAt: string;
}
```

### `TodoCreated`

```typescript
interface TodoCreatedPayload {
  todoId: string;
  title: string;
  description?: string;
}
```

### `TodoUpdated`

```typescript
interface TodoUpdatedPayload {
  todoId: string;
  title?: string;
  description?: string;
  completed?: boolean;
}
```

### `TodoDeleted`

```typescript
interface TodoDeletedPayload {
  todoId: string;
}
```

---

## Event Type Constants

```typescript
// packages/shared/src/events.ts
export const EVENT_TYPES = {
  SESSION_STARTED: 'SessionStarted',
  SESSION_ENDED: 'SessionEnded',
  MEMBER_REGISTERED: 'MemberRegistered',
  MEMBER_IDENTIFIED: 'MemberIdentified',
  PAYMENT_RECORDED: 'PaymentRecorded',
  WEIGHT_RECORDED: 'WeightRecorded',
  AWARD_GRANTED: 'AwardGranted',
  TODO_CREATED: 'TodoCreated',
  TODO_UPDATED: 'TodoUpdated',
  TODO_DELETED: 'TodoDeleted',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
```

---

## Outbox Status Flow

```
Pending
  │
  ├──► DeviceSynced   (event transmitted to all connected nearby tablets)
  │
  └──► BackendSynced  (event batch uploaded to API server)
         or
       Failed         (upload failed; retryCount incremented, exponential backoff)
```

An event can be in `DeviceSynced` and later transition to `BackendSynced` — these are independent channels.

```typescript
export const OUTBOX_STATUS = {
  PENDING: 'Pending',
  DEVICE_SYNCED: 'DeviceSynced',
  BACKEND_SYNCED: 'BackendSynced',
  FAILED: 'Failed',
} as const;
```
