// Regression: published homeowner forms are cached (they load on every /quote visit), a fresh
// time-based flowToken is signed per response, and every admin write clears the cache.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/services/customerFlowService.js'),'utf8');
const getter=source.slice(source.indexOf('async function getPublishedFlow('),source.indexOf('async function loadPublishedFlow('));
assert(getter.includes('publishedFlowCache.get('),'getPublishedFlow must read the cache');
assert(getter.includes('flowToken:signFlowToken(hit.value.versionId)'),'cached responses must carry a freshly signed flowToken');
assert(getter.includes('const {flowToken,...cacheable}=value'),'the time-based flowToken must never be cached');
const exportsLine=source.slice(source.lastIndexOf('module.exports='));
for(const name of ['createDefinition','saveDraft','publish','setDefinitionStatus'])
  assert(exportsLine.includes(`${name}:clearingCache(${name})`),`${name} must clear the published-form cache`);
assert(/finally\{clearPublishedFlowCache\(\)\}/.test(source),'the cache is cleared even when an admin write fails');
console.log('Published customer-flow cache regression passed.');
