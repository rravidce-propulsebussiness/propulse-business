const pool = require('../config/database');

async function getLinkedLeads({ investorId, investmentId = null }) {
  const values = [Number(investorId)];
  const extra = investmentId ? 'AND x.id=$2' : '';
  if (investmentId) values.push(Number(investmentId));
  return (await pool.query(`
    SELECT DISTINCT l.id,
      l.customer_name AS name,
      l.customer_phone AS phone,
      l.customer_email AS email,
      l.industry_id,
      i.name AS industry_name,
      s.name AS service_name,
      ss.name AS subservice_name,
      st.name AS state_name,
      c.name AS city_name,
      l.budget,
      l.requirement AS requirements,
      l.property_type,
      l.source,
      l.notes,
      l.custom_fields,
      l.pricing,
      l.lead_type,
      l.is_exclusive,
      l.exclusive_delay_days,
      l.buyer_capacity,
      l.pincode,
      l.status,
      l.created_at,
      l.updated_at,
      COALESCE(SUM(lp.amount) FILTER (WHERE lp.status='paid'),0) AS gross_sale_amount,
      COUNT(DISTINCT lp.id) FILTER (WHERE lp.status='paid')::int AS paid_sale_count,
      COUNT(DISTINCT lp.user_id) FILTER (WHERE lp.status='paid')::int AS purchased_buyer_count,
      COALESCE((SELECT SUM(a.allocated_amount)
        FROM investment_revenue_allocations a
        JOIN investments ix ON ix.id=a.investment_id
        WHERE ix.user_id=$1
          AND a.lead_purchase_id IN (SELECT id FROM lead_purchases WHERE lead_id=l.id)
      ),0) AS investor_revenue
    FROM leads l
    JOIN industries i ON i.id=l.industry_id
    LEFT JOIN services s ON s.id=l.service_id
    LEFT JOIN subservices ss ON ss.id=l.subservice_id
    LEFT JOIN states st ON st.id=l.state_id
    LEFT JOIN cities c ON c.id=l.city_id
    LEFT JOIN lead_purchases lp ON lp.lead_id=l.id
    JOIN investments x ON x.user_id=$1
      AND x.industry_id=l.industry_id
      AND x.status IN ('active','matured','paid')
      AND (x.state_id IS NULL OR l.state_id=x.state_id)
      AND (x.city_id IS NULL OR l.city_id=x.city_id)
      ${extra}
    WHERE l.investor_user_id=$1
    GROUP BY l.id,l.customer_name,l.customer_phone,l.customer_email,l.industry_id,i.name,s.name,ss.name,st.name,c.name,l.budget,l.requirement,l.property_type,l.source,l.notes,l.custom_fields,l.pricing,l.lead_type,l.is_exclusive,l.exclusive_delay_days,l.buyer_capacity,l.pincode,l.status,l.created_at,l.updated_at
    ORDER BY l.created_at DESC,l.id DESC
  `, values)).rows.map(row => ({
    ...row,
    gross_sale_amount: Number(row.gross_sale_amount || 0),
    paid_sale_count: Number(row.paid_sale_count || 0),
    purchased_buyer_count: Number(row.purchased_buyer_count || 0),
    buyer_capacity: Math.max(1, Number(row.buyer_capacity || 1)),
    remaining_buyer_slots: Math.max(0, Number(row.buyer_capacity || 1) - Number(row.purchased_buyer_count || 0)),
    investor_revenue: Number(row.investor_revenue || 0),
  }));
}

