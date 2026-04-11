package expo.modules.datasync.worker

import android.content.Context
import android.util.Log
import androidx.work.*
import expo.modules.datasync.db.AppDatabase
import expo.modules.datasync.engine.BackendSyncManager
import expo.modules.datasync.engine.DataSyncEngine
import expo.modules.datasync.engine.EventOutbox
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * WorkManager CoroutineWorker for background backend sync.
 *
 * Runs periodically (minimum 15 min) when network is available and battery is not low.
 * Picks up pending/device-synced events and uploads to backend in batches.
 */
class BackendSyncWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    companion object {
        const val TAG = "BackendSyncWorker"
        const val WORK_NAME = "fitsync_backend_sync"
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        Log.d(TAG, "Backend sync worker started (attempt $runAttemptCount)")

        try {
            val engine = DataSyncEngine(applicationContext)
            val backendManager = BackendSyncManager()

            val outbox = EventOutbox(
                engine = engine,
                onDeviceSyncBatch = { false }, // Not used in backend worker
                onBackendSyncBatch = { entries ->
                    backendManager.uploadBatch(entries)
                }
            )

            val syncedCount = outbox.processBackendSyncBatch()
            Log.d(TAG, "Backend sync completed: $syncedCount events synced")

            Result.success(
                workDataOf("synced_count" to syncedCount)
            )
        } catch (e: Exception) {
            Log.e(TAG, "Backend sync failed: ${e.message}")
            if (runAttemptCount < 3) {
                Result.retry()
            } else {
                Result.failure(
                    workDataOf("error" to (e.message ?: "Unknown error"))
                )
            }
        }
    }
}
