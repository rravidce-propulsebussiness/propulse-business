const pool=require('../config/database');

function fail(message,code='COUPON_INVALID'){throw Object.assign(new Error(message),{code})}
function ids(values){return [...new Set((Array.isArray(values)?values:[]).map(Number).filter(Number.isInteger).filter(x=>x>0))]}
function normalizeCode(code){return String(code||'').trim().toUpperCase()}
function jsonArray(value){if(Array.isArray(value))return value;try{return JSON.parse(value||'[]')}catch{return[]}}
function moneyValue(value){const number=Number(value);return Number.isFinite(number)?Number(number.toFixed(2)):0}

function discountFor(coupon,subtotal){
  if(String(coupon.benefit_type||'discount')!=='discount')return 0;
  const amount=Number(subtotal);
  let discount=coupon.discount_type==='percent'?amount*Number(coupon.discount_value)/100:Number(coupon.discount_value);
  if(coupon.max_discount!=null)discount=Math.min(discount,Number(coupon.max_discount));
  return Number(Math.min(Math.max(discount,0),amount).toFixed(2));
}
function rewardFor(coupon,subtotal){
  const type=String(coupon.benefit_type||'discount');
  const amount=Math.max(0,Number(subtotal)||0);
  if(type==='wallet_bonus'){
    const reward=coupon.reward_value_type==='percent'
      ?amount*Number(coupon.reward_value||0)/100
      :Number(coupon.reward_value||0);
    return{type:'wallet_bonus',amount:moneyValue(Math.max(0,reward)),valueType:coupon.reward_value_type||'fixed',value:Number(coupon.reward_value||0)};
  }
  if(type==='lead_bonus'){
    return{
      type:'lead_bonus',
      leadType:String(coupon.bonus_lead_type||'shared')==='premium'?'premium':'shared',
      quantity:Math.max(0,Number(coupon.bonus_lead_quantity||0)),
      validDays:Math.max(0,Number(coupon.bonus_valid_days||0))
    };
  }
  return null;
}
function benefitSummary(coupon,subtotal=null){
  const type=String(coupon.benefit_type||'discount');
  if(type==='wallet_bonus'){
    const base=subtotal==null?Math.max(0,Number(coupon.min_order_amount||0)):Math.max(0,Number(subtotal)||0);
    const reward=rewardFor(coupon,base);
    return{
      type,
      title:coupon.reward_value_type==='percent'
        ?`${Number(coupon.reward_value||0)}% extra wallet balance`
        :`${moneyValue(coupon.reward_value)} bonus wallet balance`,
      rewardAmount:reward?.amount||0,
      walletCredit:base+(reward?.amount||0)
    };
  }
  if(type==='lead_bonus'){
    const quantity=Math.max(0,Number(coupon.bonus_lead_quantity||0));
    const leadType=String(coupon.bonus_lead_type||'shared')==='premium'?'Premium':'Basic';
    return{type,title:`Get ${quantity} bonus ${leadType} lead${quantity===1?'':'s'}`,quantity,leadType,validDays:Number(coupon.bonus_valid_days||0)};
  }
  return{
    type:'discount',
    title:coupon.discount_type==='percent'?`${Number(coupon.discount_value||0)}% off`:`${moneyValue(coupon.discount_value)} off`
  };
}

