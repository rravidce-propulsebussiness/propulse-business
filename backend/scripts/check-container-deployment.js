const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(value,message)=>{if(!value)throw new Error(message)};

const backend=read('Dockerfile');
const backendIgnore=read('.dockerignore');
const frontend=read('../frontend/Dockerfile');
const nginx=read('../frontend/deploy/nginx.conf');
const compose=read('../deploy/compose.yml');
const staging=read('../deploy/env/staging.backend.env.example');
const production=read('../deploy/env/production.backend.env.example');
const docs=read('../deploy/README.md');
const ps=read('../scripts/deploy-docker.ps1');
const sh=read('../scripts/deploy-docker.sh');

assert(backend.includes('FROM node:24-bookworm-slim'),'Backend container must use the supported Node 24 runtime');
assert(backend.includes('npm ci --omit=dev'),'Backend image must install frozen production dependencies');
assert(backend.includes('USER node'),'Backend runtime must not run as root');
assert(backendIgnore.includes('.env.*'),'Backend Docker context must exclude real environment files');

assert(frontend.includes('nginxinc/nginx-unprivileged'),'Frontend runtime must use an unprivileged nginx image');
assert(frontend.includes('VITE_API_URL=/api'),'Frontend production build must remain same-origin');
assert(nginx.includes('location ^~ /api/'),'Frontend proxy must route API traffic internally');
assert(nginx.includes('location ^~ /health/'),'Frontend proxy must expose backend health probes');
assert(nginx.includes('client_max_body_size 10m'),'Reverse proxy must allow the application upload envelope');
assert(nginx.includes('try_files $uri $uri/ /index.html'),'SPA fallback is required');

assert(compose.includes('backend:')&&compose.includes('worker:')&&compose.includes('frontend:'),'Deployment must keep web, worker and frontend as distinct supervised services');
assert(compose.includes('profiles: ["release"]')&&compose.includes('npm","run","db:migrate'),'Database migration must be an explicit one-off release service');
assert(compose.includes('RUN_MIGRATIONS_ON_STARTUP: "false"'),'Long-running containers must not race migrations');
assert(compose.includes('RUN_BACKGROUND_JOBS_IN_WEB: "false"'),'Scheduled work must stay out of web containers');
assert(compose.includes('REQUIRE_BACKGROUND_WORKER: "true"'),'Web readiness must detect a dead worker');
assert(compose.includes('propulse-uploads:/data/propulse/uploads'),'Web and worker must share durable upload storage');
assert(compose.includes('127.0.0.1}:${PUBLIC_PORT:-8080}:8080'),'Public container must bind to loopback by default');
assert(!/postgres:\s*\n\s*image:/m.test(compose),'Production Compose must not silently create a disposable PostgreSQL database');

for(const [name,value] of [['staging',staging],['production',production]]){
  assert(value.includes('DB_SSL=true'),name+' must default to encrypted remote PostgreSQL');
  assert(value.includes('PRIVATE_OBJECT_STORAGE_DRIVER=local'),name+' template must make the initial single-host storage choice explicit');
  assert(!/re_[A-Za-z0-9_-]{20,}/.test(value),name+' template must not contain a real Resend key');
  assert(!/rzp_(live|test)_[A-Za-z0-9]+/.test(value),name+' template must not contain a real Razorpay key');
}
assert(staging.includes('propulse_staging')&&!staging.includes('propulse_production'),'Staging must use an isolated database name');
assert(production.includes('propulse_production')&&!production.includes('propulse_staging'),'Production must use an isolated database name');
assert(docs.includes('PostgreSQL remains external/managed'),'Deployment topology must keep the database external');
assert(ps.includes('dirty Git working tree')&&sh.includes('dirty Git working tree'),'Release wrappers must refuse uncommitted code');
assert(ps.includes('db:migrate')||ps.includes('profile release'),'PowerShell release must run the migration phase');
assert(sh.includes('--profile release run --rm migrate'),'Linux release must run migrations before long-running services');

console.log('Container deployment topology regression test passed.');
