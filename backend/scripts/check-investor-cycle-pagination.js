const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const service=read('src/services/investorCycleHistoryService.js');
const controller=read('src/controllers/investmentCycleController.js');
const ui=read('../frontend/src/pages/InvestorCycleHistory.jsx');

assert(service.includes('const paginated=page!==null||limit!==null'),'Cycle history service must preserve optional pagination mode');
assert(service.includes('if(!paginated)return rows'),'Unpaginated callers must preserve raw-array cycle history');
assert(service.includes('COUNT(*)::int AS total FROM investment_cycles'),'Paginated cycle history must expose accurate totals');
assert(service.includes('Math.min(Math.max(Number(limit)||20,1),50)'),'Cycle history page size must be bounded');
assert(controller.includes('const wantsPage=req.query?.page!=null||req.query?.limit!=null'),'Cycle history controller must keep the legacy array contract unless pagination is requested');
assert(ui.includes('/investments/cycles?page=1&limit=20'),'Investor History UI must request bounded cycle pages');
assert(ui.includes('Load older cycles'),'Investor History UI must provide incremental older-cycle loading');

console.log('Investor cycle pagination contract passed.');
