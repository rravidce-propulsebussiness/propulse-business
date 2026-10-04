const pool = require('../config/database');

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function calculatePrice(base, months, discount = 0) {
  const raw = Math.max(0, toNumber(base)) * Math.max(1, toNumber(months, 1));
  const pct = Math.min(100, Math.max(0, toNumber(discount)));
  return Number((raw * (1 - pct / 100)).toFixed(2));
}

function safeJson(value, fallback = []) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function normalizePlanType(value, fallback = 'non_pro') {
  const type = String(value || fallback).trim().toLowerCase();
  return ['pro', 'investor', 'non_pro'].includes(type) ? type : fallback;
}

function normalizeEntitlements(items, months = 1) {
  return safeJson(items).map(item => {
    const monthly = Math.max(0, toNumber(item.monthly_quantity ?? item.monthlyLimit ?? item.quantity ?? 0));
    const totalValue = item.period_total_quantity ?? item.periodTotal ?? item.totalLimit;
    const total = totalValue === undefined || totalValue === ''
      ? monthly * Math.max(1, toNumber(months, 1))
      : Math.max(0, toNumber(totalValue));
    return { ...item, quantity: monthly, monthly_quantity: monthly, period_total_quantity: total, complimentary: item.complimentary !== false };
  });
}

function normalizePlanName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

async function getPlans(includeInactive = true) {
  const r = await pool.query(`
    SELECT id,name,plan_group,plan_type,description,price,duration_days,billing_period,
           billing_months,monthly_base_price,discount_percent,benefits,lead_entitlements,
           add_ons,lead_rollover_enabled,lead_expiry_days,is_active,created_at,updated_at
    FROM membership_plans
    ${includeInactive ? '' : 'WHERE is_active=TRUE'}
    ORDER BY COALESCE(plan_group,name),plan_type,billing_months ASC,id
  `);
  return r.rows;
}

async function createPlan(d) {
  const name = normalizePlanName(d.name);
  if (!name) throw new Error('Plan name is required');
  const months = Math.max(1, Math.round(toNumber(d.billingMonths || d.durationMonths || 1, 1)));
  const base = d.monthlyBasePrice === undefined || d.monthlyBasePrice === '' ? Math.max(0, toNumber(d.price)) : Math.max(0, toNumber(d.monthlyBasePrice));
  const discount = Math.min(100, Math.max(0, toNumber(d.discountPercent)));
  const hasOverride = d.priceOverride !== undefined && d.priceOverride !== '' && Number.isFinite(Number(d.priceOverride));
  const finalPrice = hasOverride ? Math.max(0, toNumber(d.priceOverride)) : calculatePrice(base, months, discount);
  const days = Math.max(1, Math.round(toNumber(d.durationDays || months * 30.4375, 1)));
  const planType = normalizePlanType(d.planType);
  const entitlements = normalizeEntitlements(d.leadEntitlements, months);
  const expiryDays = d.leadExpiryDays === undefined || d.leadExpiryDays === '' || d.leadExpiryDays === null ? null : Math.max(1, Math.round(toNumber(d.leadExpiryDays)));
  const r = await pool.query(`
    INSERT INTO membership_plans(name,plan_group,plan_type,description,price,duration_days,billing_period,billing_months,monthly_base_price,discount_percent,benefits,lead_entitlements,add_ons,lead_rollover_enabled,lead_expiry_days)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    ON CONFLICT (name) DO UPDATE SET
      plan_group=EXCLUDED.plan_group, plan_type=EXCLUDED.plan_type, description=EXCLUDED.description,
      price=EXCLUDED.price, duration_days=EXCLUDED.duration_days, billing_period=EXCLUDED.billing_period,
      billing_months=EXCLUDED.billing_months, monthly_base_price=EXCLUDED.monthly_base_price,
      discount_percent=EXCLUDED.discount_percent, benefits=EXCLUDED.benefits,
      lead_entitlements=EXCLUDED.lead_entitlements, add_ons=EXCLUDED.add_ons,
      lead_rollover_enabled=EXCLUDED.lead_rollover_enabled, lead_expiry_days=EXCLUDED.lead_expiry_days,
      updated_at=CURRENT_TIMESTAMP
    RETURNING *
  `, [name, normalizePlanName(d.planGroup || name), planType, d.description || null, finalPrice, days,
      String(d.billingPeriod || `${months}-month`).trim().slice(0, 40), months, base, discount,
      JSON.stringify(safeJson(d.benefits)), JSON.stringify(entitlements), JSON.stringify(safeJson(d.addOns)),
      d.leadRolloverEnabled !== false, expiryDays]);
  return r.rows[0];
}

