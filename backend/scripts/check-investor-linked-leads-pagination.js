const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const service=read('src/services/investorLinkedLeadService.js');
const controller=read('src/controllers/investmentController.js');

assert(service.includes('const paginated=page!==null||limit!==null'),'Linked-lead service must preserve optional pagination mode');
assert(service.includes('if(!paginated)return leads'),'Investor-facing linked-lead callers must keep receiving raw arrays');
assert(service.includes('COUNT(*)::int AS total'),'Admin linked-lead pagination must expose an accurate total');
assert(service.includes('LIMIT $')&&service.includes('OFFSET $'),'Admin linked-lead query must be server-paginated');
assert(service.includes('Math.min(Math.max(Number(limit)||50,1),100)'),'Linked-lead pagination must cap page size at 100');
assert(controller.includes("page:req.query?.page||1")&&controller.includes("limit:req.query?.limit||50"),'Admin linked-lead controller must request paginated mode');
assert(controller.includes("async function linkedInvestorLeads")&&controller.includes("getLinkedLeads({investorId:Number(req.user.id)})"),'Investor assigned-leads endpoint must preserve raw-array mode');

console.log('Investor linked-lead pagination contract passed.');
