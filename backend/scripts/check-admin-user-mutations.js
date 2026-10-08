const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const originalLoad = Module._load;
const writes = [];
let profile = {phone:'9999999999',business_name:'Existing Business',business_details:'Existing description'};
let user = {id:7,name:'Existing User',email:'user@example.com',role:'business'};
const validationCalls = [];

const client = {
  async query(sql,params=[]) {
    writes.push({sql,params});
    if (['BEGIN','COMMIT','ROLLBACK'].includes(sql)) return {rows:[],rowCount:0};
    if (sql.startsWith('SELECT id,name,email,role FROM users WHERE id=')) return {rows:[{...user}],rowCount:1};
    if (sql.startsWith('SELECT phone,business_name,business_details FROM business_profiles')) return {rows:[{...profile}],rowCount:1};
    if (sql.startsWith('SELECT id FROM users WHERE LOWER(email)=')) return {rows:[],rowCount:0};
    if (sql.startsWith('UPDATE users SET name=')) {
      user={...user,name:params[0],email:params[1]};
      return {rows:[{...user,is_active:true}],rowCount:1};
    }
    if (sql.startsWith('SELECT id FROM business_profiles WHERE user_id=')) return {rows:[{id:15}],rowCount:1};
    if (sql.startsWith('UPDATE business_profiles SET phone=')) {
      profile={phone:params[0],business_name:params[1],business_details:params[2]};
      return {rows:[],rowCount:1};
    }
    if (/^(UPDATE|INSERT INTO) business_profile_(services|locations)/.test(sql)) return {rows:[],rowCount:1};
    if (sql.includes('INSERT INTO admin_user_audit')) return {rows:[],rowCount:1};
    throw new Error('Unexpected DB query in test: '+sql.slice(0,110));
  },
  release() {},
};
const pool = {connect:async()=>client,query:(...args)=>client.query(...args)};

Module._load=function(request,parent,isMain){
  const parentName=parent?.filename||'';
  if(parentName.endsWith(path.sep+'adminService.js')){
    if(request==='../config/database') return pool;
    if(request==='bcryptjs') return {hash:async()=> 'test-password-hash'};
    if(request==='./profileService')return{validateSelections:async(_client,services,locations)=>{
      validationCalls.push({services,locations});
      if(!Array.isArray(services)||!Array.isArray(locations)||!services.length||!locations.length){
        throw Object.assign(new Error('Invalid selections'),{code:'INVALID_PROFILE_SELECTION'});
      }
      // Simulate the real validator's normalization to one entry per city.
      return {services,locations:[locations[0]]};
    }};
    if(request==='./criticalActionAuditService')return{record:async()=>{}};
    if(request==='./notificationService')return{notifyUser:async()=>{}};
    if(request.startsWith('./'))return{};
  }
  if(parentName.endsWith(path.sep+'adminController.js')){
    if(request==='../services/adminService')return require('../src/services/adminService');
    if(request.startsWith('../services/'))return{};
    if(request==='../utils/errorResponse')return{sendError:(res,status,error,fallback)=>res.status(status).json({error:error.message||fallback})};
  }
  return originalLoad.apply(this,arguments);
};

function response(){
  return {statusCode:200,body:null,status(status){this.statusCode=status;return this;},json(body){this.body=body;return this;}};
}
(async()=>{
  try{
    const adminService=require('../src/services/adminService');
    const adminController=require('../src/controllers/adminController');

    writes.length=0;
    await adminService.updateUserProfile(7,{name:'Renamed User'},9);
    assert.deepEqual(profile,{phone:'9999999999',business_name:'Existing Business',business_details:'Existing description'});
    assert.equal(writes.filter(x=>/business_profile_(services|locations)/.test(x.sql)).length,0,
      'A name-only edit must not modify business coverage');

    await adminService.updateUserProfile(7,{businessDetails:''},9);
    assert.equal(profile.business_details,'','Explicit empty string must clear an editable field');
    assert.equal(profile.business_name,'Existing Business','Omitted business name must be preserved');
    assert.equal(profile.phone,'9999999999','Omitted phone must be preserved');

    writes.length=0;
    const services=[{industryId:2,serviceId:3,subserviceId:null}];
    const locations=[
      {stateId:4,cityId:5,subcityId:6,pincode:'500001'},
      {stateId:4,cityId:5,subcityId:7,pincode:'500002'}
    ];
    await adminService.updateUserProfile(7,{services,locations},9);
    assert.equal(validationCalls.length,1);
    assert.equal(writes.filter(x=>x.sql.includes('INSERT INTO business_profile_services')).length,1);
    assert.equal(writes.filter(x=>x.sql.includes('INSERT INTO business_profile_locations')).length,1,
      'Admin must save normalized locations returned by the validator');

    writes.length=0;
    await assert.rejects(()=>adminService.updateUserProfile(7,{services},9),
      error=>error.code==='INVALID_PROFILE_SELECTION');
    assert.equal(writes.filter(x=>x.sql.startsWith('UPDATE business_profile_')).length,0,
      'Incomplete coverage must roll back without changing a profile');

    const makeReq=isActive=>({params:{id:'7'},body:isActive, user:{id:9}});
    for(const value of [undefined,{isActive:'false'},{isActive:0},{isActive:null}]){
      const res=response();
      await adminController.setUserStatus(makeReq(value),res);
      assert.equal(res.statusCode,400,'Invalid status must be rejected');
      assert.equal(res.body.code,'INVALID_STATUS');
    }

    const original=adminService.setUserStatus;
    try{
      let captured=null;
      adminService.setUserStatus=async(id,isActive)=>{captured={id,isActive};return{id,is_active:isActive};};
      const res=response();
      await adminController.setUserStatus(makeReq({isActive:false}),res);
      assert.equal(res.statusCode,200);
      assert.equal(captured.isActive,false);
    }finally{adminService.setUserStatus=original;}

    const res=response();
    await adminController.updateUserProfile({params:{id:'7'},body:{services},user:{id:9}},res);
    assert.equal(res.statusCode,400,'Invalid coverage must be a client error, not HTTP 500');
    assert.equal(res.body.code,'INVALID_PROFILE_SELECTION');
    console.log('Admin user mutation regression tests passed.');
  }finally{Module._load=originalLoad;}
})().catch(error=>{console.error(error);process.exitCode=1;});
