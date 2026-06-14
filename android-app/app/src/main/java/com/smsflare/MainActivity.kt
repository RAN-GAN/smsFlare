package com.smsflare

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.telephony.SubscriptionInfo
import android.telephony.SubscriptionManager
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import com.smsflare.data.DevicePrefs
import com.smsflare.polling.DeviceRepository
import com.smsflare.polling.JobPoller
import com.smsflare.reporting.HeartbeatSender
import kotlinx.coroutines.launch
import org.json.JSONException
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions[Manifest.permission.SEND_SMS] == true) {
            showSetupForm()
        } else {
            Toast.makeText(this, "SMS permission is required to use this app.", Toast.LENGTH_LONG).show()
        }
    }

    private val qrScanLauncher = registerForActivityResult(ScanContract()) { result ->
        val raw = result.contents ?: return@registerForActivityResult
        try {
            val json = JSONObject(raw)
            val token = json.getString("token")
            val apiUrl = json.getString("api_url")
            pairDevice(apiUrl, token)
        } catch (e: JSONException) {
            showError("Invalid QR code — not an SMS Flare pairing code.")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        lifecycleScope.launch {
            if (DevicePrefs.isRegistered(this@MainActivity)) {
                if (DevicePrefs.getSubscriptionId(this@MainActivity) != null) {
                    showStatus()
                } else {
                    pickSimCard(afterPairing = false)
                }
            } else {
                requestRequiredPermissions()
            }
        }
    }

    private fun requestRequiredPermissions() {
        val required = mutableListOf(
            Manifest.permission.SEND_SMS,
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.CAMERA
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            required.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            required.add(Manifest.permission.READ_PHONE_NUMBERS)
        }

        val missing = required.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missing.isEmpty()) showSetupForm() else permissionLauncher.launch(missing.toTypedArray())
    }

    private fun showSetupForm() {
        findViewById<LinearLayout>(R.id.layoutSetup).visibility = View.VISIBLE
        findViewById<LinearLayout>(R.id.layoutStatus).visibility = View.GONE

        val etBaseUrl = findViewById<EditText>(R.id.etBaseUrl)
        val etPairingToken = findViewById<EditText>(R.id.etPairingToken)
        val btnPair = findViewById<Button>(R.id.btnPair)
        val btnScanQr = findViewById<Button>(R.id.btnScanQr)

        btnScanQr.setOnClickListener {
            qrScanLauncher.launch(
                ScanOptions().apply {
                    setDesiredBarcodeFormats(ScanOptions.QR_CODE)
                    setPrompt("Scan the QR code from your SMS Flare dashboard")
                    setBeepEnabled(false)
                    setOrientationLocked(false)
                }
            )
        }

        btnPair.setOnClickListener {
            val baseUrl = etBaseUrl.text.toString().trim()
            val token = etPairingToken.text.toString().trim()
            if (baseUrl.isEmpty() || token.isEmpty()) {
                showError("Both fields are required.")
                return@setOnClickListener
            }
            pairDevice(baseUrl, token)
        }
    }

    private fun pairDevice(baseUrl: String, token: String) {
        val btnPair = findViewById<Button>(R.id.btnPair)
        val btnScanQr = findViewById<Button>(R.id.btnScanQr)
        btnPair.isEnabled = false
        btnScanQr.isEnabled = false
        hideError()

        lifecycleScope.launch {
            try {
                val response = DeviceRepository(this@MainActivity).register(baseUrl, token)
                DevicePrefs.save(this@MainActivity, baseUrl, response.device_token, response.device_id)
                JobPoller.schedule(this@MainActivity)
                HeartbeatSender.schedule(this@MainActivity)
                pickSimCard(afterPairing = true)
            } catch (e: Exception) {
                showError("Pairing failed: ${e.message}")
                btnPair.isEnabled = true
                btnScanQr.isEnabled = true
            }
        }
    }

    // ── SIM selection ─────────────────────────────────────────────────────────

    @SuppressLint("MissingPermission")
    private fun pickSimCard(afterPairing: Boolean) {
        val subscriptionManager = getSystemService(SubscriptionManager::class.java)
        val sims: List<SubscriptionInfo> = try {
            subscriptionManager?.activeSubscriptionInfoList ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }

        when {
            sims.isEmpty() -> {
                // No SIM info available (permission denied or no SIM) — proceed without selection
                lifecycleScope.launch { showStatus() }
            }
            sims.size == 1 -> {
                // Single SIM — auto-select silently
                lifecycleScope.launch {
                    DevicePrefs.saveSubscriptionId(this@MainActivity, sims[0].subscriptionId)
                    showStatus()
                }
            }
            else -> {
                // Multiple SIMs — let user pick
                val labels = sims.map { sim ->
                    val slot = "SIM ${sim.simSlotIndex + 1}"
                    val carrier = sim.carrierName.takeIf { it.isNotEmpty() } ?: sim.displayName ?: "Unknown"
                    val number = sim.number?.takeIf { it.isNotEmpty() }
                    if (number != null) "$slot — $carrier ($number)" else "$slot — $carrier"
                }.toTypedArray()

                val title = if (afterPairing) "Choose which SIM sends SMS" else "Select SMS SIM"
                AlertDialog.Builder(this)
                    .setTitle(title)
                    .setCancelable(!afterPairing) // force pick after first pairing
                    .setItems(labels) { _, index ->
                        lifecycleScope.launch {
                            DevicePrefs.saveSubscriptionId(this@MainActivity, sims[index].subscriptionId)
                            showStatus()
                        }
                    }
                    .show()
            }
        }
    }

    // ── Status screen ─────────────────────────────────────────────────────────

    @SuppressLint("MissingPermission")
    private suspend fun showStatus() {
        val deviceId = DevicePrefs.getDeviceId(this) ?: "—"
        val baseUrl = DevicePrefs.getBaseUrl(this) ?: "—"
        val subId = DevicePrefs.getSubscriptionId(this)

        val simLabel = if (subId != null) {
            try {
                val sm = getSystemService(SubscriptionManager::class.java)
                val info = sm?.getActiveSubscriptionInfo(subId)
                if (info != null) {
                    val slot = "SIM ${info.simSlotIndex + 1}"
                    val carrier = info.carrierName.takeIf { it.isNotEmpty() } ?: info.displayName ?: "Unknown"
                    "$slot — $carrier"
                } else "SIM selected"
            } catch (_: Exception) { "SIM selected" }
        } else "No SIM selected"

        runOnUiThread {
            findViewById<LinearLayout>(R.id.layoutSetup).visibility = View.GONE
            val statusLayout = findViewById<LinearLayout>(R.id.layoutStatus)
            statusLayout.visibility = View.VISIBLE

            findViewById<TextView>(R.id.tvDeviceId).text = "Device: $deviceId"
            findViewById<TextView>(R.id.tvBaseUrl).text = "Server: $baseUrl"
            findViewById<TextView>(R.id.tvSimInfo).text = "SMS via: $simLabel"
            findViewById<TextView>(R.id.tvPollingStatus).text = "Polling every 30 seconds"

            findViewById<Button>(R.id.btnChangeSim).setOnClickListener {
                pickSimCard(afterPairing = false)
            }
        }
    }

    private fun showError(message: String) {
        val tv = findViewById<TextView>(R.id.tvError)
        tv.text = message
        tv.visibility = View.VISIBLE
    }

    private fun hideError() {
        findViewById<TextView>(R.id.tvError).visibility = View.GONE
    }
}
