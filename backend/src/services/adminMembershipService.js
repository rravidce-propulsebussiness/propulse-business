const pool = require('../config/database');

const ACTIONS = new Set(['extend', 'reduce', 'set_expiry']);
const MAX_DAYS = 3650;

function invalid(code, message) {
  return Object.assign(new Error(message), { code });
}

function parseDays(value) {
  const days = Number(value);
  if (!Number.isInteger(days) || days <= 0 || days > MAX_DAYS) {
    throw invalid('INVALID_MEMBERSHIP_DAYS', `Membership days must be a whole number between 1 and ${MAX_DAYS}.`);
  }
  return days;
}

function parseExpiry(value) {
  const raw = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw invalid('INVALID_MEMBERSHIP_EXPIRY', 'Membership expiry must be a valid date.');
  }
  const [year, month, day] = raw.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw invalid('INVALID_MEMBERSHIP_EXPIRY', 'Membership expiry must be a valid date.');
  }
  return date;
}

async function updateMembership({ membershipId, action, days, expiresAt, adminId }) {
  const id = Number(membershipId);
  if (!Number.isInteger(id) || id <= 0) throw invalid('MEMBERSHIP_NOT_FOUND', 'Membership not found');
  if (!ACTIONS.has(action)) throw invalid('INVALID_MEMBERSHIP_ACTION', 'Invalid membership action');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const membership = (await client.query(
      `SELECT m.*, mp.name AS plan_name, mp.plan_type
       FROM memberships m
       JOIN membership_plans mp ON mp.id=m.membership_plan_id
       WHERE m.id=$1
       FOR UPDATE`,
      [id]
    )).rows[0];

    if (!membership) throw invalid('MEMBERSHIP_NOT_FOUND', 'Membership not found');

    let nextExpiry;
    if (action === 'set_expiry') {
      nextExpiry = parseExpiry(expiresAt);
    } else {
      const amount = parseDays(days);
      const base = new Date(membership.expires_at);
      if (Number.isNaN(base.getTime())) throw invalid('INVALID_MEMBERSHIP_EXPIRY', 'Current membership expiry is invalid.');
      nextExpiry = new Date(base.getTime() + (action === 'extend' ? amount : -amount) * 86400000);
    }

    const startsAt = new Date(membership.starts_at);
    if (Number.isNaN(startsAt.getTime()) || nextExpiry <= startsAt) {
      throw invalid('INVALID_MEMBERSHIP_EXPIRY', 'Membership expiry must be after the membership start date.');
    }

    const updated = (await client.query(
      `UPDATE memberships
       SET expires_at=$1, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2
       RETURNING *`,
      [nextExpiry, id]
    )).rows[0];

    await client.query(
      `INSERT INTO membership_admin_history
       (membership_id,user_id,payment_id,admin_id,action,new_status,new_expires_at,notes)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, membership.user_id, membership.payment_id || null, adminId || null, action, updated.status, updated.expires_at, null]
    );

    await client.query('COMMIT');
    return updated;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { updateMembership };
