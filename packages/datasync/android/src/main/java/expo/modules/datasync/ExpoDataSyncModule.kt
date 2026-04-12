package expo.modules.datasync

import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.functions.Coroutine
import expo.modules.datasync.engine.BackendSyncManager
import expo.modules.datasync.engine.DataSyncEngine
import expo.modules.datasync.engine.EventOutbox
import expo.modules.datasync.nearby.NearbyManager
import expo.modules.datasync.nearby.NearbyPayloadHandler
import expo.modules.datasync.worker.SyncScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import java.util.UUID

/**
 * ExpoDataSyncModule — the Expo Modules API bridge between React Native and the native DataSync engine.
 *
 * Exposes all DataSync functionality as AsyncFunctions callable from JavaScript.
 * Emits events for real-time updates back to JS.
 */
class ExpoDataSyncModule : Module() {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    // Lazy-init native components
    private val engine: DataSyncEngine by lazy {
        DataSyncEngine(appContext.reactContext!!)
    }

    private val nearbyManager: NearbyManager by lazy {
        NearbyManager(appContext.reactContext!!).also { setupNearbyCallbacks(it) }
    }

    private val payloadHandler: NearbyPayloadHandler by lazy {
        NearbyPayloadHandler(engine)
    }

    private val backendSyncManager: BackendSyncManager by lazy {
        BackendSyncManager()
    }

    private val eventOutbox: EventOutbox by lazy {
        EventOutbox(
            engine = engine,
            onDeviceSyncBatch = { entries ->
                val connected = nearbyManager.connectedEndpoints.value
                if (connected.isEmpty()) return@EventOutbox false
                val deviceId = getDeviceId()
                val batchData = payloadHandler.createOutgoingBatch(
                    batchId = UUID.randomUUID().toString(),
                    deviceId = deviceId,
                    entries = entries
                )
                for (endpoint in connected) {
                    nearbyManager.sendPayload(endpoint.endpointId, batchData)
                }
                true
            },
            onBackendSyncBatch = { entries ->
                backendSyncManager.uploadBatch(entries)
            }
        )
    }

    private fun getDeviceId(): String {
        val ctx = appContext.reactContext ?: return "unknown"
        return Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown"
    }

    private fun setupNearbyCallbacks(manager: NearbyManager) {
        manager.onPayloadReceived = { endpointId, data ->
            scope.launch {
                val accepted = payloadHandler.handleIncomingPayload(endpointId, data)
                sendEvent("onSyncStatusChanged", mapOf(
                    "type" to "deviceSync",
                    "endpointId" to endpointId,
                    "acceptedEvents" to accepted
                ))
            }
        }

        manager.onConnectionRequest = { endpointId, endpointName, remoteDeviceId, authDigits, isIncoming ->
            sendEvent("onConnectionRequest", mapOf(
                "endpointId" to endpointId,
                "endpointName" to endpointName,
                "remoteDeviceId" to (remoteDeviceId ?: ""),
                "authenticationDigits" to authDigits,
                "isIncoming" to isIncoming
            ))
        }

        manager.onConnectionChanged = { endpointId, connected ->
            // All DB work + event emission happen in the same coroutine so that
            // JS receives onDeviceConnectionChanged only AFTER the DB write completes.
            // This prevents the race where loadPairedDevicesThunk() runs before upsertDevice().
            scope.launch {
                if (connected) {
                    val endpoint = manager.connectedEndpoints.value
                        .find { it.endpointId == endpointId }
                    val name = endpoint?.endpointName ?: endpointId
                    val remoteDeviceId = endpoint?.remoteDeviceId
                    // Lookup order: remoteDeviceId (stable) → endpointId → name (fallback)
                    val existing = remoteDeviceId?.let { engine.getDevice(it) }
                        ?: engine.getDeviceByEndpoint(endpointId)
                        ?: engine.getPairedDeviceByName(name)
                    val device = existing?.copy(
                        nearbyEndpointId = endpointId,
                        deviceName = name,
                        connectionStatus = "connected",
                        lastSeenAt = System.currentTimeMillis(),
                        isPaired = true
                    ) ?: expo.modules.datasync.db.entities.DeviceEntity(
                        id = remoteDeviceId ?: java.util.UUID.randomUUID().toString(),
                        deviceName = name,
                        nearbyEndpointId = endpointId,
                        role = "combined",
                        connectionStatus = "connected",
                        lastSeenAt = System.currentTimeMillis(),
                        isPaired = true
                    )
                    engine.upsertDevice(device)
                } else {
                    val existing = engine.getDeviceByEndpoint(endpointId)
                    if (existing != null) {
                        engine.updateDeviceStatus(existing.id, "disconnected")
                    }
                }
                // Fire AFTER the DB write — JS now reads fresh paired device state
                sendEvent("onDeviceConnectionChanged", mapOf(
                    "endpointId" to endpointId,
                    "connected" to connected
                ))
            }
        }

        manager.onEndpointDiscovered = { endpoint ->
            sendEvent("onDeviceFound", mapOf(
                "endpointId" to endpoint.endpointId,
                "endpointName" to endpoint.endpointName,
                "remoteDeviceId" to (endpoint.remoteDeviceId ?: ""),
                "serviceId" to endpoint.serviceId
            ))
        }

        manager.onEndpointLost = { endpointId ->
            sendEvent("onDeviceLost", mapOf(
                "endpointId" to endpointId
            ))
        }
    }