async function createPlanBundle(d) {
  const periods = Array.isArray(d.periods) ? d.periods.filter(x => x && x.enabled !== false && Number(x.months) > 0) : [];
  if (!periods.length) { const e=new Error('Enable at least one billing cycle'); e.code='INVALID_MEMBERSHIP_PLAN'; throw e; }
  const planType = normalizePlanType(d.planType, 'pro');
  const planName = normalizePlanName(d.name);
  const groupKey = planName.toLowerCase();
  if (!['grow','scale'].includes(groupKey) || planType !== 'pro') {
    const e=new Error('Membership packages must be GROW or SCALE');
    e.code='INVALID_MEMBERSHIP_PLAN';
    throw e;
  }
  const canonicalName = groupKey === 'scale' ? 'Scale' : 'Grow';
  const rows = [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const period of periods) {
      const months = Math.max(1, Math.round(toNumber(period.months, 1)));
      const label = String(period.label || `${months}-month`).trim().slice(0, 40);
      const p = d.pricing?.[period.key] || {};
      const entitlements = normalizeEntitlements(period.leadEntitlements ?? d.leadEntitlements, months);
      const name = normalizePlanName(`${canonicalName} ${label}`);
      const base = Math.max(0, toNumber(d.monthlyBasePrice));
      const discount = Math.min(100, Math.max(0, toNumber(p.discount)));
      const rawOverride = p.customPrice === true ? p.price : '';
      const priceOverride = rawOverride !== '' && Number.isFinite(Number(rawOverride)) ? Number(rawOverride) : '';
      const finalPrice = priceOverride === '' ? calculatePrice(base, months, discount) : Math.max(0, priceOverride);
      const existing=(await client.query(`
        SELECT id
        FROM membership_plans
        WHERE LOWER(TRIM(COALESCE(plan_group,'')))=$1
          AND plan_type='pro'
          AND billing_months=$2
        ORDER BY id
        LIMIT 1
        FOR UPDATE
      `,[groupKey,months])).rows[0];
      const values=[name,canonicalName,d.description||null,finalPrice,Math.max(1,Math.round(months*30.4375)),label,months,base,discount,
        JSON.stringify(safeJson(d.benefits)),JSON.stringify(entitlements),JSON.stringify(safeJson(d.addOns)),
        d.leadRolloverEnabled!==false,
        d.leadExpiryDays===undefined||d.leadExpiryDays===''||d.leadExpiryDays===null?null:Math.max(1,Math.round(toNumber(d.leadExpiryDays)))];
      let row;
      if(existing){
        row=(await client.query(`
          UPDATE membership_plans
          SET name=$1,plan_group=$2,plan_type='pro',description=$3,price=$4,duration_days=$5,billing_period=$6,billing_months=$7,
              monthly_base_price=$8,discount_percent=$9,benefits=$10,lead_entitlements=$11,add_ons=$12,
              lead_rollover_enabled=$13,lead_expiry_days=$14,is_active=TRUE,updated_at=CURRENT_TIMESTAMP
          WHERE id=$15
          RETURNING *
        `,[...values,existing.id])).rows[0];
      }else{
        row=(await client.query(`
          INSERT INTO membership_plans(name,plan_group,plan_type,description,price,duration_days,billing_period,billing_months,monthly_base_price,discount_percent,benefits,lead_entitlements,add_ons,lead_rollover_enabled,lead_expiry_days,is_active)
          VALUES($1,$2,'pro',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,TRUE)
          RETURNING *
        `,values)).rows[0];
      }
      rows.push(row);
    }
    const activeIds=rows.map(row=>Number(row.id)).filter(Number.isInteger);
    await client.query(`
      UPDATE membership_plans
      SET is_active=FALSE,updated_at=CURRENT_TIMESTAMP
      WHERE LOWER(COALESCE(plan_group,''))=$1
        AND plan_type='pro'
        AND NOT (id = ANY($2::int[]))
    `,[groupKey,activeIds]);
    await client.query('COMMIT');
    return rows;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updatePlan(id, d) {
  const cur = await pool.query('SELECT * FROM membership_plans WHERE id=$1', [id]);
  if (!cur.rows[0]) return null;
  const current = cur.rows[0];
  const months = Math.max(1, Math.round(toNumber(d.billingMonths || d.durationMonths || current.billing_months || 1, 1)));
  const base = d.monthlyBasePrice === undefined || d.monthlyBasePrice === '' ? Math.max(0, toNumber(d.price || current.monthly_base_price || current.price)) : Math.max(0, toNumber(d.monthlyBasePrice));
  const discount = Math.min(100, Math.max(0, toNumber(d.discountPercent)));
  const hasOverride = d.priceOverride !== undefined && d.priceOverride !== '' && Number.isFinite(Number(d.priceOverride));
  const final = hasOverride ? Math.max(0, toNumber(d.priceOverride)) : calculatePrice(base, months, discount);
  const planType = normalizePlanType(d.planType, normalizePlanType(current.plan_type));
  const incomingEntitlements = normalizeEntitlements(d.leadEntitlements, months);
  const entitlements = incomingEntitlements.length ? incomingEntitlements : normalizeEntitlements(current.lead_entitlements, months);
  const expiryDays = d.leadExpiryDays === undefined ? current.lead_expiry_days : (d.leadExpiryDays === '' || d.leadExpiryDays === null ? null : Math.max(1, Math.round(toNumber(d.leadExpiryDays))));
  const r = await pool.query(`
    UPDATE membership_plans SET name=$1,plan_group=$2,plan_type=$3,description=$4,price=$5,duration_days=$6,
      billing_period=$7,billing_months=$8,monthly_base_price=$9,discount_percent=$10,benefits=$11,lead_entitlements=$12,
      add_ons=$13,lead_rollover_enabled=$14,lead_expiry_days=$15,updated_at=CURRENT_TIMESTAMP
    WHERE id=$16 RETURNING *
  `, [normalizePlanName(d.name || current.name), normalizePlanName(d.planGroup || current.plan_group || d.name || current.name), planType,
      d.description === undefined ? current.description : (d.description || null), final, Math.max(1, Math.round(toNumber(d.durationDays || months * 30.4375, 1))),
      String(d.billingPeriod || current.billing_period || `${months}-month`).trim().slice(0, 40), months, base, discount,
      JSON.stringify(safeJson(d.benefits, safeJson(current.benefits))), JSON.stringify(entitlements), JSON.stringify(safeJson(d.addOns, safeJson(current.add_ons))),
      d.leadRolloverEnabled === undefined ? current.lead_rollover_enabled : Boolean(d.leadRolloverEnabled), expiryDays, id]);
  return r.rows[0] || null;
}

async function setPlanStatus(id, active) {
  return (await pool.query('UPDATE membership_plans SET is_active=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',[Boolean(active),id])).rows[0] || null;
}

async function deletePlan(id) {
  return (await pool.query('DELETE FROM membership_plans WHERE id=$1 RETURNING id',[id])).rows[0] || null;
}


function cleanText(value,max=1000){
  const text=String(value??'').trim();
  return text?text.slice(0,max):null;
}

function positiveId(value){
  const n=Number(value);
  return Number.isInteger(n)&&n>0?n:null;
}

function normalizeOfferDate(value){
  if(value===null||value===undefined||String(value).trim()==='')return null;
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))throw Object.assign(new Error('Offer date/time is invalid'),{code:'INVALID_MEMBERSHIP_PRICING_RULE'});
  return date.toISOString();
}

