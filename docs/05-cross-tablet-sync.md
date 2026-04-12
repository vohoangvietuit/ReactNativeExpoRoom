# 05 — Cross-Tablet Sync

FitSync supports real-time event synchronization between tablets in the same room using **Google Nearby Connections** (P2P WiFi/Bluetooth, no internet required).

---

## Overview

```
Tablet A (Pay role)          Tablet B (Weigh role)
┌──────────────┐             ┌──────────────┐
│  Advertising │◄───────────►│  Discovering │
│  + Accepting │  P2P WiFi / │  + Requesting│
│              │  BLE        │  connection  │
└──────┬───────┘             └──────┬───────┘
       │                            │
       │  Connected (bidirectional) │
       │                            │
  Send Payload ──────────────► Receive + Deduplicate
  (event batch JSON)             (insert to Room,
                                  skip if idempotencyKey exists)
```

---

## Google Nearby Connections

**API:** `com.google.android.gms:play-services-nearby:19.3.0`  
**Strategy:** `Strategy.P2P_CLUSTER` — all devices can connect to each other (mesh-like)

### Advertising

A tablet announces itself to nearby devices:

```kotlin
// NearbyManager.kt
fun startAdvertising(deviceName: String) {
    val advertisingOptions = AdvertisingOptions.Builder()
        .setStrategy(Strategy.P2P_CLUSTER)
        .build()

    Nearby.getConnectionsClient(context).startAdvertising(
        deviceName,
        SERVICE_ID,          // "com.fitsync.datasync"
        connectionLifecycleCallback,
        advertisingOptions
    )
}
```

### Discovery

```kotlin
fun startDiscovery() {
    val discoveryOptions = DiscoveryOptions.Builder()
        .setStrategy(Strategy.P2P_CLUSTER)
        .build()

    Nearby.getConnectionsClient(context).startDiscovery(
        SERVICE_ID,
        endpointDiscoveryCallback,  // fires onEndpointFound / onEndpointLost
        discoveryOptions
    )
}
```

### Device Name Encoding

Device names are encoded with the Android ID to enable stable device identity across reconnections:

```kotlin
// Advertising (ExpoDataSyncModule.kt)
val encodedName = "$deviceName|${getDeviceId()}"
nearbyManager.startAdvertising(encodedName)

// Parsed inside NearbyManager
private fun parseNearbyName(raw: String): Pair<String, String?> {
    val parts = raw.split("|")
    return if (parts.size == 2) Pair(parts[0], parts[1]) else Pair(raw, null)
}
```

### Connection Lifecycle

Connections require **manual accept/reject** — the module fires `onConnectionRequest` to JS which can show a confirmation UI before calling `acceptConnection` or `rejectConnection`:

```kotlin
private val connectionLifecycleCallback = object : ConnectionLifecycleCallback() {
    override fun onConnectionInitiated(endpointId: String, info: ConnectionInfo) {
        // Parse encoded name: "DisplayName|androidId"
        val (displayName, remoteDeviceId) = parseNearbyName(info.endpointName)
        pendingConnections[endpointId] = PendingConnection(
            displayName, remoteDeviceId, info.authenticationDigits
        )
        // Notify JS — user must explicitly call acceptConnection() or rejectConnection()
        onConnectionRequest?.invoke(
            endpointId, displayName, remoteDeviceId,
            info.authenticationDigits, !info.isIncomingConnection
        )
    }

    override fun onConnectionResult(endpointId: String, result: ConnectionResolution) {
        pendingConnections.remove(endpointId)
        if (result.status.isSuccess) {
            // _connectedEndpoints updated, onConnectionChanged fires
        }
    }

    override fun onDisconnected(endpointId: String) {
        _connectedEndpoints.update { it.filter { e -> e.endpointId != endpointId } }
        onConnectionChanged?.invoke(endpointId, false)
    }
}
```

From JS:

```typescript
// Show digits UI, then:
await DataSync.acceptConnection(endpointId); // or rejectConnection(endpointId)
```

---

## Payload Exchange

### Sending a Batch

The `EventOutbox` collects pending events and sends them as a JSON batch:

