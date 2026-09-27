const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const routes=read('src/routes/investmentRoutes.js');
const cycleController=read('src/controllers/investmentCycleController.js');
const investmentController=read('src/controllers/investmentController.js');
const ui=read('../frontend/src/admin/pages/InvestmentCycleControls.jsx');

assert(routes.includes("router.get('/admin/investor/:userId/cycles',admin,cycle.adminInvestorList)"),'Admin investor-specific cycle endpoint must exist');
assert(cycleController.includes('investorCycleHistory.list(userId,{page:req.query.page||1,limit:req.query.limit||20})'),'Admin investor cycle endpoint must be paginated');
assert(investmentController.includes('investorCycleHistory.getCycleHistory'),'Admin cycle history must use the aggregated history service');
assert(ui.includes('history?.ad_spends'),'Cycle UI must consume aggregated ad-spend history');
assert(!ui.includes('`/investments/admin/${inv.id}/ad-spend`'),'Cycle UI must not issue one ad-spend request per investment');
assert(ui.includes('`/investments/admin/investor/${userId}/cycles?page=1&limit=50`'),'Cycle UI must load only the selected investor cycles');
assert(!ui.includes("apiRequest('/investments/admin/cycles')"),'Cycle UI must not download the global cycle list');
console.log('Investment cycle history efficiency regression test passed.');