function normalizePricingRuleInput(input={}){
  const planGroup=String(input.planGroup||input.plan_group||'').trim().toLowerCase();
  if(!['grow','scale'].includes(planGroup))throw Object.assign(new Error('Choose GROW or SCALE'),{code:'INVALID_MEMBERSHIP_PRICING_RULE'});
  const audienceScope=String(input.audienceScope||input.audience_scope||'all').trim().toLowerCase();
  if(!['all','specific_users'].includes(audienceScope))throw Object.assign(new Error('Invalid membership audience'),{code:'INVALID_MEMBERSHIP_PRICING_RULE'});
  const verificationScope=String(input.verificationScope||input.verification_scope||'any').trim().toLowerCase();
  if(!['any','verified','unverified'].includes(verificationScope))throw Object.assign(new Error('Invalid verification filter'),{code:'INVALID_MEMBERSHIP_PRICING_RULE'});
  const name=cleanText(input.name,140);
  if(!name)throw Object.assign(new Error('Pricing rule name is required'),{code:'INVALID_MEMBERSHIP_PRICING_RULE'});
  const rawPeriods=Array.isArray(input.periodOverrides)?input.periodOverrides:Array.isArray(input.period_overrides)?input.period_overrides:[];
  const seen=new Set();
  const periodOverrides=rawPeriods.map(item=>{
    const billingMonths=Math.max(1,Math.round(toNumber(item.billingMonths??item.billing_months??item.months,0)));
    if(!billingMonths||seen.has(billingMonths))return null;
    seen.add(billingMonths);
    const price=Number(item.price);
    if(!Number.isFinite(price)||price<0)throw Object.assign(new Error('Each targeted billing cycle needs a valid price'),{code:'INVALID_MEMBERSHIP_PRICING_RULE'});
    const discountPercent=Math.min(100,Math.max(0,toNumber(item.discountPercent??item.discount_percent,0)));
    return{
      billingMonths,
      label:cleanText(item.label,40)||`${billingMonths}-month`,
      enabled:item.enabled!==false,
      price:Number(price.toFixed(2)),
      discountPercent:Number(discountPercent.toFixed(2)),
      leadEntitlements:normalizeEntitlements(item.leadEntitlements??item.lead_entitlements,billingMonths)
    };
  }).filter(Boolean);
  if(!periodOverrides.some(item=>item.enabled!==false))throw Object.assign(new Error('Configure at least one targeted billing cycle'),{code:'INVALID_MEMBERSHIP_PRICING_RULE'});
  const userIds=[...new Set((Array.isArray(input.userIds)?input.userIds:[]).map(Number).filter(id=>Number.isInteger(id)&&id>0))];
  if(audienceScope==='specific_users'&&!userIds.length)throw Object.assign(new Error('Choose at least one business user'),{code:'INVALID_MEMBERSHIP_PRICING_RULE'});
  const validFrom=normalizeOfferDate(input.validFrom??input.valid_from);
  const validUntil=normalizeOfferDate(input.validUntil??input.valid_until);
  if(validFrom&&validUntil&&new Date(validUntil)<=new Date(validFrom)){
    throw Object.assign(new Error('Offer end time must be after the start time'),{code:'INVALID_MEMBERSHIP_PRICING_RULE'});
  }
  const rawNewCustomerDays=input.newCustomerDays??input.new_customer_days;
  const newCustomerDays=rawNewCustomerDays===null||rawNewCustomerDays===undefined||String(rawNewCustomerDays).trim()===''
    ?null
    :Math.round(Number(rawNewCustomerDays));
  if(newCustomerDays!==null&&(!Number.isInteger(newCustomerDays)||newCustomerDays<1||newCustomerDays>365)){
    throw Object.assign(new Error('New-customer eligibility must be between 1 and 365 days'),{code:'INVALID_MEMBERSHIP_PRICING_RULE'});
  }
  return{
    name,
    planGroup,
    audienceScope,
    verificationScope,
    userIds,
    industryId:positiveId(input.industryId??input.industry_id),
    stateId:positiveId(input.stateId??input.state_id),
    cityId:positiveId(input.cityId??input.city_id),
    periodOverrides,
    offerLabel:cleanText(input.offerLabel??input.offer_label,80),
    validFrom,
    validUntil,
    newCustomerDays,
    notes:cleanText(input.notes,3000),
    isActive:input.isActive===undefined?input.is_active!==false:Boolean(input.isActive)
  };
}

