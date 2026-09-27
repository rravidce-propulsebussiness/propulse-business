const s=require('../services/membershipPlanService');

async function getPlans(req,res){
  try{
    res.json(req.user?.role==='admin'?await s.getPlans(true):await s.getPlansForUser(req.user?.id))
  }catch(e){
    console.error('GET /membership-plans failed:',e);
    res.status(500).json({error:'Failed to fetch membership plans',detail:process.env.NODE_ENV==='production'?undefined:e.message})
  }
}

async function getPublicPlans(req,res){
  try{
    res.json(await s.getPlans(false))
  }catch(e){
    console.error('GET /membership-plans/public failed:',e);
    res.status(500).json({error:'Failed to fetch membership plans',detail:process.env.NODE_ENV==='production'?undefined:e.message})
  }
}

async function listPricingRules(req,res){
  try{res.json(await s.listPricingRules())}
  catch(e){console.error('GET /membership-plans/rules failed:',e);res.status(500).json({error:'Failed to fetch membership pricing rules'})}
}
async function createPricingRule(req,res){
  try{res.status(201).json(await s.createPricingRule(req.body||{},req.user?.id))}
  catch(e){const status=e.code==='INVALID_MEMBERSHIP_PRICING_RULE'?400:500;res.status(status).json({error:e.message||'Failed to create membership pricing rule',code:e.code})}
}
async function updatePricingRule(req,res){
  try{res.json(await s.updatePricingRule(req.params.id,req.body||{},req.user?.id))}
  catch(e){const status=e.code==='MEMBERSHIP_PRICING_RULE_NOT_FOUND'?404:e.code==='INVALID_MEMBERSHIP_PRICING_RULE'?400:500;res.status(status).json({error:e.message||'Failed to update membership pricing rule',code:e.code})}
}
async function deletePricingRule(req,res){
  try{const row=await s.deletePricingRule(req.params.id);if(!row)return res.status(404).json({error:'Membership pricing rule not found'});res.json({deleted:true,id:row.id})}
  catch(e){res.status(500).json({error:e.message||'Failed to delete membership pricing rule'})}
}
async function listPricingRuleBusinesses(req,res){
  try{res.json({data:await s.listPricingRuleBusinesses(req.query?.search||'')})}
  catch(e){res.status(500).json({error:'Failed to fetch businesses'})}
}

async function createPlan(req,res){
  try{
    const d=req.body;
    if(!d.name)return res.status(400).json({error:'Plan name is required'});
    if(d.bundle)return res.status(201).json(await s.createPlanBundle(d));
    res.status(201).json(await s.createPlan(d))
  }catch(e){
    console.error('POST /membership-plans failed:',e);
    const status=e.code==='INVALID_MEMBERSHIP_PLAN'?400:500;
    res.status(status).json({error:e.code==='23505'?'A plan with this name already exists':e.code==='INVALID_MEMBERSHIP_PLAN'?e.message:'Failed to create membership plan',detail:process.env.NODE_ENV==='production'?undefined:e.message})
  }
}

async function updatePlan(req,res){
  try{
    const p=await s.updatePlan(req.params.id,req.body);
    if(!p)return res.status(404).json({error:'Membership plan not found'});
    res.json(p)
  }catch(e){
    console.error('PUT /membership-plans/:id failed:',e);
    res.status(500).json({error:'Failed to update membership plan',detail:process.env.NODE_ENV==='production'?undefined:e.message})
  }
}

async function setPlanStatus(req,res){
  try{
    const p=await s.setPlanStatus(req.params.id,Boolean(req.body.isActive));
    if(!p)return res.status(404).json({error:'Membership plan not found'});
    res.json(p)
  }catch(e){
    console.error('PATCH /membership-plans/:id/status failed:',e);
    res.status(500).json({error:'Failed to update membership plan status',detail:process.env.NODE_ENV==='production'?undefined:e.message})
  }
}

async function deletePlan(req,res){
  try{
    const p=await s.deletePlan(req.params.id);
    if(!p)return res.status(404).json({error:'Membership plan not found'});
    res.json({message:'Membership plan deleted successfully'})
  }catch(e){
    console.error('DELETE /membership-plans/:id failed:',e);
    res.status(500).json({error:'Failed to delete membership plan',detail:process.env.NODE_ENV==='production'?undefined:e.message})
  }
}

module.exports={getPlans,getPublicPlans,listPricingRules,createPricingRule,updatePricingRule,deletePricingRule,listPricingRuleBusinesses,createPlan,updatePlan,setPlanStatus,deletePlan};
