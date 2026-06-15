import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { signJWT, hashPassword, verifyPassword } from './utils/jwt.js';
import { generateId, now, isValidPhoneNumber, isValidEmail, findAvailableDevice, getPaginationParams } from './utils/db.js';
import { verifyUserToken, verifyDeviceToken, verifyApiKey, verifyUserOrApiKey, requireAuth } from './middleware/auth.js';

const app = new Hono();

// Middleware
app.use(logger());
app.use(cors());

// Warn loudly on every request if JWT_SECRET is not configured
app.use('*', async (c, next) => {
  if (!c.env.JWT_SECRET) {
    console.warn(
      '[SMS Flare] WARNING: JWT_SECRET is not set. ' +
      'The server is using an insecure default key. ' +
      'For local dev, add JWT_SECRET to .dev.vars. ' +
      'For production, run: wrangler secret put JWT_SECRET --env production'
    );
  }
  await next();
});

// Global error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json(
    { error: err.message || 'Internal server error', code: err.code },
    err.status || 500
  );
});

// Health check — includes setup diagnostics useful for self-hosters
app.get('/health', (c) => {
  const jwtConfigured = !!c.env.JWT_SECRET;
  if (!jwtConfigured) {
    console.warn('[SMS Flare] /health called but JWT_SECRET is not set.');
  }
  return c.json({
    status: 'ok',
    timestamp: now(),
    jwt_configured: jwtConfigured,
  });
});

// ==================== AUTH ROUTES ====================

// Returns whether the instance has been configured with an admin account.
// Frontend uses this to redirect first-time visitors to the setup page.
app.get('/auth/setup', async (c) => {
  try {
    const db = c.env.DB;
    const row = await db.prepare('SELECT COUNT(*) as count FROM users').first();
    return c.json({ configured: row.count > 0 });
  } catch (e) {
    return c.json({ configured: false });
  }
});

