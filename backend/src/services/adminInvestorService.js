const pool = require('../config/database');

async function getLinkedLeads({ userId }) {
  return (await pool.query(`
    SELECT DISTINCT
      l.id,l.name,l.phone,l.email,l.work_phone,l.industry_id,
      i.name AS industry_name,s.name AS service_name,
      st.name AS state_name,c.name AS city_name,
      l.budget,l.requirements,l.status,l.created_at,
      COALESCE(SUM(lp.amount) FILTER (WHERE lp.status='paid'),0) AS gross_sale_amount,
      COUNT(DISTINCT lp.id) FILTER (WHERE lp.status='paid')::int AS paid_sale_count
    FROM leads l
    JOIN industries i ON i.id=l.industry_id
    LEFT JOIN services s ON s.id=l.service_id
    LEFT JOIN states st ON st.id=l.state_id
    LEFT JOIN cities c ON c.id=l.city_id
    LEFT JOIN lead_purchases lp ON lp.lead_id=l.id
    WHERE l.investor_user_id=$1
    GROUP BY l.id,i.name,s.name,st.name,c.name
    ORDER BY l.created_at DESC,l.id DESC
  `,[Number(userId)])).rows.map(row => ({
    ...row,
    gross_sale_amount: Number(row.gross_sale_amount || 0),
    paid_sale_count: Number(row.paid_sale_count || 0),
  }));
}

async function payout({ investmentId, adminId, transferReference, proofUrl }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inv = (await client.query('SELECT * FROM investments WHERE id=$1 FOR UPDATE',[Number(investmentId)])).rows[0];
    if (!inv) throw Object.assign(new Error('Investment not found'),{code:'NOT_FOUND'});
    if (String(inv.status).toLowerCase()==='paid') throw Object.assign(new Error('Investment has already been paid'),{code:'ALREADY_PAID'});
    if (String(inv.status).toLowerCase()==='cancelled') throw Object.assign(new Error('Cancelled investment cannot be paid'),{code:'CANCELLED'});
    if (new Date(inv.matures_at)>new Date()) throw Object.assign(new Error('Investment has not matured yet'),{code:'NOT_MATURED'});
    const reference=String(transferReference||'').trim();
    if (!reference) throw Object.assign(new Error('Transfer reference / UTR is required'),{code:'TRANSFER_REFERENCE_REQUIRED'});
    if (!proofUrl) throw Object.assign(new Error('Transfer screenshot or proof is required'),{code:'TRANSFER_PROOF_REQUIRED'});
    const duplicate=(await client.query(`SELECT id FROM investments WHERE payout_transfer_reference=$1 AND id<>$2 LIMIT 1`,[reference,inv.id])).rows[0];
    if (duplicate) throw Object.assign(new Error('This transfer reference has already been used'),{code:'DUPLICATE_TRANSFER_REFERENCE'});
    const revenue=Number((await client.query(`SELECT COALESCE(SUM(allocated_amount),0) AS total FROM investment_revenue_allocations WHERE investment_id=$1`,[inv.id])).rows[0].total||0);
    const payoutAmount=Number(revenue.toFixed(2));
    const updated=(await client.query(`
      UPDATE investments SET
        status='paid',realized_revenue=$1,payout_amount=$1,
        payout_transfer_reference=$2,payout_proof_url=$3,
        payout_transferred_at=CURRENT_TIMESTAMP,payout_transferred_by=$4,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=$5 RETURNING *
    `,[payoutAmount,reference,proofUrl,adminId,inv.id])).rows[0];
    await client.query(`INSERT INTO investment_transactions(investment_id,user_id,type,amount,reference_type,reference_id) VALUES($1,$2,'return',$3,'admin_payout',$4)`,[inv.id,inv.user_id,payoutAmount,adminId]);
    await client.query('COMMIT');
    return {...updated,amount:Number(updated.amount),realized_revenue:payoutAmount,payout_amount:payoutAmount};
  } catch(error) {
    await client.query('ROLLBACK');
    if (error.code==='23505') throw Object.assign(new Error('This transfer reference has already been used'),{code:'DUPLICATE_TRANSFER_REFERENCE'});
    throw error;
  } finally { client.release(); }
}

module.exports={getLinkedLeads,payout};
