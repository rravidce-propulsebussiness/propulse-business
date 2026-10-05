const fs=require('fs');
const path=require('path');

const migration=fs.readFileSync(path.join(__dirname,'../src/database/migrations/20260928_production_hot_path_indexes.sql'),'utf8');
const latestCycleMigration=fs.readFileSync(path.join(__dirname,'../src/database/migrations/20260928_investment_cycle_latest_index.sql'),'utf8');
const functionHardening=fs.readFileSync(path.join(__dirname,'../src/database/migrations/20261005_supabase_function_search_path_hardening.sql'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

assert(migration.includes('idx_wallet_topups_status_created_id'),'Wallet top-up review queue needs status/time index');
assert(migration.includes('idx_lp_payout_requests_status_queue'),'Lead Partner payout review queue needs status/time index');
assert(migration.includes('idx_investor_payout_requests_status_queue'),'Investor payout review queue needs status/time index');
assert(migration.includes('idx_lp_earnings_partner_status_created'),'Lead Partner balance scans need partner/status/time index');
assert(migration.includes('idx_investments_ready_for_transfer'),'Matured investor transfer scans need a partial readiness index');
assert(migration.includes("WHERE status IN ('active','matured')"),'Investor transfer index must stay partial to the settlement states');

for(const fn of [
  'sync_lead_buyer_capacity()',
  'prevent_duplicate_lead_insert()',
  'propulse_sync_directory_pincode_to_city()',
  'propulse_sync_city_directory_pincodes(integer)',
  'propulse_sync_city_directory_pincodes_trigger()',
  'enforce_membership_tier_integrity()',
  'prevent_duplicate_lead_change()',
  'prevent_reinvestment_as_investor_payout()',
  'ensure_linked_lead_investment_revenue(bigint)',
  'allocate_linked_lead_purchase_revenue()',
  'enforce_linked_lead_revenue_owner()',
  'allocate_linked_lead_investor_revenue()',
  'allocate_linked_lead_revenue_on_assignment()',
  'repair_linked_lead_revenue_for_purchase(integer)',
  'assign_lead_to_investor_cycle()',
  'maybe_close_investment_cycle()',
  'lead_effective_buyer_capacity(text, integer, integer, integer, timestamp without time zone, integer)'
]){
  assert(functionHardening.includes('ALTER FUNCTION public.'+fn+' SET search_path = public, pg_temp'),'Missing fixed search_path for '+fn);
}

console.log('Production hot-path index and function hardening regression test passed.');