// First-run only — creates the admin account. Returns 403 after first use.
app.post('/auth/setup', async (c) => {
  try {
    const { email, password } = await c.req.json();
    const db = c.env.DB;

    const row = await db.prepare('SELECT COUNT(*) as count FROM users').first();
    if (row.count > 0) {
      return c.json({ error: 'Instance is already configured. Use login instead.' }, 403);
    }

    if (!email || !password) {
      return c.json({ error: 'Email and password required' }, 400);
    }
    if (!isValidEmail(email)) {
      return c.json({ error: 'Invalid email format' }, 400);
    }
    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    const userId = generateId();
    const passwordHash = await hashPassword(password);
    const timestamp = now();

    await db
      .prepare('INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, email, passwordHash, timestamp, timestamp)
      .run();

    const jwtSecret = c.env.JWT_SECRET || 'dev-secret-key';
    const token = await signJWT({ sub: userId, email, type: 'user' }, jwtSecret, 86400);

    return c.json({ token, user: { id: userId, email } }, 201);
  } catch (e) {
    console.error('Setup error:', e);
    return c.json({ error: 'Setup failed' }, 500);
  }
});

app.post('/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    const db = c.env.DB;

    if (!email || !password) {
      return c.json({ error: 'Email and password required' }, 400);
    }

    const user = await db
      .prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const jwtSecret = c.env.JWT_SECRET || 'dev-secret-key';
    const token = await signJWT(
      { sub: user.id, email: user.email, type: 'user' },
      jwtSecret,
      86400
    );

    return c.json({
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (e) {
    console.error('Login error:', e);
    return c.json({ error: 'Login failed' }, 500);
  }
});

app.put('/auth/password', verifyUserToken, async (c) => {
  try {
    const userId = c.get('user_id');
    const { current_password, new_password } = await c.req.json();
    const db = c.env.DB;

    if (!current_password || !new_password) {
      return c.json({ error: 'current_password and new_password required' }, 400);
    }
    if (new_password.length < 8) {
      return c.json({ error: 'New password must be at least 8 characters' }, 400);
    }

    const user = await db
      .prepare('SELECT password_hash FROM users WHERE id = ?')
      .bind(userId)
      .first();

    const valid = await verifyPassword(current_password, user.password_hash);
    if (!valid) {
      return c.json({ error: 'Current password is incorrect' }, 401);
    }

    const newHash = await hashPassword(new_password);
    const timestamp = now();
    await db
      .prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .bind(newHash, timestamp, userId)
      .run();

    return c.json({ success: true });
  } catch (e) {
    console.error('Change password error:', e);
    return c.json({ error: 'Failed to change password' }, 500);
  }
});

app.post('/auth/device-pair', verifyUserToken, async (c) => {
  try {
    const userId = c.get('user_id');
    const db = c.env.DB;

    const pairingToken = generateId();
    const timestamp = now();

    // Store pairing token as a device (to be replaced with actual device on registration)
    await db
      .prepare(
        `INSERT INTO devices (id, user_id, device_token, online, created_at, updated_at) 
         VALUES (?, ?, ?, 0, ?, ?)`
      )
      .bind(generateId(), userId, pairingToken, timestamp, timestamp)
      .run();

    return c.json({
      pairing_token: pairingToken,
      expires_in: 3600,
    });
  } catch (e) {
    console.error('Device pair error:', e);
    return c.json({ error: 'Device pairing failed' }, 500);
  }
});

// ==================== DEVICE ROUTES ====================

app.post('/api/device/register', async (c) => {
  try {
    const { pairing_token, device_model, android_version, phone_number = null, battery_level = null, sim_info = null } = await c.req.json();
    const db = c.env.DB;

    if (!pairing_token) {
      return c.json({ error: 'Pairing token required' }, 400);
    }

    // Validate pairing token exists and get user_id
    const pairingDevice = await db
      .prepare('SELECT id, user_id FROM devices WHERE device_token = ?')
      .bind(pairing_token)
      .first();

    if (!pairingDevice) {
      return c.json({ error: 'Invalid or expired pairing token' }, 401);
    }

    // Generate new device token for polling
    const newDeviceToken = generateId();
    const timestamp = now();

    // Update the pairing device with actual device details and new token
    await db
      .prepare(
        `UPDATE devices 
         SET device_token = ?, device_model = ?, android_version = ?, phone_number = ?, battery_level = ?, sim_info = ?, online = 1, last_heartbeat = ?, updated_at = ? 
         WHERE id = ?`
      )
      .bind(newDeviceToken, device_model, android_version, phone_number, battery_level, sim_info, timestamp, timestamp, pairingDevice.id)
      .run();

    return c.json(
      {
        device_id: pairingDevice.id,
        device_token: newDeviceToken,
        polling_interval: 30,
      },
      201
    );
  } catch (e) {
    console.error('Device register error:', e);
    return c.json({ error: 'Device registration failed' }, 500);
  }
});

app.post('/api/device/heartbeat', verifyDeviceToken, async (c) => {
  try {
    const deviceId = c.get('device_id');
    const { battery_level, signal_strength, sim_status, app_version } = await c.req.json();
    const db = c.env.DB;
    const timestamp = now();

    await db
      .prepare(
        `UPDATE devices
         SET battery_level = COALESCE(?, battery_level),
             online = 1,
             last_heartbeat = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .bind(battery_level, timestamp, timestamp, deviceId)
      .run();

    await db
      .prepare(
        `INSERT INTO device_heartbeats (device_id, battery_level, signal_strength, sim_status, app_version, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(deviceId, battery_level ?? null, signal_strength ?? null, sim_status ?? null, app_version ?? null, timestamp)
      .run();

    return c.json({ success: true });
  } catch (e) {
    console.error('Heartbeat error:', e);
    return c.json({ error: 'Heartbeat failed' }, 500);
  }
});

app.get('/api/device/jobs', verifyDeviceToken, async (c) => {
  try {
    const deviceId = c.get('device_id');
    const db = c.env.DB;

    // Check for a job already assigned to this device
    let job = await db
      .prepare(
        `SELECT id, recipient, message
         FROM sms_jobs
         WHERE device_id = ? AND status = 'assigned'
         LIMIT 1`
      )
      .bind(deviceId)
      .first();

    if (!job) {
      // No assigned job — try to claim a pending job or rescue an orphaned one
      // (orphaned = status 'assigned' but device_id IS NULL because the original
      //  device was deleted via ON DELETE SET NULL)
      const device = await db
        .prepare('SELECT user_id FROM devices WHERE id = ?')
        .bind(deviceId)
        .first();

      if (device) {
        const claimable = await db
          .prepare(
            `SELECT id, recipient, message
             FROM sms_jobs
             WHERE user_id = ?
               AND (status = 'pending' OR (status = 'assigned' AND device_id IS NULL))
             ORDER BY created_at ASC
             LIMIT 1`
          )
          .bind(device.user_id)
          .first();

        if (claimable) {
          const ts = now();
          const result = await db
            .prepare(
              `UPDATE sms_jobs
               SET device_id = ?, status = 'assigned', assigned_at = ?, updated_at = ?
               WHERE id = ?
                 AND (status = 'pending' OR (status = 'assigned' AND device_id IS NULL))`
            )
            .bind(deviceId, ts, ts, claimable.id)
            .run();

          if (result.meta.changes > 0) {
            job = claimable;
          }
        }
      }
    }

    if (!job) {
      return new Response(null, { status: 204 });
    }

    return c.json({
      job_id: job.id,
      recipient: job.recipient,
      message: job.message,
    });
  } catch (e) {
    console.error('Get jobs error:', e);
    return c.json({ error: 'Failed to get jobs' }, 500);
  }
});

app.post('/api/device/jobs/:id/status', verifyDeviceToken, async (c) => {
  try {
    const jobId = c.req.param('id');
    const { status, timestamp, error_message } = await c.req.json();
    const db = c.env.DB;

    if (!['sent', 'delivered', 'failed'].includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    const now_ts = now();

    const sentAt = status === 'sent' ? (timestamp || now_ts) : null;
    const deliveredAt = status === 'delivered' ? (timestamp || now_ts) : null;
    // Only allow valid transitions: sent/failed from assigned, delivered from sent
    const requiredCurrentStatus = status === 'delivered' ? 'sent' : 'assigned';

    const updateResult = await db
      .prepare(
        `UPDATE sms_jobs
         SET status = ?, sent_at = COALESCE(?, sent_at), delivered_at = COALESCE(?, delivered_at), updated_at = ?
         WHERE id = ? AND device_id = ? AND status = ?`
      )
      .bind(status, sentAt, deliveredAt, now_ts, jobId, c.get('device_id'), requiredCurrentStatus)
      .run();

    if (updateResult.meta.changes === 0) {
      return c.json({ success: false, reason: 'no_matching_job' });
    }

    // Log status change only when the transition actually happened
    await db
      .prepare(
        `INSERT INTO sms_logs (id, job_id, status, timestamp, error_message, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(generateId(), jobId, status, timestamp || now_ts, error_message ?? null, now_ts)
      .run();

    return c.json({ success: true });
  } catch (e) {
    console.error('Status update error:', e);
    return c.json({ error: 'Status update failed' }, 500);
  }
});

// ==================== SMS ROUTES ====================

app.post('/api/sms/send', verifyUserOrApiKey, async (c) => {
  try {
    const userId = c.get('user_id');
    const { to, message } = await c.req.json();
    const db = c.env.DB;

    if (!to || !message) {
      return c.json({ error: 'Recipient and message required' }, 400);
    }

    if (!isValidPhoneNumber(to)) {
      return c.json({ error: 'Invalid phone number format' }, 400);
    }

    if (message.length === 0 || message.length > 160) {
      return c.json({ error: 'Message must be 1-160 characters' }, 400);
    }

    const jobId = generateId();
    const timestamp = now();

    // Create SMS job as pending without device assignment
    await db
      .prepare(
        `INSERT INTO sms_jobs (id, user_id, device_id, recipient, message, status, created_at, updated_at) 
         VALUES (?, ?, NULL, ?, ?, 'pending', ?, ?)`
      )
      .bind(jobId, userId, to, message, timestamp, timestamp)
      .run();

    // Try to assign job to an available device
    const device = await findAvailableDevice(db, userId);

    if (device) {
      // Update job to assigned status with device_id
      await db
        .prepare(
          `UPDATE sms_jobs 
           SET device_id = ?, status = 'assigned', assigned_at = ?, updated_at = ? 
           WHERE id = ? AND status = 'pending'`
        )
        .bind(device.id, timestamp, timestamp, jobId)
        .run();
    }

    return c.json(
      {
        job_id: jobId,
        status: device ? 'assigned' : 'pending',
        assigned_device: device?.id || null,
      },
      201
    );
  } catch (e) {
    console.error('SMS send error:', e);
    return c.json({ error: 'Failed to send SMS' }, 500);
  }
});

// ==================== DASHBOARD ROUTES ====================

app.get('/api/jobs', verifyUserToken, async (c) => {
  try {
    const userId = c.get('user_id');
    const { limit, offset } = c.req.query();
    const db = c.env.DB;

    const { limit: pageLimit, offset: pageOffset } = getPaginationParams(
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0
    );

    const result = await db
      .prepare(
        `SELECT id, recipient, message, status, created_at, sent_at, delivered_at 
         FROM sms_jobs 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`
      )
      .bind(userId, pageLimit, pageOffset)
      .all();

    return c.json({
      jobs: result.results || [],
    });
  } catch (e) {
    console.error('Get jobs error:', e);
    return c.json({ error: 'Failed to get jobs' }, 500);
  }
});

app.get('/api/jobs/:id', verifyUserToken, async (c) => {
  try {
    const userId = c.get('user_id');
    const jobId = c.req.param('id');
    const db = c.env.DB;

    const job = await db
      .prepare(
        `SELECT id, recipient, message, status, created_at, sent_at, delivered_at, device_id 
         FROM sms_jobs 
         WHERE id = ? AND user_id = ?`
      )
      .bind(jobId, userId)
      .first();

    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    // Get logs
    const logsResult = await db
      .prepare(`SELECT status, timestamp, error_message FROM sms_logs WHERE job_id = ? ORDER BY created_at ASC`)
      .bind(jobId)
      .all();

    return c.json({
      job,
      logs: logsResult.results || [],
    });
  } catch (e) {
    console.error('Get job error:', e);
    return c.json({ error: 'Failed to get job' }, 500);
  }
});

app.get('/api/devices', verifyUserToken, async (c) => {
  try {
    const userId = c.get('user_id');
    const db = c.env.DB;

    const result = await db
      .prepare(
        `SELECT id, device_model, android_version, phone_number, battery_level, online, last_heartbeat 
         FROM devices 
         WHERE user_id = ? 
         ORDER BY last_heartbeat DESC`
      )
      .bind(userId)
      .all();

    return c.json({
      devices: (result.results || []).map(d => ({
        ...d,
        online: d.online === 1,
      })),
    });
  } catch (e) {
    console.error('Get devices error:', e);
    return c.json({ error: 'Failed to get devices' }, 500);
  }
});

// ==================== API KEY ROUTES ====================

app.post('/auth/api-keys', verifyUserToken, async (c) => {
  try {
    const userId = c.get('user_id');
    const db = c.env.DB;

    const apiKey = generateId() + '-' + generateId();
    const keyHash = await hashPassword(apiKey);
    const keyPreview = apiKey.slice(0, 8) + '...';
    const timestamp = now();

    await db
      .prepare(
        `INSERT INTO api_keys (id, user_id, key_hash, key_preview, created_at) 
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(generateId(), userId, keyHash, keyPreview, timestamp)
      .run();

    return c.json(
      {
        api_key: apiKey,
        preview: keyPreview,
        created_at: timestamp,
      },
      201
    );
  } catch (e) {
    console.error('Create API key error:', e);
    return c.json({ error: 'Failed to create API key' }, 500);
  }
});

app.get('/auth/api-keys', verifyUserToken, async (c) => {
  try {
    const userId = c.get('user_id');
    const db = c.env.DB;

    const result = await db
      .prepare(`SELECT id, key_preview, created_at, expires_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC`)
      .bind(userId)
      .all();

    return c.json({
      api_keys: result.results || [],
    });
  } catch (e) {
    console.error('Get API keys error:', e);
    return c.json({ error: 'Failed to get API keys' }, 500);
  }
});

// ==================== DEVICE MANAGEMENT ROUTES ====================

app.delete('/api/devices/:id', verifyUserToken, async (c) => {
  try {
    const userId = c.get('user_id');
    const deviceId = c.req.param('id');
    const db = c.env.DB;

    // Verify device belongs to this user
    const device = await db
      .prepare('SELECT id FROM devices WHERE id = ? AND user_id = ?')
      .bind(deviceId, userId)
      .first();

    if (!device) {
      return c.json({ error: 'Device not found' }, 404);
    }

    await db.prepare('DELETE FROM device_heartbeats WHERE device_id = ?').bind(deviceId).run();
    await db.prepare('DELETE FROM devices WHERE id = ?').bind(deviceId).run();

    return c.json({ success: true });
  } catch (e) {
    console.error('Delete device error:', e);
    return c.json({ error: 'Failed to delete device' }, 500);
  }
});

// ==================== ACCOUNT MANAGEMENT ROUTES ====================

app.delete('/api/jobs', verifyUserToken, async (c) => {
  try {
    const userId = c.get('user_id');
    const db = c.env.DB;

    // Delete logs first (foreign key dependency on sms_jobs)
    await db
      .prepare(`DELETE FROM sms_logs WHERE job_id IN (SELECT id FROM sms_jobs WHERE user_id = ?)`)
      .bind(userId)
      .run();

    await db
      .prepare(`DELETE FROM sms_jobs WHERE user_id = ?`)
      .bind(userId)
      .run();

    return c.json({ success: true });
  } catch (e) {
    console.error('Clear jobs error:', e);
    return c.json({ error: 'Failed to clear SMS history' }, 500);
  }
});

app.delete('/auth/account', verifyUserToken, async (c) => {
  try {
    const userId = c.get('user_id');
    const db = c.env.DB;

    // Delete in dependency order
    await db
      .prepare(`DELETE FROM sms_logs WHERE job_id IN (SELECT id FROM sms_jobs WHERE user_id = ?)`)
      .bind(userId)
      .run();
    await db.prepare(`DELETE FROM sms_jobs WHERE user_id = ?`).bind(userId).run();
    await db
      .prepare(`DELETE FROM device_heartbeats WHERE device_id IN (SELECT id FROM devices WHERE user_id = ?)`)
      .bind(userId)
      .run();
    await db.prepare(`DELETE FROM devices WHERE user_id = ?`).bind(userId).run();
    await db.prepare(`DELETE FROM api_keys WHERE user_id = ?`).bind(userId).run();
    await db.prepare(`DELETE FROM users WHERE id = ?`).bind(userId).run();

    return c.json({ success: true });
  } catch (e) {
    console.error('Delete account error:', e);
    return c.json({ error: 'Failed to delete account' }, 500);
  }
});

export default app;
