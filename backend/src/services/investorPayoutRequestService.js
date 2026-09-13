const pool = require('../config/database');
const payoutAccounts = require('./investorPayoutAccountService');
const ledger = require('./investorFinancialLedgerService');

const MAX_PROOF_DATA_URL_LENGTH = 8 * 1024 * 1024;

async function getBalance(userId, client = pool) {
  const summary = await ledger.getInvestorFinancialSummary(userId, client);
  return { generated: summary.auto_invest_earnings + summary.non_auto_earnings, settled_investment_earnings: summary.settled_non_auto_earnings, transferred: summary.payout_transferred, reserved: summary.payout_reserved, available: summary.transferable };
}

async function getTransferableBalance(userId, client = pool) {
  return ledger.getInvestorFinancialSummary(userId, client).then(summary => summary.transferable);
}

function sanitizeInvestorRequest(row) {
  return {
    id: Number(row.id),
    amount: Number(row.amount || 0),
    status: row.status,
    transfer_reference: row.transfer_reference || null,
    notes: row.notes || null,
    requested_at: row.requested_at,
    processed_at: row.processed_at,
    payout_method: row.payout_method || null,
  };
}

async function getInvestorFunds(userId) {
  const [summary, account, requests, investments] = await Promise.all([
    ledger.getInvestorFinancialSummary(userId),
    payoutAccounts.get(userId),
    pool.query(`SELECT id, amount, status, transfer_reference, notes, requested_at, processed_at, payout_method FROM investor_payout_requests WHERE user_id=$1 ORDER BY requested_at DESC,id DESC`, [Number(userId)]),
    pool.query(`SELECT COALESCE(SUM(amount) FILTER (WHERE status <> 'cancelled' AND parent_investment_id IS NULL),0) AS total_invested FROM investments WHERE user_id=$1 AND status <> 'cancelled'`, [Number(userId)]),
  ]);
  const totalInvested = Number(investments.rows[0]?.total_invested || 0);
  return {
    generated: Number((summary.auto_invest_earnings + summary.non_auto_earnings).toFixed(2)),
    transferable: Number(summary.transferable.toFixed(2)),
    withdrawable_earnings: Number(summary.withdrawable_earnings.toFixed(2)),
    payout_account: account,
    total_invested: Number(totalInvested.toFixed(2)),
    available_for_ads: Number(summary.available_for_ads.toFixed(2)),
    total_ad_spent: Number(summary.ad_spent.toFixed(2)),
    auto_invest_earnings: Number(summary.auto_invest_earnings.toFixed(2)),
    auto_invest_earnings_consumed: Number(summary.auto_invest_earnings_consumed.toFixed(2)),
    auto_invest_earnings_withdrawable: Number(summary.auto_invest_earnings_withdrawable.toFixed(2)),
    non_auto_earnings: Number(summary.non_auto_earnings.toFixed(2)),
    non_auto_earnings_withdrawable: Number(summary.non_auto_earnings_withdrawable.toFixed(2)),
    ad_spent: Number(summary.ad_spent.toFixed(2)),
    payout_reserved: Number(summary.payout_reserved.toFixed(2)),
    payout_transferred: Number(summary.payout_transferred.toFixed(2)),
    unallocated_investment_capital: Number(Math.max(0, summary.capital - summary.ad_spent).toFixed(2)),
    reserved: Number(summary.payout_reserved.toFixed(2)),
    requests: requests.rows.map(sanitizeInvestorRequest),
  };
}

async function requestTransfer({ userId, amount, notes }) {
  const requestedAmount = Number(amount);
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) throw Object.assign(new Error('Withdrawal amount must be greater than zero.'), {code:'INVALID_AMOUNT'});
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ledger.lockInvestorFinancials(client, userId);
    const account = await payoutAccounts.getInternal(client, userId);
    if (!account) throw Object.assign(new Error('Add a Bank Account or UPI before requesting a withdrawal.'), {code:'PAYOUT_ACCOUNT_REQUIRED'});
    const available = await getTransferableBalance(userId, client);
    if (requestedAmount > available + 1e-6) throw Object.assign(new Error('Withdrawal amount exceeds your available earnings.'), {code:'INSUFFICIENT_GENERATED_FUNDS'});
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
  const rows = (await pool.query(`SELECT r.id,r.user_id,r.amount,r.status,r.transfer_reference,r.notes,r.requested_at,r.processed_at,r.processed_by,r.payout_method,u.name AS user_name,u.email AS user_email FROM investor_payout_requests r JOIN users u ON u.id=r.user_id ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY r.requested_at DESC,r.id DESC`, values)).rows;
  return rows.map(row => ({...row,amount:Number(row.amount||0)}));
}