async function validatePricingRule(rule,client=pool){
  if(rule.industryId){
    const row=(await client.query('SELECT id FROM industries WHERE id=$1',[rule.industryId])).rows[0];
    if(!row)throw Object.assign(new Error('Selected industry no longer exists'),{code:'INVALID_MEMBERSHIP_PRICING_RULE'});
  }
  if(rule.stateId){
    const row=(await client.query('SELECT id FROM states WHERE id=$1',[rule.stateId])).rows[0];
    if(!row)throw Object.assign(new Error('Selected state no longer exists'),{code:'INVALID_MEMBERSHIP_PRICING_RULE'});
  }
  if(rule.cityId){
    const row=(await client.query('SELECT id,state_id FROM cities WHERE id=$1',[rule.cityId])).rows[0];
    if(!row)throw Object.assign(new Error('Selected city no longer exists'),{code:'INVALID_MEMBERSHIP_PRICING_RULE'});
    if(rule.stateId&&Number(row.state_id)!==Number(rule.stateId))throw Object.assign(new Error('Selected city does not belong to the selected state'),{code:'INVALID_MEMBERSHIP_PRICING_RULE'});
  }
  if(rule.audienceScope==='specific_users'){
    const rows=(await client.query("SELECT id FROM users WHERE id=ANY($1::int[]) AND role='business'",[rule.userIds])).rows.map(row=>Number(row.id));
    if(rows.length!==rule.userIds.length)throw Object.assign(new Error('One or more selected businesses are unavailable'),{code:'INVALID_MEMBERSHIP_PRICING_RULE'});
  }
  const groupPlans=(await client.query(`
    SELECT billing_months FROM membership_plans
    WHERE LOWER(COALESCE(plan_group,''))=$1 AND plan_type='pro'
  `,[rule.planGroup])).rows;
  const allowed=new Set(groupPlans.map(row=>Number(row.billing_months||1)));
  if(!allowed.size)throw Object.assign(new Error(`${rule.planGroup.toUpperCase()} package has no billing cycles yet`),{code:'INVALID_MEMBERSHIP_PRICING_RULE'});
  if(rule.periodOverrides.some(item=>!allowed.has(Number(item.billingMonths)))){
    throw Object.assign(new Error('A targeted cycle no longer exists in this membership package'),{code:'INVALID_MEMBERSHIP_PRICING_RULE'});
  }
  return rule;
}

