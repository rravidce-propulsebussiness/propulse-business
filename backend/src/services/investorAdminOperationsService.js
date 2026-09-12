const pool = require('../config/database');

async function getLinkedLeads({ investorId, investmentId = null }) {
  const values = [Number(investorId)];
  const extra = investmentId ? 'AND x.id=$2' : '';
  if (investmentId) values.push(Number(investmentId));
  return (await pool.query(`
    SELECT DISTINCT l.id,l.customer_name AS name,l.customer_phone AS phone,l.customer_email AS email,l.industry_id,i.name AS industry_name,s.name AS service_name,ss.name AS subservice_name,st.name AS state_name,c.name AS city_name,l.budget,l.requirement AS requirements,l.property_type,l.source,l.notes,l.custom_fields,l.pricing,l.lead_type,l.is_exclusive,l.exclusive_delay_days,l.buyer_capacity,l.pincode,l.status,l.created_at,l.updated_at,
      COALESCE(SUM(lp.amount) FILTER (WHERE lp.status='paid'),0) AS gross_sale_amount,COUNT(DISTINCT lp.id) FILTER (WHERE lp.status='paid')::int AS paid_sale_count,COUNT(DISTINCT lp.user_id) FILTER (WHERE lp.status='paid')::int AS purchased_buyer_count,
      COALESCE((SELECT SUM(a.allocated_amount) FROM investment_revenue_allocations a JOIN investments ix ON ix.id=a.investment_id WHERE ix.user_id=$1 AND a.lead_purchase_id IN (SELECT id FROM lead_purchases WHERE lead_id=l.id)),0) AS investor_revenue
    FROM leads l JOIN industries i ON i.id=l.industry_id LEFT JOIN services s ON s.id=l.service_id LEFT JOIN subservices ss ON ss.id=l.subservice_id LEFT JOIN states st ON st.id=l.state_id LEFT JOIN cities c ON c.id=l.city_id LEFT JOIN lead_purchases lp ON lp.lead_id=l.id
    JOIN investments x ON x.user_id=$1 AND x.industry_id=l.industry_id AND x.status IN ('active','matured','paid') AND (x.state_id IS NULL OR l.state_id=x.state_id) AND (x.city_id IS NULL OR l.city_id=x.city_id) ${extra}
    WHERE l.investor_user_id=$1
    GROUP BY l.id,l.customer_name,l.customer_phone,l.customer_email,l.industry_id,i.name,s.name,ss.name,st.name,c.name,l.budget,l.requirement,l.property_type,l.source,l.notes,l.custom_fields,l.pricing,l.lead_type,l.is_exclusive,l.exclusive_delay_days,l.buyer_capacity,l.pincode,l.status,l.created_at,l.updated_at
    ORDER BY l.created_at DESC,l.id DESC
  `, values)).rows.map(row => ({...row,gross_sale_amount:Number(row.gross_sale_amount||0),paid_sale_count:Number(row.paid_sale_count||0),purchased_buyer_count:Number(row.purchased_buyer_count||0),buyer_capacity:Math.max(1,Number(row.buyer_capacity||1)),remaining_buyer_slots:Math.max(0,Number(row.buyer_capacity||1)-Number(row.purchased_buyer_count||0)),investor_revenue:Number(row.investor_revenue||0)}));
}

