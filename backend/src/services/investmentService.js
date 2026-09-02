const pool=require('../config/database');
const {isProMember}=require('./membershipAccessService');

function amount(v){const n=Number(v);if(!Number.isFinite(n)||n<=0)throw Object.assign(new Error('Amount must be greater than zero'),{code:'INVALID_AMOUNT'});return n;}

async function getSettings(client=pool){
  const r=await client.query('SELECT * FROM investor_settings WHERE id=1');
  return r.rows[0]||{is_enabled:false,requires_pro:true,customer_industry_limit:0};
}

async function getRules(){
  return (await pool.query(`SELECT r.*,i.name AS industry_name FROM investment_industry_rules r JOIN industries i ON i.id=r.industry_id WHERE r.is_active=TRUE AND i.is_active=TRUE ORDER BY i.name`)).rows.map(r=>({...r,minimum_amount:Number(r.minimum_amount),maximum_amount:Number(r.maximum_amount),total_capacity:r.total_capacity==null?null:Number(r.total_capacity),return_percent:Number(r.return_percent)}));
}

async function getInvestmentAccess(userId){
  const settings=await getSettings();
  const pro=await isProMember(userId);
  return {enabled:Boolean(settings.is_enabled),requiresPro:Boolean(settings.requires_pro),isPro:pro,canInvest:Boolean(settings.is_enabled)&&(!settings.requires_pro||pro),industryLimit:Number(settings.customer_industry_limit)||0};
}

async function createInvestment({userId,industryId,amount:rawAmount}){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const settings=await getSettings(client);
    if(!settings.is_enabled)throw Object.assign(new Error('Investment is currently disabled'),{code:'INVESTMENT_DISABLED'});
    if(settings.requires_pro&&!await isProMember(userId,client))throw Object.assign(new Error('Active Pro membership is required to invest'),{code:'PRO_REQUIRED'});
    const value=amount(rawAmount);
    const rule=(await client.query(`SELECT r.*,i.name AS industry_name FROM investment_industry_rules r JOIN industries i ON i.id=r.industry_id WHERE r.industry_id=$1 AND r.is_active=TRUE AND i.is_active=TRUE FOR UPDATE`,[industryId])).rows[0];
    if(!rule)throw Object.assign(new Error('Investment is not available for this industry'),{code:'INDUSTRY_UNAVAILABLE'});
    if(value<Number(rule.minimum_amount)||value>Number(rule.maximum_amount))throw Object.assign(new Error(`Investment must be between ₹${rule.minimum_amount} and ₹${rule.maximum_amount}`),{code:'AMOUNT_OUT_OF_RANGE'});
    const distinct=(await client.query(`SELECT COUNT(DISTINCT industry_id)::int AS count FROM investments WHERE user_id=$1 AND status IN ('active','matured')`,[userId])).rows[0];
    const already=(await client.query(`SELECT 1 FROM investments WHERE user_id=$1 AND industry_id=$2 AND status IN ('active','matured') LIMIT 1`,[userId,industryId])).rows.length>0;
    if(!already&&Number(distinct.count)>=Number(settings.customer_industry_limit))throw Object.assign(new Error('Your investment industry limit has been reached'),{code:'INDUSTRY_LIMIT_REACHED'});
    if(rule.total_capacity!==null){const used=Number((await client.query(`SELECT COALESCE(SUM(amount),0) AS total FROM investments WHERE industry_id=$1 AND status IN ('active','matured')`,[industryId])).rows[0].total);if(used+value>Number(rule.total_capacity))throw Object.assign(new Error('Investment capacity for this industry has been reached'),{code:'CAPACITY_REACHED'});}
    const returnPercent=Number(rule.return_percent);const expected=Number((value*(1+returnPercent/100)).toFixed(2));const maturityDays=Number(rule.maturity_days);const result=await client.query(`INSERT INTO investments(user_id,industry_id,amount,return_percent,expected_return,maturity_days,starts_at,matures_at) VALUES($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+make_interval(days=>$6)) RETURNING *`,[userId,industryId,value,returnPercent,expected,maturityDays]);
    const investment=result.rows[0];
    const wallet=(await client.query(`INSERT INTO wallets(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING id,balance`,[userId])).rows[0];
    const locked=(await client.query('SELECT id,balance FROM wallets WHERE id=$1 FOR UPDATE',[wallet.id])).rows[0];
    const balance=Number(locked.balance);if(balance<value)throw Object.assign(new Error('Insufficient wallet balance'),{code:'INSUFFICIENT_BALANCE'});
    const next=balance-value;await client.query('UPDATE wallets SET balance=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2',[next,locked.id]);
    await client.query(`INSERT INTO wallet_transactions(wallet_id,user_id,type,amount,balance_after,reference_type,reference_id,description) VALUES($1,$2,'debit',$3,$4,'investment',$5,'Investment funding')`,[locked.id,userId,value,next,investment.id]);
    await client.query(`INSERT INTO investment_transactions(investment_id,user_id,type,amount,reference_type,reference_id) VALUES($1,$2,'investment',$3,'wallet',$4)`,[investment.id,userId,value,investment.id]);
    await client.query('COMMIT');
    return {...investment,amount:Number(investment.amount),expected_return:Number(investment.expected_return),return_percent:Number(investment.return_percent)};
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}

