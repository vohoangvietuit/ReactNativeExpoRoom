import { requireNativeModule, type EventSubscription } from 'expo-modules-core';

const ExpoDataSync = requireNativeModule('ExpoDataSync');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Native module event bridge
const emitter = ExpoDataSync as any;

// ─── Types ──────────────────────────────────────────────────────────────

export interface EventRecord {
  eventId: string;
  deviceId: string;
  sessionId: string;
  eventType: string;
  occurredAt: number;
  payload: string;
  idempotencyKey: string;
  correlationId: string;
  createdAt: number;
}

export interface MemberRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  nfcCardId: string | null;
  membershipNumber: string | null;
  currentWeight: number | null;
  targetWeight: number | null;
  height: number | null;
  bmi: number | null;
  notes: string | null;
  joinedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface SessionRecord {
  id: string;
  groupId: string;
  consultantId: string;
  status: string;
  startedAt: number | null;
  endedAt: number | null;
  memberCount: number;
  eventCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface TodoRecord {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  deviceId: string;
  sessionId: string;
  createdAt: number;
  updatedAt: number;
}

export interface PaymentRecord {
  id: string;
  memberId: string;
  amount: number;
  currency: string;
  type: string;
  sessionId: string;
  deviceId: string;
  occurredAt: number;
  createdAt: number;
}

export interface WeightRecordData {
  id: string;
  memberId: string;
  weight: number;
  previousWeight: number | null;
  change: number | null;
  source: string;
  scaleDeviceId: string | null;
  sessionId: string;
  deviceId: string;
  measuredAt: number;
  createdAt: number;
}

export interface AwardRecord {
  id: string;
  memberId: string;
  type: string;
  description: string;
  grantedAt: number;
  sessionId: string;
  createdAt: number;
}

export interface DeviceRecord {
  id: string;
  deviceName: string;
  nearbyEndpointId: string | null;
  role: string;
  connectionStatus: string;
  lastSeenAt: number | null;
  isPaired: boolean;
  createdAt: number;
}

export interface SyncStatus {
  pendingCount: number;
  deviceSyncedCount: number;
  backendSyncedCount: number;
  failedCount: number;
  lastSyncAt: number | null;
  isWorkerScheduled: boolean;
}

export interface DeviceSyncInfo {
  connectedDeviceId: string | null;
  connectedDeviceName: string | null;
  isAdvertising: boolean;
  isDiscovering: boolean;
}

export interface DiscoveredDevice {
  endpointId: string;
  endpointName: string;
  remoteDeviceId?: string;
  serviceId: string;
}

export interface ConnectedDevice {
  endpointId: string;
  endpointName: string;
  remoteDeviceId?: string;
}

// ─── Event Callback Types ───────────────────────────────────────────────

export interface EventRecordedPayload {
  eventId: string;
  eventType: string;
  sessionId: string;
}

export interface SyncStatusChangedPayload {
  type: string;
  endpointId?: string;
  acceptedEvents?: number;
}

export interface DeviceFoundPayload {
  endpointId: string;
  endpointName: string;
  remoteDeviceId?: string;
  serviceId: string;
}

export interface DeviceLostPayload {
  endpointId: string;
}

export interface DeviceConnectionChangedPayload {
  endpointId: string;
  connected: boolean;
}

export interface ConnectionRequestPayload {
  endpointId: string;
  endpointName: string;
  remoteDeviceId?: string;
  authenticationDigits: string;
  /** true = responder/advertiser (show Accept/Reject), false = initiator (read-only code display) */
  isIncoming: boolean;
}

// ─── Event Recording ────────────────────────────────────────────────────

export async function recordEvent(
  eventType: string,
  payload: Record<string, unknown>,
  sessionId: string,
): Promise<string> {
  return ExpoDataSync.recordEvent(eventType, JSON.stringify(payload), sessionId);
}

export async function recordEventWithCorrelation(
  eventType: string,
  payload: Record<string, unknown>,
  sessionId: string,
  correlationId: string,
): Promise<string> {
  return ExpoDataSync.recordEventWithCorrelation(
    eventType,
    JSON.stringify(payload),
    sessionId,
    correlationId,
  );
}

// ─── Event Queries ──────────────────────────────────────────────────────

export async function getEventsBySession(sessionId: string): Promise<EventRecord[]> {
  return ExpoDataSync.getEventsBySession(sessionId);
}

export async function getEventById(eventId: string): Promise<EventRecord | null> {
  return ExpoDataSync.getEventById(eventId);
}

export async function getEventsByType(eventType: string): Promise<EventRecord[]> {
  return ExpoDataSync.getEventsByType(eventType);
}

// ─── Sync ───────────────────────────────────────────────────────────────

export async function getSyncStatus(): Promise<SyncStatus> {
  return ExpoDataSync.getSyncStatus();
}

export async function triggerSync(): Promise<string> {
  return ExpoDataSync.triggerSync();
}

export async function triggerBackendSync(): Promise<string> {
  return ExpoDataSync.triggerBackendSync();
}

export async function schedulePeriodicSync(): Promise<string> {
  return ExpoDataSync.schedulePeriodicSync();
}

export async function cancelPeriodicSync(): Promise<string> {
  return ExpoDataSync.cancelPeriodicSync();
}

// ─── Nearby Connections ─────────────────────────────────────────────────

export async function startAdvertising(deviceName: string): Promise<string> {
  return ExpoDataSync.startAdvertising(deviceName);
}

export async function stopAdvertising(): Promise<string> {
  return ExpoDataSync.stopAdvertising();
}

export async function startDiscovery(): Promise<string> {
  return ExpoDataSync.startDiscovery();
}

export async function stopDiscovery(): Promise<string> {
  return ExpoDataSync.stopDiscovery();
}

export async function connectToDevice(deviceName: string, endpointId: string): Promise<string> {
  return ExpoDataSync.connectToDevice(deviceName, endpointId);
}

export async function disconnectDevice(endpointId: string): Promise<string> {
  return ExpoDataSync.disconnectDevice(endpointId);
}

export async function acceptConnection(endpointId: string): Promise<string> {
  return ExpoDataSync.acceptConnection(endpointId);
}

export async function rejectConnection(endpointId: string): Promise<string> {
  return ExpoDataSync.rejectConnection(endpointId);
}

export async function disconnectAll(): Promise<string> {
  return ExpoDataSync.disconnectAll();
}

export async function getDiscoveredDevices(): Promise<DiscoveredDevice[]> {
  return ExpoDataSync.getDiscoveredDevices();
}

export async function getConnectedDevices(): Promise<ConnectedDevice[]> {
  return ExpoDataSync.getConnectedDevices();
}

export async function getDeviceSyncInfo(): Promise<DeviceSyncInfo> {
  return ExpoDataSync.getDeviceSyncInfo();
}

// ─── Member Queries ─────────────────────────────────────────────────────

export async function getMember(id: string): Promise<MemberRecord | null> {
  return ExpoDataSync.getMember(id);
}

export async function getMemberByNfc(nfcCardId: string): Promise<MemberRecord | null> {
  return ExpoDataSync.getMemberByNfc(nfcCardId);
}

export async function searchMembers(query: string): Promise<MemberRecord[]> {
  return ExpoDataSync.searchMembers(query);
}

export async function getAllMembers(): Promise<MemberRecord[]> {
  return ExpoDataSync.getAllMembers();
}

// ─── Session Queries ────────────────────────────────────────────────────

export async function getSession(id: string): Promise<SessionRecord | null> {
  return ExpoDataSync.getSession(id);
}

export async function getActiveSession(): Promise<SessionRecord | null> {
  return ExpoDataSync.getActiveSession();
}

export async function getAllSessions(): Promise<SessionRecord[]> {
  return ExpoDataSync.getAllSessions();
}

// ─── Todo Queries ───────────────────────────────────────────────────────

export async function getTodo(id: string): Promise<TodoRecord | null> {
  return ExpoDataSync.getTodo(id);
}

export async function getAllTodos(): Promise<TodoRecord[]> {
  return ExpoDataSync.getAllTodos();
}

// ─── Payment Queries ────────────────────────────────────────────────────

export async function getPaymentsByMember(memberId: string): Promise<PaymentRecord[]> {
  return ExpoDataSync.getPaymentsByMember(memberId);
}

export async function getPaymentsBySession(sessionId: string): Promise<PaymentRecord[]> {
  return ExpoDataSync.getPaymentsBySession(sessionId);
}

// ─── Weight Record Queries ──────────────────────────────────────────────

export async function getWeightRecordsByMember(memberId: string): Promise<WeightRecordData[]> {
  return ExpoDataSync.getWeightRecordsByMember(memberId);
}

export async function getLatestWeight(memberId: string): Promise<WeightRecordData | null> {
  return ExpoDataSync.getLatestWeight(memberId);
}

// ─── Award Queries ──────────────────────────────────────────────────────

export async function getAwardsByMember(memberId: string): Promise<AwardRecord[]> {
  return ExpoDataSync.getAwardsByMember(memberId);
}

// ─── Device Queries ─────────────────────────────────────────────────────

export async function getDevice(id: string): Promise<DeviceRecord | null> {
  return ExpoDataSync.getDevice(id);
}

export async function getAllDevices(): Promise<DeviceRecord[]> {
  return ExpoDataSync.getAllDevices();
}

export async function getPairedDevices(): Promise<DeviceRecord[]> {
  return ExpoDataSync.getPairedDevices();
}

export async function removePairedDevice(deviceId: string): Promise<string> {
  return ExpoDataSync.removePairedDevice(deviceId);
}

export async function unpairDevice(deviceId: string): Promise<string> {
  return ExpoDataSync.unpairDevice(deviceId);
}

// ─── Device Info ────────────────────────────────────────────────────────

export async function getDeviceId(): Promise<string> {
  return ExpoDataSync.getDeviceId();
}

export async function getDeviceName(): Promise<string> {
  return ExpoDataSync.getDeviceName();
}

// ─── Outbox Processing ─────────────────────────────────────────────────

export async function startOutboxProcessing(): Promise<string> {
  return ExpoDataSync.startOutboxProcessing();
}

export async function stopOutboxProcessing(): Promise<string> {
  return ExpoDataSync.stopOutboxProcessing();
}

// ─── Event Subscriptions ────────────────────────────────────────────────

export function addEventRecordedListener(
  callback: (event: EventRecordedPayload) => void,
): EventSubscription {
  return emitter.addListener('onEventRecorded', callback);
}

export function addSyncStatusChangedListener(
  callback: (event: SyncStatusChangedPayload) => void,
): EventSubscription {
  return emitter.addListener('onSyncStatusChanged', callback);
}

export function addDeviceFoundListener(
  callback: (event: DeviceFoundPayload) => void,
): EventSubscription {
  return emitter.addListener('onDeviceFound', callback);
}

export function addDeviceLostListener(
  callback: (event: DeviceLostPayload) => void,
): EventSubscription {
  return emitter.addListener('onDeviceLost', callback);
}

export function addDeviceConnectionChangedListener(
  callback: (event: DeviceConnectionChangedPayload) => void,
): EventSubscription {
  return emitter.addListener('onDeviceConnectionChanged', callback);
}

export function addConnectionRequestListener(
  callback: (event: ConnectionRequestPayload) => void,
): EventSubscription {
  return emitter.addListener('onConnectionRequest', callback);
}
