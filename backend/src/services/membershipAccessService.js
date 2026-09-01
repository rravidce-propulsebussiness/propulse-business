const pool = require('../config/database');

/**
 * Canonical membership access query.
 * Pro and Booster are independent entitlements: Booster never replaces Pro.
 */
async function getMembershipAccess(userId, client = pool) {
  if (!userId) return { isPro: false, isBoosterActive: false, proExpiresAt: null, boosterExpiresAt: null };

  const result = await client.query(`
    SELECT
      MAX(CASE WHEN LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_'))='pro' THEN m.expires_at END) AS pro_expires_at,
      MAX(CASE WHEN LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_'))='booster' THEN m.expires_at END) AS booster_expires_at
    FROM memberships m
    JOIN membership_plans mp ON mp.id=m.membership_plan_id
    WHERE m.user_id=$1
      AND m.status='active'
      AND m.starts_at<=CURRENT_TIMESTAMP
      AND m.expires_at>CURRENT_TIMESTAMP
      AND mp.is_active=TRUE
  `, [userId]);

  const row = result.rows[0] || {};
  return {
    isPro: Boolean(row.pro_expires_at),
    isBoosterActive: Boolean(row.booster_expires_at),
    proExpiresAt: row.pro_expires_at || null,
    boosterExpiresAt: row.booster_expires_at || null,
  };
}

async function isProMember(userId, client = pool) {
  return (await getMembershipAccess(userId, client)).isPro;
}

module.exports = { getMembershipAccess, isProMember };