async function updateAdAmount({ investmentId, amount, adminId }) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) throw Object.assign(new Error('Amount in ads must be zero or greater'), { code:'INVALID_AMOUNT' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inv = (await client.query(`SELECT x.id,x.user_id,x.amount,x.amount_in_ads,x.status,COALESCE((SELECT SUM(s.amount) FROM investment_ad_spends s WHERE s.investment_id=x.id),0) AS ad_spent FROM investments x WHERE x.id=$1 FOR UPDATE`,[Number(investmentId)])).rows[0];
    if (!inv) throw Object.assign(new Error('Investment not found'),{code:'NOT_FOUND'});
    if (inv.status === 'cancelled') throw Object.assign(new Error('Cancelled investment cannot have ad allocation'),{code:'CANCELLED'});
    if (value > Number(inv.amount)) throw Object.assign(new Error('Amount in ads cannot exceed the investment amount'),{code:'AMOUNT_EXCEEDS_INVESTMENT'});
    if (value < Number(inv.ad_spent)) throw Object.assign(new Error(`Amount in ads cannot be lower than already spent amount ${Number(inv.ad_spent).toFixed(2)}`),{code:'ALLOCATION_BELOW_SPEND'});
    const nextStatus = value > 0 && Number(inv.ad_spent) >= value ? 'spent' : Number(inv.ad_spent) > 0 ? 'spending' : 'allocated';
    const updated=(await client.query(`UPDATE investments SET amount_in_ads=$1,ad_spend_status=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING id,user_id,amount,amount_in_ads,ad_spend_status,status,updated_at`,[value,nextStatus,Number(investmentId)])).rows[0];
    await client.query('COMMIT');
    return {...updated,amount:Number(updated.amount),amount_in_ads:Number(updated.amount_in_ads),updated_by_admin:Number(adminId)};
  } catch(error){await client.query('ROLLBACK');throw error}
  finally{client.release()}
}

async function getAdSpend({ investmentId }) {
  const investment = (await pool.query(`SELECT x.id,x.user_id,x.amount,x.amount_in_ads,x.ad_spend_status,x.status,COALESCE(SUM(s.amount),0) AS ad_spent FROM investments x LEFT JOIN investment_ad_spends s ON s.investment_id=x.id WHERE x.id=$1 GROUP BY x.id`, [Number(investmentId)])).rows[0];
  if (!investment) throw Object.assign(new Error('Investment not found'), { code:'NOT_FOUND' });
  const spends = (await pool.query(`SELECT s.id,s.amount,s.platform,s.campaign,s.spend_date,s.reference,s.notes,s.created_at,u.name AS created_by_name FROM investment_ad_spends s LEFT JOIN users u ON u.id=s.created_by WHERE s.investment_id=$1 ORDER BY s.spend_date DESC,s.id DESC`, [Number(investmentId)])).rows;
  const allocated = Number(investment.amount_in_ads || 0);
  const spent = Number(investment.ad_spent || 0);
  return {
    investment: {...investment, amount:Number(investment.amount), amount_in_ads:allocated, ad_spent:spent, ad_remaining:Math.max(0, allocated-spent)},
    spends: spends.map(s => ({...s, amount:Number(s.amount)}))
  };
}

