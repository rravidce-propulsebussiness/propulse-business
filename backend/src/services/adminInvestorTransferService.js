const pool = require('../config/database');
const payoutAccounts = require('./investorPayoutAccountService');

async function transferInvestorEarnings({ userId, adminId, transferReference, proofUrl }) {
  const reference = String(transferReference || '').trim();
  const proof = String(proofUrl || '').trim();
  if (!reference) throw Object.assign(new Error('Transfer reference / UTR is required'), { code:'TRANSFER_REFERENCE_REQUIRED' });
  if (!proof) throw Object.assign(new Error('Transfer proof is required'), { code:'TRANSFER_PROOF_REQUIRED' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const account = await payoutAccounts.getInternal(client, Number(userId));
    if (!account) throw Object.assign(new Error('Investor must add a Bank Account or UPI before money can be transferred'), { code:'PAYOUT_ACCOUNT_REQUIRED' });

    const duplicate = (await client.query('SELECT id FROM investments WHERE payout_transfer_reference=$1 LIMIT 1', [reference])).rows[0];
    if (duplicate) throw Object.assign(new Error('This transfer reference has already been used'), { code:'DUPLICATE_TRANSFER_REFERENCE' });

    const investments = (await client.query(`
      SELECT x.id, x.amount, x.status, x.matures_at,
             COALESCE(SUM(a.allocated_amount),0) AS earnings
      FROM investments x
      LEFT JOIN investment_revenue_allocations a ON a.investment_id=x.id
      WHERE x.user_id=$1
        AND x.status IN ('active','matured')
        AND COALESCE(x.reinvestment_enabled,FALSE)=FALSE
        AND x.matures_at <= CURRENT_TIMESTAMP
      GROUP BY x.id
      HAVING COALESCE(SUM(a.allocated_amount),0) > 0
      ORDER BY x.matures_at ASC, x.id ASC
      FOR UPDATE OF x
    `, [Number(userId)])).rows;

    if (!investments.length) throw Object.assign(new Error('No non-auto-invest earnings are ready for bank transfer'), { code:'NO_TRANSFERABLE_EARNINGS' });

    const total = investments.reduce((sum, row) => sum + Number(row.earnings || 0), 0);
    const payoutAmount = Number(total.toFixed(2));
    const snapshot = account.method === 'upi'
      ? { method:'upi', upi_id:account.upi_id }
      : { method:'bank', account_holder_name:account.account_holder_name, account_number:account.account_number, ifsc_code:account.ifsc_code, bank_name:account.bank_name };

    for (const row of investments) {
      const amount = Number(Number(row.earnings || 0).toFixed(2));
      await client.query(`
        UPDATE investments
        SET status='paid', payout_amount=$1, payout_transfer_reference=$2,
            payout_proof_url=$3, updated_at=CURRENT_TIMESTAMP
        WHERE id=$4
      `, [amount, reference, proof, Number(row.id)]);
    }

    await client.query('COMMIT');
    return {
      user_id:Number(userId),
      transferred_amount:payoutAmount,
      investment_count:investments.length,
      transfer_reference:reference,
      proof_url:proof,
      payout_method:account.method,
      payout_account_snapshot:snapshot,
      transferred_by_admin:Number(adminId),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

module.exports = { transferInvestorEarnings };
