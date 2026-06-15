package com.smsflare.data.local

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

object AppLogger {
    private lateinit var db: AppDatabase
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    fun init(database: AppDatabase) {
        db = database
    }

    fun info(tag: String, msg: String) {
        Log.i(tag, msg)
        persist("INFO", tag, msg)
    }

    fun warn(tag: String, msg: String) {
        Log.w(tag, msg)
        persist("WARN", tag, msg)
    }

    fun error(tag: String, msg: String, throwable: Throwable? = null) {
        if (throwable != null) Log.e(tag, msg, throwable) else Log.e(tag, msg)
        persist("ERROR", tag, if (throwable != null) "$msg: ${throwable.message}" else msg)
    }

    private fun persist(level: String, tag: String, msg: String) {
        if (!::db.isInitialized) return
        scope.launch {
            db.logEntryDao().insert(LogEntry(level = level, tag = tag, message = msg))
            db.logEntryDao().pruneOld()
        }
    }
}
