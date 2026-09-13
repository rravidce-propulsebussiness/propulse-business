const pool = require('../config/database');
const payoutAccounts = require('./investorPayoutAccountService');

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

async function getTransferableBalance(userId, client = pool) {
  const result = await client.query(`
    SELECT
      COALESCE((SELECT SUM(a.allocated_amount)
        FROM investment_revenue_allocations a
        JOIN investments i ON i.id=a.investment_id
        WHERE i.user_id=$1 AND i.status <> 'cancelled' AND COALESCE(i.reinvestment_enabled,FALSE)=FALSE),0) AS generated,
      COALESCE((SELECT SUM(i.payout_amount)
        FROM investments i
        WHERE i.user_id=$1 AND i.status='paid' AND COALESCE(i.reinvestment_enabled,FALSE)=FALSE),0) AS settled,
      COALESCE((SELECT SUM(r.amount)
        FROM investor_payout_requests r
        WHERE r.user_id=$1 AND r.status='paid'),0) AS transferred,
      COALESCE((SELECT SUM(r.amount)
        FROM investor_payout_requests r
        WHERE r.user_id=$1 AND r.status='pending'),0) AS reserved
  `, [Number(userId)]);
  const row = result.rows[0];
  const generated = Number(row.generated || 0);
  const settled = Number(row.settled || 0);
  const transferred = Number(row.transferred || 0);
  const reserved = Number(row.reserved || 0);
  return Math.max(0, generated - settled - transferred - reserved);
}

async function getInvestorFunds(userId) {
  const balance = await getBalance(userId);
  const transferable = await getTransferableBalance(userId);
  const account = await payoutAccounts.get(userId);
  const [requests, investments] = await Promise.all([
    pool.query(`SELECT id, amount, status, transfer_reference, notes, requested_at, processed_at, payout_method, payout_account_snapshot FROM investor_payout_requests WHERE user_id=$1 ORDER BY requested_at DESC,id DESC`, [Number(userId)]),
    pool.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE status <> 'cancelled' AND parent_investment_id IS NULL),0) AS total_invested,
        COALESCE(SUM(amount) FILTER (WHERE status <> 'cancelled'),0) AS total_funding,
        COALESCE((SELECT SUM(s.amount)
          FROM investment_ad_spends s
          JOIN investments spent_investment ON spent_investment.id=s.investment_id
          WHERE spent_investment.user_id=$1 AND spent_investment.status <> 'cancelled'),0) AS total_ad_spent,
        COALESCE((SELECT SUM(a.allocated_amount)
          FROM investment_revenue_allocations a
          JOIN investments auto_i ON auto_i.id=a.investment_id
          WHERE auto_i.user_id=$1
            AND auto_i.status NOT IN ('paid','cancelled')
            AND COALESCE(auto_i.reinvestment_enabled,FALSE)=TRUE),0) AS auto_invest_earnings
      FROM investments
      WHERE user_id=$1 AND status <> 'cancelled'
    `, [Number(userId)]),
  ]);
  const row = investments.rows[0] || {};
  const totalInvested = Number(row.total_invested || 0);
  const totalFunding = Number(row.total_funding || 0);
  const totalAdSpent = Number(row.total_ad_spent || 0);
  const autoInvestEarnings = Number(row.auto_invest_earnings || 0);
  // Match Admin Investments: unspent investment funding plus eligible
  // auto-invest earnings that are waiting to be routed back into ads.
  const availableForAds = Math.max(0, totalFunding - totalAdSpent + autoInvestEarnings);
  const unallocatedInvestmentCapital = Math.max(0, totalInvested - totalAdSpent);
  return {
    ...balance,
    transferable,
    payout_account: account,
    total_invested: totalInvested,
    amount_in_ads: Number(availableForAds.toFixed(2)),
    available_for_ads: Number(availableForAds.toFixed(2)),
    total_ad_spent: Number(totalAdSpent.toFixed(2)),
    auto_invest_earnings: Number(autoInvestEarnings.toFixed(2)),
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
    const account = await payoutAccounts.getInternal(client, userId);
    if (!account) throw Object.assign(new Error('Add a Bank Account or UPI before requesting a transfer'), {code:'PAYOUT_ACCOUNT_REQUIRED'});
    const available = await getTransferableBalance(userId, client);
    if (requestedAmount > available) throw Object.assign(new Error(`Transfer amount exceeds available non-auto-invest earnings (${available.toFixed(2)})`), {code:'INSUFFICIENT_GENERATED_FUNDS'});
    const snapshot = account.method === 'upi'
      ? { method:'upi', upi_id:account.upi_id }
      : { method:'bank', account_holder_name:account.account_holder_name, account_number:account.account_number, ifsc_code:account.ifsc_code, bank_name:account.bank_name };
    const result = await client.query(`INSERT INTO investor_payout_requests(user_id,amount,notes,payout_account_id,payout_method,payout_account_snapshot) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [Number(userId), requestedAmount, String(notes || '').trim() || null, account.id, account.method, snapshot]);
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
    const available=await getTransferableBalance(row.user_id,client);
    if(Number(row.amount)>available) throw Object.assign(new Error('Non-auto-invest earnings are no longer available for this request'),{code:'INSUFFICIENT_GENERATED_FUNDS'});
    const updated=(await client.query(`UPDATE investor_payout_requests SET status='paid',transfer_reference=$1,proof_url=$2,notes=COALESCE($3,notes),processed_at=CURRENT_TIMESTAMP,processed_by=$4,updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING *`,[reference,proofUrl,String(notes||'').trim()||null,Number(adminId),Number(requestId)])).rows[0];
    await client.query('COMMIT'); return {...updated,amount:Number(updated.amount)};
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

module.exports={getInvestorFunds,requestTransfer,adminList,adminProcess};