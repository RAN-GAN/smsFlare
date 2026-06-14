// Authentication middleware

import { verifyJWT, hashPassword } from '../utils/jwt.js';

export async function verifyUserToken(c, next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  const jwtSecret = c.env.JWT_SECRET || 'dev-secret-key';
  const payload = await verifyJWT(token, jwtSecret);

  if (!payload || payload.type !== 'user') {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  c.set('user_id', payload.sub);
  c.set('user_email', payload.email);
  await next();
}

export async function verifyDeviceToken(c, next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid authorization header' }, 401);
  }

  const deviceToken = authHeader.slice(7);
  const db = c.env.DB;

  try {
    const result = await db
      .prepare('SELECT id, user_id FROM devices WHERE device_token = ?')
      .bind(deviceToken)
      .first();

    if (!result) {
      return c.json({ error: 'Invalid device token' }, 401);
    }

    c.set('device_id', result.id);
    c.set('device_user_id', result.user_id);
    await next();
  } catch (e) {
    console.error('Device token verification error:', e);
    return c.json({ error: 'Authentication error' }, 500);
  }
}

export async function verifyApiKey(c, next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid authorization header' }, 401);
  }

  const apiKey = authHeader.slice(7);
  const db = c.env.DB;

  try {
    const keyHash = await hashPassword(apiKey);
    const result = await db
      .prepare('SELECT id, user_id, expires_at FROM api_keys WHERE key_hash = ?')
      .bind(keyHash)
      .first();

    if (!result) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    if (result.expires_at && result.expires_at < Math.floor(Date.now() / 1000)) {
      return c.json({ error: 'API key expired' }, 401);
    }

    c.set('user_id', result.user_id);
    c.set('is_api_key', true);
    await next();
  } catch (e) {
    console.error('API key verification error:', e);
    return c.json({ error: 'Authentication error' }, 500);
  }
}

export async function verifyUserOrApiKey(c, next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  const db = c.env.DB;
  const jwtSecret = c.env.JWT_SECRET || 'dev-secret-key';

  try {
    // Try JWT first
    const payload = await verifyJWT(token, jwtSecret);
    if (payload && payload.type === 'user') {
      c.set('user_id', payload.sub);
      c.set('user_email', payload.email);
      await next();
      return;
    }

    // Try API key
    const keyHash = await hashPassword(token);
    const result = await db
      .prepare('SELECT id, user_id, expires_at FROM api_keys WHERE key_hash = ?')
      .bind(keyHash)
      .first();

    if (result && (!result.expires_at || result.expires_at > Math.floor(Date.now() / 1000))) {
      c.set('user_id', result.user_id);
      c.set('is_api_key', true);
      await next();
      return;
    }

    return c.json({ error: 'Invalid token or API key' }, 401);
  } catch (e) {
    console.error('Auth verification error:', e);
    return c.json({ error: 'Authentication error' }, 500);
  }
}

export function requireAuth(c) {
  const userId = c.get('user_id');
  return userId || null;
}
