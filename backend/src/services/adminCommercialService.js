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
  const locationLimits = (await pool.query(`
    SELECT l.id,l.state_id,l.city_id,l.investor_limit,l.is_active,
           s.name AS state_name,c.name AS city_name
    FROM investor_location_limits l
    JOIN states s ON s.id=l.state_id
    LEFT JOIN cities c ON c.id=l.city_id
    WHERE s.is_active=TRUE AND (c.id IS NULL OR c.is_active=TRUE)
    ORDER BY s.name,c.name NULLS FIRST,l.id
  `)).rows;
  return { ...s, industryLimits: limits, locationLimits };
}

async function updateInvestorSettings(data) {
  const globalLimit=Number(data.globalLimit||0);
  const defaultIndustryLimit=Number(data.defaultIndustryLimit||0);
  const customerIndustryLimit=Number(data.customerIndustryLimit ?? 10);
  const minInvestment=Number(data.minInvestment);
  const maxInvestment=data.maxInvestment === '' || data.maxInvestment == null ? null : Number(data.maxInvestment);
  const cycleDays=data.investmentCycleDays == null ? null : Number(data.investmentCycleDays);
  const revenueShare=data.investorRevenueSharePercent == null ? null : Number(data.investorRevenueSharePercent);
  const autoReinvest=data.autoReinvest == null ? null : Boolean(data.autoReinvest);
  if(!Number.isFinite(minInvestment)||minInvestment<=0)throw Object.assign(new Error('Minimum investment must be greater than zero'),{code:'INVALID_INVESTMENT_CONFIG'});
  if(maxInvestment!==null&&(!Number.isFinite(maxInvestment)||maxInvestment<minInvestment))throw Object.assign(new Error('Maximum investment must be greater than or equal to minimum investment'),{code:'INVALID_INVESTMENT_CONFIG'});
  if(cycleDays!==null&&(!Number.isInteger(cycleDays)||cycleDays<=0||cycleDays>3650))throw Object.assign(new Error('Investment cycle must be between 1 and 3650 days'),{code:'INVALID_INVESTMENT_CONFIG'});
  if(revenueShare!==null&&(!Number.isFinite(revenueShare)||revenueShare<0||revenueShare>100))throw Object.assign(new Error('Investor revenue share must be between 0 and 100%'),{code:'INVALID_INVESTMENT_CONFIG'});
  await pool.query(`
    UPDATE investor_settings
    SET global_limit=$1,default_industry_limit=$2,customer_industry_limit=$3,
        min_investment=$4,max_investment=$5,enabled=$6,is_enabled=$6,
        requires_pro=$7,investment_cycle_days=COALESCE($8,investment_cycle_days),
        auto_reinvest=COALESCE($9,auto_reinvest),
        investor_revenue_share_percent=COALESCE($10,investor_revenue_share_percent),
        updated_at=CURRENT_TIMESTAMP WHERE id=1
  `,[globalLimit,defaultIndustryLimit,customerIndustryLimit,minInvestment,maxInvestment,Boolean(data.enabled),data.requiresPro!==false,cycleDays,autoReinvest,revenueShare]);

  if(Array.isArray(data.industryLimits)){
    const settings=(await pool.query('SELECT investor_revenue_share_percent FROM investor_settings WHERE id=1')).rows[0];
    const share=Number(settings.investor_revenue_share_percent ?? 100);
    for(const x of data.industryLimits){
      const industryId=Number(x.industryId??x.id);
      const limit=Number(x.limit??x.investor_limit??defaultIndustryLimit??0);
      const active=x.isActive===undefined?Boolean(x.is_active!==false):Boolean(x.isActive);
      await pool.query(`INSERT INTO investor_industry_limits(industry_id,investor_limit,is_active)
        VALUES($1,$2,$3)
        ON CONFLICT(industry_id) DO UPDATE SET investor_limit=EXCLUDED.investor_limit,is_active=EXCLUDED.is_active,updated_at=CURRENT_TIMESTAMP`,[industryId,limit,active]);
      if(active){
        const maximum=maxInvestment===null?Math.max(minInvestment,limit||globalLimit||minInvestment):maxInvestment;
        await pool.query(`INSERT INTO investment_industry_rules(industry_id,minimum_amount,maximum_amount,total_capacity,investor_revenue_share_percent,is_active)
          VALUES($1,$2,$3,$4,$5,TRUE)
          ON CONFLICT(industry_id) DO UPDATE SET minimum_amount=EXCLUDED.minimum_amount,maximum_amount=EXCLUDED.maximum_amount,total_capacity=EXCLUDED.total_capacity,investor_revenue_share_percent=EXCLUDED.investor_revenue_share_percent,is_active=TRUE,updated_at=CURRENT_TIMESTAMP`,[industryId,minInvestment,maximum,limit||null,share]);
      }else{
        await pool.query('UPDATE investment_industry_rules SET is_active=FALSE,updated_at=CURRENT_TIMESTAMP WHERE industry_id=$1',[industryId]);
      }
    }
  }

  if(Array.isArray(data.locationLimitDeleteIds) && data.locationLimitDeleteIds.length){
    const ids=data.locationLimitDeleteIds.map(Number).filter(Number.isInteger);
    if(ids.length) await pool.query('DELETE FROM investor_location_limits WHERE id=ANY($1::int[])',[ids]);
  }

  if(Array.isArray(data.locationLimits)){
    for(const x of data.locationLimits){
      const id=Number(x.id);
      const stateId=Number(x.stateId??x.state_id);
      const cityId=x.cityId===null||x.cityId===''||x.cityId===undefined?(x.city_id==null?null:Number(x.city_id)):Number(x.cityId);
      const limit=Number(x.limit??x.investor_limit??0);
      const active=x.isActive===undefined?Boolean(x.is_active!==false):Boolean(x.isActive);
      if(!Number.isInteger(stateId)||stateId<=0)throw Object.assign(new Error('A valid state is required for every investor location limit'),{code:'INVALID_LOCATION_CONFIG'});
      if(!Number.isFinite(limit)||limit<0)throw Object.assign(new Error('Investor location limit must be zero or greater'),{code:'INVALID_LOCATION_CONFIG'});
      const state=(await pool.query('SELECT id FROM states WHERE id=$1 AND is_active=TRUE',[stateId])).rows[0];
      if(!state)throw Object.assign(new Error('Selected investor location state is invalid'),{code:'INVALID_LOCATION_CONFIG'});
      if(cityId!==null){
        if(!Number.isInteger(cityId)||cityId<=0)throw Object.assign(new Error('Selected investor location city is invalid'),{code:'INVALID_LOCATION_CONFIG'});
        const city=(await pool.query('SELECT id FROM cities WHERE id=$1 AND state_id=$2 AND is_active=TRUE',[cityId,stateId])).rows[0];
        if(!city)throw Object.assign(new Error('Selected investor location city does not belong to the selected state'),{code:'INVALID_LOCATION_CONFIG'});
      }
      if(Number.isInteger(id)&&id>0){
        const updated=(await pool.query(`UPDATE investor_location_limits SET state_id=$1,city_id=$2,investor_limit=$3,is_active=$4,updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING id`,[stateId,cityId,limit,active,id])).rows[0];
        if(updated) continue;
      }
      await pool.query(`INSERT INTO investor_location_limits(state_id,city_id,investor_limit,is_active)
        VALUES($1,$2,$3,$4)
        ON CONFLICT DO UPDATE SET investor_limit=EXCLUDED.investor_limit,is_active=EXCLUDED.is_active,updated_at=CURRENT_TIMESTAMP`,[stateId,cityId,limit,active]);
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
