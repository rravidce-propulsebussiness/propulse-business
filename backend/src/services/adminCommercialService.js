const pool = require('../config/database');

async function getInvestorSettings() {
  const s = (await pool.query('SELECT * FROM investor_settings WHERE id=1')).rows[0];
  const limits = (await pool.query(`
    SELECT i.id,i.name,
           COALESCE(l.investor_limit,s.default_industry_limit) investor_limit,
           COALESCE(l.is_active,TRUE) is_active
    FROM industries i
    CROSS JOIN investor_settings s
    LEFT JOIN investor_industry_limits l ON l.industry_id=i.id
    WHERE i.is_active=TRUE
    ORDER BY i.name
  `)).rows;
  return { ...s, industryLimits: limits };
}

async function updateInvestorSettings(data) {
  await pool.query(`
    UPDATE investor_settings
    SET global_limit=$1,
        default_industry_limit=$2,
        customer_industry_limit=$3,
        min_investment=$4,
        max_investment=$5,
        enabled=$6,
        requires_pro=$7,
        updated_at=CURRENT_TIMESTAMP
    WHERE id=1
  `, [
    Number(data.globalLimit),
    Number(data.defaultIndustryLimit),
    Number(data.customerIndustryLimit ?? 10),
    Number(data.minInvestment),
    data.maxInvestment === '' || data.maxInvestment == null ? null : Number(data.maxInvestment),
    Boolean(data.enabled),
    data.requiresPro !== false,
  ]);

  if (Array.isArray(data.industryLimits)) {
    for (const x of data.industryLimits) {
      const industryId = Number(x.industryId ?? x.id);
      const limit = Number(x.limit ?? x.investor_limit ?? data.defaultIndustryLimit ?? 0);
      await pool.query(`
        INSERT INTO investor_industry_limits(industry_id,investor_limit,is_active)
        VALUES($1,$2,$3)
        ON CONFLICT(industry_id) DO UPDATE SET
          investor_limit=EXCLUDED.investor_limit,
          is_active=EXCLUDED.is_active,
          updated_at=CURRENT_TIMESTAMP
      `, [industryId, limit, x.isActive === undefined ? Boolean(x.is_active !== false) : Boolean(x.isActive)]);
    }
  }

  return getInvestorSettings();
}

async function getCoupons(){return (await pool.query('SELECT * FROM coupons ORDER BY created_at DESC')).rows;}
async function createCoupon(d){const r=await pool.query(`INSERT INTO coupons(code,discount_type,discount_value,max_discount,min_order_amount,usage_limit,starts_at,expires_at,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[String(d.code).trim().toUpperCase(),d.discountType,Number(d.discountValue),d.maxDiscount===''?null:Number(d.maxDiscount),Number(d.minOrderAmount)||0,d.usageLimit===''||d.usageLimit==null?null:Number(d.usageLimit),d.startsAt||null,d.expiresAt||null,d.isActive!==false]);return r.rows[0];}
async function updateCoupon(id,d){const r=await pool.query(`UPDATE coupons SET code=$1,discount_type=$2,discount_value=$3,max_discount=$4,min_order_amount=$5,usage_limit=$6,starts_at=$7,expires_at=$8,is_active=$9,updated_at=CURRENT_TIMESTAMP WHERE id=$10 RETURNING *`,[String(d.code).trim().toUpperCase(),d.discountType,Number(d.discountValue),d.maxDiscount===''?null:Number(d.maxDiscount),Number(d.minOrderAmount)||0,d.usageLimit===''||d.usageLimit==null?null:Number(d.usageLimit),d.startsAt||null,d.expiresAt||null,Boolean(d.isActive),id]);return r.rows[0]||null;}
async function setCouponStatus(id,isActive){return (await pool.query('UPDATE coupons SET is_active=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',[isActive,id])).rows[0]||null;}
async function deleteCoupon(id){return (await pool.query('DELETE FROM coupons WHERE id=$1 RETURNING id',[id])).rows[0]||null;}

module.exports={getInvestorSettings,updateInvestorSettings,getCoupons,createCoupon,updateCoupon,setCouponStatus,deleteCoupon};