async function getMyInvestments(userId){return (await pool.query(`SELECT x.*,i.name AS industry_name FROM investments x JOIN industries i ON i.id=x.industry_id WHERE x.user_id=$1 ORDER BY x.created_at DESC,x.id DESC`,[userId])).rows.map(x=>({...x,amount:Number(x.amount),expected_return:Number(x.expected_return),return_percent:Number(x.return_percent)}));}

async function adminPayout({investmentId,adminId}){
  const client=await pool.connect();
  try{await client.query('BEGIN');const inv=(await client.query('SELECT * FROM investments WHERE id=$1 FOR UPDATE',[investmentId])).rows[0];if(!inv)throw Object.assign(new Error('Investment not found'),{code:'NOT_FOUND'});if(inv.status==='paid')throw Object.assign(new Error('Investment has already been paid'),{code:'ALREADY_PAID'});if(new Date(inv.matures_at)>new Date())throw Object.assign(new Error('Investment has not matured yet'),{code:'NOT_MATURED'});const w=(await client.query(`INSERT INTO wallets(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING id,balance`,[inv.user_id])).rows[0];const locked=(await client.query('SELECT id,balance FROM wallets WHERE id=$1 FOR UPDATE',[w.id])).rows[0];const next=Number(locked.balance)+Number(inv.expected_return);await client.query('UPDATE wallets SET balance=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2',[next,locked.id]);await client.query(`INSERT INTO wallet_transactions(wallet_id,user_id,type,amount,balance_after,reference_type,reference_id,description) VALUES($1,$2,'credit',$3,$4,'investment_return',$5,'Investment return paid')`,[locked.id,inv.user_id,inv.expected_return,next,inv.id]);await client.query(`INSERT INTO investment_transactions(investment_id,user_id,type,amount,reference_type,reference_id) VALUES($1,$2,'return',$3,'admin_payout',$4)`,[inv.id,inv.user_id,inv.expected_return,adminId]);const updated=(await client.query(`UPDATE investments SET status='paid',updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,[inv.id])).rows[0];await client.query('COMMIT');return updated}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}

async function adminList(){return (await pool.query(`SELECT x.*,u.name AS user_name,u.email,i.name AS industry_name FROM investments x JOIN users u ON u.id=x.user_id JOIN industries i ON i.id=x.industry_id ORDER BY x.created_at DESC,x.id DESC`)).rows;}
module.exports={getSettings,getRules,getInvestmentAccess,createInvestment,getMyInvestments,adminPayout,adminList};
