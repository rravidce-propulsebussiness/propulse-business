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

async function getCurrentProMembership(userId, client = pool) {
  const result = await client.query(`
    SELECT m.id,m.user_id,m.membership_plan_id,m.payment_id,m.starts_at,m.expires_at,m.status,
           p.name AS plan_name,p.plan_type,p.billing_period,p.billing_months,p.price
    FROM memberships m
    JOIN membership_plans p ON p.id=m.membership_plan_id
    WHERE m.user_id=$1
      AND m.status='active'
      AND m.starts_at<=CURRENT_TIMESTAMP
      AND m.expires_at>CURRENT_TIMESTAMP
      AND p.is_active=TRUE
      AND LOWER(REPLACE(COALESCE(p.plan_type,''),'-','_'))='pro'
    ORDER BY m.expires_at DESC
    LIMIT 1
  `, [userId]);
  const membership = result.rows[0] || null;
  if (!membership) return null;
  return membership;
}

async function isProMember(userId, client = pool) {
  return (await getMembershipAccess(userId, client)).isPro;
}

module.exports = { getMembershipAccess, getCurrentProMembership, isProMember };