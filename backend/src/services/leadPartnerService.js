const criticalActionAudit=require('./criticalActionAuditService');
const notificationService=require('./notificationService');
const pool = require('../config/database');
const leadService = require('./leadService');
const pincodeService = require('./pincodeService');
const leadQualityService = require('./leadQualityService');

const PARTNER_STATUSES = ['pending', 'active', 'suspended', 'rejected'];

async function getPartnerByUserId(userId, client = pool) {
  return (await client.query(
    `SELECT lp.*, u.name AS user_name, u.email AS user_email
     FROM lead_partners lp
     JOIN users u ON u.id=lp.user_id
     WHERE lp.user_id=$1
     LIMIT 1`,
    [Number(userId)]
  )).rows[0] || null;
}

async function apply(userId) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) throw new Error('Invalid user ID');
  const existing = await getPartnerByUserId(id);
  if (existing) return existing;
  return (await pool.query(
    `INSERT INTO lead_partners(user_id,status)
     VALUES($1,'pending')
     RETURNING *`,
    [id]
  )).rows[0];
}

async function assertActivePartner(userId) {
  const partner = await getPartnerByUserId(userId);
  if (!partner) {
    const error = new Error('Lead Partner application not found');
    error.code = 'PARTNER_NOT_FOUND';
    throw error;
  }
  if (partner.status !== 'active') {
    const error = new Error(`Lead Partner is ${partner.status}`);
    error.code = 'PARTNER_NOT_ACTIVE';
    throw error;
  }
  return partner;
}

async function createLead({ userId, ...data }) {
  const partner = await assertActivePartner(userId);
  const created = await leadService.createLead({
    ...data,
    source: data.source || 'lead_partner',
    createdBy: Number(userId),
    leadPartnerId: partner.id,
    qualityGateContext: 'lead_partner',
  });
  return created;
}

