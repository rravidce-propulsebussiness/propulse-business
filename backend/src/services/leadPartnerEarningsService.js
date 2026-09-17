const pool = require('../config/database');

async function getCommissionPercent(client = pool) {
  const row = (await client.query('SELECT commission_percent FROM lead_partner_settings WHERE id=1')).rows[0] || {};
  const value = Number(row.commission_percent ?? 5);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 5;
}

async function createForPurchase(client, { leadId, leadPurchaseId, paymentId, grossAmount }) {
  const lead = (await client.query(
    `SELECT l.id,l.lead_partner_id,lp.user_id
       FROM leads l
       JOIN lead_partners lp ON lp.id=l.lead_partner_id
      WHERE l.id=$1
      FOR UPDATE OF l,lp`,
    [Number(leadId)]
  )).rows[0];
  if (!lead?.lead_partner_id) return null;
  const gross = Number(grossAmount || 0);
  if (!Number.isFinite(gross) || gross <= 0) return null;
  const commissionPercent = await getCommissionPercent(client);
  const earningAmount = Number((gross * commissionPercent / 100).toFixed(2));
  const result = await client.query(
    `INSERT INTO lead_partner_earnings
      (partner_id,user_id,lead_id,lead_purchase_id,payment_id,gross_sale_amount,commission_percent,earning_amount,status)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,'available')
     ON CONFLICT(lead_purchase_id) DO NOTHING
     RETURNING *`,
    [lead.lead_partner_id, lead.user_id, Number(leadId), Number(leadPurchaseId), paymentId ? Number(paymentId) : null, gross, commissionPercent, earningAmount]
  );
  return result.rows[0] || null;
}

async function reverseForPurchase(client, leadPurchaseId, reason = 'Verified fake lead') {
  const row = (await client.query(
    `UPDATE lead_partner_earnings
        SET status='reversed',reversal_reason=$2,updated_at=CURRENT_TIMESTAMP
      WHERE lead_purchase_id=$1 AND status='available'
      RETURNING *`,
    [Number(leadPurchaseId), reason]
  )).rows[0];
  return row || null;
}

async function getAdminPartnerFinancials(partnerId, client = pool) {
  const id = Number(partnerId);
  const summary = (await client.query(
    `SELECT
       COALESCE(SUM(earning_amount) FILTER (WHERE status='available'),0)::numeric AS available_earnings,
       COALESCE(SUM(earning_amount) FILTER (WHERE status='paid'),0)::numeric AS paid_earnings,
       COALESCE(SUM(earning_amount) FILTER (WHERE status='reversed'),0)::numeric AS reversed_earnings,
       COALESCE(SUM(gross_sale_amount),0)::numeric AS gross_sales,
       COUNT(*)::int AS earning_events
     FROM lead_partner_earnings WHERE partner_id=$1`, [id]
  )).rows[0] || {};
  const history = (await client.query(
    `SELECT e.*,l.customer_name,l.requirement,l.status AS lead_status,
            i.name AS industry_name,s.name AS service_name,c.name AS city_name
       FROM lead_partner_earnings e
       JOIN leads l ON l.id=e.lead_id
       LEFT JOIN industries i ON i.id=l.industry_id
       LEFT JOIN services s ON s.id=l.service_id
       LEFT JOIN cities c ON c.id=l.city_id
      WHERE e.partner_id=$1
      ORDER BY e.created_at DESC,e.id DESC
      LIMIT 500`, [id]
  )).rows;
  return {
    availableEarnings: Number(summary.available_earnings || 0),
    paidEarnings: Number(summary.paid_earnings || 0),
    reversedEarnings: Number(summary.reversed_earnings || 0),
    grossSales: Number(summary.gross_sales || 0),
    earningEvents: Number(summary.earning_events || 0),
    history,
  };
}

module.exports = { getCommissionPercent, createForPurchase, reverseForPurchase, getAdminPartnerFinancials };