async function getAdminCoupons({search='',status='all'}={}){
  const values=[],where=[];
  if(search.trim()){
    values.push(`%${search.trim()}%`);
    where.push(`(c.code ILIKE $${values.length} OR COALESCE(c.description,'') ILIKE $${values.length})`);
  }
  if(status==='active')where.push('c.is_active=TRUE');
  else if(status==='inactive')where.push('c.is_active=FALSE');
  const base=where.length?`WHERE ${where.join(' AND ')}`:'';
  return(await pool.query(`
    SELECT c.*,
      COALESCE((SELECT COUNT(*) FROM coupon_users cu WHERE cu.coupon_id=c.id),0)::int target_user_count,
      COALESCE((SELECT COUNT(*) FROM coupon_industries ci WHERE ci.coupon_id=c.id),0)::int target_industry_count,
      COALESCE((SELECT COUNT(*) FROM coupon_redemptions cr WHERE cr.coupon_id=c.id AND cr.status='redeemed'),0)::int redeemed_count,
      COALESCE((SELECT COUNT(*) FROM coupon_rewards rw WHERE rw.coupon_id=c.id),0)::int reward_count,
      COALESCE((SELECT string_agg(i.name,', ' ORDER BY i.name) FROM coupon_industries ci JOIN industries i ON i.id=ci.industry_id WHERE ci.coupon_id=c.id),'') target_industries
    FROM coupons c ${base}
    ORDER BY c.created_at DESC,c.id DESC
  `,values)).rows;
}
async function getAdminCoupon(id){
  const coupon=(await pool.query('SELECT * FROM coupons WHERE id=$1',[id])).rows[0];
  if(!coupon)return null;
  const users=(await pool.query(`SELECT u.id,u.name,u.email,bp.business_name,bp.phone FROM coupon_users cu JOIN users u ON u.id=cu.user_id LEFT JOIN business_profiles bp ON bp.user_id=u.id WHERE cu.coupon_id=$1 ORDER BY COALESCE(bp.business_name,u.name),u.id`,[id])).rows;
  const industries=(await pool.query(`SELECT i.id,i.name,i.slug FROM coupon_industries ci JOIN industries i ON i.id=ci.industry_id WHERE ci.coupon_id=$1 ORDER BY i.name,i.id`,[id])).rows;
  return {...coupon,users,industries};
}
function couponWindow(startsAt,expiresAt){
  const start=startsAt?new Date(startsAt):null;
  const end=expiresAt?new Date(expiresAt):null;
  if(start&&Number.isNaN(start.getTime()))fail('Invalid coupon start time','INVALID_COUPON');
  if(end&&Number.isNaN(end.getTime()))fail('Invalid coupon expiry time','INVALID_COUPON');
  if(start&&end&&end<=start)fail('Coupon expiry must be after its start time','INVALID_COUPON');
  return{startsAt:start?start.toISOString():null,expiresAt:end?end.toISOString():null};
}
function optionalPositive(value,label,{integer=false}={}){
  if(value===''||value==null)return null;
  const number=Number(value);
  if(!Number.isFinite(number)||number<=0||(integer&&!Number.isInteger(number)))fail(`Invalid ${label}`,'INVALID_COUPON');
  return number;
}
function purchaseTypesFrom(value,fallback=['membership','lead']){
  const types=[...new Set((Array.isArray(value)?value:fallback).filter(x=>['membership','lead','wallet_topup'].includes(x)))];
  if(!types.length)fail('Select at least one purchase type','INVALID_COUPON');
  return types;
}
function benefitFrom(input,existing=null){
  const benefitType=['discount','wallet_bonus','lead_bonus'].includes(input?.benefit_type)
    ?input.benefit_type
    :String(existing?.benefit_type||'discount');
  const discountType=input?.discount_type==='fixed'||input?.discount_type==='percent'
    ?input.discount_type
    :String(existing?.discount_type||'percent');
  const rawDiscount=input?.discount_value===undefined?Number(existing?.discount_value||0):Number(input.discount_value);
  const discountValue=benefitType==='discount'?rawDiscount:0;
  if(benefitType==='discount'&&(!Number.isFinite(discountValue)||discountValue<=0||(discountType==='percent'&&discountValue>100))){
    fail('Invalid discount value','INVALID_COUPON');
  }
  const rewardValueType=input?.reward_value_type==='percent'||input?.reward_value_type==='fixed'
    ?input.reward_value_type
    :String(existing?.reward_value_type||'fixed');
  const rawReward=input?.reward_value===undefined?Number(existing?.reward_value||0):Number(input.reward_value);
  const rewardValue=benefitType==='wallet_bonus'?rawReward:0;
  if(benefitType==='wallet_bonus'&&(!Number.isFinite(rewardValue)||rewardValue<=0||(rewardValueType==='percent'&&rewardValue>1000))){
    fail('Invalid wallet bonus value','INVALID_COUPON');
  }
  const bonusLeadType=String(input?.bonus_lead_type??existing?.bonus_lead_type??'shared')==='premium'?'premium':'shared';
  const rawQuantity=input?.bonus_lead_quantity===undefined?Number(existing?.bonus_lead_quantity||0):Number(input.bonus_lead_quantity);
  const bonusLeadQuantity=benefitType==='lead_bonus'?Math.round(rawQuantity):0;
  if(benefitType==='lead_bonus'&&(!Number.isInteger(bonusLeadQuantity)||bonusLeadQuantity<1||bonusLeadQuantity>1000)){
    fail('Bonus lead quantity must be between 1 and 1000','INVALID_COUPON');
  }
  const rawValidDays=input?.bonus_valid_days===undefined?Number(existing?.bonus_valid_days??30):Number(input.bonus_valid_days);
  const bonusValidDays=Math.round(rawValidDays);
  if(!Number.isInteger(bonusValidDays)||bonusValidDays<0||bonusValidDays>3650)fail('Bonus lead validity must be between 0 and 3650 days','INVALID_COUPON');
  return{benefitType,discountType,discountValue,rewardValueType,rewardValue,bonusLeadType,bonusLeadQuantity,bonusValidDays};
}
async function validateMembershipPlanIds(client,planIds=[]){
  if(!planIds.length)return;
  const rows=(await client.query("SELECT id FROM membership_plans WHERE id=ANY($1::int[]) AND LOWER(COALESCE(plan_type,''))='pro'",[planIds])).rows;
  if(rows.length!==planIds.length)fail('One or more selected membership cycles are unavailable','INVALID_COUPON');
}