async function recordAdSpend({ investmentId, amount, platform, campaign, spendDate, reference, notes, adminId }) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw Object.assign(new Error('Ad spend amount must be greater than zero'), { code:'INVALID_SPEND_AMOUNT' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inv = (await client.query(`SELECT x.id,x.amount,x.amount_in_ads,x.status,COALESCE((SELECT SUM(s.amount) FROM investment_ad_spends s WHERE s.investment_id=x.id),0) AS ad_spent FROM investments x WHERE x.id=$1 FOR UPDATE`, [Number(investmentId)])).rows[0];
    if (!inv) throw Object.assign(new Error('Investment not found'), { code:'NOT_FOUND' });
    if (inv.status === 'cancelled') throw Object.assign(new Error('Cancelled investment cannot record ad spend'), { code:'CANCELLED' });
    const allocated = Number(inv.amount_in_ads || 0);
    const spent = Number(inv.ad_spent || 0);
    const remaining = Math.max(0, allocated - spent);
    if (allocated <= 0) throw Object.assign(new Error('Allocate an ad budget before recording ad spend'), { code:'NO_AD_ALLOCATION' });
    if (value > remaining) throw Object.assign(new Error(`Ad spend cannot exceed the remaining ad budget of ${remaining.toFixed(2)}`), { code:'SPEND_EXCEEDS_ALLOCATION' });
    const result = (await client.query(`INSERT INTO investment_ad_spends(investment_id,amount,platform,campaign,spend_date,reference,notes,created_by) VALUES($1,$2,$3,$4,COALESCE($5::timestamp,CURRENT_TIMESTAMP),$6,$7,$8) RETURNING *`, [Number(investmentId),value,String(platform||'').trim()||null,String(campaign||'').trim()||null,spendDate ? String(spendDate) : null,String(reference||'').trim()||null,String(notes||'').trim()||null,Number(adminId)])).rows[0];
    const nextSpent = spent + value;
    const nextStatus = nextSpent >= allocated ? 'spent' : 'spending';
    await client.query(`UPDATE investments SET ad_spend_status=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2`, [nextStatus, Number(investmentId)]);
    await client.query('COMMIT');
    return {...result,amount:Number(result.amount),ad_spent:Number(nextSpent.toFixed(2)),ad_remaining:Number(Math.max(0,allocated-nextSpent).toFixed(2)),ad_spend_status:nextStatus};
  } catch(error){await client.query('ROLLBACK');throw error}
  finally{client.release()}
}

async function payout({ investmentId, adminId, transferReference, proofUrl }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inv = (await client.query('SELECT * FROM investments WHERE id=$1 FOR UPDATE', [investmentId])).rows[0];
    if (!inv) throw Object.assign(new Error('Investment not found'), { code: 'NOT_FOUND' });
    if (inv.status === 'paid') throw Object.assign(new Error('Investment has already been paid'), { code: 'ALREADY_PAID' });
    if (inv.status === 'cancelled') throw Object.assign(new Error('Cancelled investment cannot be paid'), { code: 'CANCELLED' });
    if (new Date(inv.matures_at) > new Date()) throw Object.assign(new Error('Investment has not matured yet'), { code: 'NOT_MATURED' });
    const revenue = Number((await client.query('SELECT COALESCE(SUM(allocated_amount),0) AS total FROM investment_revenue_allocations WHERE investment_id=$1',[inv.id])).rows[0].total || 0);
    const payoutAmount = Number(revenue.toFixed(2));
    const reference = String(transferReference || '').trim();
    if (!reference) throw Object.assign(new Error('Transfer reference / UTR is required'), { code: 'TRANSFER_REFERENCE_REQUIRED' });
    if (!proofUrl) throw Object.assign(new Error('Transfer screenshot or proof is required'), { code: 'TRANSFER_PROOF_REQUIRED' });
    const duplicate = (await client.query('SELECT id FROM investments WHERE payout_transfer_reference=$1 AND id<>$2 LIMIT 1',[reference,inv.id])).rows[0];
    if (duplicate) throw Object.assign(new Error('This transfer reference has already been used'), { code: 'DUPLICATE_TRANSFER_REFERENCE' });
    const updated = (await client.query(`UPDATE investments SET status='paid',realized_revenue=$1,payout_amount=$1,payout_transfer_reference=$2,payout_proof_url=$3,payout_transferred_at=CURRENT_TIMESTAMP,payout_transferred_by=$4,updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING *`,[payoutAmount,reference,proofUrl,adminId,inv.id])).rows[0];
    if (payoutAmount > 0) await client.query(`INSERT INTO investment_transactions(investment_id,user_id,type,amount,reference_type,reference_id) VALUES($1,$2,'return',$3,'admin_payout',$4)`,[inv.id,inv.user_id,payoutAmount,adminId]);
    await client.query('COMMIT');
    return {...updated,amount:Number(updated.amount),realized_revenue:payoutAmount,payout_amount:payoutAmount,payout_destination:'owner_account'};
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

module.exports = { getLinkedLeads, updateAdAmount, getAdSpend, recordAdSpend, payout };