async function replacePricingRuleUsers(client,ruleId,userIds=[]){
  await client.query('DELETE FROM membership_pricing_rule_users WHERE rule_id=$1',[ruleId]);
  if(!userIds.length)return;
  await client.query(`
    INSERT INTO membership_pricing_rule_users(rule_id,user_id)
    SELECT $1,UNNEST($2::int[])
    ON CONFLICT DO NOTHING
  `,[ruleId,userIds]);
}

async function listPricingRules(){
  const rows=(await pool.query(`
    SELECT r.*,
           i.name AS industry_name,st.name AS state_name,c.name AS city_name,
           COALESCE((
             SELECT json_agg(json_build_object(
               'id',u.id,'name',u.name,'email',u.email,'business_name',bp.business_name,'phone',bp.phone
             ) ORDER BY COALESCE(bp.business_name,u.name),u.id)
             FROM membership_pricing_rule_users ru
             JOIN users u ON u.id=ru.user_id
             LEFT JOIN business_profiles bp ON bp.user_id=u.id
             WHERE ru.rule_id=r.id
           ),'[]'::json) AS selected_users
    FROM membership_pricing_rules r
    LEFT JOIN industries i ON i.id=r.industry_id
    LEFT JOIN states st ON st.id=r.state_id
    LEFT JOIN cities c ON c.id=r.city_id
    ORDER BY r.updated_at DESC,r.id DESC
  `)).rows;
  return rows.map(row=>({...row,period_overrides:safeJson(row.period_overrides)}));
}

