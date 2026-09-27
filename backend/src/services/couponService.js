const pool=require('../config/database');
function fail(message,code='COUPON_INVALID'){throw Object.assign(new Error(message),{code})}
function ids(values){return [...new Set((Array.isArray(values)?values:[]).map(Number).filter(Number.isInteger).filter(x=>x>0))]}
function normalizeCode(code){return String(code||'').trim().toUpperCase()}
function discountFor(coupon,subtotal){const amount=Number(subtotal);let discount=coupon.discount_type==='percent'?amount*Number(coupon.discount_value)/100:Number(coupon.discount_value);if(coupon.max_discount!=null)discount=Math.min(discount,Number(coupon.max_discount));return Number(Math.min(Math.max(discount,0),amount).toFixed(2))}
async function getAdminCoupons({search='',status='all'}={}){const values=[],where=[];if(search.trim()){values.push(`%${search.trim()}%`);where.push(`(c.code ILIKE $${values.length} OR COALESCE(c.description,'') ILIKE $${values.length})`)}if(status==='active')where.push('c.is_active=TRUE');else if(status==='inactive')where.push('c.is_active=FALSE');const base=where.length?`WHERE ${where.join(' AND ')}`:'';return(await pool.query(`SELECT c.*,COALESCE((SELECT COUNT(*) FROM coupon_users cu WHERE cu.coupon_id=c.id),0)::int target_user_count,COALESCE((SELECT COUNT(*) FROM coupon_industries ci WHERE ci.coupon_id=c.id),0)::int target_industry_count,COALESCE((SELECT COUNT(*) FROM coupon_redemptions cr WHERE cr.coupon_id=c.id AND cr.status='redeemed'),0)::int redeemed_count,COALESCE((SELECT string_agg(i.name,', ' ORDER BY i.name) FROM coupon_industries ci JOIN industries i ON i.id=ci.industry_id WHERE ci.coupon_id=c.id),'') target_industries FROM coupons c ${base} ORDER BY c.created_at DESC,c.id DESC`,values)).rows}
async function getAdminCoupon(id){const coupon=(await pool.query('SELECT * FROM coupons WHERE id=$1',[id])).rows[0];if(!coupon)return null;const users=(await pool.query(`SELECT u.id,u.name,u.email FROM coupon_users cu JOIN users u ON u.id=cu.user_id WHERE cu.coupon_id=$1 ORDER BY u.name,u.id`,[id])).rows;const industries=(await pool.query(`SELECT i.id,i.name,i.slug FROM coupon_industries ci JOIN industries i ON i.id=ci.industry_id WHERE ci.coupon_id=$1 ORDER BY i.name,i.id`,[id])).rows;return {...coupon,users,industries}}
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
async function validateMembershipPlanIds(client,planIds=[]){
  if(!planIds.length)return;
  const rows=(await client.query("SELECT id FROM membership_plans WHERE id=ANY($1::int[]) AND LOWER(COALESCE(plan_type,''))='pro'",[planIds])).rows;
  if(rows.length!==planIds.length)fail('One or more selected membership cycles are unavailable','INVALID_COUPON');
}

