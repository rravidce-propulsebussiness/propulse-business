const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const service=read('src/services/investorPayoutRequestService.js');
const ui=read('../frontend/src/pages/InvestorPayoutsWithGeneratedFunds.jsx');

assert(service.includes('const requestLimit=100'),'Investor funds endpoint must cap embedded withdrawal history');
assert(service.includes("ORDER BY requested_at DESC,id DESC LIMIT ${requestLimit}"),'Investor funds history must return only newest bounded requests');
assert(service.includes('COUNT(*)::int AS total FROM investor_payout_requests'),'Investor funds endpoint must return the complete request count separately');
assert(service.includes('requests_total:requestsTotal,requests_limit:requestLimit'),'Investor funds response must expose bounded-history metadata');
assert(ui.includes('requests_total??requests.length'),'Investor withdrawal UI must show the server total when history is truncated');
assert(ui.includes('Latest ${requests.length} of ${requestTotal} requests'),'Investor UI must explain when only recent withdrawal activity is shown');
console.log('Investor funds history bound regression test passed.');