async function createCoupon(input,adminId){
  const code=normalizeCode(input.code);
  if(!/^[A-Z0-9_-]{3,50}$/.test(code))fail('Coupon code must be 3-50 characters using letters, numbers, _ or -','INVALID_COUPON');
  const benefit=benefitFrom(input);
  const min=Math.max(0,Number(input.min_order_amount||0));
  if(!Number.isFinite(min))fail('Invalid minimum order amount','INVALID_COUPON');
  const max=benefit.benefitType==='discount'?optionalPositive(input.max_discount,'maximum discount'):null;
  const usage=optionalPositive(input.usage_limit,'usage limit',{integer:true});
  const perUser=optionalPositive(input.per_user_limit,'per-user limit',{integer:true});
  const purchaseTypes=purchaseTypesFrom(input.purchase_types);
  const userIds=ids(input.user_ids);
  const industryIds=ids(input.industry_ids);
  const planIds=purchaseTypes.includes('membership')?ids(input.membership_plan_ids):[];
  const window=couponWindow(input.starts_at,input.expires_at);
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await validateMembershipPlanIds(client,planIds);
    const row=(await client.query(`
      INSERT INTO coupons(
        code,description,discount_type,discount_value,max_discount,min_order_amount,
        usage_limit,per_user_limit,starts_at,expires_at,is_active,created_by,
        purchase_types,membership_plan_ids,benefit_type,reward_value_type,reward_value,
        bonus_lead_type,bonus_lead_quantity,bonus_valid_days,is_public_offer
      )
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15,$16,$17,$18,$19,$20,$21)
      RETURNING *
    `,[
      code,input.description||null,benefit.discountType,benefit.discountValue,max,min,usage,perUser,
      window.startsAt,window.expiresAt,input.is_active!==false,adminId,
      JSON.stringify(purchaseTypes),JSON.stringify(planIds),benefit.benefitType,
      benefit.rewardValueType,benefit.rewardValue,benefit.bonusLeadType,
      benefit.bonusLeadQuantity,benefit.bonusValidDays,input.is_public_offer===true
    ])).rows[0];
    if(userIds.length)await client.query('INSERT INTO coupon_users(coupon_id,user_id) SELECT $1,x FROM UNNEST($2::int[]) AS x ON CONFLICT DO NOTHING',[row.id,userIds]);
    if(industryIds.length)await client.query('INSERT INTO coupon_industries(coupon_id,industry_id) SELECT $1,x FROM UNNEST($2::int[]) AS x ON CONFLICT DO NOTHING',[row.id,industryIds]);
    await client.query('COMMIT');
    return getAdminCoupon(row.id);
  }catch(e){
    try{await client.query('ROLLBACK')}catch{}
    if(e.code==='23505')fail('A coupon with this code already exists','DUPLICATE_COUPON');
    throw e;
  }finally{client.release()}
}

