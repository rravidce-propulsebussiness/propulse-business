const pool = require('../config/database');

const INVESTOR_LEDGER_LOCK_NAMESPACE = 2147483000;

async function lockInvestorFinancials(client, userId) {
  await client.query('SELECT pg_advisory_xact_lock($1, $2)', [INVESTOR_LEDGER_LOCK_NAMESPACE, Number(userId)]);
}

async function reconcileCycleRevenue(client, userId, cycleId) {
  if (cycleId == null) return;
  const uid = Number(userId);
  const cid = Number(cycleId);
  const purchases = (await client.query(`
    SELECT lp.id,lp.amount,l.industry_id
    FROM lead_purchases lp
    JOIN leads l ON l.id=lp.lead_id
    WHERE l.investor_user_id=$1 AND l.cycle_id=$2 AND lp.status='paid'
      AND NOT EXISTS (
        SELECT 1
        FROM investment_revenue_allocations ira
        JOIN investments existing_i ON existing_i.id=ira.investment_id
        WHERE ira.lead_purchase_id=lp.id AND existing_i.user_id=$1 AND existing_i.cycle_id=$2
      )
    ORDER BY lp.id
    FOR UPDATE OF lp
  `, [uid, cid])).rows;
  for (const purchase of purchases) {
    const shareRow = (await client.query(`
      SELECT COALESCE(r.investor_revenue_share_percent,s.investor_revenue_share_percent,95) AS share
      FROM investor_settings s
      LEFT JOIN investment_industry_rules r ON r.industry_id=$1 AND r.is_active=TRUE
      WHERE s.id=1
    `, [Number(purchase.industry_id)])).rows[0];
    const share = Math.max(0, Math.min(100, Number(shareRow?.share ?? 95)));
    if (share <= 0) continue;
    const investors = (await client.query(`
      SELECT id,amount
      FROM investments
      WHERE user_id=$1 AND cycle_id=$2
        AND status IN ('active','matured','paid')
        AND starts_at<=CURRENT_TIMESTAMP
        AND status<>'cancelled'
      ORDER BY created_at,id
      FOR UPDATE
    `, [uid, cid])).rows;
    if (!investors.length) continue;
    const total = investors.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    if (total <= 0) continue;
    const gross = Number(purchase.amount || 0);
    const distributable = gross * share / 100;
    for (const investment of investors) {
      const allocated = distributable * (Number(investment.amount || 0) / total);
      if (allocated <= 0) continue;
      await client.query(`
        INSERT INTO investment_revenue_allocations
          (investment_id,lead_purchase_id,industry_id,gross_sale_amount,investor_share_percent,allocated_amount)
        VALUES($1,$2,$3,$4,$5,$6)
        ON CONFLICT(investment_id,lead_purchase_id) DO UPDATE
        SET gross_sale_amount=EXCLUDED.gross_sale_amount,
            investor_share_percent=EXCLUDED.investor_share_percent,
            allocated_amount=EXCLUDED.allocated_amount
      `, [Number(investment.id), Number(purchase.id), Number(purchase.industry_id), gross, share, allocated]);
    }
  }
}

