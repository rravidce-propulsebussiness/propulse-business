const pool = require('../config/database');

function purchaseLabel(type) {
  if (type === 'lead') return 'Lead purchase';
  if (type === 'membership') return 'Membership purchase';
  if (type === 'booster') return 'Booster purchase';
  if (type === 'investment') return 'Investment funding';
  return 'Purchase';
}

async function getHistory(userId) {
  const [walletResult, paymentResult] = await Promise.all([
    pool.query(`
      SELECT
        wt.id, wt.type, wt.amount, wt.balance_after, wt.reference_type, wt.reference_id,
        wt.payment_id, wt.status, wt.description, wt.created_at,
        p.status AS payment_status, p.purchase_type, p.purchase_id,
        p.amount AS payment_amount, p.wallet_amount AS payment_wallet_amount,
        p.external_amount AS payment_external_amount, p.payment_method,
        p.manual_reference, p.proof_url
      FROM wallet_transactions wt
      LEFT JOIN payments p ON p.id = wt.payment_id
      WHERE wt.user_id=$1
      ORDER BY wt.created_at DESC, wt.id DESC
      LIMIT 200
    `, [userId]),
    pool.query(`
      SELECT
        p.id AS payment_id, p.amount, p.status, p.payment_method,
        p.manual_reference, p.wallet_amount, p.external_amount,
        p.purchase_type, p.purchase_id, p.notes, p.created_at, p.updated_at, p.paid_at,
        p.coupon_code, p.subtotal_amount, p.discount_amount,
        l.id AS lead_id, l.requirement, l.property_type, l.budget,
        l.customer_name, c.name AS city_name, s.name AS state_name
      FROM payments p
      LEFT JOIN leads l ON l.id=p.purchase_id AND p.purchase_type='lead'
      LEFT JOIN cities c ON c.id=l.city_id
      LEFT JOIN states s ON s.id=l.state_id
      WHERE p.user_id=$1
        AND COALESCE(p.purchase_type,'') <> 'wallet_topup'
        AND NOT (p.status='refunded' AND EXISTS (SELECT 1 FROM wallet_transactions wt WHERE wt.payment_id=p.id AND wt.type='refund'))
        AND COALESCE(p.amount,0) >= 0
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT 200
    `, [userId])
  ]);

  const wallet = walletResult.rows
    .filter(x => !(x.payment_id && x.purchase_type) || x.type === 'refund')
    .map(x => ({
      id: `wallet-${x.id}`,
      source: 'wallet',
      kind: x.type === 'refund' ? 'refund' : x.type === 'debit' ? 'wallet_debit' : 'wallet_credit',
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
      created_at: x.created_at,
      manual_reference: x.manual_reference
    }));

  const purchases = paymentResult.rows.map(x => {
    const isLead = x.purchase_type === 'lead';
    const amount = Number(x.amount || 0);
    const walletAmount = Number(x.wallet_amount || 0);
    const externalAmount = Number(x.external_amount || 0);
    const title = isLead
      ? (x.requirement || x.property_type || `Lead #${x.purchase_id}`)
      : purchaseLabel(x.purchase_type);

    return {
      id: `payment-${x.payment_id}`,
      source: 'purchase',
      kind: 'purchase',
      payment_id: x.payment_id,
      purchase_type: x.purchase_type || 'purchase',
      purchase_id: x.purchase_id,
      lead_id: x.lead_id || (isLead ? x.purchase_id : null),
      title,
      description: isLead ? `Lead #${x.purchase_id} purchase` : purchaseLabel(x.purchase_type),
      requirement: x.requirement,
      property_type: x.property_type,
      budget: x.budget,
      customer_name: x.customer_name,
      location: [x.city_name, x.state_name].filter(Boolean).join(', '),
      amount,
      total_amount: amount,
      wallet_amount: walletAmount,
      external_amount: externalAmount,
      payment_method: x.payment_method,
      manual_reference: x.manual_reference,
      proof_url: x.proof_url,
      status: x.status,
      payment_status: x.status,
      notes: x.notes,
      coupon_code: x.coupon_code,
      subtotal_amount: x.subtotal_amount == null ? null : Number(x.subtotal_amount),
      discount_amount: x.discount_amount == null ? 0 : Number(x.discount_amount),
      created_at: x.created_at,
      updated_at: x.updated_at,
      paid_at: x.paid_at
    };
  });

  const combined = [...wallet, ...purchases].sort((a, b) => {
    const time = new Date(b.created_at) - new Date(a.created_at);
    return time || String(b.id).localeCompare(String(a.id));
  });

  return {
    combined,
    purchases,
    // Kept for backwards compatibility with older clients; the new Wallet UI uses combined.
    leadPurchases: purchases.filter(x => x.purchase_type === 'lead')
  };
}

module.exports = { getHistory };
