const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const service=fs.readFileSync(path.join(__dirname,'../src/services/leadReportService.js'),'utf8');
const controller=fs.readFileSync(path.join(__dirname,'../src/controllers/leadPartnerController.js'),'utf8');
const start=service.indexOf('async function getLeadPartnerReports');
const end=service.indexOf('const sqlBind',start);
assert(start>=0&&end>start,'Lead Partner report service function must exist');
const block=service.slice(start,end);

assert(!block.includes('LIMIT 500'),'Lead Partner report history must not load a fixed 500-row snapshot');
assert(block.includes('safeLimit=Math.min(100'),'Lead Partner report page size must be capped at 100');
assert(block.includes("COUNT(DISTINCT lead_id)::int AS reported_leads"),'Report summary must count all reported leads in SQL');
assert(block.includes('reason_counts'),'Report reason analytics must come from database-wide summary data');
assert(block.includes("CONCAT_WS(' ',r.id,r.lead_id"),'Lead Partner report search must be server-side');
assert(block.includes('dataParams.length-1')&&block.includes('OFFSET $'),'Lead Partner report list must use bounded SQL pagination');
assert(controller.includes('search:req.query?.search')&&controller.includes('page:req.query?.page')&&controller.includes('limit:req.query?.limit'),'Lead Partner report controller must forward pagination/search parameters');

console.log('Lead Partner report pagination regression test passed.');
