const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'../..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const wrapper=fs.readFileSync(path.join(root,'hostinger-server.js'),'utf8');
const rootIndex=fs.readFileSync(path.join(root,'index.js'),'utf8');
const backendPkg=JSON.parse(fs.readFileSync(path.join(root,'backend','package.json'),'utf8'));
const backendIndex=fs.readFileSync(path.join(root,'backend','index.js'),'utf8');
const env=fs.readFileSync(path.join(root,'.env.example'),'utf8');

function assert(condition,message){
  if(!condition){console.error('FAIL: '+message);process.exitCode=1}
  else console.log('PASS: '+message)
}

assert(pkg.engines?.node==='24.x','Hostinger wrapper pins Node 24.x');
assert(pkg.scripts?.build==='node index.js --build-only','Manual Hostinger build uses the same runtime-build path');
assert(rootIndex.includes("const frontendDist=path.join(frontendRoot,'dist')"),'Hostinger runtime build targets frontend/dist');
assert(rootIndex.includes("buildFrontendAsync()"),'Hostinger entry builds the frontend asynchronously after server startup');
assert(pkg.scripts?.start==='node index.js','Hostinger starts through the default index.js entrypoint');
for(const dependency of ['express','pg','bcryptjs','cors','dotenv','jsonwebtoken','react','react-dom','react-router-dom','vite','@vitejs/plugin-react']){
  assert(pkg.dependencies?.[dependency],'Hostinger root package must install '+dependency);
}
assert(!pkg.scripts?.postinstall,'Hostinger deployment must not rely on npm lifecycle scripts');
assert(rootIndex.includes("spawnSync")&&rootIndex.includes("spawn"),'Hostinger index.js supports manual and background frontend builds');
assert(rootIndex.includes("node_modules','vite','bin','vite.js"),'Hostinger runtime build must use root-installed Vite');
assert(rootIndex.includes("generate-seo-static-pages.mjs"),'Hostinger runtime build must generate SEO static pages');
assert(rootIndex.includes("require('./hostinger-server')"),'Hostinger index.js must launch the single-app wrapper');
assert(rootIndex.indexOf("require('./hostinger-server')")<rootIndex.indexOf('void buildFrontendAsync()'),'Hostinger must open the public server before starting the background frontend build');
assert(!wrapper.includes('Hostinger frontend build is missing. Run npm run build before npm start.'),'Hostinger wrapper must not exit when frontend/dist is initially absent');
assert(wrapper.includes("return res.status(200).send("),'Hostinger returns HTTP 200 while the frontend build is still starting');
assert(wrapper.includes("X-App-Starting"),'Hostinger marks temporary startup responses');
assert(wrapper.includes("scheduleBackendRestart"),'Hostinger wrapper supervises and restarts the backend child process');
assert(wrapper.includes("backend?.kill('SIGTERM')"),'Hostinger wrapper stops the backend child during shutdown');
assert(wrapper.includes("if(req.path==='/health/live')"),'Hostinger liveness remains available while backend restarts');
assert(pkg.dependencies?.express,'Hostinger root package declares Express for framework detection');
assert(wrapper.includes("require('express')"),'Hostinger wrapper resolves Express from root dependencies');
assert(backendPkg.main==='index.js'&&backendPkg.scripts?.start==='node index.js','Backend directory is also a valid Hostinger app root');
for(const dependency of ['express','pg','react','react-dom','react-router-dom','vite','@vitejs/plugin-react']){
  assert(backendPkg.dependencies?.[dependency],'Backend-root Hostinger package installs '+dependency);
}
assert(backendIndex.includes("app.listen(publicPort,'0.0.0.0'"),'Backend-root Hostinger entry opens the public port');
assert(backendIndex.includes("spawn(process.execPath,['src/server.js']"),'Backend-root Hostinger entry launches the real API process');
assert(backendIndex.includes("Hostinger backend-root app is live; building frontend in the background."),'Backend-root Hostinger entry builds frontend after listen');
assert(backendIndex.includes("fs.symlinkSync(backendNodeModules,frontendNodeModules"),'Backend-root Hostinger entry exposes installed dependencies to the frontend build');
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
