// Fixed published Marketplace forms are cached briefly and receive a fresh signed token per fetch.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const service=fs.readFileSync(path.join(__dirname,'../src/services/customerFlowService.js'),'utf8');
const routes=fs.readFileSync(path.join(__dirname,'../src/routes/customerFlowRoutes.js'),'utf8');
const getter=service.slice(service.indexOf('async function getPublishedFlow('),service.indexOf('async function loadPublishedFlow('));
assert(getter.includes('publishedFlowCache.get('),'getPublishedFlow must reuse the short-lived cache');
assert(getter.includes('flowToken:signFlowToken(hit.value.versionId)'),'each cached response must get a fresh token');
assert(getter.includes('const {flowToken,...cacheable}=value'),'time-based tokens must not be cached');
const exportsLine=service.slice(service.lastIndexOf('module.exports='));
assert(exportsLine.includes('getPublishedFlow')&&exportsLine.includes('getVersionFlow')&&exportsLine.includes('verifyFlowToken'),'public Marketplace intake services must remain exported');
assert.doesNotMatch(exportsLine,/createDefinition|saveDraft|publish|setDefinitionStatus/,'fixed forms must not expose admin editing methods');
assert.match(routes,/router\.get\('\/:key', publicReadLimit, customerFlowController\.getPublic\)/,'Marketplace must retain public form reads');
assert.match(routes,/router\.post\('\/:key\/submit', publicSubmitLimit, customerFlowController\.submitPublic\)/,'Marketplace must retain public form submissions');
assert.doesNotMatch(routes,/router\.(?:get|post|put|patch)\('\/admin\/(?:'|:id)/,'admin form-builder routes must be removed');
console.log('Fixed Marketplace form runtime and cache checks passed.');
