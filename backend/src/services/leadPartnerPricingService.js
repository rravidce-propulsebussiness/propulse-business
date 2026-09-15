const pool = require('../config/database');

const normalizePricing = value => {
  const shares = Array.isArray(value?.shares) ? value.shares : [];
  return shares.map(row => ({ shares: Number(row?.shares), normal: Number(row?.normal), pro: Number(row?.pro) }))
    .filter(row => Number.isInteger(row.shares) && row.shares > 0 && Number.isFinite(row.normal) && row.normal >= 0 && Number.isFinite(row.pro) && row.pro >= 0)
    .sort((a, b) => a.shares - b.shares);
};

async function getSettings() {
  const row = (await pool.query('SELECT commission_percent,normal_price_uplift FROM lead_partner_settings WHERE id=1')).rows[0] || {};
  return { commissionPercent: Number(row.commission_percent ?? 5), normalPriceUplift: Number(row.normal_price_uplift ?? 100) };
}

async function list(userId, { search = '', status = 'all' } = {}) {
  const params = [userId];
  const conditions = ['l.created_by=$1'];
  if (status && status !== 'all') { params.push(status); conditions.push(`l.status=$${params.length}`); }
  if (String(search).trim()) {
    params.push(`%${String(search).trim()}%`);
    conditions.push(`(l.customer_name ILIKE $${params.length} OR l.customer_phone ILIKE $${params.length} OR l.requirement ILIKE $${params.length})`);
  }
  const [settings, rows] = await Promise.all([
    getSettings(),
    pool.query(`SELECT l.id,l.customer_name,l.customer_phone,l.status,l.lead_type,l.created_at,l.pricing,l.partner_base_pricing,COALESCE(l.partner_pricing_overridden,FALSE) AS partner_pricing_overridden,l.partner_pricing_updated_at,i.name AS industry_name,s.name AS service_name,c.name AS city_name FROM leads l JOIN industries i ON i.id=l.industry_id JOIN services s ON s.id=l.service_id JOIN cities c ON c.id=l.city_id WHERE ${conditions.join(' AND ')} ORDER BY l.created_at DESC,l.id DESC LIMIT 500`, params),
  ]);
  return {
    settings,
    leads: rows.rows.map(row => ({
      id: row.id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      status: row.status,
      leadType: row.lead_type,
      createdAt: row.created_at,
      industryName: row.industry_name,
      serviceName: row.service_name,
      cityName: row.city_name,
      pricing: { shares: normalizePricing(row.pricing) },
      adminPricing: { shares: normalizePricing(row.partner_base_pricing || row.pricing) },
      overridden: Boolean(row.partner_pricing_overridden),
      updatedAt: row.partner_pricing_updated_at,
    })),
  };
}

async function update(userId, leadId, input) {
  const id = Number(leadId);
  if (!Number.isInteger(id) || id <= 0) throw Object.assign(new Error('Lead ID must be valid'), { code: 'INVALID_LEAD_ID' });
  const requested = Array.isArray(input?.shares) ? input.shares : [];
  if (!requested.length) throw Object.assign(new Error('At least one pricing tier is required'), { code: 'INVALID_PRICING' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lead = (await client.query('SELECT id,pricing FROM leads WHERE id=$1 AND created_by=$2 FOR UPDATE', [id, userId])).rows[0];
    if (!lead) throw Object.assign(new Error('Lead not found in your inventory'), { code: 'NOT_FOUND' });
    const current = normalizePricing(lead.pricing);
    if (!current.length) throw Object.assign(new Error('This lead has no configured pricing tiers'), { code: 'PRICING_NOT_CONFIGURED' });
    const settings = (await client.query('SELECT normal_price_uplift FROM lead_partner_settings WHERE id=1')).rows[0] || {};
    const uplift = Number(settings.normal_price_uplift ?? 100);
    if (!Number.isFinite(uplift) || uplift < 0) throw Object.assign(new Error('Lead Partner normal-price uplift is invalid'), { code: 'INVALID_PRICING_CONFIG' });
    const incoming = new Map();
    for (const item of requested) {
      const shares = Number(item?.shares); const pro = Number(item?.pro);
      if (!Number.isInteger(shares) || shares <= 0 || !Number.isFinite(pro) || pro < 0) throw Object.assign(new Error('Every Pro price must be a valid non-negative amount'), { code: 'INVALID_PRICING' });
      if (incoming.has(shares)) throw Object.assign(new Error('Duplicate sharing tier'), { code: 'INVALID_PRICING' });
      incoming.set(shares, pro);
    }
    const pricing = { shares: current.map(tier => { const pro = incoming.has(tier.shares) ? incoming.get(tier.shares) : tier.pro; return { shares: tier.shares, pro, normal: pro + uplift }; }) };
    await client.query('UPDATE leads SET pricing=$1::jsonb,partner_pricing_overridden=TRUE,partner_pricing_updated_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND created_by=$3', [JSON.stringify(pricing), id, userId]);
    await client.query('COMMIT');
    return { id, pricing, normalPriceUplift: uplift, overridden: true };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

module.exports = { getSettings, list, update };
