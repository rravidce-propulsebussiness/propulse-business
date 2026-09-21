const pool = require('../config/database');
const ledger = require('./investorFinancialLedgerService');
const payoutAccounts = require('./investorPayoutAccountService');

async function transferInvestorEarnings({ userId, adminId, transferReference, proofUrl }) {
  const reference = String(transferReference || '').trim();
  const proof = String(proofUrl || '').trim();
  if (!reference) throw Object.assign(new Error('Transfer reference / UTR is required'), { code:'TRANSFER_REFERENCE_REQUIRED' });
  if (!proof) throw Object.assign(new Error('Transfer proof is required'), { code:'TRANSFER_PROOF_REQUIRED' });

  const investorId = Number(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ledger.lockInvestorFinancials(client, investorId);

    const account = await payoutAccounts.getInternal(client, investorId);
    if (!account) throw Object.assign(new Error('Investor must add a Bank Account or UPI before money can be transferred'), { code:'PAYOUT_ACCOUNT_REQUIRED' });

    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      [`investor-payout-reference:${reference.toLowerCase()}`],
    );

    const duplicate = (await client.query(`
      SELECT id
      FROM investor_payout_requests
      WHERE LOWER(BTRIM(transfer_reference))=LOWER(BTRIM($1))
      UNION ALL
      SELECT id
      FROM investments
      WHERE LOWER(BTRIM(payout_transfer_reference))=LOWER(BTRIM($1))
      LIMIT 1
    `, [reference])).rows[0];
    if (duplicate) throw Object.assign(new Error('This transfer reference has already been used'), { code:'DUPLICATE_TRANSFER_REFERENCE' });

    const investments = (await client.query(`
      SELECT i.id
      FROM investments i
      WHERE i.user_id=$1
        AND i.status IN ('active','matured')
        AND COALESCE(i.reinvestment_enabled,FALSE)=FALSE
        AND i.matures_at <= CURRENT_TIMESTAMP
        AND EXISTS (
          SELECT 1
          FROM investment_revenue_allocations a
          WHERE a.investment_id=i.id
        )
      ORDER BY i.matures_at ASC, i.id ASC
      FOR UPDATE OF i
    `, [investorId])).rows;

    if (!investments.length) throw Object.assign(new Error('No non-auto-invest earnings are ready for bank transfer'), { code:'NO_TRANSFERABLE_EARNINGS' });

    const summary = await ledger.getInvestorFinancialSummary(investorId, client);
    let remaining = Number(summary.non_auto_earnings_withdrawable || 0);
    let total = 0;
    const settled = [];

    for (const row of investments) {
      const revenue = Number((await client.query(`
        SELECT COALESCE(SUM(allocated_amount),0) AS total
        FROM investment_revenue_allocations
        WHERE investment_id=$1
      `, [Number(row.id)])).rows[0]?.total || 0);
      const amount = Number(revenue.toFixed(2));
      if (amount <= 0 || amount > remaining + 1e-6) continue;

      await client.query(`
        UPDATE investments
        SET status='paid',
            payout_amount=$1,
            payout_transfer_reference=$2,
            payout_proof_url=$3,
            updated_at=CURRENT_TIMESTAMP
        WHERE id=$4
      `, [amount, reference, proof, Number(row.id)]);

      total += amount;
      remaining = Math.max(0, remaining - amount);
      settled.push({ investment_id:Number(row.id), amount });
    }

    if (total <= 0) throw Object.assign(new Error('There are no realized earnings available for transfer'), { code:'NO_REALIZED_AMOUNT' });

    const payoutAmount = Number(total.toFixed(2));
    const snapshot = account.method === 'upi'
      ? { method:'upi', upi_id:account.upi_id }
      : { method:'bank', account_holder_name:account.account_holder_name, account_number:account.account_number, ifsc_code:account.ifsc_code, bank_name:account.bank_name };

    await client.query('COMMIT');
    return {
      user_id:investorId,
      transferred_amount:payoutAmount,
      investment_count:settled.length,
      investments_settled:settled.length,
      transfer_reference:reference,
      proof_url:proof,
      payout_method:account.method,
      payout_account_snapshot:snapshot,
      transferred_by_admin:Number(adminId),
      processed_by:Number(adminId),
      investments:settled,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

module.exports = { transferInvestorEarnings };