async function getAdminProof(requestId) {
  const row = (await pool.query(`SELECT id,status,proof_url,transfer_reference,processed_at FROM investor_payout_requests WHERE id=$1`, [Number(requestId)])).rows[0];
  if (!row) throw Object.assign(new Error('Transfer request not found'), {code:'NOT_FOUND'});
  return { id:Number(row.id), status:row.status, proof_url:row.proof_url || null, transfer_reference:row.transfer_reference || null, processed_at:row.processed_at };
}

function validateProof(proofUrl) {
  const value = String(proofUrl || '').trim();
  if (!value) throw Object.assign(new Error('Transfer proof is required'), {code:'TRANSFER_PROOF_REQUIRED'});
  if (value.length > MAX_PROOF_DATA_URL_LENGTH) throw Object.assign(new Error('Transfer proof image is too large. Please use an image under 6 MB.'), {code:'TRANSFER_PROOF_TOO_LARGE'});
  if (value.startsWith('data:')) {
    if (!/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(value)) throw Object.assign(new Error('Transfer proof must be a PNG, JPG, or WebP screenshot.'), {code:'INVALID_TRANSFER_PROOF'});
  } else if (!/^https?:\/\//i.test(value)) {
    throw Object.assign(new Error('Transfer proof must be an image screenshot or a valid proof URL.'), {code:'INVALID_TRANSFER_PROOF'});
  }
  return value;
}

async function adminProcess({ requestId, adminId, action, transferReference, proofUrl, notes }) {
  const normalizedAction = String(action || '').trim().toLowerCase();
  if (!['paid', 'reject'].includes(normalizedAction)) throw Object.assign(new Error('Invalid withdrawal action.'), {code:'INVALID_ACTION'});
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = (await client.query('SELECT * FROM investor_payout_requests WHERE id=$1 FOR UPDATE',[Number(requestId)])).rows[0];
    if (!row) throw Object.assign(new Error('Transfer request not found'),{code:'NOT_FOUND'});
    if (row.status !== 'pending') throw Object.assign(new Error('Transfer request has already been processed'),{code:'ALREADY_PROCESSED'});
    await ledger.lockInvestorFinancials(client, row.user_id);
    if (normalizedAction === 'reject') {
      const updated=(await client.query(`UPDATE investor_payout_requests SET status='rejected',notes=COALESCE($1,notes),processed_at=CURRENT_TIMESTAMP,processed_by=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *`,[String(notes||'').trim()||null,Number(adminId),Number(requestId)])).rows[0];
      await client.query('COMMIT'); return {...updated,amount:Number(updated.amount)};
    }
    const reference=String(transferReference||'').trim();
    if(!reference) throw Object.assign(new Error('Transfer reference / UTR is required'),{code:'TRANSFER_REFERENCE_REQUIRED'});
    const proof = validateProof(proofUrl);
    const duplicate=(await client.query(`SELECT id FROM investor_payout_requests WHERE transfer_reference=$1 AND id<>$2 UNION ALL SELECT id FROM investments WHERE payout_transfer_reference=$1 LIMIT 1`,[reference,Number(requestId)])).rows[0];
    if(duplicate) throw Object.assign(new Error('This transfer reference has already been used'),{code:'DUPLICATE_REFERENCE'});
    const summary = await ledger.getInvestorFinancialSummary(row.user_id, client);
    const earningsAvailableBeforePending = Math.max(0, summary.transferable + summary.payout_reserved);
    if(Number(row.amount)>earningsAvailableBeforePending + 1e-6) throw Object.assign(new Error('Withdrawal amount is no longer available.'),{code:'INSUFFICIENT_GENERATED_FUNDS'});
    const updated=(await client.query(`UPDATE investor_payout_requests SET status='paid',transfer_reference=$1,proof_url=$2,notes=COALESCE($3,notes),processed_at=CURRENT_TIMESTAMP,processed_by=$4,updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING *`,[reference,proof,String(notes||'').trim()||null,Number(adminId),Number(requestId)])).rows[0];
    await client.query('COMMIT'); return {...updated,amount:Number(updated.amount)};
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

module.exports={getInvestorFunds,requestTransfer,adminList,getAdminProof,adminProcess};