async function getInvestorFinancialSummary(userId, client = pool, cycleId = null) {
  const scoped = cycleId != null;
  const cycleValue = scoped ? Number(cycleId) : null;
  if (scoped) {
    await lockInvestorFinancials(client, userId);
    await reconcileCycleRevenue(client, userId, cycleValue);
  }
  const investmentFilter = scoped ? ' AND i.cycle_id=$2' : '';
  const spendFilter = scoped ? ' AND i.cycle_id=$2' : '';
  const allocationFilter = scoped ? ' AND i.cycle_id=$2' : '';
  const payoutFilter = scoped ? ' AND r.cycle_id=$2' : '';
  const result = await client.query(`
    SELECT
      COALESCE((SELECT SUM(i.amount) FROM investments i WHERE i.user_id=$1 AND i.status IN ('active','matured','paid') AND i.parent_investment_id IS NULL${investmentFilter}),0) AS contributed_capital,
      COALESCE((SELECT SUM(s.amount) FROM investment_ad_spends s JOIN investments i ON i.id=s.investment_id WHERE i.user_id=$1 AND i.status <> 'cancelled'${spendFilter}),0) AS ad_spent,
      COALESCE((SELECT SUM(a.allocated_amount) FROM investment_revenue_allocations a JOIN investments i ON i.id=a.investment_id WHERE i.user_id=$1 AND i.status <> 'cancelled' AND COALESCE(i.reinvestment_enabled,FALSE)=TRUE${allocationFilter}),0) AS auto_invest_earnings,
      COALESCE((SELECT SUM(a.allocated_amount) FROM investment_revenue_allocations a JOIN investments i ON i.id=a.investment_id WHERE i.user_id=$1 AND i.status <> 'cancelled' AND COALESCE(i.reinvestment_enabled,FALSE)=FALSE${allocationFilter}),0) AS non_auto_earnings,
      COALESCE((SELECT SUM(i.payout_amount) FROM investments i WHERE i.user_id=$1 AND i.status='paid' AND COALESCE(i.reinvestment_enabled,FALSE)=FALSE${investmentFilter}),0) AS settled_non_auto_earnings,
      COALESCE((SELECT SUM(r.amount) FROM investor_payout_requests r WHERE r.user_id=$1 AND r.status='paid'${payoutFilter}),0) AS payout_transferred,
      COALESCE((SELECT SUM(r.amount) FROM investor_payout_requests r WHERE r.user_id=$1 AND r.status='pending'${payoutFilter}),0) AS payout_reserved
  `, scoped ? [Number(userId), cycleValue] : [Number(userId)]);

  const row = result.rows[0] || {};
  const capital = Math.max(0, Number(row.contributed_capital || 0));
  const adSpent = Math.max(0, Number(row.ad_spent || 0));
  const autoInvestEarnings = Math.max(0, Number(row.auto_invest_earnings || 0));
  const nonAutoEarnings = Math.max(0, Number(row.non_auto_earnings || 0));
  const settledNonAuto = Math.max(0, Number(row.settled_non_auto_earnings || 0));
  const payoutTransferred = Math.max(0, Number(row.payout_transferred || 0));
  const payoutReserved = Math.max(0, Number(row.payout_reserved || 0));

  const autoInvestEarningsConsumed = Math.min(autoInvestEarnings, Math.max(0, adSpent - capital));
  const autoInvestEarningsRemaining = Math.max(0, autoInvestEarnings - autoInvestEarningsConsumed);
  const nonAutoEarningsRemaining = Math.max(0, nonAutoEarnings - settledNonAuto);
  const paidFromNonAuto = Math.min(payoutTransferred, nonAutoEarningsRemaining);
  const autoInvestEarningsPaid = Math.min(autoInvestEarningsRemaining, Math.max(0, payoutTransferred - paidFromNonAuto));
  const nonAutoAfterPaid = Math.max(0, nonAutoEarningsRemaining - paidFromNonAuto);
  const pendingFromNonAuto = Math.min(payoutReserved, nonAutoAfterPaid);
  const autoInvestEarningsReserved = Math.min(autoInvestEarningsRemaining - autoInvestEarningsPaid, Math.max(0, payoutReserved - pendingFromNonAuto));
  const autoInvestEarningsWithdrawable = Math.max(0, autoInvestEarningsRemaining - autoInvestEarningsPaid - autoInvestEarningsReserved);
  const nonAutoEarningsWithdrawable = Math.max(0, nonAutoAfterPaid - pendingFromNonAuto);
  const withdrawableEarnings = Math.max(0, autoInvestEarningsWithdrawable + nonAutoEarningsWithdrawable);

  return {
    contributed_capital: capital,
    capital,
    ad_spent: adSpent,
    auto_invest_earnings: autoInvestEarnings,
    auto_invest_earnings_consumed: autoInvestEarningsConsumed,
    auto_invest_earnings_withdrawable: autoInvestEarningsWithdrawable,
    auto_invest_earnings_paid: autoInvestEarningsPaid,
    auto_invest_earnings_reserved: autoInvestEarningsReserved,
    non_auto_earnings: nonAutoEarnings,
    non_auto_earnings_withdrawable: nonAutoEarningsWithdrawable,
    settled_non_auto_earnings: settledNonAuto,
    withdrawable_earnings: withdrawableEarnings,
    payout_transferred: payoutTransferred,
    payout_reserved: payoutReserved,
    available_for_ads: Math.max(0, capital + autoInvestEarnings - adSpent - autoInvestEarningsPaid - autoInvestEarningsReserved),
    transferable: withdrawableEarnings,
  };
}

module.exports = { getInvestorFinancialSummary, lockInvestorFinancials };
