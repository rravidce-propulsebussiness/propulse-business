// Non-numeric IDs (e.g. /api/leads/abc) used to reach PostgreSQL and fail as 500. Routers with
// integer IDs must reject them up front with 404.
const fs=require('fs');
const path=require('path');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const helper=require('../src/utils/numericRouteParams');
const calls=[];helper.numericRouteParams({param:(name,fn)=>calls.push([name,fn])},'id');
const res={code:0,status(c){this.code=c;return this},json(){return this}};let passed=false;
calls[0][1]({},res,()=>{passed=true},'abc');assert(res.code===404&&!passed,'Non-numeric id must return 404');
calls[0][1]({},res,()=>{passed=true},'42');assert(passed,'Numeric id must pass through');
const routes=path.join(__dirname,'..','src','routes');
for(const file of ['adminRoutes','cityRoutes','couponRoutes','industryRoutes','investmentRoutes','leadRoutes','paymentRoutes','serviceRoutes','stateRoutes','subserviceRoutes','walletRoutes']){
  assert(fs.readFileSync(path.join(routes,file+'.js'),'utf8').includes("numericRouteParams(router,"),`${file} must validate numeric route ids`);
}
assert(fs.readFileSync(path.join(__dirname,'..','src','services','leadPurchaseService.js'),'utf8').includes("throw Object.assign(new Error('Lead not found'),{code:'NOT_FOUND'})"),'Lead purchase must reject invalid lead ids');
console.log('Numeric route params regression test passed.');
