const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

for(const relative of [
  'src/database/migrations/20260928_production_hot_path_indexes.sql',
  'src/database/migrations/20260928_investor_linked_lead_pagination.sql',
  'src/database/migrations/20260928_investment_cycle_latest_index.sql',
  'src/database/migrations/20261006_hot_fk_indexes.sql'
]){
  const migration=read(relative);
  assert(migration.includes('-- propulse:no-transaction'),relative+' must opt out of the migration transaction');
  assert(migration.includes('CREATE INDEX CONCURRENTLY IF NOT EXISTS'),relative+' must build production indexes concurrently');
  assert(!migration.includes('CREATE INDEX IF NOT EXISTS'),relative+' must not use blocking index creation');
}
const hot=read('src/database/migrations/20261006_hot_fk_indexes.sql');
assert(hot.includes('idx_leads_city_created_id')&&hot.includes('ON leads(city_id, created_at DESC, id DESC)'),'Hot FK migration must optimize city-filtered lead ordering');
assert(hot.includes('idx_background_job_runs_triggered_by')&&hot.includes('ON background_job_runs(triggered_by)'),'Hot FK migration must cover background-job actor foreign key');
const runnerSource=read('src/database/runMigrations.js');
assert(runnerSource.includes('if (isNoTransactionMigration(sql))'),'Migration runner must honor explicit non-transactional migrations');
assert(runnerSource.includes('for (const statement of splitTopLevelStatements(sql))'),'Concurrent index statements must be sent separately to PostgreSQL');
console.log('Concurrent production index migration regression test passed.');
