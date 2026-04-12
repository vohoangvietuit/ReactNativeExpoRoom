# 06 — Backend Sync

Backend synchronization uploads the local event log to a central server using **WorkManager** for reliable background execution. This is independent of the cross-tablet sync (see [05-cross-tablet-sync.md](./05-cross-tablet-sync.md)).

---

## WorkManager Background Sync

**Dependency:** `androidx.work:work-runtime-ktx:2.10.0`

WorkManager guarantees execution even if the app is backgrounded or the device reboots.

### Scheduling (`SyncScheduler.kt`)

```kotlin
object SyncScheduler {

    // Periodic backend sync every 15 minutes when network + battery are OK
    fun schedulePeriodicBackendSync(context: Context) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .setRequiresBatteryNotLow(true)
            .build()

        val request = PeriodicWorkRequestBuilder<BackendSyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, WorkRequest.MIN_BACKOFF_MILLIS, TimeUnit.MILLISECONDS)
            .addTag(BackendSyncWorker.TAG)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            BackendSyncWorker.WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            request
        )
    }

    fun cancelPeriodicBackendSync(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(BackendSyncWorker.WORK_NAME)
    }

    // One-shot backend sync (triggered from JS via triggerBackendSync())
    fun triggerImmediateBackendSync(context: Context) {
        val request = OneTimeWorkRequestBuilder<BackendSyncWorker>()
            .setConstraints(Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, WorkRequest.MIN_BACKOFF_MILLIS, TimeUnit.MILLISECONDS)
            .addTag(BackendSyncWorker.TAG)
            .build()

        WorkManager.getInstance(context).enqueue(request)
    }

    // One-shot device sync (triggered on peer connection)
    fun triggerDeviceSync(context: Context, endpointId: String, deviceId: String) { ... }
}
```

### BackendSyncWorker

```kotlin
class BackendSyncWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    companion object {
        const val TAG = "BackendSyncWorker"
        const val WORK_NAME = "fitsync_backend_sync"
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val engine = DataSyncEngine(applicationContext)
            val outbox = EventOutbox(
                engine = engine,
                onDeviceSyncBatch = { false }, // unused in backend worker
                onBackendSyncBatch = { entries -> BackendSyncManager().uploadBatch(entries) }
            )
            val synced = outbox.processBackendSyncBatch()
            Result.success(workDataOf("synced_count" to synced))
        } catch (e: Exception) {
            if (runAttemptCount < 3) Result.retry()
            else Result.failure(workDataOf("error" to e.message))
        }
    }
}
```

### DeviceSyncWorker

A one-shot worker triggered when a peer device connects. It creates the outgoing `EventBatch` payload and hands it to `NearbyManager` to send:

```kotlin
class DeviceSyncWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    companion object {
        const val TAG = "DeviceSyncWorker"
        const val WORK_NAME = "fitsync_device_sync"
        const val KEY_ENDPOINT_ID = "endpoint_id"
        const val KEY_DEVICE_ID = "device_id"
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val endpointId = inputData.getString(KEY_ENDPOINT_ID) ?: return@withContext Result.failure()
        val deviceId   = inputData.getString(KEY_DEVICE_ID)   ?: return@withContext Result.failure()
        // Builds EventBatch payload — actual send is via NearbyManager in the module
        ...
    }
}
```

---

## Batch Upload Pattern

Events are uploaded in batches (up to 50 at a time) to reduce HTTP overhead. `BackendSyncWorker` calls `EventOutbox.processBackendSyncBatch()` which delegates to `BackendSyncManager.uploadBatch()`:

````kotlin
// EventOutbox.kt
suspend fun processBackendSyncBatch(): Int {
    val pending = engine.getPendingOutboxEntries(BATCH_SIZE)
        .filter { it.outbox.status == "Pending" || it.outbox.status == "DeviceSynced" }

    if (pending.isEmpty()) return 0

    val success = onBackendSyncBatch(pending)
    return if (success) {
        pending.forEach { engine.markOutboxBackendSynced(it.outbox.eventId) }
        pending.size
    } else {
        pending.forEach { engine.markOutboxFailed(it.outbox.eventId) }
        0
    }
}

---

## Retry with Exponential Backoff

WorkManager handles retry scheduling. `BackendSyncWorker` returns `Result.retry()` on transient failures (up to 3 attempts). Both the periodic and one-shot work requests use `BackoffPolicy.EXPONENTIAL` starting from `WorkRequest.MIN_BACKOFF_MILLIS`.

The `OutboxEntity.retryCount` tracks application-level failure counts independently of WorkManager retries, visible through `getSyncStatus()` on the JS side.

---

## `IBackendApi` Interface

The backend API is abstracted behind an interface, allowing a mock during development:

```kotlin
interface IBackendApi {
    suspend fun syncEvents(request: SyncRequest): SyncResponse
    suspend fun fetchUpdates(deviceId: String, since: Long): List<SyncEventPayload>
}

@Serializable
data class SyncRequest(val events: List<SyncEventPayload>)

@Serializable
data class SyncResponse(
    val success: Boolean,
    val acceptedCount: Int,
    val rejectedCount: Int,
    val rejectedEventIds: List<String> = emptyList(),
    val message: String? = null
)
````

### Mock Implementation

```kotlin
class MockBackendApi : IBackendApi {
    override suspend fun syncEvents(request: SyncRequest): SyncResponse {
        delay(500) // simulate network
        return SyncResponse(
            success = true,
            acceptedCount = request.events.size,
            rejectedCount = 0
        )
    }

    override suspend fun fetchUpdates(deviceId: String, since: Long): List<SyncEventPayload> {
        return emptyList()
    }
}
```

**Switching to real API:** Replace `MockBackendApi` with a Retrofit or Ktor implementation in `BackendSyncManager`. The interface contract remains the same.

---

## Sync Status Events

The native module emits sync status updates to React Native:

```typescript
// Emitted after each backend sync attempt
{
  type: 'backendSync';
  accepted: number;
  rejected: number;
  errors: string[];
}
```

The Redux `sync` slice listens to these events to update the UI sync indicator.

---

## Observability

Track sync health via the `OutboxEntity` table:

| Query                                          | Meaning                           |
| ---------------------------------------------- | --------------------------------- |
| `WHERE status = 'Pending'`                     | Events not yet synced anywhere    |
| `WHERE status = 'Failed' AND retry_count >= 3` | Stuck events (need investigation) |
| `WHERE status = 'BackendSynced'`               | Successfully uploaded             |

A "sync dashboard" screen in the `devices` feature can surface this data to the operator.
