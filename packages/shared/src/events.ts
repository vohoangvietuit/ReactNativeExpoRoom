// ─── Event Type Definitions ────────────────────────────────────────────
// All state changes in FitSync are recorded as immutable events.
// Events are stored locally and processed by the DataSync engine.

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

// ─── Outbox Status ──────────────────────────────────────────────────────
export const OUTBOX_STATUS = {
  PENDING: 'Pending',
  DEVICE_SYNCED: 'DeviceSynced',
  BACKEND_SYNCED: 'BackendSynced',
  FAILED: 'Failed',
} as const;

export type OutboxStatus = (typeof OUTBOX_STATUS)[keyof typeof OUTBOX_STATUS];

// ─── Base Event Envelope ────────────────────────────────────────────────
// Every event includes these identification fields for idempotency and tracing.
export interface EventEnvelope {
  eventId: string;
  deviceId: string;
  sessionId: string;
  eventType: EventType;
  occurredAt: string; // ISO 8601
  payload: Record<string, unknown>;
  idempotencyKey: string;
  correlationId: string;
}

// ─── Event Payloads ─────────────────────────────────────────────────────

export interface SessionStartedPayload {
  groupId: string;
  consultantId: string;
  startedAt: string;
}

export interface SessionEndedPayload {
  endedAt: string;
  memberCount: number;
  eventCount: number;
}

export interface MemberRegisteredPayload {
  memberId: string;
  name: string;
  email?: string;
  nfcCardId?: string;
}

export interface MemberIdentifiedPayload {
  memberId: string;
  method: 'nfc' | 'search' | 'digital_card';
  nfcCardId?: string;
}

export interface PaymentRecordedPayload {
  paymentId: string;
  memberId: string;
  amount: number;
  currency: string;
  type: 'cash' | 'card' | 'online';
}

export interface WeightRecordedPayload {
  recordId: string;
  memberId: string;
  weight: number; // kg
  source: 'manual' | 'scale';
  scaleDeviceId?: string;
}

export interface AwardGrantedPayload {
  awardId: string;
  memberId: string;
  type: string;
  description: string;
}

export interface TodoCreatedPayload {
  todoId: string;
  title: string;
  description?: string;
}

export interface TodoUpdatedPayload {
  todoId: string;
  title?: string;
  description?: string;
  completed?: boolean;
}

export interface TodoDeletedPayload {
  todoId: string;
}

// ─── Event Type Map ─────────────────────────────────────────────────────
export interface EventPayloadMap {
  SessionStarted: SessionStartedPayload;
  SessionEnded: SessionEndedPayload;
  MemberRegistered: MemberRegisteredPayload;
  MemberIdentified: MemberIdentifiedPayload;
  PaymentRecorded: PaymentRecordedPayload;
  WeightRecorded: WeightRecordedPayload;
  AwardGranted: AwardGrantedPayload;
  TodoCreated: TodoCreatedPayload;
  TodoUpdated: TodoUpdatedPayload;
  TodoDeleted: TodoDeletedPayload;
}

// ─── Typed Event Helper ─────────────────────────────────────────────────
export interface TypedEvent<T extends EventType> extends Omit<EventEnvelope, 'payload' | 'eventType'> {
  eventType: T;
  payload: T extends keyof EventPayloadMap ? EventPayloadMap[T] : Record<string, unknown>;
}

// ─── Outbox Entry ─────────────────────────────────────────────────────
export interface OutboxEntry {
  id: number;
  eventId: string;
  status: OutboxStatus;
  retryCount: number;
  lastAttemptAt?: string;
  createdAt: string;
}

// ─── Sync Batch ──────────────────────────────────────────────────────
export interface SyncBatch {
  batchId: string;
  deviceId: string;
  sessionId: string;
  events: EventEnvelope[];
  sentAt: string;
}

// ─── Sync Acknowledgement ────────────────────────────────────────────
export interface SyncAcknowledgement {
  batchId: string;
  acceptedEventIds: string[];
  rejectedEventIds: string[];
  reason?: string;
}