async function updateAdAmount({ investmentId, amount, adminId }) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw Object.assign(new Error('Ad allocation must be greater than zero'), { code:'INVALID_AMOUNT' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inv = (await client.query(`SELECT x.id,x.user_id,x.amount,x.amount_in_ads,x.status FROM investments x WHERE x.id=$1 FOR UPDATE`,[Number(investmentId)])).rows[0];
    if (!inv) throw Object.assign(new Error('Investment not found'),{code:'NOT_FOUND'});
    if (inv.status === 'cancelled') throw Object.assign(new Error('Cancelled investment cannot have ad allocation'),{code:'CANCELLED'});
    const current = (await client.query(`SELECT aa.id,aa.amount,aa.status,COALESCE((SELECT SUM(s.amount) FROM investment_ad_spends s WHERE s.allocation_id=aa.id),0) AS spent FROM investment_ad_allocations aa WHERE aa.investment_id=$1 AND aa.status IN ('allocated','spending') ORDER BY aa.id DESC LIMIT 1 FOR UPDATE`,[Number(investmentId)])).rows[0];
    const currentSpent = Number(current?.spent || 0);
    if (current && value < currentSpent) throw Object.assign(new Error(`Ad allocation cannot be lower than ${currentSpent.toFixed(2)} already spent from the current allocation`),{code:'ALLOCATION_BELOW_SPEND'});
    const totalSpent = Number((await client.query(`SELECT COALESCE(SUM(amount),0) AS total FROM investment_ad_spends WHERE investment_id=$1`,[Number(investmentId)])).rows[0].total || 0);
    const currentUnspent = current ? Math.max(0,Number(current.amount)-currentSpent) : 0;
    const fundsAvailable = Number(inv.amount) - totalSpent - currentUnspent;
    const maxNewAllocation = fundsAvailable + currentUnspent;
    if (value > maxNewAllocation) throw Object.assign(new Error(`Ad allocation cannot exceed the funds currently available for ads: ${Math.max(0,fundsAvailable+currentUnspent).toFixed(2)}`),{code:'AMOUNT_EXCEEDS_AVAILABLE_AD_FUNDS'});
    let allocation;
    if (current) {
      allocation=(await client.query(`UPDATE investment_ad_allocations SET amount=$1,status=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *`,[value,currentSpent>0?'spending':'allocated',current.id])).rows[0];
    } else {
      allocation=(await client.query(`INSERT INTO investment_ad_allocations(investment_id,amount,status,created_by) VALUES($1,$2,'allocated',$3) RETURNING *`,[Number(investmentId),value,Number(adminId)])).rows[0];
    }
    const updated=(await client.query(`UPDATE investments SET amount_in_ads=$1,ad_spend_status=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING id,user_id,amount,amount_in_ads,ad_spend_status,status,updated_at`,[value,currentSpent>0?'spending':'allocated',Number(investmentId)])).rows[0];
    await client.query('COMMIT');
    return {...updated,amount:Number(updated.amount),amount_in_ads:Number(updated.amount_in_ads),allocation_id:Number(allocation.id),current_ad_spent:currentSpent,funds_available_for_ads:Number((Number(inv.amount)-totalSpent-Math.max(0,value-currentSpent)).toFixed(2)),updated_by_admin:Number(adminId)};
  } catch(error){await client.query('ROLLBACK');throw error}
  finally{client.release()}
}

async function getAdSpend({ investmentId }) {
  const investment = (await pool.query(`SELECT x.id,x.user_id,x.amount,x.amount_in_ads,x.ad_spend_status,x.status,COALESCE((SELECT SUM(s.amount) FROM investment_ad_spends s WHERE s.investment_id=x.id),0) AS total_ad_spent FROM investments x WHERE x.id=$1`, [Number(investmentId)])).rows[0];
  if (!investment) throw Object.assign(new Error('Investment not found'), { code:'NOT_FOUND' });
  const allocations = (await pool.query(`SELECT aa.id,aa.amount,aa.status,aa.created_at,aa.updated_at,COALESCE((SELECT SUM(s.amount) FROM investment_ad_spends s WHERE s.allocation_id=aa.id),0) AS spent FROM investment_ad_allocations aa WHERE aa.investment_id=$1 ORDER BY aa.id DESC`, [Number(investmentId)])).rows.map(a=>({...a,amount:Number(a.amount),spent:Number(a.spent||0),remaining:Number(Math.max(0,Number(a.amount)-Number(a.spent||0)))}));
  const spends = (await pool.query(`SELECT s.id,s.allocation_id,s.amount,s.platform,s.campaign,s.spend_date,s.reference,s.notes,s.created_at,u.name AS created_by_name FROM investment_ad_spends s LEFT JOIN users u ON u.id=s.created_by WHERE s.investment_id=$1 ORDER BY s.spend_date DESC,s.id DESC`, [Number(investmentId)])).rows.map(s=>({...s,amount:Number(s.amount)}));
  const totalSpent=Number(investment.total_ad_spent||0);
  const currentAllocation=allocations.find(a=>['allocated','spending'].includes(String(a.status))) || null;
  const currentAllocated=Number(currentAllocation?.amount||0);
  const currentSpent=Number(currentAllocation?.spent||0);
  const currentRemaining=Math.max(0,currentAllocated-currentSpent);
  const fundsAvailable=Math.max(0,Number(investment.amount)-totalSpent-currentRemaining);
  return {investment:{...investment,amount:Number(investment.amount),amount_in_ads:currentAllocated,ad_spent:totalSpent,current_ad_spent:currentSpent,ad_remaining:currentRemaining,funds_available_for_ads:Number(fundsAvailable.toFixed(2)),total_ad_allocated:Number(allocations.reduce((sum,a)=>sum+a.amount,0).toFixed(2))},allocations,spends};
}

