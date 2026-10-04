const assert=require('assert');
const fs=require('fs');
const path=require('path');

const service=require('../src/services/leadEntitlementService');
const source=fs.readFileSync(path.join(__dirname,'../src/services/leadEntitlementService.js'),'utf8');

function withNow(now,callback){
  const OriginalDate=global.Date;
  const fixedNow=new OriginalDate(now);
  class FixedDate extends OriginalDate{
    constructor(...args){if(args.length===0)super(fixedNow.getTime());else super(...args)}
    static now(){return fixedNow.getTime()}
  }
  global.Date=FixedDate;
  try{return callback()}finally{global.Date=OriginalDate}
}

function assertDate(date,year,month,day,label){
  assert.strictEqual(date.getUTCFullYear(),year,`${label}: year`);
  assert.strictEqual(date.getUTCMonth(),month,`${label}: month`);
  assert.strictEqual(date.getUTCDate(),day,`${label}: day`);
}

withNow('2026-09-22T12:00:00Z',()=>{
  const period=service.periodForMembership({
    starts_at:'2026-08-22T12:00:00Z',
    billing_months:3
  });
  assertDate(period.monthlyStart,2026,8,22,'Monthly reset start');
  assertDate(period.monthlyEnd,2026,9,22,'Monthly reset end');
  assertDate(period.periodStart,2026,7,22,'Quarterly period start');
  assertDate(period.periodEnd,2026,10,22,'Quarterly period end');
});

withNow('2026-09-29T12:00:00Z',()=>{
  const period=service.periodForMembership({
    starts_at:'2025-09-30T12:00:00Z',
    billing_months:12
  });
  assertDate(period.monthlyStart,2026,7,30,'Pre-anniversary monthly start');
  assertDate(period.monthlyEnd,2026,8,30,'Pre-anniversary monthly end');
});

withNow('2026-09-30T12:00:00Z',()=>{
  const period=service.periodForMembership({
    starts_at:'2025-09-30T12:00:00Z',
    billing_months:12
  });
  assertDate(period.monthlyStart,2026,8,30,'Anniversary monthly start');
  assertDate(period.monthlyEnd,2026,9,30,'Anniversary monthly end');
});

assert(source.includes("grantService.findAvailableGrant(userId,entitlementType,pool,{"),'Lead access must check grant entitlements before membership');
assert(source.includes("grantService.findAvailableGrant(userId,type,client,{"),'Lead claim must lock and consume a grant before membership');
assert(source.includes("ensureWelcome:true,forUpdate:true,lead,exclusiveActive,pro"),'Lead claim must pass strategy and exclusive eligibility into the grant lookup');
assert(source.indexOf("grantService.findAvailableGrant(userId,type,client")<source.indexOf("membershipAccess(userId,lead,client,{lock:true})"),'Grant entitlement must be consumed before membership allowance');
assert(source.includes("membership_id=$2 AND entitlement_type=$3"),'Membership usage must remain scoped to the membership');
assert(source.includes("membership.lead_rollover_enabled===false?monthlyStart:periodStart"),'Non-rollover membership entitlements must reset monthly');
assert(source.includes("membership.lead_rollover_enabled===false?Math.max(0,monthly):Math.max(0,periodTotal)"),'Membership allowance must preserve monthly/period rollover behavior');
assert(source.includes("code:'ENTITLEMENT_NOT_INCLUDED'"),'Membership not-included behavior must remain distinct');
assert(source.includes("code:'ENTITLEMENT_EMPTY'"),'Membership empty entitlement behavior must remain distinct');

console.log('Lead entitlement monthly-reset, grant-priority and date-boundary regression tests passed.');
