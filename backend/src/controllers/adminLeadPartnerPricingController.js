const pool = require('../config/database');

const settingsPayload=row=>({
  commissionPercent:Number(row?.commission_percent??5),
  normalPriceUplift:Number(row?.normal_price_uplift??100),
  twoSharePercent:Number(row?.two_share_percent??60),
  threeSharePercent:Number(row?.three_share_percent??45)
});

async function getSettings(req, res) {
  try {
    const row = (await pool.query('SELECT commission_percent,normal_price_uplift,two_share_percent,three_share_percent FROM lead_partner_settings WHERE id=1')).rows[0] || {};
    return res.json(settingsPayload(row));
  } catch (error) {
    console.error('Get Lead Partner pricing settings failed:', error.message);
    return res.status(500).json({ error: 'Failed to load Lead Partner pricing settings' });
  }
}

async function updateSettings(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current=(await client.query('SELECT commission_percent,normal_price_uplift,two_share_percent,three_share_percent FROM lead_partner_settings WHERE id=1 FOR UPDATE')).rows[0]||{};
    const commissionPercent=req.body?.commissionPercent===undefined?Number(current.commission_percent??5):Number(req.body.commissionPercent);
    const normalPriceUplift=req.body?.normalPriceUplift===undefined?Number(current.normal_price_uplift??100):Number(req.body.normalPriceUplift);
    const twoSharePercent=req.body?.twoSharePercent===undefined?Number(current.two_share_percent??60):Number(req.body.twoSharePercent);
    const threeSharePercent=req.body?.threeSharePercent===undefined?Number(current.three_share_percent??45):Number(req.body.threeSharePercent);

    if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) throw Object.assign(new Error('Partner commission must be between 0 and 100%'),{status:400});
    if (!Number.isFinite(normalPriceUplift) || normalPriceUplift < 0) throw Object.assign(new Error('Normal-price uplift must be zero or greater'),{status:400});
    if (!Number.isFinite(twoSharePercent) || twoSharePercent < 0 || twoSharePercent > 100) throw Object.assign(new Error('2-share price must be between 0 and 100% of the 1-share Pro price'),{status:400});
    if (!Number.isFinite(threeSharePercent) || threeSharePercent < 0 || threeSharePercent > 100) throw Object.assign(new Error('3-share price must be between 0 and 100% of the 1-share Pro price'),{status:400});
    if (threeSharePercent > twoSharePercent) throw Object.assign(new Error('3-share price percentage cannot be higher than 2-share price percentage'),{status:400});

    const row=(await client.query(
      'UPDATE lead_partner_settings SET commission_percent=$1,normal_price_uplift=$2,two_share_percent=$3,three_share_percent=$4,updated_at=CURRENT_TIMESTAMP WHERE id=1 RETURNING commission_percent,normal_price_uplift,two_share_percent,three_share_percent',
      [commissionPercent,normalPriceUplift,twoSharePercent,threeSharePercent]
    )).rows[0];

    await client.query(`
      WITH rule_base AS (
        SELECT r.id,
          COALESCE((
            SELECT (tier->>'pro')::numeric
            FROM jsonb_array_elements(CASE WHEN jsonb_typeof(r.pricing->'shares')='array' THEN r.pricing->'shares' ELSE '[]'::jsonb END) tier
            WHERE (tier->>'shares')::int=1
            LIMIT 1
          ),0) AS base_pro
        FROM lead_partner_pricing_rules r
      )
      UPDATE lead_partner_pricing_rules r
      SET pricing=jsonb_build_object('shares',jsonb_build_array(
        jsonb_build_object('shares',1,'pro',ROUND(b.base_pro,2),'normal',ROUND(b.base_pro+$1,2)),
        jsonb_build_object('shares',2,'pro',ROUND(b.base_pro*$2/100,2),'normal',ROUND(b.base_pro*$2/100+$1,2)),
        jsonb_build_object('shares',3,'pro',ROUND(b.base_pro*$3/100,2),'normal',ROUND(b.base_pro*$3/100+$1,2))
      )),
      updated_at=CURRENT_TIMESTAMP
      FROM rule_base b
      WHERE r.id=b.id
    `,[normalPriceUplift,twoSharePercent,threeSharePercent]);

    await client.query(`
      WITH lead_base AS (
        SELECT l.id,
          COALESCE((
            SELECT (tier->>'pro')::numeric
            FROM jsonb_array_elements(CASE WHEN jsonb_typeof(l.pricing->'shares')='array' THEN l.pricing->'shares' ELSE '[]'::jsonb END) tier
            WHERE (tier->>'shares')::int=1
            LIMIT 1
          ),0) AS base_pro
        FROM leads l
        WHERE l.partner_pricing_overridden=TRUE
          AND EXISTS (SELECT 1 FROM users u WHERE u.id=l.created_by AND u.role='lead_partner')
          AND l.status IN ('available','paused')
      )
      UPDATE leads l
      SET pricing=jsonb_build_object('shares',jsonb_build_array(
        jsonb_build_object('shares',1,'pro',ROUND(b.base_pro,2),'normal',ROUND(b.base_pro+$1,2)),
        jsonb_build_object('shares',2,'pro',ROUND(b.base_pro*$2/100,2),'normal',ROUND(b.base_pro*$2/100+$1,2)),
        jsonb_build_object('shares',3,'pro',ROUND(b.base_pro*$3/100,2),'normal',ROUND(b.base_pro*$3/100+$1,2))
      )),
      updated_at=CURRENT_TIMESTAMP
      FROM lead_base b
      WHERE l.id=b.id
    `,[normalPriceUplift,twoSharePercent,threeSharePercent]);

    await client.query('COMMIT');
    return res.json(settingsPayload(row));
  } catch (error) {
    await client.query('ROLLBACK').catch(()=>{});
    if(error.status===400)return res.status(400).json({error:error.message});
    console.error('Update Lead Partner pricing settings failed:', error.message);
    return res.status(500).json({ error: 'Failed to save Lead Partner pricing settings' });
  } finally { client.release(); }
}

module.exports = { getSettings, updateSettings };