async function createPricingRule(input,adminId){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const rule=await validatePricingRule(normalizePricingRuleInput(input),client);
    const inserted=(await client.query(`
      INSERT INTO membership_pricing_rules(
        name,plan_group,audience_scope,verification_scope,industry_id,state_id,city_id,
        period_overrides,offer_label,valid_from,valid_until,new_customer_days,
        notes,is_active,created_by,updated_by
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15)
      RETURNING *
    `,[
      rule.name,rule.planGroup,rule.audienceScope,rule.verificationScope,
      rule.industryId,rule.stateId,rule.cityId,JSON.stringify(rule.periodOverrides),
      rule.offerLabel,rule.validFrom,rule.validUntil,rule.newCustomerDays,
      rule.notes,rule.isActive,adminId||null
    ])).rows[0];
    await replacePricingRuleUsers(client,inserted.id,rule.audienceScope==='specific_users'?rule.userIds:[]);
    await client.query('COMMIT');
    return inserted;
  }catch(error){
    try{await client.query('ROLLBACK')}catch{}
    throw error;
  }finally{client.release()}
}

async function updatePricingRule(ruleId,input,adminId){
  const id=positiveId(ruleId);
  if(!id)throw Object.assign(new Error('Invalid membership pricing rule'),{code:'INVALID_MEMBERSHIP_PRICING_RULE'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const existing=(await client.query('SELECT * FROM membership_pricing_rules WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(!existing)throw Object.assign(new Error('Membership pricing rule not found'),{code:'MEMBERSHIP_PRICING_RULE_NOT_FOUND'});
    const selected=(await client.query('SELECT user_id FROM membership_pricing_rule_users WHERE rule_id=$1 ORDER BY user_id',[id])).rows.map(row=>row.user_id);
    const rule=await validatePricingRule(normalizePricingRuleInput({
      name:input?.name??existing.name,
      planGroup:input?.planGroup??existing.plan_group,
      audienceScope:input?.audienceScope??existing.audience_scope,
      verificationScope:input?.verificationScope??existing.verification_scope,
      userIds:input?.userIds??selected,
      industryId:input?.industryId===undefined?existing.industry_id:input.industryId,
      stateId:input?.stateId===undefined?existing.state_id:input.stateId,
      cityId:input?.cityId===undefined?existing.city_id:input.cityId,
      periodOverrides:input?.periodOverrides??existing.period_overrides,
      offerLabel:input?.offerLabel===undefined?existing.offer_label:input.offerLabel,
      validFrom:input?.validFrom===undefined?existing.valid_from:input.validFrom,
      validUntil:input?.validUntil===undefined?existing.valid_until:input.validUntil,
      newCustomerDays:input?.newCustomerDays===undefined?existing.new_customer_days:input.newCustomerDays,
      notes:input?.notes??existing.notes,
      isActive:input?.isActive===undefined?existing.is_active:input.isActive
    }),client);
    const updated=(await client.query(`
      UPDATE membership_pricing_rules
      SET name=$2,plan_group=$3,audience_scope=$4,verification_scope=$5,
          industry_id=$6,state_id=$7,city_id=$8,period_overrides=$9,
          offer_label=$10,valid_from=$11,valid_until=$12,new_customer_days=$13,
          notes=$14,is_active=$15,updated_by=$16,updated_at=CURRENT_TIMESTAMP
      WHERE id=$1 RETURNING *
    `,[
      id,rule.name,rule.planGroup,rule.audienceScope,rule.verificationScope,
      rule.industryId,rule.stateId,rule.cityId,JSON.stringify(rule.periodOverrides),
      rule.offerLabel,rule.validFrom,rule.validUntil,rule.newCustomerDays,
      rule.notes,rule.isActive,adminId||null
    ])).rows[0];
    await replacePricingRuleUsers(client,id,rule.audienceScope==='specific_users'?rule.userIds:[]);
    await client.query('COMMIT');
    return updated;
  }catch(error){
    try{await client.query('ROLLBACK')}catch{}
    throw error;
  }finally{client.release()}
}

async function deletePricingRule(ruleId){
  const id=positiveId(ruleId);
  if(!id)return null;
  return (await pool.query('DELETE FROM membership_pricing_rules WHERE id=$1 RETURNING id',[id])).rows[0]||null;
}

async function listPricingRuleBusinesses(search=''){
  const values=[];
  const where=["u.role='business'","u.is_active=TRUE"];
  if(String(search).trim()){
    values.push(`%${String(search).trim()}%`);
    where.push(`(u.name ILIKE ${values.length} OR u.email ILIKE ${values.length} OR COALESCE(bp.business_name,'') ILIKE ${values.length} OR COALESCE(bp.phone,'') ILIKE ${values.length})`);
  }
  return (await pool.query(`
    SELECT u.id,u.name,u.email,u.is_active,bp.business_name,bp.phone,
           EXISTS(
             SELECT 1 FROM company_proof_documents cpd
             WHERE cpd.user_id=u.id AND cpd.status='verified'
           ) AS is_verified
    FROM users u
    LEFT JOIN business_profiles bp ON bp.user_id=u.id
    WHERE ${where.join(' AND ')}
    ORDER BY COALESCE(bp.business_name,u.name),u.id
    LIMIT 50
  `,values)).rows;
}

async function matchingPricingRulesForUser(userId,client=pool){
  if(!positiveId(userId))return[];
  const rows=(await client.query(`
    SELECT r.*,
      (
        CASE WHEN r.audience_scope='specific_users' THEN 256 ELSE 0 END +
        CASE WHEN r.new_customer_days IS NOT NULL THEN 128 ELSE 0 END +
        CASE WHEN r.valid_from IS NOT NULL OR r.valid_until IS NOT NULL THEN 64 ELSE 0 END +
        CASE WHEN r.city_id IS NOT NULL THEN 32 ELSE 0 END +
        CASE WHEN r.state_id IS NOT NULL THEN 16 ELSE 0 END +
        CASE WHEN r.industry_id IS NOT NULL THEN 8 ELSE 0 END +
        CASE WHEN r.verification_scope<>'any' THEN 4 ELSE 0 END
      )::int AS specificity
    FROM membership_pricing_rules r
    WHERE r.is_active=TRUE
      AND (r.valid_from IS NULL OR r.valid_from<=CURRENT_TIMESTAMP)
      AND (r.valid_until IS NULL OR r.valid_until>=CURRENT_TIMESTAMP)
      AND (
        r.new_customer_days IS NULL
        OR (
          EXISTS(
            SELECT 1 FROM users offer_user
            WHERE offer_user.id=$1
              AND offer_user.created_at>=CURRENT_TIMESTAMP-(r.new_customer_days*INTERVAL '1 day')
          )
          AND NOT EXISTS(
            SELECT 1 FROM memberships prior_membership
            WHERE prior_membership.user_id=$1
          )
        )
      )
      AND (
        r.audience_scope='all'
        OR EXISTS(
          SELECT 1 FROM membership_pricing_rule_users ru
          WHERE ru.rule_id=r.id AND ru.user_id=$1
        )
      )
      AND (
        r.verification_scope='any'
        OR (r.verification_scope='verified' AND EXISTS(
          SELECT 1 FROM company_proof_documents cpd
          WHERE cpd.user_id=$1 AND cpd.status='verified'
        ))
        OR (r.verification_scope='unverified' AND NOT EXISTS(
          SELECT 1 FROM company_proof_documents cpd
          WHERE cpd.user_id=$1 AND cpd.status='verified'
        ))
      )
      AND (
        r.industry_id IS NULL OR EXISTS(
          SELECT 1 FROM business_profiles bp
          JOIN business_profile_services bps ON bps.business_profile_id=bp.id
          WHERE bp.user_id=$1 AND bps.is_active=TRUE AND bps.industry_id=r.industry_id
        )
      )
      AND (
        r.state_id IS NULL OR EXISTS(
          SELECT 1 FROM business_profiles bp
          JOIN business_profile_locations bpl ON bpl.business_profile_id=bp.id
          WHERE bp.user_id=$1 AND bpl.is_active=TRUE AND bpl.state_id=r.state_id
        )
      )
      AND (
        r.city_id IS NULL OR EXISTS(
          SELECT 1 FROM business_profiles bp
          JOIN business_profile_locations bpl ON bpl.business_profile_id=bp.id
          WHERE bp.user_id=$1 AND bpl.is_active=TRUE AND bpl.city_id=r.city_id
        )
      )
    ORDER BY specificity DESC,r.updated_at DESC,r.id DESC
  `,[userId])).rows;
  return rows.map(row=>({...row,period_overrides:safeJson(row.period_overrides)}));
}

function periodOverrideFor(rule,billingMonths){
  return safeJson(rule?.period_overrides).find(item=>Number(item.billingMonths??item.billing_months??item.months)===Number(billingMonths)&&item.enabled!==false)||null;
}

function applyPricingRule(plan,rule){
  const override=periodOverrideFor(rule,plan.billing_months);
  if(!override)return null;
  const leadEntitlements=Array.isArray(override.leadEntitlements)
    ?normalizeEntitlements(override.leadEntitlements,plan.billing_months)
    :Array.isArray(override.lead_entitlements)
      ?normalizeEntitlements(override.lead_entitlements,plan.billing_months)
      :normalizeEntitlements(plan.lead_entitlements,plan.billing_months);
  const basePrice=Number(plan.price||0);
  const offerPrice=Number(override.price);
  const savings=Math.max(0,Number((basePrice-offerPrice).toFixed(2)));
  const derivedDiscount=basePrice>0?Math.max(0,Math.min(100,Number(((savings/basePrice)*100).toFixed(2)))):0;
  const discountPercent=derivedDiscount;
  return{
    ...plan,
    base_price:basePrice,
    price:offerPrice,
    lead_entitlements:leadEntitlements,
    pricing_rule_id:rule.id,
    pricing_rule_name:rule.name,
    targeted_pricing:true,
    offer_label:rule.offer_label||rule.name,
    offer_discount_percent:discountPercent,
    offer_savings:savings,
    offer_valid_from:rule.valid_from||null,
    offer_valid_until:rule.valid_until||null,
    offer_new_customer_days:rule.new_customer_days||null
  };
}

async function getPlansForUser(userId,client=pool){
  const result=await client.query(`
    SELECT id,name,plan_group,plan_type,description,price,duration_days,billing_period,
           billing_months,monthly_base_price,discount_percent,benefits,lead_entitlements,
           add_ons,lead_rollover_enabled,lead_expiry_days,is_active,created_at,updated_at
    FROM membership_plans
    WHERE is_active=TRUE
    ORDER BY COALESCE(plan_group,name),plan_type,billing_months ASC,id
  `);
  const rules=await matchingPricingRulesForUser(userId,client);
  return result.rows.map(plan=>{
    const group=String(plan.plan_group||'').toLowerCase();
    if(!['grow','scale'].includes(group)||String(plan.plan_type||'').toLowerCase()!=='pro')return plan;
    const rule=rules.find(item=>String(item.plan_group||'').toLowerCase()===group&&periodOverrideFor(item,plan.billing_months));
    return rule?applyPricingRule(plan,rule):{...plan,base_price:Number(plan.price||0),targeted_pricing:false};
  });
}

async function resolvePlanForUser(userId,planId,client=pool){
  const plan=(await client.query(`
    SELECT id,name,plan_group,plan_type,description,price,duration_days,billing_period,
           billing_months,monthly_base_price,discount_percent,benefits,lead_entitlements,
           add_ons,lead_rollover_enabled,lead_expiry_days,is_active
    FROM membership_plans WHERE id=$1
  `,[planId])).rows[0];
  if(!plan||!plan.is_active)return null;
  const group=String(plan.plan_group||'').toLowerCase();
  if(!positiveId(userId)||!['grow','scale'].includes(group)||String(plan.plan_type||'').toLowerCase()!=='pro'){
    return{...plan,base_price:Number(plan.price||0),targeted_pricing:false};
  }
  const rules=await matchingPricingRulesForUser(userId,client);
  const rule=rules.find(item=>String(item.plan_group||'').toLowerCase()===group&&periodOverrideFor(item,plan.billing_months));
  return rule?applyPricingRule(plan,rule):{...plan,base_price:Number(plan.price||0),targeted_pricing:false};
}

module.exports = {
  getPlans,getPlansForUser,resolvePlanForUser,
  createPlan,createPlanBundle,updatePlan,setPlanStatus,deletePlan,calculatePrice,
  listPricingRules,createPricingRule,updatePricingRule,deletePricingRule,listPricingRuleBusinesses,
  normalizePricingRuleInput,matchingPricingRulesForUser
};
