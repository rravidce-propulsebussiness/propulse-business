const fs=require('fs');
const path=require('path');

const migration=fs.readFileSync(path.join(__dirname,'../src/database/migrations/20260928_production_hot_path_indexes.sql'),'utf8');
const latestCycleMigration=fs.readFileSync(path.join(__dirname,'../src/database/migrations/20260928_investment_cycle_latest_index.sql'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

assert(migration.includes('idx_wallet_topups_status_created_id'),'Wallet top-up review queue needs status/time index');
assert(migration.includes('idx_lp_payout_requests_status_queue'),'Lead Partner payout review queue needs status/time index');
assert(migration.includes('idx_investor_payout_requests_status_queue'),'Investor payout review queue needs status/time index');
assert(migration.includes('idx_lp_earnings_partner_status_created'),'Lead Partner balance scans need partner/status/time index');
assert(migration.includes('idx_investments_ready_for_transfer'),'Matured investor transfer scans need a partial readiness index');
assert(migration.includes("WHERE status IN ('active','matured')"),'Investor transfer index must stay partial to the settlement states');

console.log('Production hot-path index regression test passed.');
