const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'../..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const wrapper=fs.readFileSync(path.join(root,'hostinger-server.js'),'utf8');
const rootIndex=fs.readFileSync(path.join(root,'index.js'),'utf8');
const env=fs.readFileSync(path.join(root,'.env.example'),'utf8');

function assert(condition,message){
  if(!condition){console.error('FAIL: '+message);process.exitCode=1}
  else console.log('PASS: '+message)
}

assert(pkg.engines?.node==='24.x','Hostinger wrapper pins Node 24.x');
assert(pkg.scripts?.build?.includes('npm ci --omit=dev --prefix backend'),'Hostinger build installs backend runtime dependencies');
assert(pkg.scripts?.build?.includes('npm ci --include=dev --prefix frontend'),'Hostinger build installs frontend build dependencies');
assert(pkg.scripts?.build?.includes('npm run build --prefix frontend'),'Hostinger build generates the Vite/prerendered frontend');
assert(pkg.scripts?.start==='node index.js','Hostinger starts through the default index.js entrypoint');
for(const dependency of ['express','pg','bcryptjs','cors','dotenv','jsonwebtoken','react','react-dom','react-router-dom','vite','@vitejs/plugin-react']){
  assert(pkg.dependencies?.[dependency],'Hostinger root package must install '+dependency);
}
assert(!pkg.scripts?.postinstall,'Hostinger deployment must not rely on npm lifecycle scripts');
assert(rootIndex.includes("spawnSync"),'Hostinger index.js must be able to build the frontend at runtime');
assert(rootIndex.includes("node_modules','vite','bin','vite.js"),'Hostinger runtime build must use root-installed Vite');
assert(rootIndex.includes("generate-seo-static-pages.mjs"),'Hostinger runtime build must generate SEO static pages');
assert(rootIndex.includes("require('./hostinger-server')"),'Hostinger index.js must launch the single-app wrapper');
assert(pkg.dependencies?.express,'Hostinger root package declares Express for framework detection');
assert(wrapper.includes("require('express')"),'Hostinger wrapper resolves Express from root dependencies');
assert(wrapper.includes("startsWith('/api/')"),'Hostinger wrapper proxies API traffic');
assert(wrapper.includes("requestPath==='/robots.txt'"),'Hostinger wrapper proxies robots.txt');
assert(wrapper.includes("requestPath==='/sitemap.xml'"),'Hostinger wrapper proxies sitemap.xml');
assert(wrapper.includes("express.static(frontendDist"),'Hostinger wrapper serves the built frontend');
assert(wrapper.includes("extensions:['html']"),'Hostinger wrapper resolves prerendered .html SEO routes');
assert(wrapper.includes("X-Robots-Tag"),'Hostinger wrapper noindexes private frontend routes');
assert(wrapper.includes("RUN_BACKGROUND_JOBS_IN_WEB:process.env.RUN_BACKGROUND_JOBS_IN_WEB||'true'"),'Hostinger staging defaults background jobs into the web backend');
assert(wrapper.includes("SERVE_FRONTEND_FROM_BACKEND:'false'"),'Hostinger wrapper keeps backend behind the internal proxy');
for(const key of ['PUBLIC_APP_URL','FRONTEND_URL','CORS_ORIGIN','DB_HOST','DB_NAME','DB_USER','DB_PASSWORD','JWT_SECRET','VITE_PUBLIC_SITE_URL']){
  assert(env.includes(key+'='),'Hostinger env template includes '+key);
}
if(process.exitCode)process.exit(process.exitCode);
console.log('Hostinger single-app deployment regression test passed.');
