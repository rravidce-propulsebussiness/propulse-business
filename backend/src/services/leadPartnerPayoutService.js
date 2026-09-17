const pool = require('../config/database');
const payoutAccounts = require('./leadPartnerPayoutAccountService');

function money(value) { return Number(Number(value || 0).toFixed(2)); }
function error(message, code) { return Object.assign(new Error(message), { code }); }
function validateAmount(value) {
  const amount = money(value);
  if (!Number.isFinite(amount) || amount <= 0) throw error('Withdrawal amount must be greater than zero.', 'INVALID_AMOUNT');
  return amount;
}
function validateProof(value) {
  const proof = String(value || '').trim();
  if (!proof) throw error('Transfer proof is required.', 'TRANSFER_PROOF_REQUIRED');
  if (proof.length > 8 * 1024 * 1024) throw error('Transfer proof is too large.', 'TRANSFER_PROOF_TOO_LARGE');
  if (proof.startsWith('data:') && !/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(proof)) {
    throw error('Transfer proof must be a PNG, JPG, or WebP image.', 'INVALID_TRANSFER_PROOF');
  }
  if (!proof.startsWith('data:') && !/^https?:\/\//i.test(proof)) throw error('Transfer proof must be an image or valid URL.', 'INVALID_TRANSFER_PROOF');
  return proof;
}

async function getPartner(userId, client = pool) {
  const row = (await client.query(`SELECT lp.id,lp.user_id,lp.status,u.name,u.email FROM lead_partners lp JOIN users u ON u.id=lp.user_id WHERE lp.user_id=$1`, [Number(userId)])).rows[0];
  if (!row) throw error('Lead Partner profile not found.', 'PARTNER_NOT_FOUND');
  if (row.status !== 'active') throw error('Lead Partner account is not active.', 'PARTNER_NOT_ACTIVE');
  return row;
}

async function getBalance(userId, client = pool, forUpdate = false) {
  const partner = await getPartner(userId, client);
  const lockSql = forUpdate ? ' FOR UPDATE' : '';
  const rows = (await client.query(`
    SELECT e.id,e.earning_amount,
      COALESCE((SELECT SUM(i.amount) FROM lead_partner_payout_items i JOIN lead_partner_payout_requests r ON r.id=i.payout_id WHERE i.earning_id=e.id AND i.status='reserved' AND r.status='pending'),0) AS reserved,
      COALESCE((SELECT SUM(i.amount) FROM lead_partner_payout_items i JOIN lead_partner_payout_requests r ON r.id=i.payout_id WHERE i.earning_id=e.id AND i.status='paid' AND r.status='paid'),0) AS paid
    FROM lead_partner_earnings e
    WHERE e.partner_id=$1 AND e.status='available'
    ORDER BY e.created_at,e.id${lockSql}`, [partner.id])).rows;
  const available = rows.reduce((sum, row) => sum + Math.max(0, Number(row.earning_amount) - Number(row.reserved) - Number(row.paid)), 0);
  const reserved = rows.reduce((sum, row) => sum + Number(row.reserved || 0), 0);
  const paid = rows.reduce((sum, row) => sum + Number(row.paid || 0), 0);
  return { partner, available: money(available), reserved: money(reserved), paid: money(paid) };
}

async function getFunds(userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const balance = await getBalance(userId, client, false);
    const account = await payoutAccounts.get(userId);
    const requests = (await client.query(`SELECT id,amount,status,transfer_reference,notes,rejection_reason,requested_at,processed_at,paid_at,payout_method FROM lead_partner_payout_requests WHERE user_id=$1 ORDER BY requested_at DESC,id DESC LIMIT 200`, [Number(userId)])).rows;
    await client.query('COMMIT');
    return { available: balance.available, reserved: balance.reserved, paid: balance.paid, payout_account: account, requests: requests.map(r => ({ ...r, id:Number(r.id), amount:money(r.amount) })) };
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

async function requestWithdrawal({ userId, amount, notes }) {
  const requested = validateAmount(amount);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const balance = await getBalance(userId, client, true);
    const account = await payoutAccounts.getInternal(client, userId);
    if (!account) throw error('Add a Bank Account or UPI before requesting a withdrawal.', 'PAYOUT_ACCOUNT_REQUIRED');
    if (requested > balance.available + 0.001) throw error('Withdrawal amount exceeds available earnings.', 'INSUFFICIENT_FUNDS');
    const snapshot = account.method === 'upi'
      ? { method:'upi', upi_id:account.upi_id }
      : { method:'bank', account_holder_name:account.account_holder_name, account_number:account.account_number, ifsc_code:account.ifsc_code, bank_name:account.bank_name };
    const partner = balance.partner;
    const payout = (await client.query(`INSERT INTO lead_partner_payout_requests(partner_id,user_id,payout_account_id,payout_method,payout_account_snapshot,amount,notes) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [partner.id,Number(userId),account.id,account.method,snapshot,requested,String(notes || '').trim() || null])).rows[0];

    let remaining = requested;
    const earnings = (await client.query(`
      SELECT e.id,e.earning_amount,
        COALESCE((SELECT SUM(i.amount) FROM lead_partner_payout_items i JOIN lead_partner_payout_requests r ON r.id=i.payout_id WHERE i.earning_id=e.id AND i.status='reserved' AND r.status='pending'),0) AS reserved,
        COALESCE((SELECT SUM(i.amount) FROM lead_partner_payout_items i JOIN lead_partner_payout_requests r ON r.id=i.payout_id WHERE i.earning_id=e.id AND i.status='paid' AND r.status='paid'),0) AS paid
      FROM lead_partner_earnings e WHERE e.partner_id=$1 AND e.status='available' ORDER BY e.created_at,e.id FOR UPDATE`, [partner.id])).rows;
    for (const earning of earnings) {
      if (remaining <= 0.001) break;
      const free = Math.max(0, Number(earning.earning_amount) - Number(earning.reserved) - Number(earning.paid));
      const allocation = money(Math.min(free, remaining));
      if (allocation <= 0) continue;
      await client.query(`INSERT INTO lead_partner_payout_items(payout_id,earning_id,amount,status) VALUES($1,$2,$3,'reserved')`, [payout.id,earning.id,allocation]);
      await client.query(`UPDATE lead_partner_earnings SET payout_id=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2`, [payout.id,earning.id]);
      remaining = money(remaining - allocation);
    }
    if (remaining > 0.001) throw error('Available earnings changed while creating the withdrawal. Please try again.', 'INSUFFICIENT_FUNDS');
    await client.query('COMMIT');
    return { ...payout, id:Number(payout.id), amount:money(payout.amount), status:payout.status };
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

async function adminList({ status='all', search='' } = {}) {
  const values=[]; const where=[];
  if (status !== 'all') { values.push(String(status)); where.push(`r.status=$${values.length}`); }
  if (String(search).trim()) { values.push(`%${String(search).trim()}%`); where.push(`(u.name ILIKE $${values.length} OR u.email ILIKE $${values.length})`); }
  const rows=(await pool.query(`SELECT r.*,u.name AS user_name,u.email AS user_email,lp.status AS partner_status FROM lead_partner_payout_requests r JOIN users u ON u.id=r.user_id JOIN lead_partners lp ON lp.id=r.partner_id ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY r.requested_at DESC,r.id DESC`,values)).rows;
  return rows.map(r=>({...r,id:Number(r.id),partner_id:Number(r.partner_id),user_id:Number(r.user_id),amount:money(r.amount),payout_account_id:r.payout_account_id?Number(r.payout_account_id):null}));
}

async function adminProcess({ requestId, adminId, action, transferReference, proofUrl, rejectionReason, notes }) {
  const normalized=String(action || '').trim().toLowerCase();
  if (!['paid','reject'].includes(normalized)) throw error('Invalid payout action.', 'INVALID_ACTION');
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const request=(await client.query('SELECT * FROM lead_partner_payout_requests WHERE id=$1 FOR UPDATE',[Number(requestId)])).rows[0];
    if (!request) throw error('Payout request not found.', 'NOT_FOUND');
    if (request.status !== 'pending') throw error('Payout request has already been processed.', 'ALREADY_PROCESSED');
    await client.query(`SELECT id FROM lead_partners WHERE id=$1 FOR UPDATE`,[request.partner_id]);
    if (normalized === 'reject') {
      const updated=(await client.query(`UPDATE lead_partner_payout_requests SET status='rejected',rejection_reason=$1,notes=COALESCE($2,notes),processed_at=CURRENT_TIMESTAMP,processed_by=$3,updated_at=CURRENT_TIMESTAMP WHERE id=$4 RETURNING *`,[String(rejectionReason || '').trim() || null,String(notes || '').trim() || null,Number(adminId),Number(requestId)])).rows[0];
      await client.query(`UPDATE lead_partner_payout_items SET status='released',updated_at=CURRENT_TIMESTAMP WHERE payout_id=$1 AND status='reserved'`,[request.id]);
      await client.query('COMMIT');
      return {...updated,id:Number(updated.id),amount:money(updated.amount)};
    }
    const reference=String(transferReference || '').trim();
    if (!reference) throw error('Transfer reference / UTR is required.', 'TRANSFER_REFERENCE_REQUIRED');
    const proof=validateProof(proofUrl);
    const duplicate=(await client.query(`SELECT id FROM lead_partner_payout_requests WHERE transfer_reference=$1 AND id<>$2`,[reference,Number(requestId)])).rows[0];
    if (duplicate) throw error('This transfer reference has already been used.', 'DUPLICATE_REFERENCE');
    const allocated=Number((await client.query(`SELECT COALESCE(SUM(amount),0) AS total FROM lead_partner_payout_items WHERE payout_id=$1 AND status='reserved'`,[request.id])).rows[0].total || 0);
    if (money(allocated) !== money(request.amount)) throw error('Payout allocation does not match the requested amount.', 'PAYOUT_ALLOCATION_MISMATCH');
    const updated=(await client.query(`UPDATE lead_partner_payout_requests SET status='paid',transfer_reference=$1,proof_url=$2,notes=COALESCE($3,notes),processed_at=CURRENT_TIMESTAMP,processed_by=$4,paid_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING *`,[reference,proof,String(notes || '').trim() || null,Number(adminId),Number(requestId)])).rows[0];
    await client.query(`UPDATE lead_partner_payout_items SET status='paid',updated_at=CURRENT_TIMESTAMP WHERE payout_id=$1 AND status='reserved'`,[request.id]);
    await client.query(`UPDATE lead_partner_earnings e SET status=CASE WHEN COALESCE((SELECT SUM(i.amount) FROM lead_partner_payout_items i WHERE i.earning_id=e.id AND i.status='paid'),0) >= e.earning_amount THEN 'paid' ELSE 'available' END,updated_at=CURRENT_TIMESTAMP WHERE e.id IN (SELECT earning_id FROM lead_partner_payout_items WHERE payout_id=$1)`,[request.id]);
    await client.query('COMMIT');
    return {...updated,id:Number(updated.id),amount:money(updated.amount)};
  } catch(e){ await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

module.exports={getFunds,requestWithdrawal,adminList,adminProcess};
