// ─── Constants ──────────────────────────────────────────────────────────

// Google Nearby Connections service ID
export const NEARBY_SERVICE_ID = 'com.fitsync.datasync';

// BLE Weight Measurement Service UUID (Bluetooth SIG standard)
export const BLE_WEIGHT_SERVICE_UUID = '0000181D-0000-1000-8000-00805F9B34FB';
export const BLE_WEIGHT_MEASUREMENT_CHAR_UUID = '00002A9D-0000-1000-8000-00805F9B34FB';

// Outbox sync intervals (ms)
export const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes (Android WorkManager minimum)
export const DEVICE_SYNC_INTERVAL_MS = 30 * 1000; // 30 seconds for device-to-device

// Retry configuration
export const MAX_RETRY_COUNT = 5;
export const INITIAL_BACKOFF_MS = 1000;

// Nearby Connections payload chunk size (bytes)
export const NEARBY_MAX_PAYLOAD_BYTES = 32 * 1024; // 32KB

// Database name
export const DATABASE_NAME = 'fitsync.db';

// Event batch size for backend sync
export const BACKEND_SYNC_BATCH_SIZE = 50;
