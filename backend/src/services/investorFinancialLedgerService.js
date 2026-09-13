const pool = require('../config/database');

/**
 * Single financial source of truth for investor money.
 * Principal is never withdrawal-eligible. Auto-invest earnings become
 * withdrawal-eligible only to the extent they have not been consumed by ads.
 */
async function getInvestorFinancialSummary(userId, client = pool) {
  const result = await client.query(`
    SELECT
      COALESCE((SELECT SUM(i.amount) FROM investments i WHERE i.user_id=$1 AND i.status IN ('active','matured','paid') AND COALESCE(i.parent_investment_id,0)=0),0) AS contributed_capital,
      COALESCE((SELECT SUM(s.amount) FROM investment_ad_spends s JOIN investments i ON i.id=s.investment_id WHERE i.user_id=$1 AND i.status<>'cancelled'),0) AS ad_spent,
      COALESCE((SELECT SUM(a.allocated_amount) FROM investment_revenue_allocations a JOIN investments i ON i.id=a.investment_id WHERE i.user_id=$1 AND i.status<>'cancelled' AND COALESCE(i.reinvestment_enabled,FALSE)=TRUE AND (i.status<>'paid' OR UPPER(COALESCE(i.payout_transfer_reference,'')) LIKE 'REINVESTMENT-%')),0) AS auto_invest_earnings,
      COALESCE((SELECT SUM(a.allocated_amount) FROM investment_revenue_allocations a JOIN investments i ON i.id=a.investment_id WHERE i.user_id=$1 AND i.status<>'cancelled' AND COALESCE(i.reinvestment_enabled,FALSE)=FALSE),0) AS non_auto_earnings,
      COALESCE((SELECT SUM(i.payout_amount) FROM investments i WHERE i.user_id=$1 AND i.status='paid' AND COALESCE(i.reinvestment_enabled,FALSE)=FALSE),0) AS settled_non_auto_earnings,
      COALESCE((SELECT SUM(r.amount) FROM investor_payout_requests r WHERE r.user_id=$1 AND r.status='paid'),0) AS payout_transferred,
      COALESCE((SELECT SUM(r.amount) FROM investor_payout_requests r WHERE r.user_id=$1 AND r.status='pending'),0) AS payout_reserved
  `, [Number(userId)]);

  const row=result.rows[0]||{};
  const capital=Math.max(0,Number(row.contributed_capital||0));
  const adSpent=Math.max(0,Number(row.ad_spent||0));
  const autoInvestEarnings=Math.max(0,Number(row.auto_invest_earnings||0));
  const nonAutoEarnings=Math.max(0,Number(row.non_auto_earnings||0));
  const settledNonAuto=Math.max(0,Number(row.settled_non_auto_earnings||0));
  const payoutTransferred=Math.max(0,Number(row.payout_transferred||0));
  const payoutReserved=Math.max(0,Number(row.payout_reserved||0));

  const autoConsumed=Math.min(autoInvestEarnings,Math.max(0,adSpent-capital));
  const autoUnconsumed=Math.max(0,autoInvestEarnings-autoConsumed);
  const nonAutoUnsettled=Math.max(0,nonAutoEarnings-settledNonAuto);
  const totalDeductions=Math.min(autoUnconsumed+nonAutoUnsettled,payoutTransferred+payoutReserved);
  const nonAutoDeductions=Math.min(nonAutoUnsettled,totalDeductions);
  const autoDeductions=Math.max(0,totalDeductions-nonAutoDeductions);
  const nonAutoWithdrawable=Math.max(0,nonAutoUnsettled-nonAutoDeductions);
  const autoWithdrawable=Math.max(0,autoUnconsumed-autoDeductions);
  const withdrawableEarnings=Math.max(0,autoWithdrawable+nonAutoWithdrawable);
  const availableForAds=Math.max(0,capital+autoUnconsumed-autoDeductions-adSpent);

  return {
    capital,
    contributed_capital:capital,
    ad_spent:adSpent,
    auto_invest_earnings:autoInvestEarnings,
    auto_invest_earnings_consumed:autoConsumed,
    auto_invest_earnings_withdrawable:autoWithdrawable,
    non_auto_earnings:nonAutoEarnings,
    non_auto_earnings_withdrawable:nonAutoWithdrawable,
    settled_non_auto_earnings:settledNonAuto,
    payout_transferred:payoutTransferred,
    payout_reserved:payoutReserved,
    withdrawable_earnings:withdrawableEarnings,
    available_for_ads:availableForAds,
    transferable:withdrawableEarnings,
  };
}

module.exports={getInvestorFinancialSummary};
