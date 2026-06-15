package com.smsflare

import android.app.Application
import androidx.work.Configuration
import com.smsflare.data.local.AppDatabase
import com.smsflare.data.local.AppLogger

class SmsFlareApplication : Application(), Configuration.Provider {
    override fun onCreate() {
        super.onCreate()
        AppLogger.init(AppDatabase.getInstance(this))
    }

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setMinimumLoggingLevel(android.util.Log.INFO)
            .build()
}
