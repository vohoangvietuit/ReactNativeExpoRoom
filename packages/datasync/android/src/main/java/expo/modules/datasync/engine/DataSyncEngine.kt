package expo.modules.datasync.engine

import android.content.Context
import androidx.room.withTransaction
import expo.modules.datasync.db.AppDatabase
import expo.modules.datasync.db.dao.SyncCountResult
import expo.modules.datasync.db.entities.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import java.util.UUID

/**
 * DataSync Engine — Single Source of Truth (SSOT) coordinator.
 *
 * All data mutations flow through this engine:
 * 1. Record an event (EventEntity + OutboxEntity)
 * 2. Apply side-effects to domain tables (members, payments, etc.)
 * 3. Outbox processor picks up pending events for sync
 *
 * This class is the ONLY entry point for writes in the native layer.
 */
class DataSyncEngine(private val context: Context) {

    private val db: AppDatabase by lazy { AppDatabase.getInstance(context) }
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    // ─── Event Recording ────────────────────────────────────────────────

    /**
     * Record an event and create an outbox entry.
     * This is the primary write method for the entire system.
     */
    suspend fun recordEvent(
        eventType: String,
        payload: String,
        deviceId: String,
        sessionId: String,
        correlationId: String = UUID.randomUUID().toString()
    ): String = withContext(Dispatchers.IO) {
        val eventId = UUID.randomUUID().toString()
        val idempotencyKey = "$deviceId:$eventId"
        val now = System.currentTimeMillis()

        val event = EventEntity(
            eventId = eventId,
            deviceId = deviceId,
            sessionId = sessionId,
            eventType = eventType,
            occurredAt = now,
            payload = payload,
            idempotencyKey = idempotencyKey,
            correlationId = correlationId,
            createdAt = now
        )

        val outboxEntry = OutboxEntity(
            eventId = eventId,
            status = "Pending",
            createdAt = now
        )

        db.withTransaction {
            db.eventDao().insert(event)
            db.outboxDao().insert(outboxEntry)
            applyEventSideEffects(eventType, payload, event)
        }

        eventId
    }

    /**
     * Record an event received from another device (already has eventId).
     * Uses IGNORE strategy to skip duplicates via idempotencyKey.
     */
    suspend fun recordRemoteEvent(event: EventEntity): Boolean = withContext(Dispatchers.IO) {
        // Check idempotency — skip if we already have this event
        val existing = db.eventDao().getByIdempotencyKey(event.idempotencyKey)
        if (existing != null) return@withContext false

        val rowId = db.eventDao().insert(event)
        if (rowId == -1L) return@withContext false // INSERT IGNORE returned -1

        // Create outbox entry as DeviceSynced (received from peer)
        val outboxEntry = OutboxEntity(
            eventId = event.eventId,
            status = "DeviceSynced",
            createdAt = System.currentTimeMillis()
        )
        db.outboxDao().insert(outboxEntry)

        // Apply side-effects
        applyEventSideEffects(event.eventType, event.payload, event)

        true
    }

    // ─── Side Effects ───────────────────────────────────────────────────

    private suspend fun applyEventSideEffects(
        eventType: String,
        payload: String,
        event: EventEntity
    ) {
        try {
            when (eventType) {
                "SessionStarted" -> applySessionStarted(payload, event)
                "SessionEnded" -> applySessionEnded(payload, event)
                "MemberRegistered" -> applyMemberRegistered(payload)
                "MemberIdentified" -> applyMemberIdentified(payload, event)
                "PaymentRecorded" -> applyPaymentRecorded(payload, event)
                "WeightRecorded" -> applyWeightRecorded(payload, event)
                "AwardGranted" -> applyAwardGranted(payload, event)
                "TodoCreated" -> applyTodoCreated(payload, event)
                "TodoUpdated" -> applyTodoUpdated(payload)
                "TodoDeleted" -> applyTodoDeleted(payload)
            }
        } catch (e: Exception) {
            // Log but don't fail the event recording
            android.util.Log.e("DataSyncEngine", "Side-effect failed for $eventType: ${e.message}")
        }
    }

