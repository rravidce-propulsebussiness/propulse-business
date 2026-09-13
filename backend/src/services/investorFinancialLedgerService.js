const pool = require('../config/database');

/**
 * Single financial source of truth for an investor.
 *
 * Capital is investor-contributed capital only (reinvestment child records are
 * excluded). Actual advertising spend is cumulative. Auto-invest earnings are
 * added to the advertising pool; non-auto-invest earnings are payout eligible.
 */
async function getInvestorFinancialSummary(userId, client = pool) {
  const result = await client.query(`
    SELECT
      COALESCE((
        SELECT SUM(i.amount)
        FROM investments i
        WHERE i.user_id=$1
          AND i.status IN ('active','matured','paid')
          AND COALESCE(i.parent_investment_id, 0) = 0
      ),0) AS contributed_capital,
      COALESCE((
        SELECT SUM(s.amount)
        FROM investment_ad_spends s
        JOIN investments i ON i.id=s.investment_id
        WHERE i.user_id=$1
          AND i.status <> 'cancelled'
      ),0) AS ad_spent,
      COALESCE((
        SELECT SUM(a.allocated_amount)
        FROM investment_revenue_allocations a
        JOIN investments i ON i.id=a.investment_id
        WHERE i.user_id=$1
          AND i.status <> 'cancelled'
          AND COALESCE(i.reinvestment_enabled,FALSE)=TRUE
          AND COALESCE(i.status,'') <> 'paid'
      ),0) AS auto_invest_earnings,
      COALESCE((
        SELECT SUM(a.allocated_amount)
        FROM investment_revenue_allocations a
        JOIN investments i ON i.id=a.investment_id
        WHERE i.user_id=$1
          AND i.status <> 'cancelled'
          AND COALESCE(i.reinvestment_enabled,FALSE)=FALSE
      ),0) AS non_auto_earnings,
      COALESCE((
        SELECT SUM(i.payout_amount)
        FROM investments i
        WHERE i.user_id=$1
          AND i.status='paid'
          AND COALESCE(i.reinvestment_enabled,FALSE)=FALSE
      ),0) AS settled_non_auto_earnings,
      COALESCE((
        SELECT SUM(r.amount)
        FROM investor_payout_requests r
        WHERE r.user_id=$1 AND r.status='paid'
      ),0) AS payout_transferred,
      COALESCE((
        SELECT SUM(r.amount)
        FROM investor_payout_requests r
        WHERE r.user_id=$1 AND r.status='pending'
      ),0) AS payout_reserved
  `, [Number(userId)]);

  const row = result.rows[0] || {};
  const capital = Number(row.contributed_capital || 0);
  const adSpent = Number(row.ad_spent || 0);
  const autoInvestEarnings = Number(row.auto_invest_earnings || 0);
  const nonAutoEarnings = Number(row.non_auto_earnings || 0);
  const settledNonAuto = Number(row.settled_non_auto_earnings || 0);
  const payoutTransferred = Number(row.payout_transferred || 0);
  const payoutReserved = Number(row.payout_reserved || 0);

  return {
    capital,
    ad_spent: adSpent,
    auto_invest_earnings: autoInvestEarnings,
    non_auto_earnings: nonAutoEarnings,
    settled_non_auto_earnings: settledNonAuto,
    payout_transferred: payoutTransferred,
    payout_reserved: payoutReserved,
    available_for_ads: Math.max(0, capital + autoInvestEarnings - adSpent),
    transferable: Math.max(0, nonAutoEarnings - settledNonAuto - payoutTransferred - payoutReserved),
  };
}

module.exports = { getInvestorFinancialSummary };