    override fun definition() = ModuleDefinition {
        Name("ExpoDataSync")

        Events(
            "onEventRecorded",
            "onSyncStatusChanged",
            "onDeviceFound",
            "onDeviceLost",
            "onDeviceConnectionChanged",
            "onConnectionRequest"
        )

        // ─── Event Recording ────────────────────────────────────────────

        AsyncFunction("recordEvent") Coroutine { eventType: String, payload: String, sessionId: String ->
            val deviceId = getDeviceId()
            val eventId = engine.recordEvent(eventType, payload, deviceId, sessionId)
            sendEvent("onEventRecorded", mapOf(
                "eventId" to eventId,
                "eventType" to eventType,
                "sessionId" to sessionId
            ))
            eventId
        }

        AsyncFunction("recordEventWithCorrelation") Coroutine { eventType: String, payload: String, sessionId: String, correlationId: String ->
            val deviceId = getDeviceId()
            engine.recordEvent(eventType, payload, deviceId, sessionId, correlationId)
        }

        // ─── Event Queries ──────────────────────────────────────────────

        AsyncFunction("getEventsBySession") Coroutine { sessionId: String ->
            engine.getEventsBySession(sessionId).map { it.toMap() }
        }

        AsyncFunction("getEventById") Coroutine { eventId: String ->
            engine.getEventById(eventId)?.toMap()
        }

        AsyncFunction("getEventsByType") Coroutine { eventType: String ->
            engine.getEventsByType(eventType).map { it.toMap() }
        }

        // ─── Sync Status ────────────────────────────────────────────────

        AsyncFunction("getSyncStatus") Coroutine { ->
            val counts = engine.getSyncCounts()
            val lastSync = engine.getLastBackendSyncTime()
            val ctx = appContext.reactContext!!
            mapOf(
                "pendingCount" to counts.pendingCount,
                "deviceSyncedCount" to counts.deviceSyncedCount,
                "backendSyncedCount" to counts.backendSyncedCount,
                "failedCount" to counts.failedCount,
                "lastSyncAt" to lastSync,
                "isWorkerScheduled" to SyncScheduler.isBackendSyncScheduled(ctx)
            )
        }

        // ─── Outbox ─────────────────────────────────────────────────────

        AsyncFunction("triggerSync") Coroutine { ->
            val before = engine.getSyncCounts()
            val pendingBefore = before.pendingCount
            eventOutbox.processNow()
            val after = engine.getSyncCounts()
            val sent = pendingBefore - after.pendingCount
            when {
                pendingBefore == 0 -> "No pending events to sync"
                sent > 0 -> "Sent $sent event(s) to connected device(s)"
                else -> "Sync attempted — $pendingBefore event(s) still pending (no connected device?)"
            }
        }

        AsyncFunction("triggerBackendSync") {
            val ctx = appContext.reactContext!!
            SyncScheduler.triggerImmediateBackendSync(ctx)
            "ok"
        }

        // ─── WorkManager Scheduling ─────────────────────────────────────

        AsyncFunction("schedulePeriodicSync") {
            val ctx = appContext.reactContext!!
            SyncScheduler.schedulePeriodicBackendSync(ctx)
            "ok"
        }

        AsyncFunction("cancelPeriodicSync") {
            val ctx = appContext.reactContext!!
            SyncScheduler.cancelPeriodicBackendSync(ctx)
            "ok"
        }

        // ─── Nearby Connections ─────────────────────────────────────────

        AsyncFunction("startAdvertising") { deviceName: String ->
            val encodedName = "$deviceName|${getDeviceId()}"
            nearbyManager.startAdvertising(encodedName)
            "ok"
        }

        AsyncFunction("stopAdvertising") {
            nearbyManager.stopAdvertising()
            "ok"
        }

        AsyncFunction("startDiscovery") {
            nearbyManager.startDiscovery()
            "ok"
        }

        AsyncFunction("stopDiscovery") {
            nearbyManager.stopDiscovery()
            "ok"
        }

        AsyncFunction("connectToDevice") { deviceName: String, endpointId: String ->
            val encodedName = "$deviceName|${getDeviceId()}"
            nearbyManager.requestConnection(encodedName, endpointId)
            "ok"
        }

        AsyncFunction("acceptConnection") { endpointId: String ->
            nearbyManager.acceptConnection(endpointId)
            "ok"
        }

        AsyncFunction("rejectConnection") { endpointId: String ->
            nearbyManager.rejectConnection(endpointId)
            "ok"
        }

        AsyncFunction("disconnectDevice") { endpointId: String ->
            nearbyManager.disconnect(endpointId)
            "ok"
        }

        AsyncFunction("disconnectAll") {
            nearbyManager.disconnectAll()
            "ok"
        }

        AsyncFunction("getDiscoveredDevices") {
            nearbyManager.discoveredEndpoints.value.map { endpoint ->
                mapOf(
                    "endpointId" to endpoint.endpointId,
                    "endpointName" to endpoint.endpointName,
                    "remoteDeviceId" to (endpoint.remoteDeviceId ?: ""),
                    "serviceId" to endpoint.serviceId
                )
            }
        }

        AsyncFunction("getConnectedDevices") {
            nearbyManager.connectedEndpoints.value.map { endpoint ->
                mapOf(
                    "endpointId" to endpoint.endpointId,
                    "endpointName" to endpoint.endpointName,
                    "remoteDeviceId" to (endpoint.remoteDeviceId ?: "")
                )
            }
        }

        AsyncFunction("getDeviceSyncInfo") {
            val connected = nearbyManager.connectedEndpoints.value.firstOrNull()
            mapOf(
                "connectedDeviceId" to connected?.endpointId,
                "connectedDeviceName" to connected?.endpointName,
                "isAdvertising" to nearbyManager.isAdvertising.value,
                "isDiscovering" to nearbyManager.isDiscovering.value
            )
        }

        // ─── Member Queries ─────────────────────────────────────────────

        AsyncFunction("getMember") Coroutine { id: String ->
            engine.getMember(id)?.toMap()
        }

        AsyncFunction("getMemberByNfc") Coroutine { nfcCardId: String ->
            engine.getMemberByNfc(nfcCardId)?.toMap()
        }

        AsyncFunction("searchMembers") Coroutine { query: String ->
            engine.searchMembers(query).map { it.toMap() }
        }

        AsyncFunction("getAllMembers") Coroutine { ->
            engine.getAllMembers().map { it.toMap() }
        }

        // ─── Session Queries ────────────────────────────────────────────

        AsyncFunction("getSession") Coroutine { id: String ->
            engine.getSession(id)?.toMap()
        }

        AsyncFunction("getActiveSession") Coroutine { ->
            engine.getActiveSession()?.toMap()
        }

        AsyncFunction("getAllSessions") Coroutine { ->
            engine.getAllSessions().map { it.toMap() }
        }

        // ─── Todo Queries ───────────────────────────────────────────────

        AsyncFunction("getTodo") Coroutine { id: String ->
            engine.getTodo(id)?.toMap()
        }

        AsyncFunction("getAllTodos") Coroutine { ->
            engine.getAllTodos().map { it.toMap() }
        }

        // ─── Payment Queries ────────────────────────────────────────────

        AsyncFunction("getPaymentsByMember") Coroutine { memberId: String ->
            engine.getPaymentsByMember(memberId).map { it.toMap() }
        }

        AsyncFunction("getPaymentsBySession") Coroutine { sessionId: String ->
            engine.getPaymentsBySession(sessionId).map { it.toMap() }
        }

        // ─── Weight Record Queries ──────────────────────────────────────

        AsyncFunction("getWeightRecordsByMember") Coroutine { memberId: String ->
            engine.getWeightRecordsByMember(memberId).map { it.toMap() }
        }

        AsyncFunction("getLatestWeight") Coroutine { memberId: String ->
            engine.getLatestWeight(memberId)?.toMap()
        }

        // ─── Award Queries ──────────────────────────────────────────────

        AsyncFunction("getAwardsByMember") Coroutine { memberId: String ->
            engine.getAwardsByMember(memberId).map { it.toMap() }
        }

        // ─── Device Queries ─────────────────────────────────────────────

        AsyncFunction("getDevice") Coroutine { id: String ->
            engine.getDevice(id)?.toMap()
        }

        AsyncFunction("getAllDevices") Coroutine { ->
            engine.getAllDevices().map { it.toMap() }
        }

        AsyncFunction("getPairedDevices") Coroutine { ->
            engine.getPairedDevices().map { it.toMap() }
        }

        AsyncFunction("removePairedDevice") Coroutine { deviceId: String ->
            engine.getDevice(deviceId)?.let { device ->
                if (device.connectionStatus == "connected" && device.nearbyEndpointId != null) {
                    nearbyManager.disconnect(device.nearbyEndpointId!!)
                }
            }
            engine.deleteDevice(deviceId)
            "ok"
        }

        AsyncFunction("unpairDevice") Coroutine { deviceId: String ->
            engine.getDevice(deviceId)?.let { device ->
                engine.upsertDevice(device.copy(isPaired = false))
            }
            "ok"
        }

        // ─── Device Info ────────────────────────────────────────────────

        AsyncFunction("getDeviceId") {
            getDeviceId()
        }

        AsyncFunction("getDeviceName") {
            val context = appContext.reactContext

            val deviceName = try {
                Settings.Global.getString(context?.contentResolver, "device_name")
                    ?: Settings.Secure.getString(context?.contentResolver, "bluetooth_name")
            } catch (e: Exception) {
                null
            }
            deviceName ?: Build.MODEL ?: "Unknown Device"
        }

        // ─── Outbox Management ──────────────────────────────────────────

        AsyncFunction("startOutboxProcessing") {
            eventOutbox.startProcessing()
            "ok"
        }

        AsyncFunction("stopOutboxProcessing") {
            eventOutbox.stopProcessing()
            "ok"
        }

        // ─── Lifecycle ──────────────────────────────────────────────────

        OnDestroy {
            eventOutbox.destroy()
            nearbyManager.destroy()
        }
    }
}

