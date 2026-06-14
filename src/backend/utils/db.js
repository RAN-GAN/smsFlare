// Database utilities

export function generateId() {
  return crypto.getRandomValues(new Uint8Array(8))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function now() {
  return Math.floor(Date.now() / 1000);
}

export function getPaginationParams(limit, offset) {
  const pageLimit = Math.min(limit || 20, 100);
  const pageOffset = offset || 0;
  return { limit: pageLimit, offset: pageOffset };
}

// Helper to validate phone number format
export function isValidPhoneNumber(phone) {
  return /^\+?[1-9]\d{1,14}$/.test(phone.replace(/\s/g, ''));
}

// Helper to validate email format
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Helper to get online devices
export async function getOnlineDevices(db, userId) {
  const result = await db
    .prepare(
      'SELECT id, device_token FROM devices WHERE user_id = ? AND online = 1 ORDER BY last_heartbeat DESC'
    )
    .bind(userId)
    .all();
  return result.results || [];
}

// Helper to find an available device for a job
export async function findAvailableDevice(db, userId) {
  const result = await db
    .prepare(
      `SELECT d.id FROM devices d 
       WHERE d.user_id = ? AND d.online = 1 
       ORDER BY d.last_heartbeat DESC 
       LIMIT 1`
    )
    .bind(userId)
    .first();
  return result;
}
