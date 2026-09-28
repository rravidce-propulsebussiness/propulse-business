const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const inventory=read('src/services/leadPartnerInventoryService.js');
const scheduler=read('src/services/leadPartnerSheetSyncScheduler.js');
const ui=read('../frontend/src/pages/LeadPartnerInventory.jsx');
const investor=read('../frontend/src/pages/InvestorInvestmentSection.jsx');

assert(inventory.includes("n==='singleonly'"),'Lead Partner Google Sheet import must accept Single Only wording');
assert(inventory.includes('const locationCache=new Map()'),'Lead Partner sheet import must cache repeated PIN/location resolution within one file');
assert(inventory.includes('const settings=await partnerPricing.getSettings()'),'Partner pricing settings must be loaded once per import rather than per row');
assert(inventory.includes('failureSummary:summarizeFailures(failures)'),'Lead Partner import must return categorized failure diagnostics');
assert(inventory.includes('last_sync_failure_summary:summarizeFailures'),'Stored sheet connections must expose failure-category summaries');
assert(scheduler.includes('failureSummary='),'Worker logs must include failure category counts');
assert(scheduler.includes('Google Sheet row failures:'),'Worker logs must include sample row-level failures');
assert(ui.includes('partner-sheet-failure-summary'),'Lead Partner inventory must show failure categories');
assert(!investor.includes('const isSold ='),'Unused investor isSold helper must remain removed');
console.log('Lead Partner sheet diagnostics/efficiency regression test passed.');
