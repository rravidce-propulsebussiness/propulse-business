const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseMoneyPaise, paiseToMoney, allocatePaise } = require('../src/utils/money');
const { allocateInvestmentRevenue } = require('../src/services/leadPurchaseService');

const ledgerSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'services', 'investorFinancialLedgerService.js'), 'utf8');
const purchaseSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'services', 'leadPurchaseService.js'), 'utf8');

assert.match(ledgerSource, /allocatePaise/);
assert.match(ledgerSource, /investmentPaise/);
assert.match(ledgerSource, /totalPaise/);
assert.match(ledgerSource, /grossPaise/);
assert.match(purchaseSource, /allocatePaise/);
assert.match(purchaseSource, /UNNEST\(\$1::int\[\],\$2::numeric\[\]\)/);
assert(!/for\s*\(const inv of investors\)[\s\S]{0,600}?client\.query/.test(purchaseSource),'Purchase-time investor allocation must not issue one INSERT per investor');

const gross = parseMoneyPaise('100.00');
const total = parseMoneyPaise('100.00');
assert.equal(paiseToMoney(allocatePaise(gross, '95', parseMoneyPaise('60.00'), total)), 57);
assert.equal(paiseToMoney(allocatePaise(gross, '95', parseMoneyPaise('40.00'), total)), 38);
assert.equal(
  allocatePaise(parseMoneyPaise('0.03'), '95', parseMoneyPaise('0.01'), parseMoneyPaise('0.03')),
  1n
);
assert.equal(
  allocatePaise(parseMoneyPaise('100.00'), '95', parseMoneyPaise('50.00'), parseMoneyPaise('100.00')) +
  allocatePaise(parseMoneyPaise('100.00'), '95', parseMoneyPaise('50.00'), parseMoneyPaise('100.00')),
  9500n
);

async function main(){
  const calls=[];
  const client={
    async query(sql,params=[]){
      calls.push({sql:String(sql),params});
      if(String(sql).includes('FROM investment_industry_rules')) return {rows:[{investor_revenue_share_percent:'95.00'}]};
      if(String(sql).includes('FROM investments WHERE industry_id=')) return {rows:[{id:11,amount:'60.00'},{id:12,amount:'40.00'}]};
      if(String(sql).includes('INSERT INTO investment_revenue_allocations')) return {rows:[],rowCount:2};
      throw new Error(`Unexpected allocation query: ${String(sql).slice(0,120)}`);
    }
  };

  await allocateInvestmentRevenue(client,{
    leadPurchaseId:77,
    industryId:3,
    stateId:5,
    cityId:9,
    grossAmount:'100.00'
  });

  const inserts=calls.filter(call=>call.sql.includes('INSERT INTO investment_revenue_allocations'));
  assert.equal(inserts.length,1,'Investor allocations must be inserted in one batch');
  assert.deepEqual(inserts[0].params[0],[11,12]);
  assert.deepEqual(inserts[0].params[1],[57,38]);
  assert.equal(inserts[0].params[2],77);
  assert.equal(inserts[0].params[3],3);
  assert.equal(inserts[0].params[4],100);
  assert.equal(inserts[0].params[5],95);

  console.log('Investor money allocation and batch-write checks passed.');
}

main().catch(error=>{console.error(error.stack||error.message);process.exit(1)});
