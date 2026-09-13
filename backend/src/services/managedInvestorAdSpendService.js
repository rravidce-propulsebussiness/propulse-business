const pool = require('../config/database');

async function getAvailableForAds(client, userId) {
  const row = (await client.query(`
    SELECT
      COALESCE((SELECT SUM(i.amount) FROM investments i WHERE i.user_id=$1 AND i.status IN ('active','matured')),0) AS capital,
      COALESCE((SELECT SUM(s.amount) FROM investment_ad_spends s JOIN investments i ON i.id=s.investment_id WHERE i.user_id=$1 AND i.status <> 'cancelled'),0) AS spent,
      COALESCE((SELECT SUM(a.allocated_amount) FROM investment_revenue_allocations a JOIN investments i ON i.id=a.investment_id WHERE i.user_id=$1 AND i.status <> 'cancelled' AND COALESCE(i.reinvestment_enabled,FALSE)=TRUE AND COALESCE(i.payout_transfer_reference,'') NOT ILIKE 'REINVESTMENT-%'),0) AS reinvestable_earnings,
      COALESCE((SELECT SUM(i.payout_amount) FROM investments i WHERE i.user_id=$1 AND i.status='paid' AND COALESCE(i.payout_transfer_reference,'') NOT ILIKE 'REINVESTMENT-%'),0) AS paid_earnings
  `, [Number(userId)])).rows[0];
  const capital = Number(row.capital || 0);
  const spent = Number(row.spent || 0);
  const reinvestable = Number(row.reinvestable_earnings || 0);
  const paid = Number(row.paid_earnings || 0);
  return { capital, spent, reinvestable, paid, available: Math.max(0, capital + reinvestable - spent - paid) };
}

async function recordSpend({ userId, amount, platform, campaign, spendDate, reference, notes, adminId }) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw Object.assign(new Error('Ad spend amount must be greater than zero'), { code:'INVALID_SPEND_AMOUNT' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const available = await getAvailableForAds(client, userId);
    if (value > available.available + 1e-6) throw Object.assign(new Error(`Ad spend exceeds available funds of ₹${available.available.toFixed(2)}`), { code:'SPEND_EXCEEDS_AVAILABLE_AD_FUNDS' });
    const investment = (await client.query(`SELECT id FROM investments WHERE user_id=$1 AND status IN ('active','matured') ORDER BY created_at ASC,id ASC LIMIT 1 FOR UPDATE`, [Number(userId)])).rows[0];
    if (!investment) throw Object.assign(new Error('No active investment is available for advertising spend'), { code:'NO_ACTIVE_INVESTMENT' });
    const allocation = (await client.query(`INSERT INTO investment_ad_allocations(investment_id,amount,status,created_by) VALUES($1,$2,'spending',$3) RETURNING id,amount,status`, [Number(investment.id), value, Number(adminId)])).rows[0];
    const spend = (await client.query(`INSERT INTO investment_ad_spends(investment_id,allocation_id,amount,platform,campaign,spend_date,reference,notes,created_by) VALUES($1,$2,$3,$4,$5,COALESCE($6::timestamp,CURRENT_TIMESTAMP),$7,$8,$9) RETURNING *`, [Number(investment.id), Number(allocation.id), value, String(platform || '').trim() || null, String(campaign || '').trim() || null, spendDate ? String(spendDate) : null, String(reference || '').trim() || null, String(notes || '').trim() || null, Number(adminId)])).rows[0];
    await client.query(`UPDATE investment_ad_allocations SET status='spent',updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [Number(allocation.id)]);
    await client.query(`UPDATE investments SET amount_in_ads=0,ad_spend_status='spent',updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [Number(investment.id)]);
    const after = await getAvailableForAds(client, userId);
    await client.query('COMMIT');
    return {...spend,amount:Number(spend.amount),investment_id:Number(investment.id),allocation_id:Number(allocation.id),total_spent:Number(after.spent.toFixed(2)),available_for_ads:Number(after.available.toFixed(2)),capital:Number(after.capital.toFixed(2)),reinvestable_earnings:Number(after.reinvestable.toFixed(2))};
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

module.exports = { getAvailableForAds, recordSpend };