async function updateCoupon(id,input){
  const existing=await getAdminCoupon(id);
  if(!existing)fail('Coupon not found','NOT_FOUND');
  const code=normalizeCode(input.code||existing.code);
  if(!/^[A-Z0-9_-]{3,50}$/.test(code))fail('Coupon code must be 3-50 characters using letters, numbers, _ or -','INVALID_COUPON');
  const benefit=benefitFrom(input,existing);
  const max=benefit.benefitType==='discount'
    ?(input.max_discount===undefined?existing.max_discount:optionalPositive(input.max_discount,'maximum discount'))
    :null;
  const min=input.min_order_amount===undefined?Number(existing.min_order_amount||0):Math.max(0,Number(input.min_order_amount||0));
  if(!Number.isFinite(min))fail('Invalid minimum order amount','INVALID_COUPON');
  const usage=input.usage_limit===undefined?existing.usage_limit:optionalPositive(input.usage_limit,'usage limit',{integer:true});
  const perUser=input.per_user_limit===undefined?existing.per_user_limit:optionalPositive(input.per_user_limit,'per-user limit',{integer:true});
  const purchaseTypes=purchaseTypesFrom(input.purchase_types,jsonArray(existing.purchase_types));
  const userIds=ids(input.user_ids);
  const industryIds=ids(input.industry_ids);
  const rawPlanIds=input.membership_plan_ids===undefined?jsonArray(existing.membership_plan_ids):input.membership_plan_ids;
  const planIds=purchaseTypes.includes('membership')?ids(rawPlanIds):[];
  const window=couponWindow(
    input.starts_at===undefined?existing.starts_at:input.starts_at,
    input.expires_at===undefined?existing.expires_at:input.expires_at
  );
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await validateMembershipPlanIds(client,planIds);
    await client.query(`
      UPDATE coupons
      SET code=$1,description=$2,discount_type=$3,discount_value=$4,max_discount=$5,
          min_order_amount=$6,usage_limit=$7,per_user_limit=$8,starts_at=$9,expires_at=$10,
          is_active=$11,purchase_types=$12::jsonb,membership_plan_ids=$13::jsonb,
          benefit_type=$14,reward_value_type=$15,reward_value=$16,bonus_lead_type=$17,
          bonus_lead_quantity=$18,bonus_valid_days=$19,is_public_offer=$20,
          updated_at=CURRENT_TIMESTAMP
      WHERE id=$21
    `,[
      code,input.description??existing.description,benefit.discountType,benefit.discountValue,max,min,usage,perUser,
      window.startsAt,window.expiresAt,
      input.is_active!==undefined?Boolean(input.is_active):existing.is_active,
      JSON.stringify(purchaseTypes),JSON.stringify(planIds),benefit.benefitType,
      benefit.rewardValueType,benefit.rewardValue,benefit.bonusLeadType,
      benefit.bonusLeadQuantity,benefit.bonusValidDays,
      input.is_public_offer===undefined?Boolean(existing.is_public_offer):Boolean(input.is_public_offer),
      id
    ]);
    if(input.user_ids!==undefined){
      await client.query('DELETE FROM coupon_users WHERE coupon_id=$1',[id]);
      if(userIds.length)await client.query('INSERT INTO coupon_users(coupon_id,user_id) SELECT $1,x FROM UNNEST($2::int[]) AS x ON CONFLICT DO NOTHING',[id,userIds]);
    }
    if(input.industry_ids!==undefined){
      await client.query('DELETE FROM coupon_industries WHERE coupon_id=$1',[id]);
      if(industryIds.length)await client.query('INSERT INTO coupon_industries(coupon_id,industry_id) SELECT $1,x FROM UNNEST($2::int[]) AS x ON CONFLICT DO NOTHING',[id,industryIds]);
    }
    await client.query('COMMIT');
    return getAdminCoupon(id);
  }catch(e){
    try{await client.query('ROLLBACK')}catch{}
    if(e.code==='23505')fail('A coupon with this code already exists','DUPLICATE_COUPON');
    throw e;
  }finally{client.release()}
}

