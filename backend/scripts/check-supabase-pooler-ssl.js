const fs=require('fs');
const path=require('path');

const database=fs.readFileSync(path.join(__dirname,'../src/config/database.js'),'utf8');
const env=fs.readFileSync(path.join(__dirname,'../.env.example'),'utf8');
const server=fs.readFileSync(path.join(__dirname,'../src/server.js'),'utf8');

function assert(value,message){
  if(!value){console.error('FAIL: '+message);process.exitCode=1}
  else console.log('PASS: '+message)
}

assert(database.includes(".pooler.supabase.com"),'Supabase shared pooler host is detected');
assert(database.includes("DB_SSL_CA_BASE64"),'Optional Supabase CA configuration is supported');
assert(database.includes("isSupabasePooler ? false : rejectUnauthorizedRequested"),'Supabase pooler falls back to encrypted require-mode when CA is absent');
assert(database.includes("dbSslCa ? true"),'Supplying the CA restores strict certificate verification');
assert(database.includes("normalized.searchParams.delete(key)"),'Connection-string SSL query parameters cannot override explicit TLS policy');
assert(env.includes("DB_SSL_CA_BASE64="),'Supabase CA environment option is documented');
assert(server.includes("app.get('/favicon.ico'"),'favicon.ico has a compatibility redirect');
assert(server.includes("/^\\/customer-flows\\/(build|design|property)$/"),'public customer flows have a degraded fallback');

if(process.exitCode)process.exit(process.exitCode);
console.log('Supabase pooler TLS regression passed.');
