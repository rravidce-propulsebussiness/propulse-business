const pool = require('../config/database');

async function getCycleStatement(userId, cycleId) {
  const uid = Number(userId);
  const cid = Number(cycleId);
  if (!Number.isInteger(uid) || uid <= 0 || !Number.isInteger(cid) || cid <= 0) {
    throw Object.assign(new Error('Invalid investor or cycle'), { code: 'INVALID_CYCLE' });
  }

  const cycle = (await pool.query(`
    SELECT id,user_id,status,auto_invest,started_at,maturity_at,exit_requested_at,closed_at,
           created_at,updated_at,admin_closed_by,admin_closed_reason,exit_reason
    FROM investment_cycles
    WHERE id=$1 AND user_id=$2
  `, [cid, uid])).rows[0];
  if (!cycle) throw Object.assign(new Error('Investment cycle not found'), { code: 'CYCLE_NOT_FOUND' });

  const investment = (await pool.query(`
    SELECT COUNT(*)::int AS count,
           COALESCE(SUM(amount) FILTER (WHERE status<>'cancelled'),0)::numeric AS principal
    FROM investments
    WHERE user_id=$1 AND cycle_id=$2 AND status<>'cancelled'
  `, [uid, cid])).rows[0];

  const ads = (await pool.query(`
    SELECT COUNT(ias.id)::int AS transactions,
           COALESCE(SUM(ia.amount),0)::numeric AS allocated,
           COALESCE(SUM(ias.amount),0)::numeric AS spent,
           GREATEST(0,COALESCE(SUM(ia.amount),0)-COALESCE(SUM(ias.amount),0))::numeric AS remaining
    FROM investments i
    LEFT JOIN investment_ad_allocations ia ON ia.investment_id=i.id
    LEFT JOIN investment_ad_spends ias ON ias.investment_id=i.id
    WHERE i.user_id=$1 AND i.cycle_id=$2 AND i.status<>'cancelled'
  `, [uid, cid])).rows[0];

  const leads = (await pool.query(`
    SELECT
      COUNT(DISTINCT l.id)::int AS linked,
      COUNT(DISTINCT l.id) FILTER (WHERE EXISTS (
        SELECT 1 FROM lead_purchases lp WHERE lp.lead_id=l.id AND lp.status='paid'
      ))::int AS sold,
      COUNT(DISTINCT l.id) FILTER (WHERE LOWER(COALESCE(l.status,''))='expired')::int AS expired,
      COUNT(DISTINCT l.id) FILTER (WHERE LOWER(COALESCE(l.status,''))='closed')::int AS closed,
      COUNT(DISTINCT l.id) FILTER (WHERE LOWER(COALESCE(l.status,''))='admin_closed')::int AS admin_closed,
      COUNT(DISTINCT l.id) FILTER (WHERE NOT EXISTS (
        SELECT 1 FROM lead_purchases lp WHERE lp.lead_id=l.id AND lp.status='paid'
      ) AND LOWER(COALESCE(l.status,'')) NOT IN ('expired','closed','admin_closed','sold','consumed'))::int AS pending
    FROM leads l
    WHERE l.investor_user_id=$1 AND l.cycle_id=$2
  `, [uid, cid])).rows[0];

  const revenue = (await pool.query(`
    SELECT
      COUNT(lp.id) FILTER (WHERE lp.status='paid')::int AS sales,
      COALESCE(SUM(lp.amount) FILTER (WHERE lp.status='paid'),0)::numeric AS gross_sales,
      COALESCE((
        SELECT SUM(ira.allocated_amount)
        FROM investment_revenue_allocations ira
        JOIN investments i ON i.id=ira.investment_id
        WHERE i.user_id=$1 AND i.cycle_id=$2 AND i.status<>'cancelled'
      ),0)::numeric AS investor_earnings
    FROM lead_purchases lp
    JOIN leads l ON l.id=lp.lead_id
    WHERE l.investor_user_id=$1 AND l.cycle_id=$2
  `, [uid, cid])).rows[0];

  const payouts = (await pool.query(`
    SELECT COUNT(*)::int AS requests,
           COALESCE(SUM(amount) FILTER (WHERE status='paid'),0)::numeric AS paid,
           COALESCE(SUM(amount) FILTER (WHERE status='pending'),0)::numeric AS pending,
           COALESCE(SUM(amount) FILTER (WHERE status='rejected'),0)::numeric AS rejected
    FROM investor_payout_requests
    WHERE user_id=$1 AND cycle_id=$2
  `, [uid, cid])).rows[0];

  const leadRows = (await pool.query(`
    SELECT l.id,l.status,l.created_at,
           COUNT(lp.id) FILTER (WHERE lp.status='paid')::int AS paid_sales,
           COALESCE(SUM(lp.amount) FILTER (WHERE lp.status='paid'),0)::numeric AS gross_revenue,
           COALESCE((
             SELECT SUM(ira.allocated_amount)
             FROM investment_revenue_allocations ira
             WHERE ira.lead_purchase_id IN (
               SELECT lp2.id FROM lead_purchases lp2 WHERE lp2.lead_id=l.id AND lp2.status='paid'
             )
             AND ira.investment_id IN (
               SELECT i2.id FROM investments i2 WHERE i2.user_id=$1 AND i2.cycle_id=$2 AND i2.status<>'cancelled'
             )
           ),0)::numeric AS investor_earnings
    FROM leads l
    LEFT JOIN lead_purchases lp ON lp.lead_id=l.id
    WHERE l.investor_user_id=$1 AND l.cycle_id=$2
    GROUP BY l.id,l.status,l.created_at
    ORDER BY l.created_at ASC,l.id ASC
  `, [uid, cid])).rows.map(row => ({
    id: Number(row.id),
    status: row.status,
    created_at: row.created_at,
    paid_sales: Number(row.paid_sales || 0),
    gross_revenue: Number(row.gross_revenue || 0),
    investor_earnings: Number(row.investor_earnings || 0),
  }));

  return {
    cycle: {
      ...cycle,
      id: Number(cycle.id),
      user_id: Number(cycle.user_id),
      auto_invest: Boolean(cycle.auto_invest),
    },
    investment: {
      count: Number(investment.count || 0),
      principal: Number(investment.principal || 0),
    },
    ads: {
      transactions: Number(ads.transactions || 0),
      allocated: Number(ads.allocated || 0),
      spent: Number(ads.spent || 0),
      remaining: Number(ads.remaining || 0),
    },
    leads: {
      linked: Number(leads.linked || 0),
      sold: Number(leads.sold || 0),
      expired: Number(leads.expired || 0),
      closed: Number(leads.closed || 0),
      admin_closed: Number(leads.admin_closed || 0),
      pending: Number(leads.pending || 0),
    },
    revenue: {
      sales: Number(revenue.sales || 0),
      generated: Number(revenue.gross_sales || 0),
      gross_sales: Number(revenue.gross_sales || 0),
      investor_earnings: Number(revenue.investor_earnings || 0),
    },
    payouts: {
      requests: Number(payouts.requests || 0),
      paid: Number(payouts.paid || 0),
      pending: Number(payouts.pending || 0),
      rejected: Number(payouts.rejected || 0),
    },
    leads_detail: leadRows,
  };
}

module.exports = { getCycleStatement };