async function setCouponActive(id,isActive){
  const r=await pool.query('UPDATE coupons SET is_active=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',[Boolean(isActive),id]);
  if(!r.rows[0])fail('Coupon not found','NOT_FOUND');
  return r.rows[0];
}
async function deleteCoupon(id){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const exists=(await client.query('SELECT id FROM coupons WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(!exists)fail('Coupon not found','NOT_FOUND');
    const redemptions=(await client.query("SELECT COUNT(*)::int count FROM coupon_redemptions WHERE coupon_id=$1",[id])).rows[0].count;
    if(Number(redemptions)>0)fail('This coupon has redemption history and cannot be deleted. Deactivate it instead.','COUPON_HAS_REDEMPTIONS');
    await client.query('DELETE FROM coupons WHERE id=$1',[id]);
    await client.query('COMMIT');
    return{id:Number(id)};
  }catch(e){
    try{await client.query('ROLLBACK')}catch{}
    throw e;
  }finally{client.release()}
}

async function audienceEligible(db,coupon,userId,{industryId=null}={}){
  const targetUserCount=(await db.query('SELECT COUNT(*)::int count FROM coupon_users WHERE coupon_id=$1',[coupon.id])).rows[0].count;
  if(Number(targetUserCount)>0){
    const targetUser=(await db.query('SELECT 1 FROM coupon_users WHERE coupon_id=$1 AND user_id=$2',[coupon.id,userId])).rowCount;
    if(!targetUser)return false;
  }
  const targetIndustryCount=(await db.query('SELECT COUNT(*)::int count FROM coupon_industries WHERE coupon_id=$1',[coupon.id])).rows[0].count;
  if(Number(targetIndustryCount)>0){
    let targetIndustry=0;
    if(industryId){
      targetIndustry=(await db.query('SELECT 1 FROM coupon_industries WHERE coupon_id=$1 AND industry_id=$2',[coupon.id,industryId])).rowCount;
    }else{
      targetIndustry=(await db.query(`
        SELECT 1
        FROM coupon_industries ci
        JOIN business_profiles bp ON bp.user_id=$2
        JOIN business_profile_services bps ON bps.business_profile_id=bp.id AND bps.is_active=TRUE
        WHERE ci.coupon_id=$1 AND ci.industry_id=bps.industry_id
        LIMIT 1
      `,[coupon.id,userId])).rowCount;
    }
    if(!targetIndustry)return false;
  }
  return true;
}
async function usageEligible(db,coupon,userId){
  if(coupon.usage_limit!=null){
    const activeUses=(await db.query(`SELECT COUNT(*)::int count FROM coupon_redemptions WHERE coupon_id=$1 AND status IN ('reserved','redeemed')`,[coupon.id])).rows[0].count;
    if(Number(activeUses)>=Number(coupon.usage_limit))return false;
  }
  if(coupon.per_user_limit!=null){
    const userUses=(await db.query(`SELECT COUNT(*)::int count FROM coupon_redemptions WHERE coupon_id=$1 AND user_id=$2 AND status IN ('reserved','redeemed')`,[coupon.id,userId])).rows[0].count;
    if(Number(userUses)>=Number(coupon.per_user_limit))return false;
  }
  return true;
}

async function validateForUser({client=pool,userId,code,subtotal,purchaseType,industryId=null,membershipPlanId=null}){
  const normalized=normalizeCode(code);
  if(!normalized)return null;
  const amount=Number(subtotal);
  if(!Number.isFinite(amount)||amount<0)fail('Invalid purchase amount','INVALID_AMOUNT');
  const db=client||pool;
  const coupon=(await db.query('SELECT * FROM coupons WHERE UPPER(code)=UPPER($1) FOR UPDATE',[normalized])).rows[0];
  if(!coupon)fail('Coupon code not found','COUPON_NOT_FOUND');
  const now=new Date();
  if(!coupon.is_active)fail('This coupon is inactive','COUPON_INACTIVE');
  if(coupon.starts_at&&new Date(coupon.starts_at)>now)fail('This coupon is not active yet','COUPON_NOT_STARTED');
  if(coupon.expires_at&&new Date(coupon.expires_at)<=now)fail('This coupon has expired','COUPON_EXPIRED');
  if(Number(coupon.min_order_amount)>amount)fail(`Minimum order amount is ₹${Number(coupon.min_order_amount).toFixed(2)}`,'MIN_ORDER');
  const purchaseTypes=jsonArray(coupon.purchase_types);
  if(purchaseType&&!purchaseTypes.includes(purchaseType))fail('This offer does not apply to this purchase','PURCHASE_NOT_ELIGIBLE');
  const planIds=jsonArray(coupon.membership_plan_ids).map(Number);
  if(membershipPlanId&&planIds.length&&!planIds.includes(Number(membershipPlanId)))fail('This offer does not apply to this membership plan','PLAN_NOT_ELIGIBLE');
  if(!(await audienceEligible(db,coupon,userId,{industryId})))fail('This offer is not available for this account','USER_NOT_ELIGIBLE');
  if(!(await usageEligible(db,coupon,userId))){
    if(coupon.per_user_limit!=null){
      const userUses=(await db.query(`SELECT COUNT(*)::int count FROM coupon_redemptions WHERE coupon_id=$1 AND user_id=$2 AND status IN ('reserved','redeemed')`,[coupon.id,userId])).rows[0].count;
      if(Number(userUses)>=Number(coupon.per_user_limit))fail('You have reached this offer usage limit','USER_USAGE_LIMIT');
    }
    fail('This offer has reached its usage limit','USAGE_LIMIT');
  }
  const discount=discountFor(coupon,amount);
  const reward=rewardFor(coupon,amount);
  return{
    coupon,
    discountAmount:discount,
    finalAmount:Number((amount-discount).toFixed(2)),
    reward,
    benefit:benefitSummary(coupon,amount)
  };
}

async function getPublicOffersForUser({userId,purchaseType,subtotal=null,membershipPlanId=null,industryId=null}){
  if(!['membership','lead','wallet_topup'].includes(purchaseType))return[];
  const normalizedIndustryId=industryId==null||industryId===''?null:Number(industryId);
  const rows=(await pool.query(`
    SELECT c.*
    FROM coupons c
    WHERE c.is_public_offer=TRUE
      AND c.is_active=TRUE
      AND (c.starts_at IS NULL OR c.starts_at<=CURRENT_TIMESTAMP)
      AND (c.expires_at IS NULL OR c.expires_at>CURRENT_TIMESTAMP)
      AND (
        NOT EXISTS(SELECT 1 FROM coupon_users cu WHERE cu.coupon_id=c.id)
        OR EXISTS(SELECT 1 FROM coupon_users cu WHERE cu.coupon_id=c.id AND cu.user_id=$1)
      )
      AND (
        NOT EXISTS(SELECT 1 FROM coupon_industries ci WHERE ci.coupon_id=c.id)
        OR (
          $2::int IS NOT NULL
          AND EXISTS(SELECT 1 FROM coupon_industries ci WHERE ci.coupon_id=c.id AND ci.industry_id=$2)
        )
        OR (
          $2::int IS NULL
          AND EXISTS(
            SELECT 1
            FROM coupon_industries ci
            JOIN business_profiles bp ON bp.user_id=$1
            JOIN business_profile_services bps ON bps.business_profile_id=bp.id AND bps.is_active=TRUE
            WHERE ci.coupon_id=c.id AND ci.industry_id=bps.industry_id
          )
        )
      )
      AND (
        c.usage_limit IS NULL
        OR (SELECT COUNT(*) FROM coupon_redemptions cr WHERE cr.coupon_id=c.id AND cr.status IN ('reserved','redeemed')) < c.usage_limit
      )
      AND (
        c.per_user_limit IS NULL
        OR (SELECT COUNT(*) FROM coupon_redemptions cr WHERE cr.coupon_id=c.id AND cr.user_id=$1 AND cr.status IN ('reserved','redeemed')) < c.per_user_limit
      )
    ORDER BY COALESCE(c.min_order_amount,0) ASC,c.created_at DESC,c.id DESC
  `,[userId,Number.isInteger(normalizedIndustryId)&&normalizedIndustryId>0?normalizedIndustryId:null])).rows;
  const amount=subtotal==null?null:Number(subtotal);
  const offers=[];
  for(const coupon of rows){
    const purchaseTypes=jsonArray(coupon.purchase_types);
    if(!purchaseTypes.includes(purchaseType))continue;
    const planIds=jsonArray(coupon.membership_plan_ids).map(Number);
    if(membershipPlanId&&planIds.length&&!planIds.includes(Number(membershipPlanId)))continue;
    const previewBase=amount!=null&&Number.isFinite(amount)?amount:Number(coupon.min_order_amount||0);
    offers.push({
      id:coupon.id,
      code:coupon.code,
      description:coupon.description||'',
      benefit_type:coupon.benefit_type||'discount',
      discount_type:coupon.discount_type,
      discount_value:Number(coupon.discount_value||0),
      max_discount:coupon.max_discount==null?null:Number(coupon.max_discount),
      min_order_amount:Number(coupon.min_order_amount||0),
      reward_value_type:coupon.reward_value_type||'fixed',
      reward_value:Number(coupon.reward_value||0),
      bonus_lead_type:coupon.bonus_lead_type||'shared',
      bonus_lead_quantity:Number(coupon.bonus_lead_quantity||0),
      bonus_valid_days:Number(coupon.bonus_valid_days||0),
      starts_at:coupon.starts_at,
      expires_at:coupon.expires_at,
      purchase_types:purchaseTypes,
      membership_plan_ids:planIds,
      meets_minimum:amount==null||!Number.isFinite(amount)||amount>=Number(coupon.min_order_amount||0),
      benefit:benefitSummary(coupon,previewBase)
    });
  }
  return offers;
}

async function reserveRedemption(client,{couponId,userId,paymentId,purchaseType,purchaseId,discountAmount}){
  const existing=(await client.query('SELECT id,status FROM coupon_redemptions WHERE payment_id=$1 FOR UPDATE',[paymentId])).rows[0];
  if(existing)return existing;
  return(await client.query(`
    INSERT INTO coupon_redemptions(coupon_id,user_id,payment_id,purchase_type,purchase_id,discount_amount,status)
    VALUES($1,$2,$3,$4,$5,$6,'reserved')
    RETURNING *
  `,[couponId,userId,paymentId,purchaseType,purchaseId,discountAmount])).rows[0];
}
async function redeemForPayment(client,paymentId){
  const row=(await client.query('SELECT * FROM coupon_redemptions WHERE payment_id=$1 FOR UPDATE',[paymentId])).rows[0];
  if(!row||row.status==='redeemed')return row||null;
  if(row.status!=='reserved')fail('Coupon redemption is not active','COUPON_REDEMPTION_INVALID');
  await client.query(`UPDATE coupons SET used_count=used_count+1,updated_at=CURRENT_TIMESTAMP WHERE id=$1`,[row.coupon_id]);
  return(await client.query(`UPDATE coupon_redemptions SET status='redeemed',redeemed_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,[row.id])).rows[0];
}
async function releaseForPayment(client,paymentId){
  const row=(await client.query('SELECT * FROM coupon_redemptions WHERE payment_id=$1 FOR UPDATE',[paymentId])).rows[0];
  if(!row||row.status==='released')return row||null;
  if(row.status==='redeemed')await client.query('UPDATE coupons SET used_count=GREATEST(0,used_count-1),updated_at=CURRENT_TIMESTAMP WHERE id=$1',[row.coupon_id]);
  if(!['reserved','redeemed'].includes(row.status))return row;
  return(await client.query(`UPDATE coupon_redemptions SET status='released',released_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,[row.id])).rows[0];
}

async function applyRewardForPayment(client,paymentId){
  const row=(await client.query(`
    SELECT p.id AS payment_id,p.user_id,p.purchase_type,p.purchase_id,
           COALESCE(p.subtotal_amount,p.amount,0)::numeric AS subtotal_amount,
           p.coupon_id,c.*
    FROM payments p
    JOIN coupons c ON c.id=p.coupon_id
    JOIN coupon_redemptions cr ON cr.payment_id=p.id AND cr.status='redeemed'
    WHERE p.id=$1 AND c.benefit_type IN ('wallet_bonus','lead_bonus')
    FOR UPDATE OF p,c
  `,[paymentId])).rows[0];
  if(!row)return null;
  const reward=rewardFor(row,Number(row.subtotal_amount||0));
  if(!reward||reward.type==='wallet_bonus'&&reward.amount<=0||reward.type==='lead_bonus'&&reward.quantity<=0)return null;

  const existing=(await client.query('SELECT * FROM coupon_rewards WHERE payment_id=$1 FOR UPDATE',[paymentId])).rows[0];
  if(existing)return existing;

  const inserted=(await client.query(`
    INSERT INTO coupon_rewards(coupon_id,user_id,payment_id,reward_type,reward_amount)
    VALUES($1,$2,$3,$4,$5)
    ON CONFLICT(payment_id) DO NOTHING
    RETURNING *
  `,[row.coupon_id,row.user_id,paymentId,reward.type,reward.type==='wallet_bonus'?reward.amount:0])).rows[0];
  if(!inserted)return(await client.query('SELECT * FROM coupon_rewards WHERE payment_id=$1',[paymentId])).rows[0]||null;

  if(reward.type==='wallet_bonus'){
    const wallet=(await client.query(`
      INSERT INTO wallets(user_id) VALUES($1)
      ON CONFLICT(user_id) DO UPDATE SET user_id=EXCLUDED.user_id
      RETURNING id
    `,[row.user_id])).rows[0];
    const locked=(await client.query('SELECT id,balance FROM wallets WHERE id=$1 FOR UPDATE',[wallet.id])).rows[0];
    const next=moneyValue(Number(locked.balance||0)+reward.amount);
    await client.query('UPDATE wallets SET balance=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2',[next,locked.id]);
    await client.query(`
      INSERT INTO wallet_transactions(
        wallet_id,user_id,type,amount,balance_after,reference_type,reference_id,payment_id,description
      )
      VALUES($1,$2,'credit',$3,$4,'promotion',$5,$6,$7)
    `,[locked.id,row.user_id,reward.amount,next,row.coupon_id,paymentId,`Promotion ${row.code}: bonus wallet balance`]);
    return{...inserted,reward_amount:reward.amount,balance_after:next};
  }

  const expiresAt=reward.validDays>0?new Date(Date.now()+reward.validDays*86400000):null;
  const shared=reward.leadType==='shared'?reward.quantity:0;
  const premium=reward.leadType==='premium'?reward.quantity:0;
  const grant=(await client.query(`
    INSERT INTO lead_entitlement_grants(
      user_id,source,shared_quantity,premium_quantity,starts_at,expires_at,
      claim_expiry_days,created_by,notes
    )
    VALUES($1,'promotion',$2,$3,CURRENT_TIMESTAMP,$4,0,NULL,$5)
    RETURNING *
  `,[
    row.user_id,shared,premium,expiresAt,
    `Promotion ${row.code}: ${reward.quantity} bonus ${reward.leadType==='premium'?'Premium':'Basic'} lead credit${reward.quantity===1?'':'s'}`
  ])).rows[0];
  return(await client.query('UPDATE coupon_rewards SET lead_grant_id=$1 WHERE id=$2 RETURNING *',[grant.id,inserted.id])).rows[0];
}

module.exports={
  getAdminCoupons,getAdminCoupon,createCoupon,updateCoupon,setCouponActive,deleteCoupon,
  validateForUser,getPublicOffersForUser,reserveRedemption,redeemForPayment,releaseForPayment,
  applyRewardForPayment,benefitSummary
};
