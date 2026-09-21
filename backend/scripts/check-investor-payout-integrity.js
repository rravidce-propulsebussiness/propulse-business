const assert=require('assert');

function loadService({summary,investments,revenueByInvestment}) {
  const dbPath=require.resolve('../src/config/database');
  const ledgerPath=require.resolve('../src/services/investorFinancialLedgerService');
  const calls=[];
  const updates=[];
  const client={
    release() {},
    async query(sql,params=[]){
      calls.push(sql.trim());
      if(sql.trim()==='BEGIN' || sql.trim()==='COMMIT' || sql.trim()==='ROLLBACK') return {rows:[],rowCount:0};
      if(sql.includes('investor-payout-reference:')) return {rows:[],rowCount:0};
      if(sql.includes('pg_advisory_xact_lock')) return {rows:[],rowCount:0};
      if(sql.includes('SELECT id FROM investor_payout_requests')) return {rows:[],rowCount:0};
      if(sql.includes('SELECT i.id') && sql.includes('FROM investments i')) return {rows:investments.map(id=>({id})),rowCount:investments.length};
      if(sql.includes('SELECT COALESCE(SUM(allocated_amount)')) {
        const id=Number(params[0]);
        return {rows:[{total:revenueByInvestment[id]||0}],rowCount:1};
      }
      if(sql.includes("SET status='paid'")) {
        updates.push({id:Number(params[3]),amount:Number(params[0])});
        return {rows:[],rowCount:1};
      }
      throw new Error(`Unexpected SQL in regression test: ${sql}`);
    },
  };
  const pool={connect:async()=>client};
  const ledger={
    lockInvestorFinancials:async()=>calls.push('LOCK_INVESTOR_FINANCIALS'),
    getInvestorFinancialSummary:async()=>summary,
  };
  require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:pool};
  require.cache[ledgerPath]={id:ledgerPath,filename:ledgerPath,loaded:true,exports:ledger};
  delete require.cache[require.resolve('../src/services/investorAdminTransferService')];
  return {service:require('../src/services/investorAdminTransferService'),calls,updates};
}

async function main(){
  {
    const {service,calls,updates}=loadService({
      summary:{non_auto_earnings_withdrawable:6000},
      investments:[101],
      revenueByInvestment:{101:10000},
    });
    await assert.rejects(
      service.transferInvestorEarnings({userId:7,adminId:1,transferReference:'UTR-1',proofUrl:'proof'}),
      error=>error && error.code==='NO_REALIZED_AMOUNT'
    );
    assert.strictEqual(updates.length,0,'A partially available investment must not be marked paid');
    assert(calls.indexOf('LOCK_INVESTOR_FINANCIALS')>=0,'Transfer-all must acquire the investor financial lock');
  }

  {
    const {service,updates}=loadService({
      summary:{non_auto_earnings_withdrawable:6000},
      investments:[101,102],
      revenueByInvestment:{101:4000,102:7000},
    });
    const result=await service.transferInvestorEarnings({userId:7,adminId:1,transferReference:'UTR-2',proofUrl:'proof'});
    assert.strictEqual(result.transferred_amount,4000,'Transfer-all must not exceed the remaining withdrawable earnings');
    assert.deepStrictEqual(updates,[{id:101,amount:4000}]);
  }

  console.log('Investor payout double-payment regression test passed.');
}

main().catch(error=>{console.error(error.stack||error.message);process.exit(1)});