// ─── Entity → Map Extensions ────────────────────────────────────────────

private fun expo.modules.datasync.db.entities.EventEntity.toMap() = mapOf(
    "eventId" to eventId,
    "deviceId" to deviceId,
    "sessionId" to sessionId,
    "eventType" to eventType,
    "occurredAt" to occurredAt,
    "payload" to payload,
    "idempotencyKey" to idempotencyKey,
    "correlationId" to correlationId,
    "createdAt" to createdAt
)

private fun expo.modules.datasync.db.entities.MemberEntity.toMap() = mapOf(
    "id" to id,
    "name" to name,
    "email" to email,
    "phone" to phone,
    "nfcCardId" to nfcCardId,
    "membershipNumber" to membershipNumber,
    "currentWeight" to currentWeight,
    "targetWeight" to targetWeight,
    "height" to height,
    "bmi" to bmi,
    "notes" to notes,
    "joinedAt" to joinedAt,
    "createdAt" to createdAt,
    "updatedAt" to updatedAt
)

private fun expo.modules.datasync.db.entities.SessionEntity.toMap() = mapOf(
    "id" to id,
    "groupId" to groupId,
    "consultantId" to consultantId,
    "status" to status,
    "startedAt" to startedAt,
    "endedAt" to endedAt,
    "memberCount" to memberCount,
    "eventCount" to eventCount,
    "createdAt" to createdAt,
    "updatedAt" to updatedAt
)

