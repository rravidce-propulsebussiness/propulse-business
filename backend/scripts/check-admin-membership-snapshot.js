const assert=require('node:assert/strict');
const Module=require('node:module');
const path=require('node:path');

const originalLoad=Module._load;
let currentMembership=null;
let lastUpdateSql='';
let lastHistory='';
let auditCount=0;
let notifications=0;
const plans={
  2:{id:2,name:'GROW',plan_group:'grow',plan_type:'pro',duration_days:30,is_active:true},
  3:{id:3,name:'SCALE',plan_group:'scale',plan_type:'pro',duration_days:30,is_active:true}
};
const client={
  async query(sql,args=[]){
    if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return{rows:[],rowCount:0};
    if(sql.includes('SELECT id FROM users WHERE id=$1 FOR UPDATE'))return{rows:[{id:5}],rowCount:1};
    if(sql.includes('SELECT pg_advisory_xact_lock'))return{rows:[],rowCount:1};
    if(sql.includes('FROM membership_plans WHERE id=$1'))return{rows:[plans[Number(args[0])]].filter(Boolean)};
    if(sql.includes('FROM memberships m')&&sql.includes('FOR UPDATE OF m'))return{
      rows:currentMembership?[{...currentMembership,old_plan_name:plans[currentMembership.membership_plan_id].name,old_plan_group:plans[currentMembership.membership_plan_id].plan_group}]:[]
    };
    if(sql.includes('UPDATE memberships')&&sql.includes('SET membership_plan_id=$1')){
      lastUpdateSql=sql;
      const changed=Number(currentMembership.membership_plan_id)!==Number(args[0]);
      // In PostgreSQL, SET RHS expressions read the previous row values.
      currentMembership={...currentMembership,membership_plan_id:Number(args[0]),expires_at:args[1],
        pricing_rule_id:changed?null:currentMembership.pricing_rule_id,
        effective_price:changed?null:currentMembership.effective_price,
        lead_entitlements_snapshot:changed?null:currentMembership.lead_entitlements_snapshot};
      return{rows:[{...currentMembership}]};
    }
    if(sql.includes('INSERT INTO memberships(')){
      currentMembership={id:90,user_id:5,membership_plan_id:Number(args[1]),starts_at:new Date(),
        expires_at:args[2],status:'active',pricing_rule_id:null,effective_price:null,lead_entitlements_snapshot:null};
      return{rows:[{...currentMembership}]};
    }
    if(sql.includes('INSERT INTO membership_admin_history')){
      lastHistory=sql;
      return{rows:[],rowCount:1};
    }
    throw new Error('Unexpected query: '+sql.slice(0,120));
  },
  release(){}
};
const pool={connect:async()=>client,query:(...args)=>client.query(...args)};
Module._load=function(request,parent,isMain){
  if((parent?.filename||'').endsWith(path.sep+'adminUser360Service.js')){
    if(request==='../config/database')return pool;
    if(request==='./criticalActionAuditService')return{record:async()=>{auditCount++;}};
    if(request==='./notificationService')return{notifyUser:async()=>{notifications++;}};
    if(request.startsWith('./'))return{};
  }
  return originalLoad.apply(this,arguments);
};

(async()=>{
  try{
    const service=require('../src/services/adminUser360Service');
    async function assign(planId){return service.setMembershipPlan({userId:5,planId,adminId:7,days:30,reason:'Admin correction'});}
    currentMembership={id:12,user_id:5,membership_plan_id:2,status:'active',
      starts_at:new Date('2026-10-01'),expires_at:new Date('2026-11-01'),payment_id:44,
      pricing_rule_id:29,effective_price:'1499.00',lead_entitlements_snapshot:{source:'grow-paid'}};

    await assign(3);
    assert.equal(currentMembership.membership_plan_id,3);
    for(const column of ['pricing_rule_id','effective_price','lead_entitlements_snapshot']){
      assert.match(lastUpdateSql,new RegExp(column+'=CASE WHEN membership_plan_id=\\$1 THEN '+column+' ELSE NULL END'),
        'Reassigning a plan must reset stale '+column);
      assert.equal(currentMembership[column],null);
    }
    assert.match(lastHistory,/change_plan/);

    currentMembership.pricing_rule_id=31;
    currentMembership.effective_price='2345.00';
    currentMembership.lead_entitlements_snapshot={source:'scale-custom'};
    await assign(3);
    assert.equal(currentMembership.pricing_rule_id,31,'Same-plan extension must retain pricing rule');
    assert.equal(currentMembership.effective_price,'2345.00','Same-plan extension must retain effective price');
    assert.deepEqual(currentMembership.lead_entitlements_snapshot,{source:'scale-custom'},
      'Same-plan extension must retain entitlement snapshot');

    currentMembership=null;
    await assign(2);
    assert.equal(currentMembership.membership_plan_id,2);
    assert.equal(currentMembership.lead_entitlements_snapshot,null);
    assert.equal(currentMembership.effective_price,null);
    assert.match(lastHistory,/assign_plan/);
    assert.equal(auditCount,3);
    assert.equal(notifications,3);
    console.log('Admin membership snapshot regression tests passed.');
  }finally{Module._load=originalLoad;}
})().catch(error=>{console.error(error);process.exitCode=1;});
