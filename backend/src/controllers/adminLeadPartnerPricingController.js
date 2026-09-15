const pool = require('../config/database');

async function getSettings(req, res) {
  try {
    const row = (await pool.query('SELECT commission_percent,normal_price_uplift FROM lead_partner_settings WHERE id=1')).rows[0] || {};
    return res.json({ commissionPercent: Number(row.commission_percent ?? 5), normalPriceUplift: Number(row.normal_price_uplift ?? 100) });
  } catch (error) {
    console.error('Get Lead Partner pricing settings failed:', error.message);
    return res.status(500).json({ error: 'Failed to load Lead Partner pricing settings' });
  }
}

async function updateSettings(req, res) {
  const commissionPercent = Number(req.body?.commissionPercent);
  const normalPriceUplift = Number(req.body?.normalPriceUplift);
  if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) return res.status(400).json({ error: 'Partner commission must be between 0 and 100%' });
  if (!Number.isFinite(normalPriceUplift) || normalPriceUplift < 0) return res.status(400).json({ error: 'Normal-price uplift must be zero or greater' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = (await client.query('UPDATE lead_partner_settings SET commission_percent=$1,normal_price_uplift=$2,updated_at=CURRENT_TIMESTAMP WHERE id=1 RETURNING commission_percent,normal_price_uplift', [commissionPercent, normalPriceUplift])).rows[0];
    await client.query(`
      UPDATE leads l
      SET pricing=jsonb_build_object('shares', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('shares', (tier->>'shares')::int, 'pro', (tier->>'pro')::numeric, 'normal', (tier->>'pro')::numeric + $1) ORDER BY (tier->>'shares')::int)
        FROM jsonb_array_elements(CASE WHEN jsonb_typeof(l.pricing->'shares')='array' THEN l.pricing->'shares' ELSE '[]'::jsonb END) AS tier
      ), '[]'::jsonb)),
          updated_at=CURRENT_TIMESTAMP
      WHERE l.partner_pricing_overridden=TRUE
        AND EXISTS (SELECT 1 FROM users u WHERE u.id=l.created_by AND u.role='lead_partner')
        AND l.status IN ('available','paused')
    `, [normalPriceUplift]);
    await client.query('COMMIT');
    return res.json({ commissionPercent: Number(row.commission_percent), normalPriceUplift: Number(row.normal_price_uplift) });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update Lead Partner pricing settings failed:', error.message);
    return res.status(500).json({ error: 'Failed to save Lead Partner pricing settings' });
  } finally { client.release(); }
}

module.exports = { getSettings, updateSettings };