async function recordAdSpend({ investmentId, amount, platform, campaign, spendDate, reference, notes, adminId }) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw Object.assign(new Error('Ad spend amount must be greater than zero'), { code:'INVALID_SPEND_AMOUNT' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const investment = (await client.query(`SELECT id,amount,status FROM investments WHERE id=$1 FOR UPDATE`,[Number(investmentId)])).rows[0];
    if (!investment) throw Object.assign(new Error('Investment not found'), { code:'NOT_FOUND' });
    if (investment.status === 'cancelled') throw Object.assign(new Error('Cancelled investment cannot record ad spend'), { code:'CANCELLED' });
    let allocation = (await client.query(`SELECT aa.id,aa.amount,aa.status,COALESCE((SELECT SUM(s.amount) FROM investment_ad_spends s WHERE s.allocation_id=aa.id),0) AS spent FROM investment_ad_allocations aa WHERE aa.investment_id=$1 AND aa.status IN ('allocated','spending') ORDER BY aa.id DESC LIMIT 1 FOR UPDATE`,[Number(investmentId)])).rows[0];
    if (!allocation) {
      const totalSpentBefore = Number((await client.query(`SELECT COALESCE(SUM(amount),0) AS total FROM investment_ad_spends WHERE investment_id=$1`,[Number(investmentId)])).rows[0].total||0);
      const available = Math.max(0,Number(investment.amount)-totalSpentBefore);
      if (value > available + 1e-6) throw Object.assign(new Error(`Ad spend exceeds available ad funds of ₹${available.toFixed(2)}`),{code:'SPEND_EXCEEDS_AVAILABLE_AD_FUNDS'});
      allocation=(await client.query(`INSERT INTO investment_ad_allocations(investment_id,amount,status,created_by) VALUES($1,$2,'allocated',$3) RETURNING id,amount,status`,[Number(investmentId),value,Number(adminId)])).rows[0];
      allocation.spent=0;
    }
    const allocated=Number(allocation.amount); const spent=Number(allocation.spent||0); const remaining=Math.max(0,allocated-spent);
    if (value > remaining + 1e-6) throw Object.assign(new Error(`Ad spend cannot exceed the current allocation remaining amount of ${remaining.toFixed(2)}`), { code:'SPEND_EXCEEDS_ALLOCATION' });
    const result=(await client.query(`INSERT INTO investment_ad_spends(investment_id,allocation_id,amount,platform,campaign,spend_date,reference,notes,created_by) VALUES($1,$2,$3,$4,$5,COALESCE($6::timestamp,CURRENT_TIMESTAMP),$7,$8,$9) RETURNING *`,[Number(investmentId),Number(allocation.id),value,String(platform||'').trim()||null,String(campaign||'').trim()||null,spendDate ? String(spendDate) : null,String(reference||'').trim()||null,String(notes||'').trim()||null,Number(adminId)])).rows[0];
    const nextSpent=spent+value; const nextStatus=nextSpent>=allocated?'spent':'spending';
    await client.query(`UPDATE investment_ad_allocations SET status=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2`,[nextStatus,Number(allocation.id)]);
    await client.query(`UPDATE investments SET amount_in_ads=$1,ad_spend_status=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3`,[nextStatus==='spent'?0:allocated,nextStatus,Number(investmentId)]);
    const totalSpent=Number((await client.query(`SELECT COALESCE(SUM(amount),0) AS total FROM investment_ad_spends WHERE investment_id=$1`,[Number(investmentId)])).rows[0].total||0);
    const fundsAvailable=Math.max(0,Number(investment.amount)-totalSpent-(nextStatus==='spent'?0:Math.max(0,allocated-nextSpent)));
    await client.query('COMMIT');
    return {...result,amount:Number(result.amount),allocation_id:Number(allocation.id),ad_spent:Number(totalSpent.toFixed(2)),current_ad_spent:Number(nextSpent.toFixed(2)),ad_remaining:Number(Math.max(0,allocated-nextSpent).toFixed(2)),funds_available_for_ads:Number(fundsAvailable.toFixed(2)),ad_spend_status:nextStatus};
  } catch(error){await client.query('ROLLBACK');throw error}
  finally{client.release()}
}

