const pool = require('../config/database');

async function getBalance(userId, client = pool) {
  const result = await client.query(`
    SELECT
      COALESCE((SELECT SUM(a.allocated_amount) FROM investment_revenue_allocations a JOIN investments i ON i.id=a.investment_id WHERE i.user_id=$1 AND i.status <> 'cancelled'),0) AS generated,
      COALESCE((SELECT SUM(i.payout_amount) FROM investments i WHERE i.user_id=$1 AND i.status='paid'),0) AS settled_investment_earnings,
      COALESCE((SELECT SUM(r.amount) FROM investor_payout_requests r WHERE r.user_id=$1 AND r.status='paid'),0) AS transferred,
      COALESCE((SELECT SUM(r.amount) FROM investor_payout_requests r WHERE r.user_id=$1 AND r.status='pending'),0) AS reserved
  `, [Number(userId)]);
  const row = result.rows[0];
  const generated = Number(row.generated || 0);
  const settledInvestmentEarnings = Number(row.settled_investment_earnings || 0);
  const transferred = Number(row.transferred || 0);
  const reserved = Number(row.reserved || 0);
  return {
    generated,
    settled_investment_earnings: settledInvestmentEarnings,
    transferred,
    reserved,
    available: Math.max(0, generated - settledInvestmentEarnings - transferred - reserved),
  };
}

async function getInvestorFunds(userId) {
  const balance = await getBalance(userId);
  const [requests, investments] = await Promise.all([
    pool.query(`SELECT id, amount, status, transfer_reference, notes, requested_at, processed_at FROM investor_payout_requests WHERE user_id=$1 ORDER BY requested_at DESC,id DESC`, [Number(userId)]),
    pool.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE status IN ('active','matured')),0) AS total_invested,
        COALESCE(SUM(amount_in_ads) FILTER (WHERE status IN ('active','matured')),0) AS amount_in_ads,
        COALESCE((
          SELECT SUM(s.amount)
          FROM investment_ad_spends s
          JOIN investments spent_investment ON spent_investment.id=s.investment_id
          WHERE spent_investment.user_id=$1
            AND spent_investment.status <> 'cancelled'
        ),0) AS total_ad_spent
      FROM investments
      WHERE user_id=$1 AND status <> 'cancelled'
    `, [Number(userId)]),
  ]);
  const totalInvested = Number(investments.rows[0]?.total_invested || 0);
  const amountInAds = Number(investments.rows[0]?.amount_in_ads || 0);
  const totalAdSpent = Number(investments.rows[0]?.total_ad_spent || 0);
  const unallocatedInvestmentCapital = Math.max(0, totalInvested - totalAdSpent - amountInAds);
  return {
    ...balance,
    total_invested: totalInvested,
    amount_in_ads: amountInAds,
    total_ad_spent: totalAdSpent,
    unallocated_investment_capital: Number(unallocatedInvestmentCapital.toFixed(2)),
    requests: requests.rows.map(row => ({...row, amount:Number(row.amount || 0)})),
  };
}

async function requestTransfer({ userId, amount, notes }) {
  const requestedAmount = Number(amount);
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) throw Object.assign(new Error('Transfer amount must be greater than zero'), {code:'INVALID_AMOUNT'});
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const balance = await getBalance(userId, client);
    if (requestedAmount > balance.available) throw Object.assign(new Error(`Transfer amount exceeds available generated funds (${balance.available.toFixed(2)})`), {code:'INSUFFICIENT_GENERATED_FUNDS'});
    const result = await client.query(`INSERT INTO investor_payout_requests(user_id,amount,notes) VALUES($1,$2,$3) RETURNING *`, [Number(userId), requestedAmount, String(notes || '').trim() || null]);
    await client.query('COMMIT');
    return {...result.rows[0], amount:Number(result.rows[0].amount)};
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function adminList({ status='all', search='' }) {
  const values=[]; const where=[];
  if (status !== 'all') { values.push(status); where.push(`r.status=$${values.length}`); }
  if (String(search).trim()) { values.push(`%${String(search).trim()}%`); where.push(`(u.name ILIKE $${values.length} OR u.email ILIKE $${values.length})`); }
  return (await pool.query(`SELECT r.*,u.name AS user_name,u.email AS user_email FROM investor_payout_requests r JOIN users u ON u.id=r.user_id ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY r.requested_at DESC,r.id DESC`, values)).rows.map(row=>({...row,amount:Number(row.amount||0)}));
}

async function adminProcess({ requestId, adminId, action, transferReference, proofUrl, notes }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = (await client.query('SELECT * FROM investor_payout_requests WHERE id=$1 FOR UPDATE',[Number(requestId)])).rows[0];
    if (!row) throw Object.assign(new Error('Transfer request not found'),{code:'NOT_FOUND'});
    if (row.status !== 'pending') throw Object.assign(new Error('Transfer request has already been processed'),{code:'ALREADY_PROCESSED'});
    if (action === 'reject') {
      const updated=(await client.query(`UPDATE investor_payout_requests SET status='rejected',notes=COALESCE($1,notes),processed_at=CURRENT_TIMESTAMP,processed_by=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *`,[String(notes||'').trim()||null,Number(adminId),Number(requestId)])).rows[0];
      await client.query('COMMIT'); return {...updated,amount:Number(updated.amount)};
    }
    const reference=String(transferReference||'').trim();
    if(!reference) throw Object.assign(new Error('Transfer reference / UTR is required'),{code:'TRANSFER_REFERENCE_REQUIRED'});
    if(!proofUrl) throw Object.assign(new Error('Transfer proof is required'),{code:'TRANSFER_PROOF_REQUIRED'});
    const duplicate=(await client.query('SELECT id FROM investor_payout_requests WHERE transfer_reference=$1 AND id<>$2 LIMIT 1',[reference,Number(requestId)])).rows[0];
    if(duplicate) throw Object.assign(new Error('This transfer reference has already been used'),{code:'DUPLICATE_REFERENCE'});
    const balance=await getBalance(row.user_id,client);
    if(Number(row.amount)>balance.available) throw Object.assign(new Error('Generated funds are no longer available for this request'),{code:'INSUFFICIENT_GENERATED_FUNDS'});
    const updated=(await client.query(`UPDATE investor_payout_requests SET status='paid',transfer_reference=$1,proof_url=$2,notes=COALESCE($3,notes),processed_at=CURRENT_TIMESTAMP,processed_by=$4,updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING *`,[reference,proofUrl,String(notes||'').trim()||null,Number(adminId),Number(requestId)])).rows[0];
    await client.query('COMMIT'); return {...updated,amount:Number(updated.amount)};
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

module.exports={getInvestorFunds,requestTransfer,adminList,adminProcess};