private fun expo.modules.datasync.db.entities.TodoEntity.toMap() = mapOf(
    "id" to id,
    "title" to title,
    "description" to description,
    "completed" to completed,
    "deviceId" to deviceId,
    "sessionId" to sessionId,
    "createdAt" to createdAt,
    "updatedAt" to updatedAt
)

private fun expo.modules.datasync.db.entities.PaymentEntity.toMap() = mapOf(
    "id" to id,
    "memberId" to memberId,
    "amount" to amount,
    "currency" to currency,
    "type" to type,
    "sessionId" to sessionId,
    "deviceId" to deviceId,
    "occurredAt" to occurredAt,
    "createdAt" to createdAt
)

private fun expo.modules.datasync.db.entities.WeightRecordEntity.toMap() = mapOf(
    "id" to id,
    "memberId" to memberId,
    "weight" to weight,
    "previousWeight" to previousWeight,
    "change" to change,
    "source" to source,
    "scaleDeviceId" to scaleDeviceId,
    "sessionId" to sessionId,
    "deviceId" to deviceId,
    "measuredAt" to measuredAt,
    "createdAt" to createdAt
)

private fun expo.modules.datasync.db.entities.AwardEntity.toMap() = mapOf(
    "id" to id,
    "memberId" to memberId,
    "type" to type,
    "description" to description,
    "grantedAt" to grantedAt,
    "sessionId" to sessionId,
    "createdAt" to createdAt
)

private fun expo.modules.datasync.db.entities.DeviceEntity.toMap() = mapOf(
    "id" to id,
    "deviceName" to deviceName,
    "nearbyEndpointId" to nearbyEndpointId,
    "role" to role,
    "connectionStatus" to connectionStatus,
    "lastSeenAt" to lastSeenAt,
    "isPaired" to isPaired,
    "createdAt" to createdAt
)
