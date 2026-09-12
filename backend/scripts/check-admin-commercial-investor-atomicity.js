const assert=require('assert');
const Module=require('module');

const poolCalls=[];
const clientCalls=[];
let mode='invalid';

const fakePool={
  async query(sql,params){
    poolCalls.push({sql,params});
    if(String(sql).startsWith('SELECT * FROM investor_settings'))return {rows:[{id:1,investor_revenue_share_percent:100}]};
    if(String(sql).includes('FROM industries i'))return {rows:[]};
    throw new Error(`Unexpected pool query: ${sql}`);
  },
  async connect(){
    return {
      async query(sql,params){
        clientCalls.push({sql,params});
        const text=String(sql);
        if(text==='BEGIN'||text==='COMMIT'||text==='ROLLBACK')return {rows:[]};
        if(text.startsWith('UPDATE investor_settings SET'))return {rows:[]};
        if(text.startsWith('SELECT investor_revenue_share_percent FROM investor_settings'))return {rows:[{investor_revenue_share_percent:100}]};
        if(text.startsWith('SELECT id FROM industries'))return mode==='invalid'?{rows:[]}:{rows:[{id:1}]};
        if(text.startsWith('DELETE FROM investor_industry_location_limits'))return {rows:[]};
        if(text.startsWith('UPDATE investor_industry_limits SET'))return {rows:[]};
        if(text.startsWith('UPDATE investment_industry_rules SET'))return {rows:[]};
        if(text.startsWith('UPDATE investments SET maturity_days='))return {rows:[]};
        if(text.startsWith('INSERT INTO investor_industry_limits'))return {rows:[]};
        if(text.startsWith('INSERT INTO investor_industry_location_limits'))return {rows:[]};
        if(text.startsWith('SELECT id FROM states'))return {rows:[{id:1}]};
        if(text.startsWith('SELECT id FROM cities'))return {rows:[{id:1}]};
        if(text.startsWith('INSERT INTO investment_industry_rules'))return {rows:[]};
        throw new Error(`Unexpected client query: ${sql}`);
      },
      release(){clientCalls.push({sql:'RELEASE'});
      }
    };
  }
};

const originalLoad=Module._load;
Module._load=function(request,parent,isMain){
  if(parent&&parent.filename&&parent.filename.endsWith('/backend/src/services/adminCommercialService.js')&&request==='../config/database')return fakePool;
  return originalLoad.apply(this,arguments);
};

const {updateInvestorSettings}=require('../src/services/adminCommercialService');

const base={globalLimit:100,defaultIndustryLimit:20,customerIndustryLimit:10,minInvestment:1000,maxInvestment:5000,enabled:true,requiresPro:true,investmentCycleDays:30,investorRevenueSharePercent:100,autoReinvest:false};

async function main(){
  await assert.rejects(
    () => updateInvestorSettings({...base,industryLimits:[{industryId:999,locations:[]}]}),
    error => error.code==='INVALID_INDUSTRY_LOCATION_CONFIG'
  );
  assert.strictEqual(poolCalls.length,0,'Investor settings must not be written through the pool outside the transaction');
  assert(clientCalls.some(x=>x.sql==='BEGIN'),'Transaction did not begin');
  assert(clientCalls.some(x=>x.sql.startsWith('UPDATE investor_settings SET')),'Global investor settings were not updated inside the transaction');
  assert(clientCalls.some(x=>x.sql==='ROLLBACK'),'Failed investor configuration did not roll back');

  poolCalls.length=0;
  clientCalls.length=0;
  mode='valid';
  await updateInvestorSettings({...base,industryLimits:[]});
  assert(clientCalls.some(x=>x.sql==='DELETE FROM investor_industry_location_limits'),'Empty industry limits must clear all existing industry-location rules');
  assert(clientCalls.some(x=>x.sql==='COMMIT'),'Successful investor settings update did not commit');
  assert(!clientCalls.some(x=>x.sql==='ROLLBACK'),'Successful investor settings update rolled back');
  assert(poolCalls.length===2,'Final investor settings read should happen only after the transaction commits');

  console.log('Investor settings transaction atomicity regression test passed.');
}

main().catch(error=>{console.error(error.stack||error.message);process.exit(1)});
