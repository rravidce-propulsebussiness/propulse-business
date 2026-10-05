const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'../..');
const migration=fs.readFileSync(path.join(root,'backend/src/database/migrations/20261006_supabase_data_api_least_privilege.sql'),'utf8');
const supabaseAuth=fs.readFileSync(path.join(root,'backend/src/services/supabaseAuthService.js'),'utf8');
const frontendPkg=JSON.parse(fs.readFileSync(path.join(root,'frontend/package.json'),'utf8'));

assert.match(migration,/REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated/i);
assert.match(migration,/REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated/i);
assert.match(migration,/REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated, PUBLIC/i);
assert.match(migration,/GRANT SELECT, UPDATE ON TABLE public\.profiles TO authenticated/i);
assert.match(migration,/ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public\s+REVOKE ALL ON TABLES FROM anon, authenticated/i);
assert.match(migration,/ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public\s+REVOKE ALL ON SEQUENCES FROM anon, authenticated/i);
assert.match(migration,/ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public\s+REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, PUBLIC/i);
assert.doesNotMatch(migration,/GRANT\s+(?:ALL|INSERT|DELETE|TRUNCATE|TRIGGER|REFERENCES).*\b(?:anon|authenticated)\b/i);

assert.match(supabaseAuth,/\/auth\/v1\/user/);
assert(!frontendPkg.dependencies?.['@supabase/supabase-js'],'Frontend must not depend on direct Supabase Data API access');

console.log('Supabase Data API least-privilege regression test passed.');