    private suspend fun applySessionStarted(payload: String, event: EventEntity) {
        val data = json.decodeFromString<Map<String, String>>(payload)
        val session = SessionEntity(
            id = event.sessionId,
            groupId = data["groupId"] ?: "",
            consultantId = data["consultantId"] ?: "",
            status = "active",
            startedAt = event.occurredAt,
            createdAt = event.occurredAt
        )
        db.sessionDao().insert(session)
    }

    private suspend fun applySessionEnded(payload: String, event: EventEntity) {
        db.sessionDao().updateStatus(event.sessionId, "completed", event.occurredAt)
    }

    private suspend fun applyMemberRegistered(payload: String) {
        val data = json.decodeFromString<Map<String, String>>(payload)
        val now = System.currentTimeMillis()
        val member = MemberEntity(
            id = data["memberId"] ?: UUID.randomUUID().toString(),
            name = data["name"] ?: "",
            email = data["email"],
            nfcCardId = data["nfcCardId"],
            joinedAt = now,
            createdAt = now
        )
        db.memberDao().insert(member)
    }

    private suspend fun applyMemberIdentified(payload: String, event: EventEntity) {
        val data = json.decodeFromString<Map<String, String>>(payload)
        val memberId = data["memberId"] ?: return
        // Increment session member count
        db.sessionDao().incrementEventCount(event.sessionId)
    }

    private suspend fun applyPaymentRecorded(payload: String, event: EventEntity) {
        val data = json.decodeFromString<Map<String, String>>(payload)
        val payment = PaymentEntity(
            id = data["paymentId"] ?: UUID.randomUUID().toString(),
            memberId = data["memberId"] ?: "",
            amount = data["amount"]?.toDoubleOrNull() ?: 0.0,
            currency = data["currency"] ?: "GBP",
            type = data["type"] ?: "cash",
            sessionId = event.sessionId,
            deviceId = event.deviceId,
            occurredAt = event.occurredAt,
            createdAt = System.currentTimeMillis()
        )
        db.paymentDao().insert(payment)
    }

    private suspend fun applyWeightRecorded(payload: String, event: EventEntity) {
        val data = json.decodeFromString<Map<String, String>>(payload)
        val memberId = data["memberId"] ?: return
        val weight = data["weight"]?.toDoubleOrNull() ?: return

        // Get previous weight for change calculation
        val latest = db.weightRecordDao().getLatestByMemberId(memberId)
        val previousWeight = latest?.weight
        val change = previousWeight?.let { weight - it }

        val record = WeightRecordEntity(
            id = data["recordId"] ?: UUID.randomUUID().toString(),
            memberId = memberId,
            weight = weight,
            previousWeight = previousWeight,
            change = change,
            source = data["source"] ?: "manual",
            scaleDeviceId = data["scaleDeviceId"],
            sessionId = event.sessionId,
            deviceId = event.deviceId,
            measuredAt = event.occurredAt,
            createdAt = System.currentTimeMillis()
        )
        db.weightRecordDao().insert(record)

        // Update member's current weight
        val height = db.memberDao().getById(memberId)?.height
        val bmi = if (height != null && height > 0) weight / ((height / 100.0) * (height / 100.0)) else null
        db.memberDao().updateWeight(memberId, weight, bmi)
    }

    private suspend fun applyAwardGranted(payload: String, event: EventEntity) {
        val data = json.decodeFromString<Map<String, String>>(payload)
        val award = AwardEntity(
            id = data["awardId"] ?: UUID.randomUUID().toString(),
            memberId = data["memberId"] ?: "",
            type = data["type"] ?: "",
            description = data["description"] ?: "",
            grantedAt = event.occurredAt,
            sessionId = event.sessionId,
            createdAt = System.currentTimeMillis()
        )
        db.awardDao().insert(award)
    }

