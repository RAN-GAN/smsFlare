package com.smsflare.sms

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import com.smsflare.data.DevicePrefs
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume

sealed class SmsResult {
    object Sent : SmsResult()
    data class Failed(val reason: String) : SmsResult()
}

class SmsSender(private val context: Context) {

    private fun getSmsManager(): SmsManager {
        val subId = DevicePrefs.getSubscriptionIdBlocking(context)
        return if (subId != null && subId != SubscriptionManager.INVALID_SUBSCRIPTION_ID) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                context.getSystemService(SmsManager::class.java).createForSubscriptionId(subId)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getSmsManagerForSubscriptionId(subId)
            }
        } else {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                context.getSystemService(SmsManager::class.java)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            }
        }
    }

    suspend fun send(jobId: String, recipient: String, message: String): SmsResult {
        val sentAction = "com.smsflare.SMS_SENT.$jobId"

        val result = withTimeoutOrNull(30_000L) {
            suspendCancellableCoroutine { cont ->
                val receiver = object : BroadcastReceiver() {
                    override fun onReceive(ctx: Context, intent: Intent) {
                        context.unregisterReceiver(this)
                        when (resultCode) {
                            Activity.RESULT_OK -> cont.resume(SmsResult.Sent)
                            else -> cont.resume(SmsResult.Failed("Send failed: resultCode=$resultCode"))
                        }
                    }
                }

                val filter = IntentFilter(sentAction)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
                } else {
                    @Suppress("UnspecifiedRegisterReceiverFlag")
                    context.registerReceiver(receiver, filter)
                }

                cont.invokeOnCancellation {
                    try { context.unregisterReceiver(receiver) } catch (_: Exception) {}
                }

                val sentIntent = PendingIntent.getBroadcast(
                    context, jobId.hashCode(),
                    Intent(sentAction),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                try {
                    getSmsManager().sendTextMessage(recipient, null, message, sentIntent, null)
                } catch (e: Exception) {
                    try { context.unregisterReceiver(receiver) } catch (_: Exception) {}
                    cont.resume(SmsResult.Failed(e.message ?: "Unknown error"))
                }
            }
        }

        return result ?: SmsResult.Failed("Timeout: no confirmation after 30s")
    }
}
