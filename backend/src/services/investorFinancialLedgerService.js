const pool = require('../config/database');

const INVESTOR_LEDGER_LOCK_NAMESPACE = 2147483000;

// Serialize payout reservations/settlements and advertising-spend mutations for
// the same investor. The lock is transaction-scoped and does not lock unrelated users.
async function lockInvestorFinancials(client, userId) {
  await client.query('SELECT pg_advisory_xact_lock($1, $2)', [INVESTOR_LEDGER_LOCK_NAMESPACE, Number(userId)]);
}

/**
 * Single financial source of truth for an investor.
 * Principal is never transferable. Auto-invest earnings first replenish the
 * advertising pool; only the portion not consumed by cumulative ad spend and
 * not already paid/reserved can be withdrawn.
 */
async function getInvestorFinancialSummary(userId, client = pool) {
  const result = await client.query(`
    SELECT
      COALESCE((SELECT SUM(i.amount) FROM investments i WHERE i.user_id=$1 AND i.status IN ('active','matured','paid') AND i.parent_investment_id IS NULL),0) AS contributed_capital,
      COALESCE((SELECT SUM(s.amount) FROM investment_ad_spends s JOIN investments i ON i.id=s.investment_id WHERE i.user_id=$1 AND i.status <> 'cancelled'),0) AS ad_spent,
      COALESCE((SELECT SUM(a.allocated_amount) FROM investment_revenue_allocations a JOIN investments i ON i.id=a.investment_id WHERE i.user_id=$1 AND i.status <> 'cancelled' AND COALESCE(i.reinvestment_enabled,FALSE)=TRUE),0) AS auto_invest_earnings,
      COALESCE((SELECT SUM(a.allocated_amount) FROM investment_revenue_allocations a JOIN investments i ON i.id=a.investment_id WHERE i.user_id=$1 AND i.status <> 'cancelled' AND COALESCE(i.reinvestment_enabled,FALSE)=FALSE),0) AS non_auto_earnings,
      COALESCE((SELECT SUM(i.payout_amount) FROM investments i WHERE i.user_id=$1 AND i.status='paid' AND COALESCE(i.reinvestment_enabled,FALSE)=FALSE),0) AS settled_non_auto_earnings,
      COALESCE((SELECT SUM(r.amount) FROM investor_payout_requests r WHERE r.user_id=$1 AND r.status='paid'),0) AS payout_transferred,
      COALESCE((SELECT SUM(r.amount) FROM investor_payout_requests r WHERE r.user_id=$1 AND r.status='pending'),0) AS payout_reserved
  `, [Number(userId)]);

  const row = result.rows[0] || {};
  const capital = Math.max(0, Number(row.contributed_capital || 0));
  const adSpent = Math.max(0, Number(row.ad_spent || 0));
  const autoInvestEarnings = Math.max(0, Number(row.auto_invest_earnings || 0));
  const nonAutoEarnings = Math.max(0, Number(row.non_auto_earnings || 0));
  const settledNonAuto = Math.max(0, Number(row.settled_non_auto_earnings || 0));
  const payoutTransferred = Math.max(0, Number(row.payout_transferred || 0));
  const payoutReserved = Math.max(0, Number(row.payout_reserved || 0));

  // Capital is consumed first by advertising. Only spend beyond principal
  // can consume Auto-Invest earnings.
  const autoInvestEarningsConsumed = Math.min(autoInvestEarnings, Math.max(0, adSpent - capital));
  const autoInvestEarningsRemaining = Math.max(0, autoInvestEarnings - autoInvestEarningsConsumed);
  const nonAutoEarningsRemaining = Math.max(0, nonAutoEarnings - settledNonAuto);

  // Payouts are allocated against non-auto earnings first. Any amount beyond
  // that pool is therefore an auto-invest withdrawal and must also leave the
  // advertising pool. Pending reservations use the same deterministic order.
  const paidFromNonAuto = Math.min(payoutTransferred, nonAutoEarningsRemaining);
  const autoInvestEarningsPaid = Math.min(autoInvestEarningsRemaining, Math.max(0, payoutTransferred - paidFromNonAuto));
  const nonAutoAfterPaid = Math.max(0, nonAutoEarningsRemaining - paidFromNonAuto);
  const pendingFromNonAuto = Math.min(payoutReserved, nonAutoAfterPaid);
  const autoInvestEarningsReserved = Math.min(autoInvestEarningsRemaining - autoInvestEarningsPaid, Math.max(0, payoutReserved - pendingFromNonAuto));

  const autoInvestEarningsWithdrawable = Math.max(0, autoInvestEarningsRemaining - autoInvestEarningsPaid - autoInvestEarningsReserved);
  const nonAutoEarningsWithdrawable = Math.max(0, nonAutoAfterPaid - pendingFromNonAuto);
  const grossWithdrawableEarnings = Math.max(0, autoInvestEarningsWithdrawable + nonAutoEarningsWithdrawable);
  const withdrawableEarnings = grossWithdrawableEarnings;

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