    private suspend fun applyTodoCreated(payload: String, event: EventEntity) {
        val data = json.decodeFromString<Map<String, String>>(payload)
        val todo = TodoEntity(
            id = data["todoId"] ?: UUID.randomUUID().toString(),
            title = data["title"] ?: "",
            description = data["description"],
            completed = false,
            deviceId = event.deviceId,
            sessionId = event.sessionId,
            createdAt = System.currentTimeMillis()
        )
        db.todoDao().insert(todo)
    }

    private suspend fun applyTodoUpdated(payload: String) {
        val data = json.decodeFromString<Map<String, String>>(payload)
        val todoId = data["todoId"] ?: return
        val existing = db.todoDao().getById(todoId) ?: return
        val updated = existing.copy(
            title = data["title"] ?: existing.title,
            description = data["description"] ?: existing.description,
            completed = data["completed"]?.toBooleanStrictOrNull() ?: existing.completed,
            updatedAt = System.currentTimeMillis()
        )
        db.todoDao().update(updated)
    }

    private suspend fun applyTodoDeleted(payload: String) {
        val data = json.decodeFromString<Map<String, String>>(payload)
        val todoId = data["todoId"] ?: return
        db.todoDao().deleteById(todoId)
    }

    // ─── Queries ────────────────────────────────────────────────────────

    suspend fun getEventsBySession(sessionId: String): List<EventEntity> =
        withContext(Dispatchers.IO) { db.eventDao().getBySessionId(sessionId) }

    suspend fun getEventById(eventId: String): EventEntity? =
        withContext(Dispatchers.IO) { db.eventDao().getById(eventId) }

    suspend fun getEventsByType(eventType: String): List<EventEntity> =
        withContext(Dispatchers.IO) { db.eventDao().getByType(eventType) }

    // ─── Outbox Queries ─────────────────────────────────────────────────

    suspend fun getPendingOutboxEntries(limit: Int = 50): List<OutboxEntry> =
        withContext(Dispatchers.IO) {
            val outboxEntries = db.outboxDao().getPendingBatch(limit)
            val eventIds = outboxEntries.map { it.eventId }
            val events = db.eventDao().getByIds(eventIds).associateBy { it.eventId }
            outboxEntries.mapNotNull { entry ->
                events[entry.eventId]?.let { event ->
                    OutboxEntry(outbox = entry, event = event)
                }
            }
        }

    suspend fun getRetryableOutboxEntries(maxRetries: Int = 5): List<OutboxEntry> =
        withContext(Dispatchers.IO) {
            val outboxEntries = db.outboxDao().getRetryable(maxRetries)
            val eventIds = outboxEntries.map { it.eventId }
            val events = db.eventDao().getByIds(eventIds).associateBy { it.eventId }
            outboxEntries.mapNotNull { entry ->
                events[entry.eventId]?.let { event ->
                    OutboxEntry(outbox = entry, event = event)
                }
            }
        }

    // ─── Outbox Updates ─────────────────────────────────────────────────

    suspend fun markDeviceSynced(eventIds: List<String>) = withContext(Dispatchers.IO) {
        db.outboxDao().updateStatusForEvents(eventIds, "DeviceSynced")
    }

    suspend fun markBackendSynced(eventIds: List<String>) = withContext(Dispatchers.IO) {
        db.outboxDao().updateStatusForEvents(eventIds, "BackendSynced")
    }

    suspend fun markFailed(eventIds: List<String>, error: String) = withContext(Dispatchers.IO) {
        db.outboxDao().markFailed(eventIds, error)
    }

    // ─── Sync Status ────────────────────────────────────────────────────

    suspend fun getSyncCounts(): SyncCountResult = withContext(Dispatchers.IO) {
        db.outboxDao().getSyncCounts()
    }

    suspend fun getLastBackendSyncTime(): Long? = withContext(Dispatchers.IO) {
        db.outboxDao().getLastBackendSyncTime()
    }

    // ─── Domain Queries (passthrough to DAOs) ───────────────────────────