async function getMyLeads(userId, { status, page = 1, limit = 50 } = {}) {
  const partner = await assertActivePartner(userId);
  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 50));
  const offset = (currentPage - 1) * pageSize;
  const values = [partner.id];
  let filter = 'l.lead_partner_id=$1';
  if (status && status !== 'all') {
    values.push(String(status));
    filter += ` AND l.status=$${values.length}`;
  }
  const count = (await pool.query(`SELECT COUNT(*)::int AS total FROM leads l WHERE ${filter}`, values)).rows[0];
  values.push(pageSize, offset);
  const rows = (await pool.query(
    `SELECT l.*, i.name AS industry_name, s.name AS service_name,
            ss.name AS subservice_name, st.name AS state_name, c.name AS city_name
     FROM leads l
     LEFT JOIN industries i ON i.id=l.industry_id
     LEFT JOIN services s ON s.id=l.service_id
     LEFT JOIN subservices ss ON ss.id=l.subservice_id
     LEFT JOIN states st ON st.id=l.state_id
     LEFT JOIN cities c ON c.id=l.city_id
     WHERE ${filter}
     ORDER BY l.created_at DESC,l.id DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  )).rows;
  return { partner, leads: rows, pagination: { page: currentPage, limit: pageSize, total: Number(count.total || 0), totalPages: Math.ceil(Number(count.total || 0) / pageSize) } };
}

async function getQualityMetrics(partnerId, client = pool) {
  return leadQualityService.getPartnerQuality(partnerId, client);
}

async function updateStatus(partnerId, status, adminUserId=null) {
  const id = Number(partnerId);
  const nextStatus = String(status || '').trim().toLowerCase();
  if (!Number.isInteger(id) || id <= 0 || !PARTNER_STATUSES.includes(nextStatus)) {
    const error = new Error('Invalid Lead Partner status');
    error.code = 'INVALID_PARTNER_STATUS';
    throw error;
  }
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const before=(await client.query('SELECT * FROM lead_partners WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(!before){const error=new Error('Lead Partner not found');error.code='PARTNER_NOT_FOUND';throw error}
    const row=(await client.query(`UPDATE lead_partners SET status=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *`,[nextStatus,id])).rows[0];
    await criticalActionAudit.record(client,{actorId:adminUserId,category:'account',action:'partner.status_change',entityType:'lead_partner',entityId:id,beforeData:{status:before.status,userId:before.user_id},afterData:{status:row.status,userId:row.user_id},source:'lead_partner_service'});
    await notificationService.notifyUser({
      userId:row.user_id,type:'lead_partner_status_changed',category:'system',
      severity:row.status==='active'?'success':row.status==='rejected'||row.status==='suspended'?'warning':'info',
      title:row.status==='active'?'Lead Partner account approved':'Lead Partner status updated',
      message:`Your Lead Partner account status is now ${String(row.status).replace(/_/g,' ')}.`,
      actionUrl:'/lead-partner/dashboard',relatedType:'lead_partner',relatedId:id,
      dedupeKey:`lead-partner-status:${id}:${row.status}:${new Date(row.updated_at||Date.now()).toISOString()}`,
      metadata:{status:row.status}
    },client);
    await client.query('COMMIT');return row;
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}

async function getAdminPartners({ status, search = '', page = 1, limit = 50 } = {}) {
  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 50));
  const offset = (currentPage - 1) * pageSize;
  const values = [];
  const filters = ['1=1'];

  if (status) {
    values.push(String(status));
    filters.push(`lp.status=$${values.length}`);
  }
  if (String(search || '').trim()) {
    values.push(`%${String(search).trim()}%`);
    filters.push(`(
      u.name ILIKE $${values.length}
      OR u.email ILIKE $${values.length}
      OR COALESCE(bp.business_name,'') ILIKE $${values.length}
      OR COALESCE(bp.phone,'') ILIKE $${values.length}
      OR CAST(lp.id AS TEXT) ILIKE $${values.length}
    )`);
  }

  const where = filters.join(' AND ');
  const count = (await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM lead_partners lp
     JOIN users u ON u.id=lp.user_id
     LEFT JOIN business_profiles bp ON bp.user_id=lp.user_id
     WHERE ${where}`,
    values
  )).rows[0];

  const rows = (await pool.query(
    `WITH lead_stats AS (
       SELECT lead_partner_id,
              COUNT(*)::int AS total_leads,
              COUNT(*) FILTER (WHERE status='invalid')::int AS invalid_leads,
              COUNT(*) FILTER (WHERE status IN ('available','paused'))::int AS active_leads
       FROM leads
       WHERE lead_partner_id IS NOT NULL
       GROUP BY lead_partner_id
     ),
     purchase_stats AS (
       SELECT l.lead_partner_id,
              COUNT(DISTINCT p.lead_id) FILTER (WHERE p.status IN ('paid','refunded'))::int AS purchased_leads
       FROM lead_purchases p
       JOIN leads l ON l.id=p.lead_id
       WHERE l.lead_partner_id IS NOT NULL
       GROUP BY l.lead_partner_id
     ),
     report_stats AS (
       SELECT l.lead_partner_id,
              COUNT(DISTINCT r.lead_id) FILTER (WHERE r.status='verified_fake')::int AS verified_fake_leads,
              COUNT(DISTINCT r.id) FILTER (WHERE r.status='verified_genuine')::int AS verified_genuine_reports
       FROM lead_reports r
       JOIN leads l ON l.id=r.lead_id
       WHERE l.lead_partner_id IS NOT NULL
       GROUP BY l.lead_partner_id
     ),
     earning_calc AS (
       SELECT e.partner_id,e.status,e.gross_sale_amount,e.earning_amount,
              COALESCE((SELECT SUM(a.amount) FROM lead_partner_earning_adjustment_allocations a WHERE a.earning_id=e.id),0)::numeric AS adjusted,
              COALESCE((SELECT SUM(i.amount)
                        FROM lead_partner_payout_items i
                        JOIN lead_partner_payout_requests r ON r.id=i.payout_id
                        WHERE i.earning_id=e.id AND i.status='reserved' AND r.status='pending'),0)::numeric AS reserved,
              COALESCE((SELECT SUM(i.amount)
                        FROM lead_partner_payout_items i
                        JOIN lead_partner_payout_requests r ON r.id=i.payout_id
                        WHERE i.earning_id=e.id AND i.status='paid' AND r.status='paid'),0)::numeric AS paid
       FROM lead_partner_earnings e
     ),
     earning_stats AS (
       SELECT partner_id,
              COALESCE(SUM(gross_sale_amount) FILTER (WHERE status<>'reversed'),0)::numeric AS gross_sales,
              COALESCE(SUM(earning_amount) FILTER (WHERE status<>'reversed'),0)::numeric AS generated_earnings,
              COALESCE(SUM(
                GREATEST(0,earning_amount-adjusted-reserved-paid)
              ) FILTER (WHERE status='available'),0)::numeric AS available_earnings,
              COALESCE(SUM(reserved) FILTER (WHERE status='available'),0)::numeric AS reserved_earnings,
              COALESCE(SUM(paid),0)::numeric AS paid_earnings,
              COALESCE(SUM(earning_amount) FILTER (WHERE status='reversed'),0)::numeric AS reversed_earnings
       FROM earning_calc
       GROUP BY partner_id
     ),
     payout_stats AS (
       SELECT partner_id,
              COALESCE(SUM(amount) FILTER (WHERE status='pending'),0)::numeric AS pending_transfer,
              COALESCE(SUM(amount) FILTER (WHERE status='paid'),0)::numeric AS transferred_amount,
              COUNT(*) FILTER (WHERE status='pending')::int AS pending_payout_count
       FROM lead_partner_payout_requests
       GROUP BY partner_id
     ),
     recovery_stats AS (
       SELECT a.partner_id,
              COALESCE(SUM(
                CASE WHEN a.status='outstanding'
                  THEN a.amount-COALESCE((SELECT SUM(x.amount) FROM lead_partner_earning_adjustment_allocations x WHERE x.adjustment_id=a.id),0)
                  ELSE 0 END
              ),0)::numeric AS recovery_outstanding
       FROM lead_partner_earning_adjustments a
       GROUP BY a.partner_id
     )
     SELECT lp.*,u.name AS user_name,u.email AS user_email,
            bp.business_name,bp.phone AS business_phone,
            COALESCE(ls.total_leads,0)::int AS total_leads,
            COALESCE(ls.active_leads,0)::int AS active_leads,
            COALESCE(ls.invalid_leads,0)::int AS invalid_leads,
            COALESCE(ps.purchased_leads,0)::int AS purchased_leads,
            COALESCE(rs.verified_fake_leads,0)::int AS verified_fake_leads,
            COALESCE(rs.verified_genuine_reports,0)::int AS verified_genuine_reports,
            CASE WHEN COALESCE(ps.purchased_leads,0)=0 THEN 0
                 ELSE ROUND(COALESCE(rs.verified_fake_leads,0)::numeric * 100.0 / ps.purchased_leads, 2)
            END AS verified_fake_rate_pct,
            COALESCE(es.gross_sales,0)::numeric AS gross_sales,
            COALESCE(es.generated_earnings,0)::numeric AS generated_earnings,
            COALESCE(es.available_earnings,0)::numeric AS available_earnings,
            COALESCE(es.reserved_earnings,0)::numeric AS reserved_earnings,
            COALESCE(es.paid_earnings,0)::numeric AS paid_earnings,
            COALESCE(es.reversed_earnings,0)::numeric AS reversed_earnings,
            COALESCE(pos.pending_transfer,0)::numeric AS pending_transfer,
            COALESCE(pos.transferred_amount,0)::numeric AS transferred_amount,
            COALESCE(pos.pending_payout_count,0)::int AS pending_payout_count,
            COALESCE(rec.recovery_outstanding,0)::numeric AS recovery_outstanding
     FROM lead_partners lp
     JOIN users u ON u.id=lp.user_id
     LEFT JOIN business_profiles bp ON bp.user_id=lp.user_id
     LEFT JOIN lead_stats ls ON ls.lead_partner_id=lp.id
     LEFT JOIN purchase_stats ps ON ps.lead_partner_id=lp.id
     LEFT JOIN report_stats rs ON rs.lead_partner_id=lp.id
     LEFT JOIN earning_stats es ON es.partner_id=lp.id
     LEFT JOIN payout_stats pos ON pos.partner_id=lp.id
     LEFT JOIN recovery_stats rec ON rec.partner_id=lp.id
     WHERE ${where}
     ORDER BY
       CASE WHEN COALESCE(pos.pending_transfer,0)>0 THEN 0 ELSE 1 END,
       lp.created_at DESC,lp.id DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, pageSize, offset]
  )).rows;

  const qualityByPartner=await leadQualityService.getPartnerQualityBatch(rows.map(row=>Number(row.id)),pool);

  const partners = rows.map(row => ({

    ...row,
    total_leads: Number(row.total_leads || 0),
    active_leads: Number(row.active_leads || 0),
    invalid_leads: Number(row.invalid_leads || 0),
    purchased_leads: Number(row.purchased_leads || 0),
    verified_fake_leads: Number(row.verified_fake_leads || 0),
    verified_genuine_reports: Number(row.verified_genuine_reports || 0),
    verified_fake_rate_pct: Number(row.verified_fake_rate_pct || 0),
    gross_sales: Number(row.gross_sales || 0),
    generated_earnings: Number(row.generated_earnings || 0),
    available_earnings: Number(row.available_earnings || 0),
    reserved_earnings: Number(row.reserved_earnings || 0),
    paid_earnings: Number(row.paid_earnings || 0),
    reversed_earnings: Number(row.reversed_earnings || 0),
    pending_transfer: Number(row.pending_transfer || 0),
    transferred_amount: Number(row.transferred_amount || 0),
    pending_payout_count: Number(row.pending_payout_count || 0),
    recovery_outstanding: Number(row.recovery_outstanding || 0),
    quality_score: qualityByPartner.get(Number(row.id))?.score ?? null,
    quality_band: qualityByPartner.get(Number(row.id))?.band || 'no_data',
    quality_confidence: qualityByPartner.get(Number(row.id))?.confidence || 'none',
    quality_breakdown: qualityByPartner.get(Number(row.id))?.breakdown || null,
    quality_top_issues: qualityByPartner.get(Number(row.id))?.topIssues || [],
    quality_metric_definition: 'Average per-lead score: completeness 45, validity 25, uniqueness 15 and verified buyer outcome 15.',
  }));

  const totals = partners.reduce((acc,row) => {
    acc.totalLeads += row.total_leads;
    acc.purchasedLeads += row.purchased_leads;
    acc.generatedEarnings += row.generated_earnings;
    acc.pendingTransfer += row.pending_transfer;
    acc.transferredAmount += row.transferred_amount;
    return acc;
  }, { totalLeads:0,purchasedLeads:0,generatedEarnings:0,pendingTransfer:0,transferredAmount:0 });

  return {
    partners,
    totals,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total: Number(count.total || 0),
      totalPages: Math.ceil(Number(count.total || 0) / pageSize)
    }
  };
}

async function getDashboard(userId, period='month') {
  const periodKey=['month','last_month','last_3_months','last_6_months','all'].includes(String(period)) ? String(period) : 'month';
  const periodStartSql={month:"date_trunc('month',CURRENT_DATE)",last_month:"date_trunc('month',CURRENT_DATE)-interval '1 month'",last_3_months:"date_trunc('month',CURRENT_DATE)-interval '2 months'",last_6_months:"date_trunc('month',CURRENT_DATE)-interval '5 months'",all:'NULL'}[periodKey];
  const periodCondition=(column)=>periodKey==='all'?'TRUE':`${column} >= ${periodStartSql}`;
  const [summaryResult, recentResult, profileResult, partnerResult] = await Promise.all([
    pool.query(`SELECT
      COUNT(DISTINCT l.id)::int AS total_leads,
      COUNT(DISTINCT l.id) FILTER (WHERE l.status IN ('available','paused'))::int AS active_leads,
      COUNT(DISTINCT p.lead_id) FILTER (WHERE p.status='paid' AND ${periodCondition('p.created_at')})::int AS sold_leads,
      COUNT(DISTINCT l.id) FILTER (WHERE l.status='closed')::int AS closed_leads,
      COUNT(DISTINCT p.lead_id) FILTER (WHERE p.status='refunded' AND ${periodCondition('p.updated_at')})::int AS refunded_leads,
      COUNT(DISTINCT r.lead_id) FILTER (WHERE r.status='verified_fake' AND ${periodCondition('r.reviewed_at')})::int AS verified_fake_leads,
      COUNT(DISTINCT c.lead_id) FILTER (WHERE c.expires_at IS NOT NULL AND c.expires_at < CURRENT_TIMESTAMP AND ${periodCondition('c.expires_at')})::int AS expired_access_leads
     FROM leads l
     LEFT JOIN lead_purchases p ON p.lead_id=l.id
     LEFT JOIN lead_reports r ON r.lead_id=l.id
     LEFT JOIN lead_entitlement_claims c ON c.lead_id=l.id
     WHERE l.lead_partner_id=(SELECT id FROM lead_partners WHERE user_id=$1 LIMIT 1)
       AND ${periodCondition('l.created_at')}`, [userId]),
    pool.query(`SELECT l.id,l.customer_name,l.requirement,l.status,l.created_at,i.name AS industry_name,s.name AS service_name,c.name AS city_name FROM leads l LEFT JOIN industries i ON i.id=l.industry_id LEFT JOIN services s ON s.id=l.service_id LEFT JOIN cities c ON c.id=l.city_id WHERE l.lead_partner_id=(SELECT id FROM lead_partners WHERE user_id=$1 LIMIT 1) AND ${periodCondition('l.created_at')} ORDER BY l.created_at DESC,l.id DESC LIMIT 8`, [userId]),
    pool.query(`SELECT bp.business_name,bp.phone,bp.business_details FROM business_profiles bp WHERE bp.user_id=$1 LIMIT 1`, [userId]),
    getPartnerByUserId(userId),
  ]);
  const summary = summaryResult.rows[0] || {};
  const quality = partnerResult ? await getQualityMetrics(partnerResult.id) : null;
  const financialResult = partnerResult ? await pool.query(`
    SELECT
      COALESCE((SELECT SUM(p.amount) FROM lead_purchases p JOIN leads l ON l.id=p.lead_id WHERE l.lead_partner_id=$1 AND p.status='paid' AND ${periodCondition('p.created_at')}),0) AS gross_sales,
      COALESCE((SELECT SUM(e.earning_amount) FROM lead_partner_earnings e WHERE e.partner_id=$1 AND e.status<>'reversed' AND ${periodCondition('e.created_at')}),0) AS earnings_generated,
      COALESCE((SELECT SUM(r.amount) FROM lead_partner_payout_requests r WHERE r.partner_id=$1 AND r.status='paid' AND ${periodCondition('r.processed_at')}),0) AS amount_received,
      COALESCE((SELECT SUM(r.amount) FROM lead_partner_payout_requests r WHERE r.partner_id=$1 AND r.status='pending' AND ${periodCondition('r.requested_at')}),0) AS pending_withdrawals,
      COALESCE((SELECT SUM(e.earning_amount-COALESCE(x.adjusted,0)-COALESCE(x.reserved,0)-COALESCE(x.paid,0))
        FROM lead_partner_earnings e
        LEFT JOIN LATERAL (
          SELECT
            COALESCE((SELECT SUM(a.amount) FROM lead_partner_earning_adjustment_allocations a WHERE a.earning_id=e.id),0) adjusted,
            COALESCE((SELECT SUM(i.amount) FROM lead_partner_payout_items i JOIN lead_partner_payout_requests r ON r.id=i.payout_id WHERE i.earning_id=e.id AND i.status='reserved' AND r.status='pending'),0) reserved,
            COALESCE((SELECT SUM(i.amount) FROM lead_partner_payout_items i JOIN lead_partner_payout_requests r ON r.id=i.payout_id WHERE i.earning_id=e.id AND i.status='paid' AND r.status='paid'),0) paid
        ) x ON TRUE
        WHERE e.partner_id=$1 AND e.status='available'),0) AS available_earnings,
      COALESCE((SELECT SUM(amount-COALESCE((SELECT SUM(a.amount) FROM lead_partner_earning_adjustment_allocations a WHERE a.adjustment_id=adj.id),0)) FROM lead_partner_earning_adjustments adj WHERE adj.partner_id=$1 AND adj.status='outstanding'),0) AS recovery_outstanding
  `, [partnerResult.id]) : { rows: [{}] };
  const financial = financialResult.rows[0] || {};
  const partnerId = partnerResult?.id || 0;
  const [chartResult,statusResult,payoutResult] = partnerResult ? await Promise.all([
    pool.query(`WITH months AS (
      SELECT generate_series(date_trunc('month', CURRENT_DATE) - interval '5 months', date_trunc('month', CURRENT_DATE), interval '1 month') AS month
    )
    SELECT to_char(m.month,'Mon') AS label,
           COALESCE((SELECT SUM(e.earning_amount) FROM lead_partner_earnings e WHERE e.partner_id=$1 AND e.status<>'reversed' AND date_trunc('month',e.created_at)=m.month),0) AS earnings,
           COALESCE((SELECT SUM(r.amount) FROM lead_partner_payout_requests r WHERE r.partner_id=$1 AND r.status='paid' AND date_trunc('month',r.processed_at)=m.month),0) AS received
    FROM months m ORDER BY m.month`, [partnerId]),
    pool.query(`WITH outcome AS (
      SELECT l.id,
        CASE
          WHEN EXISTS (SELECT 1 FROM lead_reports r WHERE r.lead_id=l.id AND r.status='verified_fake') THEN 'fake'
          WHEN EXISTS (SELECT 1 FROM lead_purchases p WHERE p.lead_id=l.id AND p.status='refunded') THEN 'refunded'
          WHEN EXISTS (SELECT 1 FROM lead_purchases p WHERE p.lead_id=l.id AND p.status='paid') THEN 'sold'
          WHEN l.status='closed' THEN 'closed'
          WHEN l.status='paused' THEN 'paused'
          WHEN l.status='quarantined' THEN 'quarantined'
          ELSE 'available'
        END AS status
      FROM leads l
      WHERE l.lead_partner_id=$1
    )
    SELECT status,COUNT(*)::int AS count FROM outcome GROUP BY status`, [partnerId]),
    pool.query(`SELECT id,amount,status,transfer_reference,requested_at,processed_at,payout_account_snapshot FROM lead_partner_payout_requests WHERE partner_id=$1 ORDER BY requested_at DESC,id DESC LIMIT 5`, [partnerId])
  ]) : [{rows:[]},{rows:[]},{rows:[]}];
  const leadStatus = Object.fromEntries(statusResult.rows.map(x=>[x.status,Number(x.count||0)]));
  return {
    partner: partnerResult || profileResult.rows[0] || null,
    stats: {
      totalLeads: Number(summary.total_leads || 0),
      activeLeads: Number(summary.active_leads || 0),
      soldLeads: Number(summary.sold_leads || 0),
      closedLeads: Number(summary.closed_leads || 0),
      refundedLeads: Number(summary.refunded_leads || 0),
      verifiedFakeLeads: Number(summary.verified_fake_leads || 0),
      expiredAccessLeads: Number(summary.expired_access_leads || 0),
      grossSales: Number(financial.gross_sales || 0),
      earningsGenerated: Number(financial.earnings_generated || 0),
      amountReceived: Number(financial.amount_received || 0),
      pendingWithdrawals: Number(financial.pending_withdrawals || 0),
      availableEarnings: Number(financial.available_earnings || 0),
      recoveryOutstanding: Number(financial.recovery_outstanding || 0),
    },
    charts: {
      earnings: chartResult.rows.map(x=>({label:x.label,earnings:Number(x.earnings||0),received:Number(x.received||0)})),
      leadStatus: {
        available:Number(leadStatus.available||0),
        sold:Number(leadStatus.sold||0),
        refunded:Number(leadStatus.refunded||0),
        fake:Number(leadStatus.fake||0),
        closed:Number(leadStatus.closed||0),
        paused:Number(leadStatus.paused||0),
        quarantined:Number(leadStatus.quarantined||0),
      },
    },
    quality,
    recentLeads: recentResult.rows,
    recentPayouts: payoutResult.rows.map(x=>({id:x.id,amount:Number(x.amount||0),status:x.status,transfer_reference:x.transfer_reference,requested_at:x.requested_at,processed_at:x.processed_at})),
    pricing: { commissionPercent: 5, normalPriceUplift: null, configured: false },
    period: periodKey,
  };
}

module.exports = { PARTNER_STATUSES, getPartnerByUserId, apply, assertActivePartner, createLead, getMyLeads, getQualityMetrics, getAdminPartners, updateStatus, getDashboard };
