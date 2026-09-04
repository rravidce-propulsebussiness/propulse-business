const pool = require('../config/database');

async function ensureWallet(client, userId) {
  const r = await client.query(
    `INSERT INTO wallets(user_id) VALUES($1)
     ON CONFLICT(user_id) DO UPDATE SET user_id=EXCLUDED.user_id
     RETURNING *`,
    [userId]
  );
  return r.rows[0];
}

function money(value, code = 'INVALID_AMOUNT') {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw Object.assign(new Error('Amount must be greater than zero'), { code });
  }
  return n;
}

async function getWallet(userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const w = await ensureWallet(client, userId);
    const tx = await client.query(
      `SELECT id,type,amount,balance_after,reference_type,reference_id,status,description,created_at
       FROM wallet_transactions
       WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100`,
      [userId]
    );
    await client.query('COMMIT');
    return {
      id: w.id,
      balance: Number(w.balance),
      transactions: tx.rows.map(x => ({ ...x, amount: Number(x.amount), balance_after: Number(x.balance_after) }))
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function createTopup({ userId, amount, reference, proofUrl }) {
  const value = money(amount);
  const normalizedReference = reference == null ? null : String(reference).trim() || null;
  const r = await pool.query(
    `INSERT INTO wallet_topups(user_id,amount,reference,proof_url)
     VALUES($1,$2,$3,$4) RETURNING *`,
    [userId, value, normalizedReference, proofUrl || null]
  );
  return r.rows[0];
}

async function getTopups(userId) {
  const r = await pool.query(
    `SELECT id,amount,payment_method,reference,proof_url,status,reviewed_at,created_at,updated_at
     FROM wallet_topups WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100`,
    [userId]
  );
  return r.rows.map(x => ({ ...x, amount: Number(x.amount) }));
}

async function getAdminTopups({ status = 'all', search = '', page = 1, limit = 50 }) {
  const params = [];
  const where = [];
  if (status && status !== 'all') {
    const allowed = ['pending', 'approved', 'rejected'];
    if (!allowed.includes(status)) throw Object.assign(new Error('Invalid top-up status filter'), { code: 'INVALID_STATUS' });
    params.push(status);
    where.push(`wt.status=$${params.length}`);
  }
  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    where.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR COALESCE(bp.business_name,'') ILIKE $${params.length} OR COALESCE(wt.reference,'') ILIKE $${params.length})`);
  }
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const count = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM wallet_topups wt
     JOIN users u ON u.id=wt.user_id
     LEFT JOIN business_profiles bp ON bp.user_id=wt.user_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`,
    params
  );
  const total = count.rows[0].total;
  const offset = (safePage - 1) * safeLimit;
  const dataParams = [...params, safeLimit, offset];
  const q = `SELECT wt.id,wt.user_id,wt.amount,wt.payment_method,wt.reference,wt.proof_url,wt.status,wt.reviewed_by,wt.reviewed_at,wt.created_at,wt.updated_at,
    u.name AS user_name,u.email AS user_email,bp.business_name,ru.name AS reviewer_name
    FROM wallet_topups wt JOIN users u ON u.id=wt.user_id
    LEFT JOIN business_profiles bp ON bp.user_id=wt.user_id
    LEFT JOIN users ru ON ru.id=wt.reviewed_by
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY wt.created_at DESC,wt.id DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`;
  const rows = (await pool.query(q, dataParams)).rows.map(x => ({ ...x, amount: Number(x.amount) }));
  return { items: rows, total, page: safePage, limit: safeLimit, pages: Math.ceil(total / safeLimit) };
}

async function approveTopup({ topupId, adminId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const t = (await client.query(`SELECT * FROM wallet_topups WHERE id=$1 FOR UPDATE`, [topupId])).rows[0];
    if (!t) throw Object.assign(new Error('Top-up not found'), { code: 'NOT_FOUND' });
    if (t.status !== 'pending') throw Object.assign(new Error('Top-up is already reviewed'), { code: 'ALREADY_REVIEWED' });

    const w = await ensureWallet(client, t.user_id);
    const next = Number(w.balance) + Number(t.amount);
    await client.query(`UPDATE wallets SET balance=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2`, [next, w.id]);
    await client.query(
      `INSERT INTO wallet_transactions(wallet_id,user_id,type,amount,balance_after,reference_type,reference_id,description)
       VALUES($1,$2,'credit',$3,$4,'wallet_topup',$5,'Wallet top-up approved')`,
      [w.id, t.user_id, t.amount, next, t.id]
    );
    const updated = (await client.query(
      `UPDATE wallet_topups SET status='approved',reviewed_by=$1,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
       WHERE id=$2 AND status='pending' RETURNING *`,
      [adminId, topupId]
    )).rows[0];
    if (!updated) throw Object.assign(new Error('Top-up was reviewed concurrently'), { code: 'ALREADY_REVIEWED' });
    await client.query('COMMIT');
    return updated;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function rejectTopup({ topupId, adminId }) {
  const r = await pool.query(
    `UPDATE wallet_topups SET status='rejected',reviewed_by=$1,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
     WHERE id=$2 AND status='pending' RETURNING *`,
    [adminId, topupId]
  );
  if (!r.rows[0]) throw Object.assign(new Error('Pending top-up not found'), { code: 'NOT_FOUND' });
  return r.rows[0];
}

async function debitForLead(client, { userId, amount, leadPurchaseId }) {
  const value = money(amount);
  if (!Number.isInteger(Number(leadPurchaseId)) || Number(leadPurchaseId) <= 0) {
    throw Object.assign(new Error('Invalid lead purchase reference'), { code: 'INVALID_REFERENCE' });
  }

  const w = await ensureWallet(client, userId);
  const locked = (await client.query(`SELECT id,balance FROM wallets WHERE id=$1 FOR UPDATE`, [w.id])).rows[0];
  const balance = Number(locked.balance);
  if (!Number.isFinite(balance) || balance < value) {
    throw Object.assign(new Error('Insufficient wallet balance'), { code: 'INSUFFICIENT_BALANCE' });
  }

  const next = balance - value;
  await client.query(`UPDATE wallets SET balance=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2`, [next, locked.id]);
  await client.query(
    `INSERT INTO wallet_transactions(wallet_id,user_id,type,amount,balance_after,reference_type,reference_id,description)
     VALUES($1,$2,'debit',$3,$4,'lead_purchase',$5,'Lead purchase')`,
    [locked.id, userId, value, next, leadPurchaseId]
  );
  return next;
}

module.exports = { ensureWallet, getWallet, createTopup, getTopups, getAdminTopups, approveTopup, rejectTopup, debitForLead };