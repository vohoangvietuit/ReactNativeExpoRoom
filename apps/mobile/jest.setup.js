import '@testing-library/jest-native/extend-expect';

// ─── @xpw2/datasync ──────────────────────────────────────────────────────────
jest.mock('@xpw2/datasync', () => ({
  // Event Recording
  recordEvent: jest.fn().mockResolvedValue('mock-event-id'),
  recordEventWithCorrelation: jest.fn().mockResolvedValue('mock-event-id'),

  // Event Queries
  getAllEvents: jest.fn().mockResolvedValue([]),
  getEventsBySession: jest.fn().mockResolvedValue([]),
  getEventsByType: jest.fn().mockResolvedValue([]),
  getEventById: jest.fn().mockResolvedValue(null),

  // Member Queries
  getAllMembers: jest.fn().mockResolvedValue([]),
  getMember: jest.fn().mockResolvedValue(null),
  getMemberById: jest.fn().mockResolvedValue(null),
  getMemberByNfc: jest.fn().mockResolvedValue(null),
  searchMembers: jest.fn().mockResolvedValue([]),

  // Session Queries
  getActiveSession: jest.fn().mockResolvedValue(null),
  getAllSessions: jest.fn().mockResolvedValue([]),
  getSession: jest.fn().mockResolvedValue(null),

  // Todo Queries
  getAllTodos: jest.fn().mockResolvedValue([]),
  getTodo: jest.fn().mockResolvedValue(null),

  // Payment Queries
  getAllPayments: jest.fn().mockResolvedValue([]),
  getPaymentsByMember: jest.fn().mockResolvedValue([]),
  getPaymentsBySession: jest.fn().mockResolvedValue([]),

  // Weight Queries
  getWeightsByMember: jest.fn().mockResolvedValue([]),
  getWeightRecordsByMember: jest.fn().mockResolvedValue([]),
  getLatestWeight: jest.fn().mockResolvedValue(null),

  // Award Queries
  getAwardsByMember: jest.fn().mockResolvedValue([]),

  // Device Queries
  getAllDevices: jest.fn().mockResolvedValue([]),
  getDevice: jest.fn().mockResolvedValue(null),
  getPairedDevices: jest.fn().mockResolvedValue([]),

  // Device Info
  getDeviceId: jest.fn().mockResolvedValue('mock-device-id'),
  getDeviceName: jest.fn().mockResolvedValue('MockDevice'),

  // Sync
  getSyncStatus: jest.fn().mockResolvedValue({
    pendingCount: 0,
    deviceSyncedCount: 0,
    backendSyncedCount: 0,
    failedCount: 0,
    lastSyncAt: null,
    isWorkerScheduled: false,
  }),
  triggerSync: jest.fn().mockResolvedValue(undefined),
  triggerBackendSync: jest.fn().mockResolvedValue(undefined),
  schedulePeriodicSync: jest.fn().mockResolvedValue(undefined),
  cancelPeriodicSync: jest.fn().mockResolvedValue(undefined),

  // Nearby / Device Connections
  startAdvertising: jest.fn().mockResolvedValue(undefined),
  stopAdvertising: jest.fn().mockResolvedValue(undefined),
  startDiscovery: jest.fn().mockResolvedValue(undefined),
  stopDiscovery: jest.fn().mockResolvedValue(undefined),
  connectToDevice: jest.fn().mockResolvedValue(undefined),
  disconnectDevice: jest.fn().mockResolvedValue(undefined),
  disconnectAll: jest.fn().mockResolvedValue(undefined),
  getDiscoveredDevices: jest.fn().mockResolvedValue([]),
  getConnectedDevices: jest.fn().mockResolvedValue([]),
  getDeviceSyncInfo: jest.fn().mockResolvedValue({
    connectedDeviceId: null,
    connectedDeviceName: null,
    isAdvertising: false,
    isDiscovering: false,
  }),

  // Outbox Processing
  startOutboxProcessing: jest.fn().mockResolvedValue(undefined),
  stopOutboxProcessing: jest.fn().mockResolvedValue(undefined),

  // Event Subscriptions (no-op stubs)
  addEventRecordedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addSyncStatusChangedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addDeviceFoundListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addDeviceLostListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addDeviceConnectionChangedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
}));

// ─── @xpw2/nfc ───────────────────────────────────────────────────────────────
jest.mock('@xpw2/nfc', () => ({
  NfcReader: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    isSupported: jest.fn().mockResolvedValue(true),
    isEnabled: jest.fn().mockResolvedValue(true),
  })),
  parseNdefTextRecord: jest.fn().mockReturnValue(null),
  decodeNdefText: jest.fn().mockReturnValue(''),
  tagIdToHex: jest.fn().mockReturnValue(''),
  useNfcReader: jest.fn().mockReturnValue({
    status: { isSupported: true, isEnabled: true },
    isScanning: false,
    lastResult: null,
    scanForMemberCard: jest.fn().mockResolvedValue({ success: false, error: 'No tag' }),
    readTagId: jest.fn().mockResolvedValue(null),
    cancel: jest.fn(),
  }),
}));

// ─── @xpw2/ble-scale ─────────────────────────────────────────────────────────
jest.mock('@xpw2/ble-scale', () => ({
  BleScaleReader: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
  })),
  parseWeightMeasurement: jest.fn().mockReturnValue(null),
  toKg: jest.fn().mockImplementation((value) => value),
  WEIGHT_SERVICE_UUID: '0000181D-0000-1000-8000-00805F9B34FB',
  WEIGHT_MEASUREMENT_CHAR_UUID: '00002A9D-0000-1000-8000-00805F9B34FB',
  useScaleWeight: jest.fn().mockReturnValue({
    weight: null,
    status: 'idle',
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
}));

// ─── expo-secure-store (in-memory) ───────────────────────────────────────────
const mockSecureStoreMemory = new Map();

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn((key, value) => {
    mockSecureStoreMemory.set(key, value);
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key) => {
    return Promise.resolve(mockSecureStoreMemory.get(key) ?? null);
  }),
  deleteItemAsync: jest.fn((key) => {
    mockSecureStoreMemory.delete(key);
    return Promise.resolve();
  }),
}));

beforeEach(() => {
  mockSecureStoreMemory.clear();
});

// ─── uuid — deterministic IDs ─────────────────────────────────────────────────
let mockUuidCounter = 0;

jest.mock('uuid', () => ({
  v4: jest.fn(() => `mock-uuid-${++mockUuidCounter}`),
}));

beforeEach(() => {
  mockUuidCounter = 0;
});
