const pool = require('../config/database');
const { isProMember } = require('./membershipAccessService');

function amount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw Object.assign(new Error('Amount must be greater than zero'), { code: 'INVALID_AMOUNT' });
  }
  return number;
}

async function getSettings(client = pool) {
  const result = await client.query('SELECT * FROM investor_settings WHERE id=1');
  return result.rows[0] || {
    is_enabled: false,
    requires_pro: true,
    customer_industry_limit: 0,
    investment_cycle_days: 30,
    auto_reinvest: false,
    investor_revenue_share_percent: 100,
  };
}

async function getRules() {
  return (await pool.query(`SELECT r.*,i.name AS industry_name FROM investment_industry_rules r JOIN industries i ON i.id=r.industry_id WHERE r.is_active=TRUE AND i.is_active=TRUE ORDER BY i.name`)).rows.map((rule) => ({
    ...rule,
    minimum_amount: Number(rule.minimum_amount),
    maximum_amount: Number(rule.maximum_amount),
    total_capacity: rule.total_capacity == null ? null : Number(rule.total_capacity),
    return_percent: 0,
    investor_revenue_share_percent: Number(rule.investor_revenue_share_percent ?? 100),
    maturity_days: Number(rule.maturity_days),
  }));
}

async function getInvestmentAccess(userId) {
  const settings = await getSettings();
  const pro = await isProMember(userId);
  const enabled = Boolean(settings.is_enabled ?? settings.enabled);
  return {
    enabled,
    requiresPro: Boolean(settings.requires_pro),
    isPro: pro,
    canInvest: enabled && (!settings.requires_pro || pro),
    industryLimit: Number(settings.customer_industry_limit) || 0,
    investmentCycleDays: Number(settings.investment_cycle_days) || 30,
    autoReinvest: false,
    reinvestmentMode: 'investor_choice',
    revenueSharePercent: Number(settings.investor_revenue_share_percent ?? 100),
  };
}

