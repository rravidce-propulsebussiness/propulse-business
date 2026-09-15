const pool = require('../config/database');

async function getDashboard(userId) {
  const [summaryResult, recentResult, profileResult] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS total_leads,
        COUNT(*) FILTER (WHERE status IN ('available','paused'))::int AS active_leads,
        COUNT(*) FILTER (WHERE status='sold')::int AS sold_leads,
        COUNT(*) FILTER (WHERE status='closed')::int AS closed_leads
      FROM leads
      WHERE created_by=$1
    `, [userId]),
    pool.query(`
      SELECT l.id,l.customer_name,l.requirement,l.status,l.created_at,
             i.name AS industry_name,s.name AS service_name,c.name AS city_name
      FROM leads l
      INNER JOIN industries i ON i.id=l.industry_id
      INNER JOIN services s ON s.id=l.service_id
      INNER JOIN cities c ON c.id=l.city_id
      WHERE l.created_by=$1
      ORDER BY l.created_at DESC,l.id DESC
      LIMIT 8
    `, [userId]),
    pool.query(`
      SELECT bp.business_name,bp.phone,bp.business_details
      FROM business_profiles bp
      WHERE bp.user_id=$1
      LIMIT 1
    `, [userId]),
  ]);

  const summary = summaryResult.rows[0] || {};
  return {
    partner: profileResult.rows[0] || null,
    stats: {
      totalLeads: Number(summary.total_leads || 0),
      activeLeads: Number(summary.active_leads || 0),
      soldLeads: Number(summary.sold_leads || 0),
      closedLeads: Number(summary.closed_leads || 0),
    },
    recentLeads: recentResult.rows,
    pricing: {
      commissionPercent: 5,
      normalPriceUplift: null,
      configured: false,
    },
  };
}

module.exports = { getDashboard };
