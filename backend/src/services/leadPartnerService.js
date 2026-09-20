const pool = require('../config/database');
const leadService = require('./leadService');

const PARTNER_STATUSES = ['pending', 'active', 'suspended', 'rejected'];

async function getPartnerByUserId(userId, client = pool) {
  const result = await client.query(
    `SELECT lp.*, u.name AS user_name, u.email AS user_email
     FROM lead_partners lp
     INNER JOIN users u ON u.id = lp.user_id
     WHERE lp.user_id=$1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function apply(userId) {
  const existing = await getPartnerByUserId(userId);
  if (existing) return existing;
  const result = await pool.query(
    `INSERT INTO lead_partners (user_id, status)
     VALUES ($1, 'pending')
     RETURNING *`,
    [userId]
  );
  return result.rows[0];
}

async function assertActivePartner(userId) {
  const partner = await getPartnerByUserId(userId);
  if (!partner) {
    const error = new Error('Lead Partner account not found. Apply to become a Lead Partner first.');
    error.code = 'PARTNER_NOT_FOUND';
    throw error;
  }
  if (partner.status !== 'active') {
    const error = new Error(`Lead Partner account is ${partner.status}.`);
    error.code = 'PARTNER_NOT_ACTIVE';
    throw error;
  }
  return partner;
}

async function createLead({ userId, ...data }) {
  const partner = await assertActivePartner(userId);
  const lead = await leadService.createLead({
    ...data,
    source: data.source || 'lead_partner',
    createdBy: userId,
  });
  const result = await pool.query(
    `UPDATE leads
     SET lead_partner_id=$1, updated_at=CURRENT_TIMESTAMP
     WHERE id=$2
     RETURNING *`,
    [partner.id, lead.id]
  );
  return result.rows[0] || lead;
}

async function getMyLeads(userId, { status, page = 1, limit = 50 } = {}) {
  const partner = await assertActivePartner(userId);
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const offset = (safePage - 1) * safeLimit;
  const values = [partner.id];
  const conditions = ['l.lead_partner_id=$1'];
  if (status && status !== 'all') {
    values.push(status);
    conditions.push(`l.status=$${values.length}`);
  }
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM leads l WHERE ${conditions.join(' AND ')}`,
    values
  );
  values.push(safeLimit, offset);
  const result = await pool.query(
    `SELECT l.*, i.name AS industry_name, s.name AS service_name,
            ss.name AS subservice_name, st.name AS state_name, c.name AS city_name
     FROM leads l
     INNER JOIN industries i ON i.id=l.industry_id
     INNER JOIN services s ON s.id=l.service_id
     LEFT JOIN subservices ss ON ss.id=l.subservice_id
     INNER JOIN states st ON st.id=l.state_id
     INNER JOIN cities c ON c.id=l.city_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY l.created_at DESC, l.id DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  return {
    partner,
    leads: result.rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: countResult.rows[0].total,
      pages: Math.ceil(countResult.rows[0].total / safeLimit),
    },
  };
}

async function getAdminPartners({ status, page = 1, limit = 50 } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const offset = (safePage - 1) * safeLimit;
  const values = [];
  const conditions = [];
  if (status && status !== 'all') {
    if (!PARTNER_STATUSES.includes(status)) throw new Error('Invalid partner status');
    values.push(status);
    conditions.push(`lp.status=$${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const count = await pool.query(`SELECT COUNT(*)::int AS total FROM lead_partners lp ${where}`, values);
  values.push(safeLimit, offset);
  const rows = await pool.query(
    `SELECT lp.*, u.name AS user_name, u.email AS user_email,
            COUNT(l.id)::int AS total_leads,
            COUNT(l.id) FILTER (WHERE l.status='invalid')::int AS invalid_leads
     FROM lead_partners lp
     INNER JOIN users u ON u.id=lp.user_id
     LEFT JOIN leads l ON l.lead_partner_id=lp.id
     ${where}
     GROUP BY lp.id,u.name,u.email
     ORDER BY lp.created_at DESC,lp.id DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  return { partners: rows.rows, pagination: { page: safePage, limit: safeLimit, total: count.rows[0].total, pages: Math.ceil(count.rows[0].total / safeLimit) } };
}

async function updateStatus(partnerId, status) {
  if (!PARTNER_STATUSES.includes(status)) throw new Error('Invalid partner status');
  const result = await pool.query(
    `UPDATE lead_partners SET status=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *`,
    [status, partnerId]
  );
  return result.rows[0] || null;
}

module.exports = { apply, getPartnerByUserId, assertActivePartner, createLead, getMyLeads, getAdminPartners, updateStatus };
