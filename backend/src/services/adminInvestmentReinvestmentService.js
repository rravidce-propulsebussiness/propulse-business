const pool = require('../config/database');

async function reinvestFromEarnings({ investmentId, adminId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const inv = (await client.query('SELECT * FROM investments WHERE id=$1 FOR UPDATE', [Number(investmentId)])).rows[0];
    if (!inv) throw Object.assign(new Error('Investment not found'), { code:'NOT_FOUND' });
    if (String(inv.status).toLowerCase() === 'paid') throw Object.assign(new Error('Investment has already been settled'), { code:'ALREADY_PAID' });
    if (String(inv.status).toLowerCase() === 'cancelled') throw Object.assign(new Error('Cancelled investment cannot be reinvested'), { code:'CANCELLED' });
    if (new Date(inv.matures_at) > new Date()) throw Object.assign(new Error('Investment has not matured yet'), { code:'NOT_MATURED' });
    if (!Boolean(inv.reinvestment_enabled)) throw Object.assign(new Error('Investor has not selected reinvestment for this cycle'), { code:'REINVESTMENT_DISABLED' });

    const existing = (await client.query('SELECT id FROM investments WHERE parent_investment_id=$1 LIMIT 1', [inv.id])).rows[0];
    if (existing) throw Object.assign(new Error('This investment has already been reinvested'), { code:'REINVESTMENT_EXISTS', childId:Number(existing.id) });

    const revenue = Number((await client.query('SELECT COALESCE(SUM(allocated_amount),0) AS total FROM investment_revenue_allocations WHERE investment_id=$1', [inv.id])).rows[0].total || 0);
    const reinvestAmount = Number(revenue.toFixed(2));
    if (reinvestAmount <= 0) throw Object.assign(new Error('There are no realized earnings available to reinvest'), { code:'NO_REALIZED_AMOUNT' });

    const rule = (await client.query('SELECT * FROM investment_industry_rules WHERE industry_id=$1 AND is_active=TRUE FOR UPDATE', [Number(inv.industry_id)])).rows[0];
    if (!rule) throw Object.assign(new Error('Investment is no longer available for this industry'), { code:'INDUSTRY_UNAVAILABLE' });
    if (reinvestAmount > Number(rule.maximum_amount)) throw Object.assign(new Error(`Realized earnings ₹${reinvestAmount} exceed this industry maximum cycle size of ₹${rule.maximum_amount}`), { code:'REINVESTMENT_ABOVE_MAXIMUM' });

    if (!inv.state_id) throw Object.assign(new Error('Investment location is required for reinvestment'), { code:'LOCATION_REQUIRED' });
    const location = (await client.query(`
      SELECT l.* FROM investor_industry_location_limits l
      WHERE l.industry_id=$1 AND l.state_id=$2 AND (l.city_id IS NULL OR l.city_id=$3) AND l.is_active=TRUE
      ORDER BY CASE WHEN l.city_id=$3 THEN 0 ELSE 1 END,l.id LIMIT 1 FOR UPDATE
    `, [Number(inv.industry_id), Number(inv.state_id), inv.city_id ? Number(inv.city_id) : null])).rows[0];
    if (!location) throw Object.assign(new Error('Investment is no longer available for this industry and location'), { code:'LOCATION_UNAVAILABLE' });

    const params = [Number(inv.industry_id), Number(inv.state_id)];
    let where = 'industry_id=$1 AND state_id=$2 AND status IN (\'active\',\'matured\',\'paid\')';
    if (location.city_id !== null) { params.push(Number(location.city_id)); where += ' AND city_id=$3'; }
    const used = Number((await client.query(`SELECT COUNT(DISTINCT user_id)::int AS total FROM investments WHERE ${where}`, params)).rows[0].total || 0);
    if (used >= Number(location.investor_limit)) throw Object.assign(new Error('Investor limit completed for this industry and location'), { code:'LOCATION_CAPACITY_REACHED' });

    const maturityDays = Number(rule.maturity_days || 30);
    const child = (await client.query(`
      INSERT INTO investments(user_id,industry_id,state_id,city_id,amount,return_percent,expected_return,maturity_days,reinvestment_enabled,parent_investment_id,starts_at,matures_at)
      VALUES($1,$2,$3,$4,$5,0,$5,$6,FALSE,$7,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+make_interval(days=>$6))
      RETURNING *
    `, [Number(inv.user_id),Number(inv.industry_id),Number(inv.state_id),location.city_id == null ? null : Number(location.city_id),reinvestAmount,maturityDays,Number(inv.id)])).rows[0];

    await client.query(`UPDATE investments SET status='paid',realized_revenue=$1,payout_amount=$1,payout_transfer_reference=$2,payout_proof_url=NULL,payout_transferred_at=CURRENT_TIMESTAMP,payout_transferred_by=$3,updated_at=CURRENT_TIMESTAMP WHERE id=$4`, [reinvestAmount,`REINVESTMENT-${inv.id}-${child.id}`,Number(adminId),Number(inv.id)]);
    await client.query(`INSERT INTO investment_transactions(investment_id,user_id,type,amount,reference_type,reference_id) VALUES($1,$2,'return',$3,'reinvestment',$4)`, [Number(inv.id),Number(inv.user_id),reinvestAmount,Number(child.id)]);
    await client.query(`INSERT INTO investment_transactions(investment_id,user_id,type,amount,reference_type,reference_id) VALUES($1,$2,'investment',$3,'reinvestment',$4)`, [Number(child.id),Number(inv.user_id),reinvestAmount,Number(inv.id)]);

    await client.query('COMMIT');
    return {
      investmentId:Number(inv.id),
      userId:Number(inv.user_id),
      earningsReinvested:reinvestAmount,
      parentInvestmentId:Number(inv.id),
      newInvestmentId:Number(child.id),
      status:'reinvested',
      payoutDestination:'reinvestment',
      adminId:Number(adminId),
    };
  } catch(error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') throw Object.assign(new Error('This investment has already been reinvested'), { code:'REINVESTMENT_EXISTS' });
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { reinvestFromEarnings };