    // Members
    suspend fun getMember(id: String): MemberEntity? = withContext(Dispatchers.IO) { db.memberDao().getById(id) }
    suspend fun getMemberByNfc(nfcCardId: String): MemberEntity? = withContext(Dispatchers.IO) { db.memberDao().getByNfcCardId(nfcCardId) }
    suspend fun searchMembers(query: String): List<MemberEntity> = withContext(Dispatchers.IO) { db.memberDao().search(query) }
    suspend fun getAllMembers(): List<MemberEntity> = withContext(Dispatchers.IO) { db.memberDao().getAll() }
    fun observeMembers(): Flow<List<MemberEntity>> = db.memberDao().observeAll()

    // Payments
    suspend fun getPaymentsByMember(memberId: String): List<PaymentEntity> = withContext(Dispatchers.IO) { db.paymentDao().getByMemberId(memberId) }
    suspend fun getPaymentsBySession(sessionId: String): List<PaymentEntity> = withContext(Dispatchers.IO) { db.paymentDao().getBySessionId(sessionId) }

    // Weight Records
    suspend fun getWeightRecordsByMember(memberId: String): List<WeightRecordEntity> = withContext(Dispatchers.IO) { db.weightRecordDao().getByMemberId(memberId) }
    suspend fun getLatestWeight(memberId: String): WeightRecordEntity? = withContext(Dispatchers.IO) { db.weightRecordDao().getLatestByMemberId(memberId) }

    // Awards
    suspend fun getAwardsByMember(memberId: String): List<AwardEntity> = withContext(Dispatchers.IO) { db.awardDao().getByMemberId(memberId) }

    // Sessions
    suspend fun getSession(id: String): SessionEntity? = withContext(Dispatchers.IO) { db.sessionDao().getById(id) }
    suspend fun getActiveSession(): SessionEntity? = withContext(Dispatchers.IO) { db.sessionDao().getActiveSession() }
    suspend fun getAllSessions(): List<SessionEntity> = withContext(Dispatchers.IO) { db.sessionDao().getAll() }
    fun observeSessions(): Flow<List<SessionEntity>> = db.sessionDao().observeAll()

    // Todos
    suspend fun getTodo(id: String): TodoEntity? = withContext(Dispatchers.IO) { db.todoDao().getById(id) }
    suspend fun getAllTodos(): List<TodoEntity> = withContext(Dispatchers.IO) { db.todoDao().getAll() }
    fun observeTodos(): Flow<List<TodoEntity>> = db.todoDao().observeAll()

    // Devices
    suspend fun getDevice(id: String): DeviceEntity? = withContext(Dispatchers.IO) { db.deviceDao().getById(id) }
    suspend fun getDeviceByEndpoint(endpointId: String): DeviceEntity? = withContext(Dispatchers.IO) { db.deviceDao().getByEndpointId(endpointId) }
    suspend fun getPairedDeviceByName(name: String): DeviceEntity? = withContext(Dispatchers.IO) { db.deviceDao().getPairedByName(name) }
    suspend fun getPairedDevices(): List<DeviceEntity> = withContext(Dispatchers.IO) { db.deviceDao().getPairedDevices() }
    suspend fun getAllDevices(): List<DeviceEntity> = withContext(Dispatchers.IO) { db.deviceDao().getAll() }
    fun observeDevices(): Flow<List<DeviceEntity>> = db.deviceDao().observeAll()

    // Device management (direct writes — not event-sourced)
    suspend fun upsertDevice(device: DeviceEntity) = withContext(Dispatchers.IO) { db.deviceDao().insert(device) }
    suspend fun updateDeviceStatus(id: String, status: String) = withContext(Dispatchers.IO) { db.deviceDao().updateConnectionStatus(id, status) }
    suspend fun deleteDevice(id: String) = withContext(Dispatchers.IO) { db.deviceDao().deleteById(id) }

    // ─── Outbox Observable ──────────────────────────────────────────────

    fun observeOutbox(): Flow<List<OutboxEntity>> = db.outboxDao().observeAll()

    /**
     * Combined outbox entry associating an outbox record with its event data.
     */
    data class OutboxEntry(
        val outbox: OutboxEntity,
        val event: EventEntity
    )
}
