const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'../..');
const migration=fs.readFileSync(path.join(root,'backend/src/database/migrations/20261006_supabase_data_api_least_privilege.sql'),'utf8');
const supabaseAuth=fs.readFileSync(path.join(root,'backend/src/services/supabaseAuthService.js'),'utf8');
const frontendPkg=JSON.parse(fs.readFileSync(path.join(root,'frontend/package.json'),'utf8'));

assert.match(migration,/EXISTS \(SELECT 1 FROM pg_roles WHERE rolname='anon'\)/);
assert.match(migration,/EXISTS \(SELECT 1 FROM pg_roles WHERE rolname='authenticated'\)/);
assert.match(migration,/REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon/i);
assert.match(migration,/REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM authenticated/i);
assert.match(migration,/REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon/i);
assert.match(migration,/REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM authenticated/i);
assert.match(migration,/REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon/i);
assert.match(migration,/REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated/i);
assert.match(migration,/to_regclass\('public\.profiles'\) IS NOT NULL/);
assert.match(migration,/GRANT SELECT, UPDATE ON TABLE public\.profiles TO authenticated/i);
assert.match(migration,/ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon/i);
assert.match(migration,/ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated/i);
assert.match(migration,/REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC/i);
assert.match(migration,/ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC/i);
assert.doesNotMatch(migration,/ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin/i);

assert.match(supabaseAuth,/\/auth\/v1\/user/);
assert(!frontendPkg.dependencies?.['@supabase/supabase-js'],'Frontend must not depend on direct Supabase Data API access');

console.log('Supabase Data API least-privilege regression test passed.');
