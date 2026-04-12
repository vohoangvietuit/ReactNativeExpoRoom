package expo.modules.datasync.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import expo.modules.datasync.db.dao.*
import expo.modules.datasync.db.entities.*
import net.sqlcipher.database.SupportFactory

/**
 * SQLCipher-encrypted Room database. Single Source of Truth for all local data.
 */
@Database(
    entities = [
        MemberEntity::class,
        PaymentEntity::class,
        WeightRecordEntity::class,
        AwardEntity::class,
        SessionEntity::class,
        TodoEntity::class,
        DeviceEntity::class,
        EventEntity::class,
        OutboxEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun memberDao(): MemberDao
    abstract fun paymentDao(): PaymentDao
    abstract fun weightRecordDao(): WeightRecordDao
    abstract fun awardDao(): AwardDao
    abstract fun sessionDao(): SessionDao
    abstract fun todoDao(): TodoDao
    abstract fun deviceDao(): DeviceDao
    abstract fun eventDao(): EventDao
    abstract fun outboxDao(): OutboxDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        private const val DATABASE_NAME = "fitsync.db"

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val passphrase = KeystoreHelper.getOrCreatePassphrase(context)
                val factory = SupportFactory(passphrase)
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    DATABASE_NAME
                )
                    .openHelperFactory(factory)
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
