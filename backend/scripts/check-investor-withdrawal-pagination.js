const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const service=read('src/services/investorPayoutRequestService.js');
const controller=read('src/controllers/investmentController.js');
const ui=read('../frontend/src/admin/pages/AdminInvestorWithdrawals.jsx');

assert(service.includes('safeLimit=Math.min(Math.max(Number(limit)||50,1),100)'),'Investor withdrawal admin queue must enforce a bounded page size');
assert(service.includes('LIMIT $${rowValues.length-1} OFFSET $${rowValues.length}'),'Investor withdrawal rows must use server-side LIMIT/OFFSET');
assert(service.includes("COUNT(*) FILTER(WHERE r.status='pending')"),'Investor withdrawal status totals must be computed server-side');
assert(controller.includes('page:req.query.page,limit:req.query.limit'),'Investor withdrawal controller must forward pagination inputs');
assert(ui.includes("limit: '50'"),'Investor withdrawal UI must request bounded pages');
assert(ui.includes('setPagination({'),'Investor withdrawal UI must consume pagination metadata');
assert(!ui.includes("requests.filter(item => cleanStatus(item.status) === status)"),'Investor withdrawal tabs must not filter an unbounded ledger in the browser');
assert(ui.includes('pagination.pages > 1'),'Investor withdrawal UI must expose page navigation');

console.log('Investor withdrawal pagination regression test passed.');
