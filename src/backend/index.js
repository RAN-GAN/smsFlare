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

// Global error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json(
    { error: err.message || 'Internal server error', code: err.code },
    err.status || 500
  );
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: now() });
});

// ==================== AUTH ROUTES ====================

app.post('/auth/register', async (c) => {
  try {
    const { email, password } = await c.req.json();
    const db = c.env.DB;

    if (!email || !password) {
      return c.json({ error: 'Email and password required' }, 400);
    }

    if (!isValidEmail(email)) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400);
    }

    // Check if user exists
    const existing = await db
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (existing) {
      return c.json({ error: 'User already exists' }, 409);
    }

    const userId = generateId();
    const passwordHash = await hashPassword(password);
    const timestamp = now();

    await db
      .prepare(
        'INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(userId, email, passwordHash, timestamp, timestamp)
      .run();

    const jwtSecret = c.env.JWT_SECRET || 'dev-secret-key';
    const token = await signJWT(
      { sub: userId, email, type: 'user' },
      jwtSecret,
      86400 // 24 hours
    );

    return c.json(
      {
        token,
        user: { id: userId, email, created_at: timestamp, updated_at: timestamp },
      },
      201
    );
  } catch (e) {
    console.error('Register error:', e);
    return c.json({ error: 'Registration failed' }, 500);
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
    const { pairing_token, device_model, android_version, phone_number, battery_level, sim_info } = await c.req.json();
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

    // Update device heartbeat
    await db
      .prepare(
        `UPDATE devices 
         SET battery_level = COALESCE(?, battery_level), 
             online = 1, 
             last_heartbeat = ? 
         WHERE id = ?`
      )
      .bind(battery_level, timestamp, deviceId)
      .run();

    // Log heartbeat
    await db
      .prepare(
        `INSERT INTO device_heartbeats (id, device_id, battery_level, signal_strength, sim_status, app_version, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(generateId(), deviceId, battery_level, signal_strength, sim_status, app_version, timestamp)
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

    // Find assigned job for this device
    const job = await db
      .prepare(
        `SELECT id, recipient, message 
         FROM sms_jobs 
         WHERE device_id = ? AND status = 'assigned' 
         LIMIT 1`
      )
      .bind(deviceId)
      .first();

    if (!job) {
      return c.json(null, 204);
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

    // Update job status
    const updateData = {
      status,
      updated_at: now_ts,
    };

    if (status === 'sent') {
      updateData.sent_at = timestamp || now_ts;
    } else if (status === 'delivered') {
      updateData.delivered_at = timestamp || now_ts;
    }

    await db
      .prepare(
        `UPDATE sms_jobs 
         SET status = ?, sent_at = COALESCE(?, sent_at), delivered_at = COALESCE(?, delivered_at), updated_at = ? 
         WHERE id = ?`
      )
      .bind(status, updateData.sent_at, updateData.delivered_at, now_ts, jobId)
      .run();

    // Log status change
    await db
      .prepare(
        `INSERT INTO sms_logs (id, job_id, status, timestamp, error_message, created_at) 
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(generateId(), jobId, status, timestamp || now_ts, error_message, now_ts)
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
      total: (result.results || []).length,
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

export default app;
