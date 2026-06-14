package com.smsflare.data.local

import androidx.room.*

@Dao
interface PendingJobDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(job: PendingJob)

    @Query("SELECT * FROM pending_jobs ORDER BY createdAt ASC")
    suspend fun getAll(): List<PendingJob>

    @Query("DELETE FROM pending_jobs WHERE jobId = :jobId")
    suspend fun deleteById(jobId: String)
}
