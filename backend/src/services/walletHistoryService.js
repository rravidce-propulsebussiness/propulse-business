const pool = require('../config/database');

async function getHistory(userId) {
  const [walletResult, directResult, leadResult] = await Promise.all([
    pool.query(`SELECT wt.id,wt.type,wt.amount,wt.balance_after,wt.reference_type,wt.reference_id,wt.payment_id,wt.status,wt.description,wt.created_at,p.status AS payment_status FROM wallet_transactions wt LEFT JOIN payments p ON p.id=wt.payment_id WHERE wt.user_id=$1 ORDER BY wt.created_at DESC,wt.id DESC LIMIT 200`, [userId]),
    pool.query(`SELECT p.id,p.amount,p.status,p.payment_method,p.manual_reference,p.wallet_amount,p.external_amount,p.purchase_type,p.purchase_id,p.notes,p.created_at,p.updated_at,p.paid_at FROM payments p WHERE p.user_id=$1 AND COALESCE(p.external_amount,0)>0 ORDER BY p.created_at DESC,p.id DESC LIMIT 200`, [userId]),
    pool.query(`SELECT p.id AS payment_id,p.amount,p.status,p.payment_method,p.manual_reference,p.wallet_amount,p.external_amount,p.purchase_type,p.purchase_id,p.notes,p.created_at,p.paid_at,l.id AS lead_id,l.title,l.requirement,l.location,l.budget FROM payments p LEFT JOIN leads l ON l.id=p.purchase_id WHERE p.user_id=$1 AND p.purchase_type='lead' ORDER BY p.created_at DESC,p.id DESC LIMIT 200`, [userId])
  ]);

  const wallet = walletResult.rows.map(x => ({
    id: `wallet-${x.id}`,
    source: 'wallet',
    kind: 'wallet',
    transaction_id: x.id,
    type: x.type,
    amount: Number(x.amount),
    balance_after: Number(x.balance_after),
    reference_type: x.reference_type,
    reference_id: x.reference_id,
    payment_id: x.payment_id,
    status: x.status,
    payment_status: x.payment_status,
    description: x.description || (x.type === 'debit' ? 'Wallet debit' : x.type === 'refund' ? 'Wallet refund' : 'Wallet credit'),
    created_at: x.created_at
  }));

  const direct = directResult.rows.map(x => ({
    id: `direct-${x.id}`,
    source: 'direct',
    kind: 'direct',
    payment_id: x.id,
    type: 'debit',
    amount: Number(x.external_amount || x.amount),
    total_amount: Number(x.amount),
    wallet_amount: Number(x.wallet_amount || 0),
    external_amount: Number(x.external_amount || x.amount),
    payment_method: x.payment_method,
    manual_reference: x.manual_reference,
    purchase_type: x.purchase_type,
    purchase_id: x.purchase_id,
    status: x.status,
    payment_status: x.status,
    notes: x.notes,
    description: `${x.purchase_type === 'lead' ? 'Lead' : x.purchase_type === 'membership' ? 'Membership' : x.purchase_type === 'booster' ? 'Booster' : 'Purchase'} direct payment`,
    created_at: x.created_at,
    paid_at: x.paid_at
  }));

  const leadPayments = leadResult.rows.map(x => ({
    id: `lead-${x.payment_id}`,
    payment_id: x.payment_id,
    lead_id: x.lead_id || x.purchase_id,
    title: x.title || `Lead #${x.purchase_id}`,
    requirement: x.requirement,
    location: x.location,
    budget: x.budget,
    amount: Number(x.amount),
    wallet_amount: Number(x.wallet_amount || 0),
    external_amount: Number(x.external_amount || 0),
    payment_method: x.payment_method,
    manual_reference: x.manual_reference,
    status: x.status,
    created_at: x.created_at,
    paid_at: x.paid_at,
    notes: x.notes
  }));

  const combined = [...wallet, ...direct].sort((a,b) => new Date(b.created_at)-new Date(a.created_at));
  return { combined, leadPurchases: leadPayments };
}

module.exports = { getHistory };