async function payout({ investmentId, adminId, transferReference, proofUrl, forceTransfer = false }) {
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
    if (payoutAmount <= 0) throw Object.assign(new Error('There are no realized earnings available for settlement'), { code:'NO_REALIZED_AMOUNT' });
    if (Boolean(inv.reinvestment_enabled) && !forceTransfer) {
      const existing = (await client.query('SELECT id FROM investments WHERE parent_investment_id=$1 LIMIT 1',[inv.id])).rows[0];
      if (existing) throw Object.assign(new Error('This investment has already been reinvested'), { code:'REINVESTMENT_EXISTS' });
      const rule = (await client.query('SELECT * FROM investment_industry_rules WHERE industry_id=$1 AND is_active=TRUE FOR UPDATE',[Number(inv.industry_id)])).rows[0];
      if (!rule) throw Object.assign(new Error('Investment is no longer available for this industry'), { code:'INDUSTRY_UNAVAILABLE' });
      if (payoutAmount > Number(rule.maximum_amount)) throw Object.assign(new Error(`Realized earnings ${payoutAmount.toFixed(2)} exceed the maximum cycle amount of ${Number(rule.maximum_amount).toFixed(2)}`), { code:'REINVESTMENT_ABOVE_MAXIMUM' });
      if (!inv.state_id) throw Object.assign(new Error('Investment location is required for reinvestment'), { code:'LOCATION_REQUIRED' });
      const location = (await client.query(`SELECT l.* FROM investor_industry_location_limits l WHERE l.industry_id=$1 AND l.state_id=$2 AND (l.city_id IS NULL OR l.city_id=$3) AND l.is_active=TRUE ORDER BY CASE WHEN l.city_id=$3 THEN 0 ELSE 1 END,l.id LIMIT 1 FOR UPDATE`,[Number(inv.industry_id),Number(inv.state_id),inv.city_id?Number(inv.city_id):null])).rows[0];
      if (!location) throw Object.assign(new Error('Investment is no longer available for this industry and location'), { code:'LOCATION_UNAVAILABLE' });
      const params=[Number(inv.industry_id),Number(inv.state_id)]; let where="industry_id=$1 AND state_id=$2 AND status IN ('active','matured','paid') AND user_id<>$3";
      params.push(Number(inv.user_id));
      if (location.city_id !== null) { params.push(Number(location.city_id)); where += ' AND city_id=$4'; }
      const used=Number((await client.query(`SELECT COUNT(DISTINCT user_id)::int AS total FROM investments WHERE ${where}`,params)).rows[0].total||0);
      if (used >= Number(location.investor_limit)) throw Object.assign(new Error('Investor limit completed for this industry and location'), { code:'LOCATION_CAPACITY_REACHED' });
      const settings=(await client.query('SELECT investment_cycle_days FROM investor_settings WHERE id=1 FOR SHARE')).rows[0];
      const configuredCycle=settings?.investment_cycle_days==null?null:Number(settings.investment_cycle_days);
      const maturityDays=configuredCycle===null?Number(rule.maturity_days??30):configuredCycle;
      const childStatus=maturityDays===0?'matured':'active';
      const child=(await client.query(`INSERT INTO investments(user_id,industry_id,state_id,city_id,amount,amount_in_ads,ad_spend_status,status,maturity_days,starts_at,matures_at,reinvestment_enabled,parent_investment_id) VALUES($1,$2,$3,$4,$5,0,'unallocated',$6,$7,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+make_interval(days=>$7),FALSE,$8) RETURNING *`,[Number(inv.user_id),Number(inv.industry_id),Number(inv.state_id),inv.city_id?Number(inv.city_id):null,payoutAmount,childStatus,maturityDays,inv.id])).rows[0];
      await client.query(`UPDATE investments SET status='paid',payout_amount=$1,payout_transfer_reference=$2,payout_proof_url=$3,reinvestment_child_investment_id=$4,updated_at=CURRENT_TIMESTAMP WHERE id=$5`,[0,'REINVESTMENT-'+child.id,null,child.id,inv.id]);
      await client.query('COMMIT');
      return { investment: {...inv,status:'paid',payout_amount:0,payout_transfer_reference:'REINVESTMENT-'+child.id,payout_proof_url:null,reinvestment_child_investment_id:child.id}, reinvestment: child, payout_amount:payoutAmount, transferred_to_investor:0 };
    }
    if (!String(transferReference || '').trim()) throw Object.assign(new Error('Transfer reference is required'), { code:'TRANSFER_REFERENCE_REQUIRED' });
    if (!String(proofUrl || '').trim()) throw Object.assign(new Error('Transfer proof is required'), { code:'TRANSFER_PROOF_REQUIRED' });
    await client.query(`UPDATE investments SET status='paid',payout_amount=$1,payout_transfer_reference=$2,payout_proof_url=$3,updated_at=CURRENT_TIMESTAMP WHERE id=$4`,[payoutAmount,String(transferReference).trim(),String(proofUrl).trim(),inv.id]);
    await client.query('COMMIT');
    return { investment: {...inv,status:'paid',payout_amount:payoutAmount,payout_transfer_reference:String(transferReference).trim(),payout_proof_url:String(proofUrl).trim()}, payout_amount:payoutAmount, transferred_to_investor:payoutAmount };
  } catch(error){await client.query('ROLLBACK');throw error}
  finally{client.release()}
}

module.exports={getLinkedLeads,updateAdAmount,getAdSpend,recordAdSpend,payout};
