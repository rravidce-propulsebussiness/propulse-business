const pool = require('../config/database');

async function getDashboard({ search = '', status = 'all', industryId = '' } = {}) {
  const values = [];
  const where = [];
  const q = String(search || '').trim();
  if (q) {
    values.push(`%${q}%`);
    where.push(`(u.name ILIKE $${values.length} OR u.email ILIKE $${values.length} OR i.name ILIKE $${values.length} OR COALESCE(s.name,'') ILIKE $${values.length} OR COALESCE(c.name,'') ILIKE $${values.length})`);
  }
  if (status && status !== 'all') {
    values.push(status);
    where.push(`x.status=$${values.length}`);
  }
  if (industryId) {
    values.push(Number(industryId));
    where.push(`x.industry_id=$${values.length}`);
  }
  const baseWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = (await pool.query(`
    SELECT x.id,
           x.user_id,
           u.name AS user_name,
           u.email AS user_email,
           x.industry_id,
           i.name AS industry_name,
           x.state_id,
           s.name AS state_name,
           x.city_id,
           c.name AS city_name,
           x.amount,
           x.status,
           x.starts_at,
           x.matures_at,
           x.maturity_days,
           x.created_at,
           x.updated_at,
           COALESCE(a.allocated_revenue,0)::numeric AS allocated_revenue,
           COALESCE(ls.linked_leads,0)::int AS linked_leads,
           COALESCE(ls.sold_linked_leads,0)::int AS sold_linked_leads,
           COALESCE(ls.linked_paid_sales,0)::int AS linked_paid_sales,
           COALESCE(ls.linked_gross_sales,0)::numeric AS linked_gross_sales,
           COALESCE(a.allocated_sales,0)::int AS allocated_sales,
           COALESCE(x.payout_amount,0)::numeric AS paid_to_investor,
           CASE
             WHEN x.status='paid' THEN 0::numeric
             WHEN x.matures_at<=CURRENT_TIMESTAMP THEN COALESCE(a.allocated_revenue,0)::numeric
             ELSE 0::numeric
           END AS payable_now
    FROM investments x
    JOIN users u ON u.id=x.user_id
    JOIN industries i ON i.id=x.industry_id
    LEFT JOIN states s ON s.id=x.state_id
    LEFT JOIN cities c ON c.id=x.city_id
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(ira.allocated_amount),0) AS allocated_revenue,
             COUNT(DISTINCT ira.lead_purchase_id)::int AS allocated_sales
      FROM investment_revenue_allocations ira
      WHERE ira.investment_id=x.id
    ) a ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(DISTINCT l.id)::int AS linked_leads,
             COUNT(DISTINCT l.id) FILTER (WHERE EXISTS (
               SELECT 1 FROM lead_purchases lp WHERE lp.lead_id=l.id AND lp.status='paid'
             ))::int AS sold_linked_leads,
             COUNT(DISTINCT lp.id) FILTER (WHERE lp.status='paid')::int AS linked_paid_sales,
             COALESCE(SUM(lp.amount) FILTER (WHERE lp.status='paid'),0) AS linked_gross_sales
      FROM leads l
      LEFT JOIN lead_purchases lp ON lp.lead_id=l.id
      WHERE l.investor_user_id=x.user_id
        AND l.industry_id=x.industry_id
        AND (x.state_id IS NULL OR l.state_id=x.state_id)
        AND (x.city_id IS NULL OR l.city_id=x.city_id)
    ) ls ON TRUE
    ${baseWhere}
    ORDER BY x.created_at DESC,x.id DESC
  `, values)).rows.map(row => ({
    ...row,
    amount: Number(row.amount || 0),
    allocated_revenue: Number(row.allocated_revenue || 0),
    linked_gross_sales: Number(row.linked_gross_sales || 0),
    paid_to_investor: Number(row.paid_to_investor || 0),
    payable_now: Number(row.payable_now || 0),
    linked_leads: Number(row.linked_leads || 0),
    sold_linked_leads: Number(row.sold_linked_leads || 0),
    linked_paid_sales: Number(row.linked_paid_sales || 0),
    allocated_sales: Number(row.allocated_sales || 0),
  }));

  const investorsMap = new Map();
  for (const row of rows) {
    if (!investorsMap.has(row.user_id)) {
      investorsMap.set(row.user_id, {
        user_id: row.user_id,
        user_name: row.user_name,
        user_email: row.user_email,
        investment_count: 0,
        total_invested: 0,
        active_invested: 0,
        matured_unpaid: 0,
        linked_leads: 0,
        sold_linked_leads: 0,
        allocated_sales: 0,
        linked_gross_sales: 0,
        allocated_revenue: 0,
        paid_to_investor: 0,
        payable_now: 0,
        cycles: [],
      });
    }
    const investor = investorsMap.get(row.user_id);
    investor.investment_count += 1;
    if (!['cancelled', 'pending'].includes(String(row.status).toLowerCase())) investor.total_invested += row.amount;
    if (row.status === 'active') investor.active_invested += row.amount;
    if (row.status !== 'paid' && row.status !== 'cancelled' && new Date(row.matures_at) <= new Date()) investor.matured_unpaid += 1;
    investor.linked_leads += row.linked_leads;
    investor.sold_linked_leads += row.sold_linked_leads;
    investor.allocated_sales += row.allocated_sales;
    investor.linked_gross_sales += row.linked_gross_sales;
    investor.allocated_revenue += row.allocated_revenue;
    investor.paid_to_investor += row.paid_to_investor;
    investor.payable_now += row.payable_now;
    investor.cycles.push(row);
  }

  const investors = Array.from(investorsMap.values()).map(item => ({
    ...item,
    total_invested: Number(item.total_invested.toFixed(2)),
    active_invested: Number(item.active_invested.toFixed(2)),
    linked_gross_sales: Number(item.linked_gross_sales.toFixed(2)),
    allocated_revenue: Number(item.allocated_revenue.toFixed(2)),
    paid_to_investor: Number(item.paid_to_investor.toFixed(2)),
    payable_now: Number(item.payable_now.toFixed(2)),
  })).sort((a, b) => b.total_invested - a.total_invested || String(a.user_name || '').localeCompare(String(b.user_name || '')));

  const stats = {
    investors: investors.length,
    investment_cycles: rows.length,
    total_invested: Number(rows.filter(x => !['cancelled', 'pending'].includes(String(x.status).toLowerCase())).reduce((sum, x) => sum + x.amount, 0).toFixed(2)),
    active_invested: Number(rows.filter(x => x.status === 'active').reduce((sum, x) => sum + x.amount, 0).toFixed(2)),
    matured_unpaid: rows.filter(x => x.status !== 'paid' && x.status !== 'cancelled' && new Date(x.matures_at) <= new Date()).length,
    linked_leads: Number(investors.reduce((sum, x) => sum + x.linked_leads, 0)),
    sold_linked_leads: Number(investors.reduce((sum, x) => sum + x.sold_linked_leads, 0)),
    allocated_sales: Number(investors.reduce((sum, x) => sum + x.allocated_sales, 0)),
    allocated_revenue: Number(investors.reduce((sum, x) => sum + x.allocated_revenue, 0).toFixed(2)),
    paid_to_investors: Number(investors.reduce((sum, x) => sum + x.paid_to_investor, 0).toFixed(2)),
    payable_now: Number(investors.reduce((sum, x) => sum + x.payable_now, 0).toFixed(2)),
  };

  return { stats, investors, items: rows };
}

module.exports = { getDashboard };
