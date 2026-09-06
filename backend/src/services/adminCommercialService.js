const pool = require('../config/database');

async function getInvestorSettings() {
  const s = (await pool.query('SELECT * FROM investor_settings WHERE id=1')).rows[0];
  const rows = (await pool.query(`
    SELECT i.id AS industry_id,i.name AS industry_name,
           iil.is_active AS industry_active,
           l.id,l.state_id,l.city_id,l.investor_limit,l.is_active,
           st.name AS state_name,c.name AS city_name
    FROM industries i
    LEFT JOIN investor_industry_limits iil ON iil.industry_id=i.id
    LEFT JOIN investor_industry_location_limits l ON l.industry_id=i.id
    LEFT JOIN states st ON st.id=l.state_id
    LEFT JOIN cities c ON c.id=l.city_id
    WHERE i.is_active=TRUE
      AND (l.id IS NULL OR (st.is_active=TRUE AND (c.id IS NULL OR c.is_active=TRUE)))
    ORDER BY i.name,st.name,c.name NULLS FIRST,l.id
  `)).rows;

  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.industry_id)) {
      map.set(row.industry_id, {
        id: row.industry_id,
        name: row.industry_name,
        is_active: row.industry_active !== false,
        locations: [],
      });
    }
    if (row.id) map.get(row.industry_id).locations.push({
      id: row.id,
      state_id: row.state_id,
      city_id: row.city_id,
      state_name: row.state_name,
      city_name: row.city_name,
      investor_limit: Number(row.investor_limit || 0),
      is_active: row.is_active !== false,
    });
  }

  return { ...s, industryLimits: Array.from(map.values()), locationLimits: [] };
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
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const seenIndustries=new Set();
      for(const industry of data.industryLimits){
        const industryId=Number(industry.industryId??industry.id);
        const active=industry.isActive===undefined?Boolean(industry.is_active!==false):Boolean(industry.isActive);
        if(!Number.isInteger(industryId)||industryId<=0)throw Object.assign(new Error('A valid industry is required for every investor limit group'),{code:'INVALID_INDUSTRY_LOCATION_CONFIG'});
        const industryExists=(await client.query('SELECT id FROM industries WHERE id=$1 AND is_active=TRUE',[industryId])).rows[0];
        if(!industryExists)throw Object.assign(new Error('Selected investor industry is invalid'),{code:'INVALID_INDUSTRY_LOCATION_CONFIG'});
        seenIndustries.add(industryId);

        await client.query(`INSERT INTO investor_industry_limits(industry_id,investor_limit,is_active)
          VALUES($1,0,$2)
          ON CONFLICT(industry_id) DO UPDATE SET is_active=EXCLUDED.is_active,updated_at=CURRENT_TIMESTAMP`,[industryId,active]);
        await client.query('DELETE FROM investor_industry_location_limits WHERE industry_id=$1',[industryId]);

        const locations=Array.isArray(industry.locations)?industry.locations:[];
        let aggregate=0;
        for(const location of locations){
          const stateId=Number(location.stateId??location.state_id);
          const cityRaw=location.cityId??location.city_id;
          const cityId=cityRaw===null||cityRaw===''||cityRaw===undefined?null:Number(cityRaw);
          const limit=Number(location.limit??location.investor_limit??0);
          const locationActive=location.isActive===undefined?Boolean(location.is_active!==false):Boolean(location.isActive);
          if(!Number.isInteger(stateId)||stateId<=0)throw Object.assign(new Error('A valid state is required for every investor location'),{code:'INVALID_INDUSTRY_LOCATION_CONFIG'});
          if(!Number.isFinite(limit)||limit<0)throw Object.assign(new Error('Investor location limit must be zero or greater'),{code:'INVALID_INDUSTRY_LOCATION_CONFIG'});
          const state=(await client.query('SELECT id FROM states WHERE id=$1 AND is_active=TRUE',[stateId])).rows[0];
          if(!state)throw Object.assign(new Error('Selected investor location state is invalid'),{code:'INVALID_INDUSTRY_LOCATION_CONFIG'});
          if(cityId!==null){
            if(!Number.isInteger(cityId)||cityId<=0)throw Object.assign(new Error('Selected investor location city is invalid'),{code:'INVALID_INDUSTRY_LOCATION_CONFIG'});
            const city=(await client.query('SELECT id FROM cities WHERE id=$1 AND state_id=$2 AND is_active=TRUE',[cityId,stateId])).rows[0];
            if(!city)throw Object.assign(new Error('Selected investor location city does not belong to the selected state'),{code:'INVALID_INDUSTRY_LOCATION_CONFIG'});
          }
          aggregate+=limit;
          await client.query(`INSERT INTO investor_industry_location_limits(industry_id,state_id,city_id,investor_limit,is_active)
            VALUES($1,$2,$3,$4,$5)
            ON CONFLICT (industry_id,state_id,COALESCE(city_id,0)) DO UPDATE SET investor_limit=EXCLUDED.investor_limit,is_active=EXCLUDED.is_active,updated_at=CURRENT_TIMESTAMP`,[industryId,stateId,cityId,limit,locationActive]);
        }
        await client.query('UPDATE investor_industry_limits SET investor_limit=$1 WHERE industry_id=$2',[aggregate,industryId]);

        if(active){
          const maximum=maxInvestment===null?Math.max(minInvestment,globalLimit||minInvestment):maxInvestment;
          await client.query(`INSERT INTO investment_industry_rules(industry_id,minimum_amount,maximum_amount,total_capacity,investor_revenue_share_percent,is_active)
            VALUES($1,$2,$3,NULL,$4,TRUE)
            ON CONFLICT(industry_id) DO UPDATE SET minimum_amount=EXCLUDED.minimum_amount,maximum_amount=EXCLUDED.maximum_amount,total_capacity=NULL,investor_revenue_share_percent=EXCLUDED.investor_revenue_share_percent,is_active=TRUE,updated_at=CURRENT_TIMESTAMP`,[industryId,minInvestment,maximum,share]);
        }else{
          await client.query('UPDATE investment_industry_rules SET is_active=FALSE,updated_at=CURRENT_TIMESTAMP WHERE industry_id=$1',[industryId]);
        }
      }
      if(seenIndustries.size) {
        const ids=Array.from(seenIndustries);
        await client.query('DELETE FROM investor_industry_location_limits WHERE industry_id <> ALL($1::int[])',[ids]);
      }
      await client.query('COMMIT');
    }catch(error){
      await client.query('ROLLBACK');
      throw error;
    }finally{client.release();}
  }

  return getInvestorSettings();
}

