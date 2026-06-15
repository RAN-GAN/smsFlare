package com.smsflare.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(entities = [PendingJob::class, LogEntry::class, SentJob::class], version = 3, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun pendingJobDao(): PendingJobDao
    abstract fun logEntryDao(): LogEntryDao
    abstract fun sentJobDao(): SentJobDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase =
            INSTANCE ?: synchronized(this) {
                Room.databaseBuilder(context.applicationContext, AppDatabase::class.java, "smsflare.db")
                    .addMigrations(MIGRATION_1_2, MIGRATION_2_3)
                    .build()
                    .also { INSTANCE = it }
            }

        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(database: SupportSQLiteDatabase) {
                database.execSQL(
                    "CREATE TABLE IF NOT EXISTS log_entries (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
                    "level TEXT NOT NULL, " +
                    "tag TEXT NOT NULL, " +
                    "message TEXT NOT NULL, " +
                    "timestamp INTEGER NOT NULL DEFAULT 0)"
                )
            }
        }

        private val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(database: SupportSQLiteDatabase) {
                database.execSQL(
                    "CREATE TABLE IF NOT EXISTS sent_jobs (" +
                    "jobId TEXT PRIMARY KEY NOT NULL, " +
                    "sentAt INTEGER NOT NULL DEFAULT 0)"
                )
            }
        }
    }
}
