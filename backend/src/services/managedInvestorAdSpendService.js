const pool = require('../config/database');
const ledger = require('./investorFinancialLedgerService');

const OPEN_CYCLE_STATUSES = ['ACTIVE','EXIT_REQUESTED','WAITING_FOR_LEADS'];

async function getCurrentCycle(client, userId) {
  return (await client.query(`SELECT id,status FROM investment_cycles WHERE user_id=$1 AND status = ANY($2::varchar[]) ORDER BY id DESC LIMIT 1 FOR UPDATE`, [Number(userId), OPEN_CYCLE_STATUSES])).rows[0] || null;
}

async function getAvailableForAds(client, userId, cycleId = null) {
  const summary = await ledger.getInvestorFinancialSummary(userId, client, cycleId);
  return {
    capital: summary.capital,
    spent: summary.ad_spent,
    reinvestable: summary.auto_invest_earnings,
    paid: summary.settled_non_auto_earnings,
    available: summary.available_for_ads,
  };
}

async function recordSpend({ userId, amount, platform, campaign, spendDate, reference, notes, adminId }) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw Object.assign(new Error('Ad spend amount must be greater than zero'), { code:'INVALID_SPEND_AMOUNT' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ledger.lockInvestorFinancials(client, userId);
    const cycle = await getCurrentCycle(client, userId);
    if (!cycle) throw Object.assign(new Error('No active investment cycle is available for advertising spend'), { code:'NO_ACTIVE_INVESTMENT' });
    const available = await getAvailableForAds(client, userId, Number(cycle.id));
    if (value > available.available + 1e-6) throw Object.assign(new Error(`Ad spend exceeds available funds of ₹${available.available.toFixed(2)}`), { code:'SPEND_EXCEEDS_AVAILABLE_AD_FUNDS' });
    const investment = (await client.query(`SELECT id FROM investments WHERE user_id=$1 AND cycle_id=$2 AND status IN ('active','matured') ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE`, [Number(userId), Number(cycle.id)])).rows[0];
    if (!investment) throw Object.assign(new Error('No active investment is available for advertising spend'), { code:'NO_ACTIVE_INVESTMENT' });
    const allocation = (await client.query(`INSERT INTO investment_ad_allocations(investment_id,amount,status,created_by) VALUES($1,$2,'spending',$3) RETURNING id,amount,status`, [Number(investment.id), value, Number(adminId)])).rows[0];
    const spend = (await client.query(`INSERT INTO investment_ad_spends(investment_id,allocation_id,amount,platform,campaign,spend_date,reference,notes,created_by) VALUES($1,$2,$3,$4,$5,COALESCE($6::timestamp,CURRENT_TIMESTAMP),$7,$8,$9) RETURNING *`, [Number(investment.id), Number(allocation.id), value, String(platform || '').trim() || null, String(campaign || '').trim() || null, spendDate ? String(spendDate) : null, String(reference || '').trim() || null, String(notes || '').trim() || null, Number(adminId)])).rows[0];
    await client.query(`UPDATE investment_ad_allocations SET status='spent',updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [Number(allocation.id)]);
    await client.query(`UPDATE investments SET amount_in_ads=0,ad_spend_status='spent',updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [Number(investment.id)]);
    const after = await getAvailableForAds(client, userId, Number(cycle.id));
    await client.query('COMMIT');
    return {...spend,amount:Number(spend.amount),investment_id:Number(investment.id),allocation_id:Number(allocation.id),cycle_id:Number(cycle.id),total_spent:Number(after.spent.toFixed(2)),available_for_ads:Number(after.available.toFixed(2)),capital:Number(after.capital.toFixed(2)),reinvestable_earnings:Number(after.reinvestable.toFixed(2))};
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function recordSpendForInvestment({ investmentId, amount, platform, campaign, spendDate, reference, notes, adminId }) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw Object.assign(new Error('Ad spend amount must be greater than zero'), { code:'INVALID_SPEND_AMOUNT' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const investment = (await client.query(`SELECT id,user_id,cycle_id,status FROM investments WHERE id=$1 FOR UPDATE`, [Number(investmentId)])).rows[0];
    if (!investment) throw Object.assign(new Error('Investment not found'), { code:'NOT_FOUND' });
    if (!['active','matured'].includes(String(investment.status))) throw Object.assign(new Error('Only active or matured investments can fund advertising spend'), { code:'NO_ACTIVE_INVESTMENT' });
    if (!investment.cycle_id) throw Object.assign(new Error('Investment is not assigned to an investment cycle'), { code:'NO_ACTIVE_INVESTMENT' });
    const cycle = (await client.query(`SELECT id,status FROM investment_cycles WHERE id=$1 AND user_id=$2 FOR UPDATE`, [Number(investment.cycle_id), Number(investment.user_id)])).rows[0];
    if (!cycle || !OPEN_CYCLE_STATUSES.includes(String(cycle.status).toUpperCase())) throw Object.assign(new Error('Investment cycle is not active for advertising spend'), { code:'NO_ACTIVE_INVESTMENT' });
    await ledger.lockInvestorFinancials(client, Number(investment.user_id));
    const available = await getAvailableForAds(client, Number(investment.user_id), Number(investment.cycle_id));
    if (value > available.available + 1e-6) throw Object.assign(new Error(`Ad spend exceeds available funds of ₹${available.available.toFixed(2)}`), { code:'SPEND_EXCEEDS_AVAILABLE_AD_FUNDS' });
    const allocation = (await client.query(`INSERT INTO investment_ad_allocations(investment_id,amount,status,created_by) VALUES($1,$2,'spending',$3) RETURNING id,amount,status`, [Number(investment.id), value, Number(adminId)])).rows[0];
    const spend = (await client.query(`INSERT INTO investment_ad_spends(investment_id,allocation_id,amount,platform,campaign,spend_date,reference,notes,created_by) VALUES($1,$2,$3,$4,$5,COALESCE($6::timestamp,CURRENT_TIMESTAMP),$7,$8,$9) RETURNING *`, [Number(investment.id), Number(allocation.id), value, String(platform || '').trim() || null, String(campaign || '').trim() || null, spendDate ? String(spendDate) : null, String(reference || '').trim() || null, String(notes || '').trim() || null, Number(adminId)])).rows[0];
    await client.query(`UPDATE investment_ad_allocations SET status='spent',updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [Number(allocation.id)]);
    await client.query(`UPDATE investments SET amount_in_ads=0,ad_spend_status='spent',updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [Number(investment.id)]);
    const after = await getAvailableForAds(client, Number(investment.user_id), Number(investment.cycle_id));
    await client.query('COMMIT');
    return {...spend,amount:Number(spend.amount),investment_id:Number(investment.id),allocation_id:Number(allocation.id),cycle_id:Number(investment.cycle_id),total_spent:Number(after.spent.toFixed(2)),available_for_ads:Number(after.available.toFixed(2)),capital:Number(after.capital.toFixed(2)),reinvestable_earnings:Number(after.reinvestable.toFixed(2))};
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

module.exports = { getAvailableForAds, recordSpend, recordSpendForInvestment };