```kotlin
// NearbyPayloadHandler.kt
fun createOutgoingBatch(
    batchId: String,
    deviceId: String,
    entries: List<DataSyncEngine.OutboxEntry>
): ByteArray {
    val batch = EventBatch(
        batchId = batchId,
        deviceId = deviceId,
        events = entries.map { entry ->
            SerializableEvent(
                eventId      = entry.event.eventId,
                deviceId     = entry.event.deviceId,
                sessionId    = entry.event.sessionId,
                eventType    = entry.event.eventType,
                occurredAt   = entry.event.occurredAt,
                payload      = entry.event.payload,
                idempotencyKey = entry.event.idempotencyKey,
                correlationId  = entry.event.correlationId
            )
        }
    )
    return json.encodeToString(batch).toByteArray(Charsets.UTF_8)
}

// NearbyManager.kt
fun sendPayload(endpointId: String, data: ByteArray) {
    Nearby.getConnectionsClient(context)
        .sendPayload(endpointId, Payload.fromBytes(data))
}
```

### Receiving a Batch

```kotlin
private val payloadCallback = object : PayloadCallback() {
    override fun onPayloadReceived(endpointId: String, payload: Payload) {
        payload.asBytes()?.let { bytes ->
            onPayloadReceived?.invoke(endpointId, bytes)
        }
    }
}

// NearbyPayloadHandler.kt
suspend fun handleIncomingPayload(endpointId: String, data: ByteArray): Int {
    val batch = json.decodeFromString<EventBatch>(data.toString(Charsets.UTF_8))
    var accepted = 0
    for (event in batch.events) {
        val entity = EventEntity(
            eventId = event.eventId,  deviceId = event.deviceId,
            sessionId = event.sessionId, eventType = event.eventType,
            occurredAt = event.occurredAt, payload = event.payload,
            idempotencyKey = event.idempotencyKey, correlationId = event.correlationId
        )
        val isNew = engine.recordRemoteEvent(entity)
        if (isNew) accepted++  // false means duplicate (idempotencyKey already seen)
    }
    return accepted
}
```

---

## Conflict Resolution

Conflicts are resolved through **idempotency keys**:

1. Each event has a stable `idempotencyKey` of the form `"deviceId:eventId"` (see [04-event-model.md](./04-event-model.md))
2. `DataSyncEngine.recordRemoteEvent()` checks `eventDao().getByIdempotencyKey()` before inserting
3. If an event arrives with an `idempotencyKey` already in the DB, it is silently skipped
4. No merge logic is needed — events are immutable facts

**Example:** If Tablet A sends the same event batch twice (network retry), all events from the second batch are skipped because their `idempotencyKey` values are already present.

---

## JS Event Bridge

The native layer emits six events to React Native via the Expo Modules event system:

```typescript
// packages/datasync/src/index.ts

// New device discovered in Nearby
export function addDeviceFoundListener(
  callback: (event: DeviceFoundPayload) => void,
): EventSubscription {
  return emitter.addListener('onDeviceFound', callback);
}

// Device lost from Nearby discovery
export function addDeviceLostListener(
  callback: (event: DeviceLostPayload) => void,
): EventSubscription {
  return emitter.addListener('onDeviceLost', callback);
}

// Device connected / disconnected (after accept/reject)
export function addDeviceConnectionChangedListener(
  callback: (event: DeviceConnectionChangedPayload) => void,
): EventSubscription {
  return emitter.addListener('onDeviceConnectionChanged', callback);
}

// Incoming connection request — show auth digits UI
export function addConnectionRequestListener(
  callback: (event: ConnectionRequestPayload) => void,
): EventSubscription {
  return emitter.addListener('onConnectionRequest', callback);
}

// Sync batch completed
export function addSyncStatusChangedListener(
  callback: (event: SyncStatusChangedPayload) => void,
): EventSubscription {
  return emitter.addListener('onSyncStatusChanged', callback);
}

// Local event recorded
export function addEventRecordedListener(
  callback: (event: EventRecordedPayload) => void,
): EventSubscription {
  return emitter.addListener('onEventRecorded', callback);
}
```

---

## Device Roles

| Role       | Responsibilities                          |
| ---------- | ----------------------------------------- |
| `pay`      | Records payments, identifies members      |
| `weigh`    | Records weight measurements via BLE scale |
| `combined` | Both roles on a single tablet             |

Role is stored in `DeviceEntity` and exchanged during the initial connection handshake via the endpoint name.
