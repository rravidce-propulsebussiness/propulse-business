const assert=require('assert');
const fs=require('fs');
const path=require('path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

// An investor whose Pro membership lapsed keeps read and withdrawal access to
// existing investments, but cannot start new investments.
const routes=read('src/routes/investmentRoutes.js');
for(const route of ["router.get('/cycle',investorHolder","router.get('/funds',investorHolder","router.post('/funds/transfer-request',investorHolder","router.get('/sold-leads',investorHolder","router.get('/assigned-leads',investorHolder","router.get('/',investorHolder"]){
  assert(routes.includes(route),`Lapsed investors must keep access: ${route}`);
}
for(const route of ["router.post('/checkout',investor,","router.post('/',investor,","router.post('/:id/reinvest',investor,"]){
  assert(routes.includes(route),`New investment must still require Pro: ${route}`);
}
const middleware=read('src/middleware/investorMiddleware.js');
assert(middleware.includes("status NOT IN ('pending','cancelled')"),'Holder access must require a real (non-pending) investment');
const service=read('src/services/investmentService.js');
assert(service.includes('canViewInvestments:Boolean(eligible&&(pro||hasInvestments))')&&service.includes('canInvest:Boolean(enabled&&pro&&eligible)'),'Access must separate viewing from investing');
const app=read('../frontend/src/App.jsx');
assert(app.includes("a?.canViewInvestments===true"),'Investor routes must open for lapsed investors with investments');
console.log('Lapsed investor access regression checks passed.');
