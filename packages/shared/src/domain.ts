// ─── Domain Types ───────────────────────────────────────────────────────
// Core business entities for the FitSync application.

// ─── Member ─────────────────────────────────────────────────────────────
export interface Member {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  nfcCardId?: string;
  membershipNumber?: string;
  currentWeight?: number;
  targetWeight?: number;
  height?: number;
  bmi?: number;
  notes?: string;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Payment ────────────────────────────────────────────────────────────
export interface Payment {
  id: string;
  memberId: string;
  amount: number;
  currency: string;
  type: 'cash' | 'card' | 'online';
  sessionId: string;
  deviceId: string;
  occurredAt: string;
  createdAt: string;
}

// ─── Weight Record ──────────────────────────────────────────────────────
export interface WeightRecord {
  id: string;
  memberId: string;
  weight: number; // kg, 1 decimal
  previousWeight?: number;
  change?: number; // weight - previousWeight
  source: 'manual' | 'scale';
  scaleDeviceId?: string;
  sessionId: string;
  deviceId: string;
  measuredAt: string;
  createdAt: string;
}

// ─── Award ──────────────────────────────────────────────────────────────
export type AwardType =
  | 'first_week'
  | 'weight_loss_5'
  | 'weight_loss_10'
  | 'weight_loss_15'
  | 'weight_loss_20'
  | 'target_reached'
  | 'consistency_4_weeks'
  | 'consistency_8_weeks';

export interface Award {
  id: string;
  memberId: string;
  type: AwardType;
  description: string;
  grantedAt: string;
  sessionId: string;
  createdAt: string;
}

// ─── Session ────────────────────────────────────────────────────────────
export type SessionStatus = 'preparing' | 'active' | 'syncing' | 'completed';

export interface Session {
  id: string;
  groupId: string;
  consultantId: string;
  status: SessionStatus;
  startedAt?: string;
  endedAt?: string;
  memberCount: number;
  eventCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Device ─────────────────────────────────────────────────────────────
export type DeviceRole = 'pay' | 'weigh' | 'combined';
export type DeviceConnectionStatus = 'discovered' | 'connecting' | 'connected' | 'disconnected';

export interface Device {
  id: string;
  deviceName: string;
  nearbyEndpointId?: string;
  role: DeviceRole;
  connectionStatus: DeviceConnectionStatus;
  lastSeenAt?: string;
  isPaired: boolean;
  createdAt: string;
}

// ─── Todo (Sync Testing) ────────────────────────────────────────────────
export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  deviceId: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── NFC Card Data ──────────────────────────────────────────────────────
export interface NfcMemberCard {
  memberId: string;
  name: string;
  membershipNumber: string;
  rawData?: string;
  tagId?: string;
  tagType?: string;
}

// ─── Scale Reading ──────────────────────────────────────────────────────
export interface ScaleReading {
  weight: number; // kg
  unit: 'kg' | 'lb' | 'st';
  stable: boolean;
  timestamp: string;
  deviceId: string;
  deviceName: string;
}

// ─── Auth ───────────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'consultant' | 'admin';
}

// ─── Sync Status ────────────────────────────────────────────────────────
export interface SyncStatus {
  pendingCount: number;
  deviceSyncedCount: number;
  backendSyncedCount: number;
  failedCount: number;
  lastSyncAt?: string;
  isWorkerScheduled: boolean;
}

// ─── Device Sync Info ───────────────────────────────────────────────────
export interface DeviceSyncInfo {
  connectedDeviceId?: string;
  connectedDeviceName?: string;
  isAdvertising: boolean;
  isDiscovering: boolean;
  lastExchangeAt?: string;
  eventsExchanged: number;
}
