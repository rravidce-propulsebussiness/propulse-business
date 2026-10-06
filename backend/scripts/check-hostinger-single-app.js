const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'../..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const wrapper=fs.readFileSync(path.join(root,'hostinger-server.js'),'utf8');
const rootIndex=fs.readFileSync(path.join(root,'index.js'),'utf8');
const backendPkg=JSON.parse(fs.readFileSync(path.join(root,'backend','package.json'),'utf8'));
const backendIndex=fs.readFileSync(path.join(root,'backend','index.js'),'utf8');
const backendServer=fs.readFileSync(path.join(root,'backend','src','server.js'),'utf8');
const releaseMarkerHelper=fs.readFileSync(path.join(root,'backend','scripts','hostinger-release-marker.js'),'utf8');
const env=fs.readFileSync(path.join(root,'.env.example'),'utf8');
const prebuildWorkflow=fs.readFileSync(path.join(root,'.github','workflows','hostinger-main-prebuild.yml'),'utf8');

function assert(condition,message){
  if(!condition){console.error('FAIL: '+message);process.exitCode=1}
  else console.log('PASS: '+message)
}

assert(pkg.engines?.node==='24.x','Hostinger wrapper pins Node 24.x');
assert(pkg.scripts?.build==='node index.js --build-only','Manual Hostinger build uses the same runtime-build path');
assert(rootIndex.includes("const frontendDist=path.join(frontendRoot,'dist')"),'Hostinger runtime build targets frontend/dist');
assert(rootIndex.includes("buildFrontendAsync()"),'Hostinger entry builds the frontend asynchronously after server startup');
assert(rootIndex.includes("if(fs.existsSync(frontendIndex))return;"),'Hostinger root runtime skips rebuilding an already generated frontend');
assert(pkg.scripts?.start==='node index.js','Hostinger starts through the default index.js entrypoint');
for(const dependency of ['express','pg','bcryptjs','cors','dotenv','jsonwebtoken','react','react-dom','react-router-dom','vite','@vitejs/plugin-react']){
  assert(pkg.dependencies?.[dependency],'Hostinger root package must install '+dependency);
}
assert(pkg.overrides?.['proxy-addr']==='2.0.8','Hostinger root must pin the patched proxy-addr release');
assert(pkg.overrides?.['source-map-js']==='1.2.2','Hostinger root must pin the patched source-map-js release');
assert(prebuildWorkflow.includes('npm audit --omit=dev --audit-level=high'),'Hostinger prebuild must block high/critical runtime dependency advisories');
assert(!pkg.scripts?.postinstall,'Hostinger deployment must not rely on npm lifecycle scripts');
assert(rootIndex.includes("spawnSync")&&rootIndex.includes("spawn"),'Hostinger index.js supports manual and background frontend builds');
assert(rootIndex.includes("node_modules','vite','bin','vite.js"),'Hostinger runtime build must use root-installed Vite');
assert(rootIndex.includes("generate-seo-static-pages.mjs"),'Hostinger runtime build must generate SEO static pages');
assert(rootIndex.includes('ensureFrontendReleaseMarker()'),'Root Hostinger build must regenerate the frontend release marker before Vite builds');
assert(releaseMarkerHelper.includes("hostinger-release.json")&&releaseMarkerHelper.includes("frontend','public")&&releaseMarkerHelper.includes("release.json"),'Release marker helper must copy baked deployment identity into frontend/public/release.json');
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
assert(backendPkg.scripts?.postinstall==='node scripts/build-hostinger-frontend.js','Backend-root Hostinger install builds the frontend before publish');
assert(backendPkg.scripts?.['build:hostinger-frontend']==='node scripts/build-hostinger-frontend.js','Backend-root Hostinger exposes an explicit frontend build script');
const backendBuildScript=fs.readFileSync(path.join(root,'backend','scripts','build-hostinger-frontend.js'),'utf8');
assert(backendBuildScript.includes('Frontend build bundled inside backend for Hostinger publish.'),'Hostinger install build bundles frontend inside published backend app');
assert(backendBuildScript.includes('generate-seo-static-pages.mjs'),'Hostinger install build generates SEO static pages');
assert(backendBuildScript.includes('ensureFrontendReleaseMarker()'),'Backend-root install build must regenerate the release marker before Vite builds');
assert(backendIndex.includes('ensureFrontendReleaseMarker()'),'Backend-root runtime rebuild must regenerate the release marker before Vite builds');
assert(backendBuildScript.includes("const bundledFrontend=path.join(backendRoot,'hostinger-frontend')"),'Hostinger build targets a bundle inside backend');
assert(backendBuildScript.includes('fs.cpSync(frontendDist,bundledFrontend,{recursive:true})'),'Hostinger build copies Vite output into the published backend root');
assert(backendBuildScript.includes('fs.unlinkSync(frontendNodeModules)'),'Hostinger build safely unlinks the temporary frontend dependency link');
assert(backendServer.includes("const bundledFrontendDist=path.resolve(__dirname,'../hostinger-frontend')"),'Backend server prefers bundled Hostinger frontend');
assert(backendIndex.includes("const bundledFrontendIndex=path.join(bundledFrontendDist,'index.html')"),'Backend runtime detects the published frontend bundle');
for(const dependency of ['express','pg','react','react-dom','react-router-dom','vite','@vitejs/plugin-react']){
  assert(backendPkg.dependencies?.[dependency],'Backend-root Hostinger package installs '+dependency);
}
assert(backendIndex.includes("require('./src/server')"),'Backend-root Hostinger entry launches the real API in-process');
assert(!backendIndex.includes("spawn(process.execPath,['src/server.js']"),'Backend-root Hostinger entry must not launch a child backend process');
assert(!backendIndex.includes('proxyToBackend'),'Backend-root Hostinger entry must not proxy API traffic over localhost');
assert(backendIndex.includes("process.env.SERVE_FRONTEND_FROM_BACKEND='true'"),'Backend-root Hostinger entry enables single-process frontend serving');
assert(backendIndex.includes("Hostinger single-process app is live; building frontend in the background."),'Backend-root Hostinger entry builds frontend after API startup');
assert(backendIndex.includes("if(frontendBuilding||fs.existsSync(bundledFrontendIndex)||fs.existsSync(frontendIndex))return;"),'Backend-root Hostinger skips redundant runtime frontend builds when deploy output already exists');
assert(backendIndex.includes("fs.symlinkSync(backendNodeModules,frontendNodeModules"),'Backend-root Hostinger entry exposes installed dependencies to the frontend build');
assert(backendServer.includes("app.use(express.static(frontendDist"),'Backend server serves built frontend assets in single-process mode');
assert(backendServer.includes("Application frontend is starting. Please retry shortly."),'Backend server keeps HTML requests safe while background frontend build runs');
assert(backendServer.includes("['website','users','professionals','lead_partners','common'].includes(requestedAudience)"),'Degraded contact fallback must preserve the Professional audience during startup');
assert(wrapper.includes("startsWith('/api/')"),'Hostinger wrapper proxies API traffic');
assert(wrapper.includes("requestPath==='/robots.txt'"),'Hostinger wrapper proxies robots.txt');
assert(wrapper.includes("requestPath==='/sitemap.xml'"),'Hostinger wrapper proxies sitemap.xml');
assert(wrapper.includes("requestPath==='/release.json'"),'Hostinger wrapper proxies the frontend release marker to the backend bundle');
assert(backendServer.includes("app.get('/release.json'")&&backendServer.includes("path.join(frontendDist,'release.json')"),'Backend single-app runtime serves the bundled release marker explicitly');
assert(wrapper.includes("express.static(frontendDist"),'Hostinger wrapper serves the built frontend');
assert(wrapper.includes("extensions:['html']"),'Hostinger wrapper resolves prerendered .html SEO routes');
assert(wrapper.includes('knownSpaFrontendPath(req.path)')&&wrapper.includes("res.status(404).send('Not found')"),'Hostinger wrapper must return 404 for unknown HTML routes');
assert(backendServer.includes('knownSpaFrontendPath(req.path)')&&backendServer.includes("res.status(404).send('Not found')"),'Backend single-process SPA fallback must return 404 for unknown HTML routes');
assert(backendServer.includes("'/interior-estimator'")&&backendServer.includes('publicDynamicFrontendPath'),'Backend SPA allowlist must preserve estimator redirects and dynamic SEO routes');
assert(wrapper.includes("'/interior-estimator'")&&wrapper.includes('publicDynamicFrontendPath'),'Wrapper SPA allowlist must preserve estimator redirects and dynamic SEO routes');
for(const source of [wrapper,backendServer]){
  assert(source.includes('function serveExactPrerenderedHtml(root)'),'Runtime must define exact prerendered HTML resolution');
  assert(source.includes("relative+'.html'"),'Runtime must prefer a route-level prerendered .html file');
  assert(source.indexOf('app.use(serveExactPrerenderedHtml(frontendDist))')<source.indexOf('app.use(express.static(frontendDist'),'Exact prerendered HTML must run before express.static directory redirects');
}
for(const source of [wrapper,backendServer]){
  assert(source.includes("['/home','/','']")&&source.includes("['/leads','/professionals','']"),'Legacy Home and Leads aliases must use server-side redirects');
  assert(source.includes("['/build','/quote','#construction']")&&source.includes("['/design','/quote','#interiors']"),'Legacy Construction and Interior aliases must use server-side redirects');
  assert(source.includes("['/property','/quote','#property']")&&source.includes("['/real-estate','/quote','#property']"),'Legacy Real Estate aliases must use server-side redirects');
  assert(source.includes("['/pricing','/','#pricing']")&&source.includes("['/industries','/','']"),'Legacy Pricing and Industries aliases must use server-side redirects');
  assert(source.includes("const queryIndex=req.originalUrl.indexOf('?')")&&source.includes("target+query+hash"),'Legacy public redirects must preserve query strings before their canonical hash');
  assert(!source.includes("'/home','/quote','/solutions','/build','/design','/property'"),'Legacy fixed aliases must be removed from the public SPA allowlist');
}
assert(wrapper.includes("X-Robots-Tag"),'Hostinger wrapper noindexes private frontend routes');
assert(wrapper.includes("RUN_BACKGROUND_JOBS_IN_WEB:process.env.RUN_BACKGROUND_JOBS_IN_WEB||'true'"),'Hostinger staging defaults background jobs into the web backend');
assert(wrapper.includes("SERVE_FRONTEND_FROM_BACKEND:'false'"),'Hostinger wrapper keeps backend behind the internal proxy');
for(const key of ['PUBLIC_APP_URL','FRONTEND_URL','CORS_ORIGIN','DB_HOST','DB_NAME','DB_USER','DB_PASSWORD','JWT_SECRET','VITE_PUBLIC_SITE_URL']){
  assert(env.includes(key+'='),'Hostinger env template includes '+key);
}
if(process.exitCode)process.exit(process.exitCode);
console.log('Hostinger single-app deployment regression test passed.');
