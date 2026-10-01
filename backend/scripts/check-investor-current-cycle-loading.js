const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const service=read('src/services/investmentService.js');
const controller=read('src/controllers/investmentController.js');
const dashboard=read('../frontend/src/pages/InvestmentCycleDashboard.jsx');

assert(service.includes("async function getMyInvestments(userId,{cycleId=null}={})"),'Investment service must accept optional cycle filtering');
assert(service.includes("where+=' AND x.cycle_id=$2'"),'Investment query must filter by cycle server-side when requested');
assert(controller.includes("getMyInvestments(req.user.id,{cycleId:"),'Investor investments controller must forward cycleId');
assert(dashboard.includes("/investments?cycleId="),'Current-cycle dashboard must request only active-cycle investment rows');
assert(!dashboard.includes("authRequest('/investments'),"),'Current-cycle dashboard must not download complete investment history');

console.log('Investor current-cycle loading regression passed.');
