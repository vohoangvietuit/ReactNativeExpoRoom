package expo.modules.datasync.db.dao

import androidx.room.*
import expo.modules.datasync.db.entities.DeviceEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DeviceDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(device: DeviceEntity)

    @Update
    suspend fun update(device: DeviceEntity)

    @Query("SELECT * FROM devices WHERE id = :id")
    suspend fun getById(id: String): DeviceEntity?

    @Query("SELECT * FROM devices WHERE nearby_endpoint_id = :endpointId")
    suspend fun getByEndpointId(endpointId: String): DeviceEntity?

    @Query("SELECT * FROM devices WHERE device_name = :name AND is_paired = 1 ORDER BY last_seen_at DESC LIMIT 1")
    suspend fun getPairedByName(name: String): DeviceEntity?

    @Query("SELECT * FROM devices WHERE is_paired = 1")
    suspend fun getPairedDevices(): List<DeviceEntity>

    @Query("SELECT * FROM devices ORDER BY last_seen_at DESC")
    suspend fun getAll(): List<DeviceEntity>

    @Query("SELECT * FROM devices ORDER BY last_seen_at DESC")
    fun observeAll(): Flow<List<DeviceEntity>>

    @Query("UPDATE devices SET connection_status = :status, last_seen_at = :lastSeenAt WHERE id = :id")
    suspend fun updateConnectionStatus(id: String, status: String, lastSeenAt: Long = System.currentTimeMillis())

    @Query("DELETE FROM devices WHERE id = :id")
    suspend fun deleteById(id: String)
}
