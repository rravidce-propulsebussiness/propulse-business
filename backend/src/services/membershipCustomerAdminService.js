const pool = require('../config/database');

async function getMembershipCustomers({ search, page = 1, limit = 50 } = {}) {
  const values = [];
  const where = [];
  const term = String(search || '').trim();

  if (term) {
    values.push(`%${term}%`);
    const n = values.length;
    where.push(`(
      u.name ILIKE $${n}
      OR u.email ILIKE $${n}
      OR COALESCE(bp.business_name,'') ILIKE $${n}
      OR COALESCE(bp.phone,'') ILIKE $${n}
      OR EXISTS (
        SELECT 1
        FROM memberships sm
        JOIN membership_plans sp ON sp.id = sm.membership_plan_id
        WHERE sm.user_id = u.id AND sp.name ILIKE $${n}
      )
    )`);
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;
  const baseWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const from = `users u
    LEFT JOIN business_profiles bp ON bp.user_id = u.id
    JOIN memberships m ON m.user_id = u.id
    LEFT JOIN membership_plans mp ON mp.id = m.membership_plan_id`;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM (
       SELECT u.id
       FROM ${from}
       ${baseWhere}
       GROUP BY u.id
     ) customer_count`,
    values,
  );

  const dataValues = [...values, safeLimit, offset];
  const limitParam = dataValues.length - 1;
  const offsetParam = dataValues.length;

  const result = await pool.query(
    `SELECT
       u.id AS user_id,
       u.name AS user_name,
       u.email AS user_email,
       bp.business_name,
       bp.phone,
       COALESCE((
         SELECT string_agg(x.location_label, ' · ' ORDER BY x.location_label)
         FROM (
           SELECT DISTINCT c.name || ', ' || s.name AS location_label
           FROM business_profile_locations bpl
           JOIN cities c ON c.id = bpl.city_id
           JOIN states s ON s.id = bpl.state_id
           WHERE bpl.business_profile_id = bp.id
             AND bpl.is_active = TRUE
         ) x
       ), '—') AS location,
       COUNT(DISTINCT m.id)::int AS membership_count,
       COUNT(DISTINCT m.id) FILTER (
         WHERE m.status = 'active' AND m.starts_at <= CURRENT_TIMESTAMP AND m.expires_at > CURRENT_TIMESTAMP
       )::int AS active_membership_count,
       COALESCE(
         string_agg(DISTINCT mp.name, ', ' ORDER BY mp.name)
           FILTER (WHERE m.status = 'active' AND m.starts_at <= CURRENT_TIMESTAMP AND m.expires_at > CURRENT_TIMESTAMP),
         '—'
       ) AS plans,
       MAX(m.expires_at) FILTER (
         WHERE m.status = 'active' AND m.starts_at <= CURRENT_TIMESTAMP AND m.expires_at > CURRENT_TIMESTAMP
       ) AS active_expires_at,
       (
         SELECT MAX(p2.created_at)
         FROM payments p2
         WHERE p2.user_id = u.id
           AND (p2.purchase_type = 'membership' OR p2.membership_plan_id IS NOT NULL)
       ) AS last_payment_at,
       (
         SELECT COUNT(*)::int
         FROM payments p3
         WHERE p3.user_id = u.id
           AND p3.status = 'paid'
           AND (p3.purchase_type = 'membership' OR p3.membership_plan_id IS NOT NULL)
       ) AS paid_payment_count
     FROM ${from}
     ${baseWhere}
     GROUP BY u.id, u.name, u.email, bp.id, bp.business_name, bp.phone
     ORDER BY COALESCE(bp.business_name, u.name), u.id
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    dataValues,
  );

  const total = Number(countResult.rows[0]?.total || 0);
  return {
    items: result.rows,
    total,
    page: safePage,
    limit: safeLimit,
    pages: total ? Math.ceil(total / safeLimit) : 0,
  };
}

module.exports = { getMembershipCustomers };
