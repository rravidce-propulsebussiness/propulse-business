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
  try {
    const commissionPercent = Number(req.body?.commissionPercent);
    const normalPriceUplift = Number(req.body?.normalPriceUplift);
    if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) return res.status(400).json({ error: 'Partner commission must be between 0 and 100%' });
    if (!Number.isFinite(normalPriceUplift) || normalPriceUplift < 0) return res.status(400).json({ error: 'Normal-price uplift must be zero or greater' });
    const row = (await pool.query('UPDATE lead_partner_settings SET commission_percent=$1,normal_price_uplift=$2,updated_at=CURRENT_TIMESTAMP WHERE id=1 RETURNING commission_percent,normal_price_uplift', [commissionPercent, normalPriceUplift])).rows[0];
    return res.json({ commissionPercent: Number(row.commission_percent), normalPriceUplift: Number(row.normal_price_uplift) });
  } catch (error) {
    console.error('Update Lead Partner pricing settings failed:', error.message);
    return res.status(500).json({ error: 'Failed to save Lead Partner pricing settings' });
  }
}

module.exports = { getSettings, updateSettings };
