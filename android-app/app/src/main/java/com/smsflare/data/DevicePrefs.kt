package com.smsflare.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "device_prefs")

object DevicePrefs {
    private val BASE_URL = stringPreferencesKey("base_url")
    private val DEVICE_TOKEN = stringPreferencesKey("device_token")
    private val DEVICE_ID = stringPreferencesKey("device_id")
    private val SUBSCRIPTION_ID = intPreferencesKey("subscription_id")

    suspend fun save(context: Context, baseUrl: String, token: String, deviceId: String) {
        context.dataStore.edit { prefs ->
            prefs[BASE_URL] = baseUrl
            prefs[DEVICE_TOKEN] = token
            prefs[DEVICE_ID] = deviceId
        }
    }

    suspend fun getToken(context: Context): String? =
        context.dataStore.data.map { it[DEVICE_TOKEN] }.first()

    suspend fun getBaseUrl(context: Context): String? =
        context.dataStore.data.map { it[BASE_URL] }.first()

    suspend fun getDeviceId(context: Context): String? =
        context.dataStore.data.map { it[DEVICE_ID] }.first()

    suspend fun isRegistered(context: Context): Boolean =
        getToken(context) != null

    fun isRegisteredBlocking(context: Context): Boolean =
        runBlocking { isRegistered(context) }

    suspend fun saveSubscriptionId(context: Context, subId: Int) {
        context.dataStore.edit { it[SUBSCRIPTION_ID] = subId }
    }

    suspend fun getSubscriptionId(context: Context): Int? =
        context.dataStore.data.map { it[SUBSCRIPTION_ID] }.first()

    fun getSubscriptionIdBlocking(context: Context): Int? =
        runBlocking { getSubscriptionId(context) }
}
