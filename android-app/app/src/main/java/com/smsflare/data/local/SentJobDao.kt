package com.smsflare.data.local

import androidx.room.*

@Dao
interface SentJobDao {
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(job: SentJob)

    @Query("SELECT * FROM sent_jobs WHERE jobId = :jobId LIMIT 1")
    suspend fun findById(jobId: String): SentJob?

    @Query("DELETE FROM sent_jobs WHERE sentAt < :cutoff")
    suspend fun deleteOlderThan(cutoff: Long)
}
