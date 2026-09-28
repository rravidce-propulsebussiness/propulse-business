const fs=require('fs');
const path=require('path');

const source=fs.readFileSync(path.join(__dirname,'../src/services/adminInvestmentService.js'),'utf8');
const controller=fs.readFileSync(path.join(__dirname,'../src/controllers/adminCommercialController.js'),'utf8');
const ledger=fs.readFileSync(path.join(__dirname,'../src/services/investorFinancialLedgerService.js'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../../frontend/src/admin/pages/AdminInvestmentsWallet.jsx'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

assert(source.includes('WITH current_cycles AS'),'Dashboard must resolve lightweight current-cycle scopes before detail loading');
assert(source.includes('const pageScopes=scopeRows.slice'),'Dashboard must page investor scopes before expensive detail aggregation');
assert(source.includes('WITH page_scope AS'),'Expensive investment detail query must be restricted to the selected investor page');
assert(source.includes('UNNEST($1::int[],$2::int[])'),'Page detail query must join a bounded scope set');
assert(source.includes('pagination:{page:pageValue,limit:safeLimit,total,pages}'),'Dashboard service must expose pagination metadata');
assert(source.includes('summaryScopes:scopeRows'),'Dashboard must expose lightweight scopes for batched global finance totals');
assert(source.includes('const allLeadIds=[...new Set(investors.flatMap'),'Page linked-lead metrics must remain batched');
assert(source.includes('WHERE l.id=ANY($1::int[])'),'Page linked-lead metrics must use one set-based query');
assert(controller.includes('ledger.getInvestorFinancialSummaries(summaryScopes)'),'Controller must batch global financial summaries in one helper call');
assert(controller.includes('const portfolio=summaryScopes.reduce'),'Controller must compute global KPI totals from lightweight scopes, not paged rows');
assert(!controller.includes('Promise.all((dashboard?.investors||[]).map'),'Controller must not run per-investor async enrichment');
assert(ledger.includes('WITH scope AS')&&ledger.includes('UNNEST($1::int[], $2::int[])'),'Investor ledger batch read must use one scoped query');
assert(ui.includes("page:String(page), limit:'30'"),'Admin investment UI must request bounded pages');
assert(ui.includes('data.pagination?.total'),'Admin investment UI must use server total count');
assert(ui.includes('data.portfolio'),'Admin investment KPI cards must use global backend totals');
assert(ui.includes('Page {Number(data.pagination?.page||1)} of'),'Admin investment UI must expose page navigation');

console.log('Admin investment dashboard pagination and query efficiency regression test passed.');