async function createCoupon(input,adminId){
  const code=normalizeCode(input.code);
  if(!/^[A-Z0-9_-]{3,50}$/.test(code))fail('Coupon code must be 3-50 characters using letters, numbers, _ or -','INVALID_COUPON');
  const type=input.discount_type==='fixed'?'fixed':'percent';
  const value=Number(input.discount_value);
  if(!Number.isFinite(value)||value<=0||(type==='percent'&&value>100))fail('Invalid discount value','INVALID_COUPON');
  const min=Math.max(0,Number(input.min_order_amount||0));
  if(!Number.isFinite(min))fail('Invalid minimum order amount','INVALID_COUPON');
  const max=optionalPositive(input.max_discount,'maximum discount');
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
        purchase_types,membership_plan_ids
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb)
      RETURNING *
    `,[
      code,input.description||null,type,value,max,min,usage,perUser,
      window.startsAt,window.expiresAt,input.is_active!==false,adminId,
      JSON.stringify(purchaseTypes),JSON.stringify(planIds)
    ])).rows[0];
    for(const userId of userIds)await client.query('INSERT INTO coupon_users(coupon_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[row.id,userId]);
    for(const industryId of industryIds)await client.query('INSERT INTO coupon_industries(coupon_id,industry_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[row.id,industryId]);
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
  const type=input.discount_type==='fixed'||input.discount_type==='percent'?input.discount_type:existing.discount_type;
  const value=input.discount_value==null?Number(existing.discount_value):Number(input.discount_value);
  if(!Number.isFinite(value)||value<=0||(type==='percent'&&value>100))fail('Invalid discount value','INVALID_COUPON');
  const max=input.max_discount===undefined?existing.max_discount:optionalPositive(input.max_discount,'maximum discount');
  const min=input.min_order_amount===undefined?Number(existing.min_order_amount||0):Math.max(0,Number(input.min_order_amount||0));
  if(!Number.isFinite(min))fail('Invalid minimum order amount','INVALID_COUPON');
  const usage=input.usage_limit===undefined?existing.usage_limit:optionalPositive(input.usage_limit,'usage limit',{integer:true});
  const perUser=input.per_user_limit===undefined?existing.per_user_limit:optionalPositive(input.per_user_limit,'per-user limit',{integer:true});
  const purchaseTypes=purchaseTypesFrom(input.purchase_types,Array.isArray(existing.purchase_types)?existing.purchase_types:JSON.parse(existing.purchase_types||'[]'));
  const userIds=ids(input.user_ids);
  const industryIds=ids(input.industry_ids);
  const rawPlanIds=input.membership_plan_ids===undefined
    ?(Array.isArray(existing.membership_plan_ids)?existing.membership_plan_ids:JSON.parse(existing.membership_plan_ids||'[]'))
    :input.membership_plan_ids;
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
          updated_at=CURRENT_TIMESTAMP
      WHERE id=$14
    `,[
      code,input.description??existing.description,type,value,max,min,usage,perUser,
      window.startsAt,window.expiresAt,
      input.is_active!==undefined?Boolean(input.is_active):existing.is_active,
      JSON.stringify(purchaseTypes),JSON.stringify(planIds),id
    ]);
    if(input.user_ids!==undefined){
      await client.query('DELETE FROM coupon_users WHERE coupon_id=$1',[id]);
      for(const userId of userIds)await client.query('INSERT INTO coupon_users(coupon_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,userId]);
    }
    if(input.industry_ids!==undefined){
      await client.query('DELETE FROM coupon_industries WHERE coupon_id=$1',[id]);
      for(const industryId of industryIds)await client.query('INSERT INTO coupon_industries(coupon_id,industry_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,industryId]);
    }
    await client.query('COMMIT');
    return getAdminCoupon(id);
  }catch(e){
    try{await client.query('ROLLBACK')}catch{}
    if(e.code==='23505')fail('A coupon with this code already exists','DUPLICATE_COUPON');
    throw e;
  }finally{client.release()}
}
async function setCouponActive(id,isActive){const r=await pool.query('UPDATE coupons SET is_active=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',[Boolean(isActive),id]);if(!r.rows[0])fail('Coupon not found','NOT_FOUND');return r.rows[0]}
async function deleteCoupon(id){const client=await pool.connect();try{await client.query('BEGIN');const exists=(await client.query('SELECT id FROM coupons WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!exists)fail('Coupon not found','NOT_FOUND');const redemptions=(await client.query("SELECT COUNT(*)::int count FROM coupon_redemptions WHERE coupon_id=$1",[id])).rows[0].count;if(Number(redemptions)>0)fail('This coupon has redemption history and cannot be deleted. Deactivate it instead.','COUPON_HAS_REDEMPTIONS');await client.query('DELETE FROM coupons WHERE id=$1',[id]);await client.query('COMMIT');return{id:Number(id)}}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}
async function validateForUser({client=pool,userId,code,subtotal,purchaseType,industryId=null,membershipPlanId=null}){const normalized=normalizeCode(code);if(!normalized)return null;const amount=Number(subtotal);if(!Number.isFinite(amount)||amount<0)fail('Invalid purchase amount','INVALID_AMOUNT');const db=client||pool;const coupon=(await db.query('SELECT * FROM coupons WHERE UPPER(code)=UPPER($1) FOR UPDATE',[normalized])).rows[0];if(!coupon)fail('Coupon code not found','COUPON_NOT_FOUND');const now=new Date();if(!coupon.is_active)fail('This coupon is inactive','COUPON_INACTIVE');if(coupon.starts_at&&new Date(coupon.starts_at)>now)fail('This coupon is not active yet','COUPON_NOT_STARTED');if(coupon.expires_at&&new Date(coupon.expires_at)<=now)fail('This coupon has expired','COUPON_EXPIRED');if(Number(coupon.min_order_amount)>amount)fail(`Minimum order amount is ₹${Number(coupon.min_order_amount).toFixed(2)}`,'MIN_ORDER');const purchaseTypes=Array.isArray(coupon.purchase_types)?coupon.purchase_types:JSON.parse(coupon.purchase_types||'[]');if(purchaseType&&!purchaseTypes.includes(purchaseType))fail('This coupon does not apply to this purchase','PURCHASE_NOT_ELIGIBLE');const planIds=Array.isArray(coupon.membership_plan_ids)?coupon.membership_plan_ids:JSON.parse(coupon.membership_plan_ids||'[]');if(membershipPlanId&&planIds.length&&!planIds.includes(Number(membershipPlanId)))fail('This coupon does not apply to this membership plan','PLAN_NOT_ELIGIBLE');const targetUser=(await db.query('SELECT 1 FROM coupon_users WHERE coupon_id=$1 AND user_id=$2',[coupon.id,userId])).rowCount;const targetUserCount=(await db.query('SELECT COUNT(*)::int count FROM coupon_users WHERE coupon_id=$1',[coupon.id])).rows[0].count;if(Number(targetUserCount)>0&&!targetUser)fail('This coupon is restricted to specified users','USER_NOT_ELIGIBLE');const targetIndustryCount=(await db.query('SELECT COUNT(*)::int count FROM coupon_industries WHERE coupon_id=$1',[coupon.id])).rows[0].count;let targetIndustry=0;if(Number(targetIndustryCount)>0){if(industryId){targetIndustry=(await db.query('SELECT 1 FROM coupon_industries WHERE coupon_id=$1 AND industry_id=$2',[coupon.id,industryId])).rowCount}else{targetIndustry=(await db.query(`
  SELECT 1
  FROM coupon_industries ci
  JOIN business_profiles bp ON bp.user_id=$2
  JOIN business_profile_services bps ON bps.business_profile_id=bp.id AND bps.is_active=TRUE
  WHERE ci.coupon_id=$1 AND ci.industry_id=bps.industry_id
  LIMIT 1
`,[coupon.id,userId])).rowCount}if(!targetIndustry)fail('This coupon is restricted to specified industries','INDUSTRY_NOT_ELIGIBLE');}if(coupon.usage_limit!=null){const activeUses=(await db.query(`SELECT COUNT(*)::int count FROM coupon_redemptions WHERE coupon_id=$1 AND status IN ('reserved','redeemed')`,[coupon.id])).rows[0].count;if(Number(activeUses)>=Number(coupon.usage_limit))fail('This coupon has reached its usage limit','USAGE_LIMIT')}const userUses=(await db.query(`SELECT COUNT(*)::int count FROM coupon_redemptions WHERE coupon_id=$1 AND user_id=$2 AND status IN ('reserved','redeemed')`,[coupon.id,userId])).rows[0].count;if(coupon.per_user_limit!=null&&Number(userUses)>=Number(coupon.per_user_limit))fail('You have reached this coupon usage limit','USER_USAGE_LIMIT');const discount=discountFor(coupon,amount);return{coupon,discountAmount:discount,finalAmount:Number((amount-discount).toFixed(2))}}
async function reserveRedemption(client,{couponId,userId,paymentId,purchaseType,purchaseId,discountAmount}){const existing=(await client.query('SELECT id,status FROM coupon_redemptions WHERE payment_id=$1 FOR UPDATE',[paymentId])).rows[0];if(existing)return existing;return(await client.query(`INSERT INTO coupon_redemptions(coupon_id,user_id,payment_id,purchase_type,purchase_id,discount_amount,status) VALUES($1,$2,$3,$4,$5,$6,'reserved') RETURNING *`,[couponId,userId,paymentId,purchaseType,purchaseId,discountAmount])).rows[0]}
async function redeemForPayment(client,paymentId){const row=(await client.query('SELECT * FROM coupon_redemptions WHERE payment_id=$1 FOR UPDATE',[paymentId])).rows[0];if(!row||row.status==='redeemed')return row||null;if(row.status!=='reserved')fail('Coupon redemption is not active','COUPON_REDEMPTION_INVALID');await client.query(`UPDATE coupons SET used_count=used_count+1,updated_at=CURRENT_TIMESTAMP WHERE id=$1`,[row.coupon_id]);return(await client.query(`UPDATE coupon_redemptions SET status='redeemed',redeemed_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,[row.id])).rows[0]}
async function releaseForPayment(client,paymentId){const row=(await client.query('SELECT * FROM coupon_redemptions WHERE payment_id=$1 FOR UPDATE',[paymentId])).rows[0];if(!row||row.status==='released')return row||null;if(row.status==='redeemed')await client.query('UPDATE coupons SET used_count=GREATEST(0,used_count-1),updated_at=CURRENT_TIMESTAMP WHERE id=$1',[row.coupon_id]);if(!['reserved','redeemed'].includes(row.status))return row;return(await client.query(`UPDATE coupon_redemptions SET status='released',released_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,[row.id])).rows[0]}
module.exports={getAdminCoupons,getAdminCoupon,createCoupon,updateCoupon,setCouponActive,deleteCoupon,validateForUser,reserveRedemption,redeemForPayment,releaseForPayment};