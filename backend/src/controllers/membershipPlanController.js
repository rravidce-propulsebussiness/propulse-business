const s=require('../services/membershipPlanService');
const {sendError}=require('../utils/errorResponse');

async function getPlans(req,res){
  try{return res.json(req.user?.role==='admin'?await s.getPlans(true):await s.getPlansForUser(req.user?.id))}
  catch(e){console.error('GET /membership-plans failed:',e);return sendError(res,500,e,'Failed to fetch membership plans')}
}
async function getPublicPlans(req,res){
  try{return res.json(await s.getPlans(false))}
  catch(e){console.error('GET /membership-plans/public failed:',e);return sendError(res,500,e,'Failed to fetch membership plans')}
}
async function listPricingRules(req,res){
  try{return res.json(await s.listPricingRules())}
  catch(e){console.error('GET /membership-plans/rules failed:',e);return sendError(res,500,e,'Failed to fetch membership pricing rules')}
}
async function createPricingRule(req,res){
  try{return res.status(201).json(await s.createPricingRule(req.body||{},req.user?.id))}
  catch(e){const status=e.code==='INVALID_MEMBERSHIP_PRICING_RULE'?400:500;if(status===500)console.error('Create membership pricing rule failed:',e.message);return sendError(res,status,e,'Failed to create membership pricing rule',{code:e.code})}
}
async function updatePricingRule(req,res){
  try{return res.json(await s.updatePricingRule(req.params.id,req.body||{},req.user?.id))}
  catch(e){const status=e.code==='MEMBERSHIP_PRICING_RULE_NOT_FOUND'?404:e.code==='INVALID_MEMBERSHIP_PRICING_RULE'?400:500;if(status===500)console.error('Update membership pricing rule failed:',e.message);return sendError(res,status,e,'Failed to update membership pricing rule',{code:e.code})}
}
async function deletePricingRule(req,res){
  try{const row=await s.deletePricingRule(req.params.id);if(!row)return res.status(404).json({error:'Membership pricing rule not found'});return res.json({deleted:true,id:row.id})}
  catch(e){console.error('Delete membership pricing rule failed:',e.message);return sendError(res,500,e,'Failed to delete membership pricing rule')}
}
async function listPricingRuleBusinesses(req,res){
  try{return res.json({data:await s.listPricingRuleBusinesses(req.query?.search||'')})}
  catch(e){console.error('List pricing rule businesses failed:',e.message);return sendError(res,500,e,'Failed to fetch businesses')}
}
async function createPlan(req,res){
  try{
    const d=req.body;
    if(!d.name)return res.status(400).json({error:'Plan name is required'});
    if(d.bundle)return res.status(201).json(await s.createPlanBundle(d));
    return res.status(201).json(await s.createPlan(d));
  }catch(e){
    console.error('POST /membership-plans failed:',e);
    if(e.code==='23505')return res.status(409).json({error:'A plan with this name already exists'});
    const status=e.code==='INVALID_MEMBERSHIP_PLAN'?400:500;
    return sendError(res,status,e,'Failed to create membership plan',{code:e.code});
  }
}
async function updatePlan(req,res){
  try{const p=await s.updatePlan(req.params.id,req.body);if(!p)return res.status(404).json({error:'Membership plan not found'});return res.json(p)}
  catch(e){console.error('PUT /membership-plans/:id failed:',e);return sendError(res,500,e,'Failed to update membership plan')}
}
async function setPlanStatus(req,res){
  try{const p=await s.setPlanStatus(req.params.id,Boolean(req.body.isActive));if(!p)return res.status(404).json({error:'Membership plan not found'});return res.json(p)}
  catch(e){console.error('PATCH /membership-plans/:id/status failed:',e);return sendError(res,500,e,'Failed to update membership plan status')}
}
async function deletePlan(req,res){
  try{const p=await s.deletePlan(req.params.id);if(!p)return res.status(404).json({error:'Membership plan not found'});return res.json({message:'Membership plan deleted successfully'})}
  catch(e){console.error('DELETE /membership-plans/:id failed:',e);return sendError(res,500,e,'Failed to delete membership plan')}
}

module.exports={getPlans,getPublicPlans,listPricingRules,createPricingRule,updatePricingRule,deletePricingRule,listPricingRuleBusinesses,createPlan,updatePlan,setPlanStatus,deletePlan};
