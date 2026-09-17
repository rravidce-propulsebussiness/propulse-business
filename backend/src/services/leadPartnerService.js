const pool = require('../config/database');
const leadService = require('./leadService');
const pincodeService = require('./pincodeService');

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
  });
  try {
    await pool.query(
      `UPDATE leads SET lead_partner_id=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2`,
      [partner.id, created.id]
    );
  } catch (error) {
    console.error('Lead Partner lead linkage failed:', error.message);
    throw error;
  }
  return { ...created, lead_partner_id: partner.id };
}

async function getMyLeads(userId, { status, page = 1, limit = 50 } = {}) {
  const partner = await assertActivePartner(userId);
  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 50));
  const offset = (currentPage - 1) * pageSize;
  const values = [partner.id];
  let filter = 'l.lead_partner_id=$1';
  if (status) {
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

async function updateStatus(partnerId, status) {
  const id = Number(partnerId);
  const nextStatus = String(status || '').trim().toLowerCase();
  if (!Number.isInteger(id) || id <= 0 || !PARTNER_STATUSES.includes(nextStatus)) {
    const error = new Error('Invalid Lead Partner status');
    error.code = 'INVALID_PARTNER_STATUS';
    throw error;
  }
  const row = (await pool.query(
    `UPDATE lead_partners SET status=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *`,
    [nextStatus, id]
  )).rows[0];
  if (!row) {
    const error = new Error('Lead Partner not found');
    error.code = 'PARTNER_NOT_FOUND';
    throw error;
  }
  return row;
}

async function getAdminPartners({ status, page = 1, limit = 50 } = {}) {
  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 50));
  const offset = (currentPage - 1) * pageSize;
  const values = [];
  let filter = '1=1';
  if (status) {
    values.push(String(status));
    filter += ` AND lp.status=$${values.length}`;
  }
  const count = (await pool.query(`SELECT COUNT(*)::int AS total FROM lead_partners lp WHERE ${filter}`, values)).rows[0];
  values.push(pageSize, offset);
  const rows = (await pool.query(
    `SELECT lp.*,u.name AS user_name,u.email AS user_email,
            COUNT(l.id)::int AS total_leads,
            COUNT(l.id) FILTER (WHERE l.status='invalid')::int AS invalid_leads
     FROM lead_partners lp
     JOIN users u ON u.id=lp.user_id
     LEFT JOIN leads l ON l.lead_partner_id=lp.id
     WHERE ${filter}
     GROUP BY lp.id,u.id
     ORDER BY lp.created_at DESC,lp.id DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  )).rows;
  return { partners: rows, pagination: { page: currentPage, limit: pageSize, total: Number(count.total || 0), totalPages: Math.ceil(Number(count.total || 0) / pageSize) } };
}

async function getDashboard(userId) {
  const [summaryResult, recentResult, profileResult, partnerResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total_leads, COUNT(*) FILTER (WHERE status IN ('available','paused'))::int AS active_leads, COUNT(*) FILTER (WHERE status='sold')::int AS sold_leads, COUNT(*) FILTER (WHERE status='closed')::int AS closed_leads FROM leads WHERE created_by=$1`, [userId]),
    pool.query(`SELECT l.id,l.customer_name,l.requirement,l.status,l.created_at,i.name AS industry_name,s.name AS service_name,c.name AS city_name FROM leads l LEFT JOIN industries i ON i.id=l.industry_id LEFT JOIN services s ON s.id=l.service_id LEFT JOIN cities c ON c.id=l.city_id WHERE l.created_by=$1 ORDER BY l.created_at DESC,l.id DESC LIMIT 8`, [userId]),
    pool.query(`SELECT bp.business_name,bp.phone,bp.business_details FROM business_profiles bp WHERE bp.user_id=$1 LIMIT 1`, [userId]),
    getPartnerByUserId(userId),
  ]);
  const summary = summaryResult.rows[0] || {};
  return {
    partner: partnerResult || profileResult.rows[0] || null,
    stats: { totalLeads: Number(summary.total_leads || 0), activeLeads: Number(summary.active_leads || 0), soldLeads: Number(summary.sold_leads || 0), closedLeads: Number(summary.closed_leads || 0) },
    recentLeads: recentResult.rows,
    pricing: { commissionPercent: 5, normalPriceUplift: null, configured: false },
  };
}

module.exports = { PARTNER_STATUSES, getPartnerByUserId, apply, assertActivePartner, createLead, getMyLeads, getAdminPartners, updateStatus, getDashboard };
