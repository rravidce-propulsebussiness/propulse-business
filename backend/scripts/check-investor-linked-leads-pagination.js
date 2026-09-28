const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const service=read('src/services/investorLinkedLeadService.js');
const controller=read('src/controllers/investmentController.js');
const ui=read('../frontend/src/pages/InvestorInvestmentSection.jsx');

assert(service.includes("availability='all'"),'Linked-lead service must support server-side available/sold filtering');
assert(service.includes("['all','available','sold']"),'Linked-lead availability filter must be validated');
assert(service.includes("COUNT(*) FILTER(WHERE purchased_buyer_count < buyer_capacity)"),'Linked-lead stats must count available leads server-side');
assert(service.includes("COUNT(*) FILTER(WHERE purchased_buyer_count >= buyer_capacity)"),'Linked-lead stats must count sold leads server-side');
assert(service.includes("saleState==='sold'")&&service.includes("saleState==='available'"),'Data query must filter sold/available leads before pagination');
assert(service.includes('LIMIT $')&&service.includes('OFFSET $'),'Linked-lead query must be server-paginated');
assert(service.includes('Math.min(Math.max(Number(limit)||50,1),100)'),'Linked-lead pagination must cap page size at 100');
assert(controller.includes("availability:'available'")&&controller.includes("limit:req.query?.limit||30"),'Investor assigned-leads endpoint must request bounded available pages');
assert(controller.includes("availability:'sold'")&&controller.includes("limit:req.query?.limit||30"),'Investor sold-leads endpoint must request bounded sold pages');
assert(ui.includes('/investments/assigned-leads?page=')&&ui.includes('limit=30'),'Investor assigned-leads UI must request server pages');
assert(ui.includes('/investments/sold-leads?page=')&&ui.includes('limit=30'),'Investor sold-leads UI must request server pages');
assert(ui.includes('pagination.pages>1'),'Investor lead UI must expose page navigation');
assert(ui.includes('leadStats.available')&&ui.includes('leadStats.sold')&&ui.includes('leadStats.total'),'Investor lead headline counts must use server-side totals');

console.log('Investor linked-lead pagination contract passed.');