async function getCoupons(){return (await pool.query('SELECT * FROM coupons ORDER BY created_at DESC')).rows;}
async function createCoupon(d){const r=await pool.query(`INSERT INTO coupons(code,discount_type,discount_value,max_discount,min_order_amount,usage_limit,starts_at,expires_at,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[String(d.code).trim().toUpperCase(),d.discountType,Number(d.discountValue),d.maxDiscount===''?null:Number(d.maxDiscount),Number(d.minOrderAmount)||0,d.usageLimit===''||d.usageLimit==null?null:Number(d.usageLimit),d.startsAt||null,d.expiresAt||null,d.isActive!==false]);return r.rows[0];}
async function updateCoupon(id,d){const r=await pool.query(`UPDATE coupons SET code=$1,discount_type=$2,discount_value=$3,max_discount=$4,min_order_amount=$5,usage_limit=$6,starts_at=$7,expires_at=$8,is_active=$9,updated_at=CURRENT_TIMESTAMP WHERE id=$10 RETURNING *`,[String(d.code).trim().toUpperCase(),d.discountType,Number(d.discountValue),d.maxDiscount===''?null:Number(d.maxDiscount),Number(d.minOrderAmount)||0,d.usageLimit===''||d.usageLimit==null?null:Number(d.usageLimit),d.startsAt||null,d.expiresAt||null,Boolean(d.isActive),id]);return r.rows[0]||null;}
async function setCouponStatus(id,isActive){return (await pool.query('UPDATE coupons SET is_active=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',[isActive,id])).rows[0]||null;}
async function deleteCoupon(id){return (await pool.query('DELETE FROM coupons WHERE id=$1 RETURNING id',[id])).rows[0]||null;}

module.exports={getInvestorSettings,updateInvestorSettings,getCoupons,createCoupon,updateCoupon,setCouponStatus,deleteCoupon};
