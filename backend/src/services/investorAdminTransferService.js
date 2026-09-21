const pool = require('../config/database');

async function transferInvestorEarnings({ userId, adminId, transferReference, proofUrl }) {
  const reference = String(transferReference || '').trim();
  const proof = String(proofUrl || '').trim();
  if (!reference) throw Object.assign(new Error('Transfer reference / UTR is required'), { code: 'TRANSFER_REFERENCE_REQUIRED' });
  if (!proof) throw Object.assign(new Error('Transfer proof is required'), { code: 'TRANSFER_PROOF_REQUIRED' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`investor-payout-reference:${reference.toLowerCase()}`]);
    const duplicate = (await client.query(`SELECT id FROM investor_payout_requests WHERE LOWER(BTRIM(transfer_reference))=LOWER(BTRIM($1)) UNION ALL SELECT id FROM investments WHERE LOWER(BTRIM(payout_transfer_reference))=LOWER(BTRIM($1)) LIMIT 1`, [reference])).rows[0];
    if (duplicate) throw Object.assign(new Error('This transfer reference has already been used'), { code: 'DUPLICATE_REFERENCE' });

    const investments = (await client.query(`
      SELECT i.id
      FROM investments i
      WHERE i.user_id=$1
        AND i.status IN ('active','matured')
        AND i.reinvestment_enabled=FALSE
        AND i.matures_at<=CURRENT_TIMESTAMP
        AND EXISTS (
          SELECT 1 FROM investment_revenue_allocations a
          WHERE a.investment_id=i.id
        )
      ORDER BY i.id
      FOR UPDATE
    `, [Number(userId)])).rows;

    if (!investments.length) {
      throw Object.assign(new Error('There are no matured non-auto-invest earnings ready for transfer'), { code: 'NO_REALIZED_AMOUNT' });
    }

    const settled = [];
    let total = 0;
    for (const row of investments) {
      const revenue = Number((await client.query(`
        SELECT COALESCE(SUM(allocated_amount),0) AS total
        FROM investment_revenue_allocations
        WHERE investment_id=$1
      `, [Number(row.id)])).rows[0]?.total || 0);
      const amount = Number(revenue.toFixed(2));
      if (amount <= 0) continue;

      const rowReference = investments.length === 1 ? reference : `${reference} / INV-${row.id}`;
      await client.query(`
        UPDATE investments
        SET status='paid',
            payout_amount=$1,
            payout_transfer_reference=$2,
            payout_proof_url=$3,
            updated_at=CURRENT_TIMESTAMP
        WHERE id=$4
      `, [amount, rowReference, proof, Number(row.id)]);

      total += amount;
      settled.push({ investment_id: Number(row.id), amount, transfer_reference: rowReference });
    }

    if (total <= 0) {
      throw Object.assign(new Error('There are no realized earnings available for transfer'), { code: 'NO_REALIZED_AMOUNT' });
    }

    await client.query('COMMIT');
    return {
      user_id: Number(userId),
      transferred_amount: Number(total.toFixed(2)),
      investments_settled: settled.length,
      transfer_reference: reference,
      proof_url: proof,
      processed_by: Number(adminId),
      investments: settled,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { transferInvestorEarnings };