async function createInvestment({ userId, industryId, amount: rawAmount }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const settings = await getSettings(client);
    if (!(settings.is_enabled ?? settings.enabled)) throw Object.assign(new Error('Investment is currently disabled'), { code: 'INVESTMENT_DISABLED' });
    if (settings.requires_pro && !await isProMember(userId, client)) throw Object.assign(new Error('Active Pro membership is required to invest'), { code: 'PRO_REQUIRED' });
    const value = amount(rawAmount);
    const rule = (await client.query(`SELECT r.*,i.name AS industry_name FROM investment_industry_rules r JOIN industries i ON i.id=r.industry_id WHERE r.industry_id=$1 AND r.is_active=TRUE AND i.is_active=TRUE FOR UPDATE`, [industryId])).rows[0];
    if (!rule) throw Object.assign(new Error('Investment is not available for this industry'), { code: 'INDUSTRY_UNAVAILABLE' });
    if (value < Number(rule.minimum_amount) || value > Number(rule.maximum_amount)) throw Object.assign(new Error(`Investment must be between ₹${rule.minimum_amount} and ₹${rule.maximum_amount}`), { code: 'AMOUNT_OUT_OF_RANGE' });
    const distinct = (await client.query(`SELECT COUNT(DISTINCT industry_id)::int AS count FROM investments WHERE user_id=$1 AND status IN ('active','matured')`, [userId])).rows[0];
    const already = (await client.query(`SELECT 1 FROM investments WHERE user_id=$1 AND industry_id=$2 AND status IN ('active','matured') LIMIT 1`, [userId, industryId])).rows.length > 0;
    if (!already && Number(settings.customer_industry_limit) > 0 && Number(distinct.count) >= Number(settings.customer_industry_limit)) throw Object.assign(new Error('Your investment industry limit has been reached'), { code: 'INDUSTRY_LIMIT_REACHED' });
    if (rule.total_capacity !== null) {
      const used = Number((await client.query(`SELECT COALESCE(SUM(amount),0) AS total FROM investments WHERE industry_id=$1 AND status IN ('active','matured')`, [industryId])).rows[0].total);
      if (used + value > Number(rule.total_capacity)) throw Object.assign(new Error('Investment capacity for this industry has been reached'), { code: 'CAPACITY_REACHED' });
    }
    const maturityDays = Number(settings.investment_cycle_days || rule.maturity_days || 30);
    const result = await client.query(`INSERT INTO investments(user_id,industry_id,amount,return_percent,expected_return,maturity_days,reinvestment_enabled,starts_at,matures_at) VALUES($1,$2,$3,0,$3,$4,TRUE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+make_interval(days=>$4)) RETURNING *`, [userId, industryId, value, maturityDays]);
    const investment = result.rows[0];
    const wallet = (await client.query(`INSERT INTO wallets(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING id,balance`, [userId])).rows[0];
    const locked = (await client.query('SELECT id,balance FROM wallets WHERE id=$1 FOR UPDATE', [wallet.id])).rows[0];
    const balance = Number(locked.balance);
    if (balance < value) throw Object.assign(new Error('Insufficient wallet balance'), { code: 'INSUFFICIENT_BALANCE' });
    const next = balance - value;
    await client.query('UPDATE wallets SET balance=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2', [next, locked.id]);
    await client.query(`INSERT INTO wallet_transactions(wallet_id,user_id,type,amount,balance_after,reference_type,reference_id,description) VALUES($1,$2,'debit',$3,$4,'investment',$5,'Investment funding')`, [locked.id, userId, value, next, investment.id]);
    await client.query(`INSERT INTO investment_transactions(investment_id,user_id,type,amount,reference_type,reference_id) VALUES($1,$2,'investment',$3,'wallet',$4)`, [investment.id, userId, value, investment.id]);
    await client.query('COMMIT');
    return { ...investment, amount: Number(investment.amount), expected_return: Number(investment.expected_return), return_percent: 0, realized_revenue: 0, payout_amount: 0, reinvestment_available: false };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function getMyInvestments(userId) {
  return (await pool.query(`SELECT x.*,i.name AS industry_name,ri.id AS reinvested_to_id FROM investments x JOIN industries i ON i.id=x.industry_id LEFT JOIN investments ri ON ri.parent_investment_id=x.id WHERE x.user_id=$1 ORDER BY x.created_at DESC,x.id DESC`, [userId])).rows.map((item) => {
    const payout = Number(item.payout_amount || 0);
    const hasChild = Boolean(item.reinvested_to_id);
    return {
      ...item,
      amount: Number(item.amount),
      expected_return: Number(item.expected_return),
      return_percent: 0,
      realized_revenue: Number(item.realized_revenue || 0),
      payout_amount: payout,
      reinvestment_enabled: Boolean(item.reinvestment_enabled),
      parent_investment_id: item.parent_investment_id ? Number(item.parent_investment_id) : null,
      reinvested_to_id: item.reinvested_to_id ? Number(item.reinvested_to_id) : null,
      reinvestment_available: String(item.status).toLowerCase() === 'paid' && payout > 0 && Boolean(item.reinvestment_enabled) && !hasChild,
    };
  });
}

async function adminPayout({ investmentId, adminId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inv = (await client.query('SELECT * FROM investments WHERE id=$1 FOR UPDATE', [investmentId])).rows[0];
    if (!inv) throw Object.assign(new Error('Investment not found'), { code: 'NOT_FOUND' });
    if (inv.status === 'paid') throw Object.assign(new Error('Investment has already been paid'), { code: 'ALREADY_PAID' });
    if (new Date(inv.matures_at) > new Date()) throw Object.assign(new Error('Investment has not matured yet'), { code: 'NOT_MATURED' });
    const revenue = Number((await client.query(`SELECT COALESCE(SUM(allocated_amount),0) AS total FROM investment_revenue_allocations WHERE investment_id=$1`, [inv.id])).rows[0].total || 0);
    const payout = Number(revenue.toFixed(2));
    await client.query(`UPDATE investments SET status='paid',realized_revenue=$1,payout_amount=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2`, [payout, inv.id]);
    const wallet = (await client.query(`INSERT INTO wallets(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING id,balance`, [inv.user_id])).rows[0];
    const locked = (await client.query('SELECT id,balance FROM wallets WHERE id=$1 FOR UPDATE', [wallet.id])).rows[0];
    const next = Number(locked.balance) + payout;
    await client.query('UPDATE wallets SET balance=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2', [next, locked.id]);
    if (payout > 0) {
      await client.query(`INSERT INTO wallet_transactions(wallet_id,user_id,type,amount,balance_after,reference_type,reference_id,description) VALUES($1,$2,'credit',$3,$4,'investment_return',$5,'Realized lead-sale revenue paid')`, [locked.id, inv.user_id, payout, next, inv.id]);
      await client.query(`INSERT INTO investment_transactions(investment_id,user_id,type,amount,reference_type,reference_id) VALUES($1,$2,'return',$3,'admin_payout',$4)`, [inv.id, inv.user_id, payout, adminId]);
    }
    await client.query('COMMIT');
    return { ...inv, status: 'paid', realized_revenue: payout, payout_amount: payout, reinvested_to_id: null, reinvestment_available: payout > 0 && Boolean(inv.reinvestment_enabled) };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function reinvestInvestment({ userId, investmentId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inv = (await client.query('SELECT * FROM investments WHERE id=$1 AND user_id=$2 FOR UPDATE', [investmentId, userId])).rows[0];
    if (!inv) throw Object.assign(new Error('Investment not found'), { code: 'NOT_FOUND' });
    if (String(inv.status).toLowerCase() !== 'paid') throw Object.assign(new Error('Only a settled investment can be reinvested'), { code: 'NOT_SETTLED' });
    if (!Boolean(inv.reinvestment_enabled)) throw Object.assign(new Error('Reinvestment is not available for this investment'), { code: 'REINVESTMENT_DISABLED' });
    // Reinvestment carries the full realized amount from the settled cycle.
// It is not subject to the normal minimum investment amount.
const reinvestAmount = Number(Number(inv.payout_amount || 0).toFixed(2));
    if (reinvestAmount <= 0) throw Object.assign(new Error('There is no realized amount available to reinvest'), { code: 'NO_REALIZED_AMOUNT' });
    const existing = (await client.query('SELECT id FROM investments WHERE parent_investment_id=$1 LIMIT 1', [inv.id])).rows[0];
    if (existing) throw Object.assign(new Error('This investment has already been reinvested'), { code: 'REINVESTMENT_EXISTS', childId: existing.id });
    const rule = (await client.query(`SELECT * FROM investment_industry_rules WHERE industry_id=$1 AND is_active=TRUE FOR UPDATE`, [inv.industry_id])).rows[0];
    if (!rule) throw Object.assign(new Error('Investment is no longer available for this industry'), { code: 'INDUSTRY_UNAVAILABLE' });
    if (reinvestAmount > Number(rule.maximum_amount)) throw Object.assign(new Error(`Realized amount ₹${reinvestAmount} is above this industry's maximum cycle size of ₹${rule.maximum_amount}`), { code: 'REINVESTMENT_ABOVE_MAXIMUM' });
    if (rule.total_capacity !== null) {
      const used = Number((await client.query(`SELECT COALESCE(SUM(amount),0) AS total FROM investments WHERE industry_id=$1 AND status IN ('active','matured')`, [inv.industry_id])).rows[0].total);
      if (used + reinvestAmount > Number(rule.total_capacity)) throw Object.assign(new Error('Investment capacity for this industry has been reached'), { code: 'CAPACITY_REACHED' });
    }
    const wallet = (await client.query(`INSERT INTO wallets(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING id,balance`, [userId])).rows[0];
    const lockedWallet = (await client.query('SELECT id,balance FROM wallets WHERE id=$1 FOR UPDATE', [wallet.id])).rows[0];
    const balance = Number(lockedWallet.balance);
    if (balance < reinvestAmount) throw Object.assign(new Error('The realized payout is no longer available in your wallet. You can only reinvest funds that remain available.'), { code: 'INSUFFICIENT_BALANCE' });
    const settings = await getSettings(client);
    const maturityDays = Number(settings.investment_cycle_days || rule.maturity_days || 30);
    const child = (await client.query(`INSERT INTO investments(user_id,industry_id,amount,return_percent,expected_return,maturity_days,reinvestment_enabled,parent_investment_id,starts_at,matures_at) VALUES($1,$2,$3,0,$3,$4,TRUE,$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+make_interval(days=>$4)) RETURNING *`, [userId, inv.industry_id, reinvestAmount, maturityDays, inv.id])).rows[0];
    const next = balance - reinvestAmount;
    await client.query('UPDATE wallets SET balance=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2', [next, lockedWallet.id]);
    await client.query(`INSERT INTO wallet_transactions(wallet_id,user_id,type,amount,balance_after,reference_type,reference_id,description) VALUES($1,$2,'debit',$3,$4,'investment_reinvestment',$5,'Investor-selected reinvestment of realized proceeds')`, [lockedWallet.id, userId, reinvestAmount, next, child.id]);
    await client.query(`INSERT INTO investment_transactions(investment_id,user_id,type,amount,reference_type,reference_id) VALUES($1,$2,'investment',$3,'reinvestment',$4)`, [child.id, userId, reinvestAmount, inv.id]);
    await client.query('COMMIT');
    return { ...child, amount: Number(child.amount), expected_return: Number(child.expected_return), parent_investment_id: inv.id, reinvested_from_id: inv.id, return_percent: 0 };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') throw Object.assign(new Error('This investment has already been reinvested'), { code: 'REINVESTMENT_EXISTS' });
    throw error;
  } finally { client.release(); }
}

async function adminList() {
  return (await pool.query(`SELECT x.*,u.name AS user_name,u.email,i.name AS industry_name,COALESCE(SUM(a.allocated_amount),0) AS realized_revenue FROM investments x JOIN users u ON u.id=x.user_id JOIN industries i ON i.id=x.industry_id LEFT JOIN investment_revenue_allocations a ON a.investment_id=x.id GROUP BY x.id,u.name,u.email,i.name ORDER BY x.created_at DESC,x.id DESC`)).rows.map((item) => ({ ...item, amount: Number(item.amount), realized_revenue: Number(item.realized_revenue || 0), payout_amount: Number(item.payout_amount || 0), return_percent: 0 }));
}

module.exports = { getSettings, getRules, getInvestmentAccess, createInvestment, getMyInvestments, adminPayout, reinvestInvestment, adminList };
