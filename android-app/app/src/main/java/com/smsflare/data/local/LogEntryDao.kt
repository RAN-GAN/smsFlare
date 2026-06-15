package com.smsflare.data.local

import androidx.room.*

@Dao
interface LogEntryDao {
    @Insert
    suspend fun insert(entry: LogEntry)

    @Query("SELECT * FROM log_entries ORDER BY timestamp DESC LIMIT 500")
    suspend fun getRecent(): List<LogEntry>

    @Query("DELETE FROM log_entries")
    suspend fun deleteAll()

    @Query("DELETE FROM log_entries WHERE id NOT IN (SELECT id FROM log_entries ORDER BY timestamp DESC LIMIT 500)")
    suspend fun pruneOld()
}
