const leadPurchaseService=require('../services/leadPurchaseService');
async function purchase(req,res){try{return res.status(201).json(await leadPurchaseService.purchaseLead({leadId:req.params.id,userId:req.user.id,shares:req.body.shares}))}catch(error){const map={INVALID_SHARES:400,INVALID_PRICE:400,PRO_REQUIRED:403,PROFILE_MISMATCH:403,NOT_FOUND:404,NOT_AVAILABLE:409,CAPACITY_REACHED:409,INSUFFICIENT_BALANCE:402};return res.status(map[error.code]||500).json({error:error.message||'Failed to purchase lead',code:error.code})}}
async function purchases(req,res){try{return res.json(await leadPurchaseService.getPurchases(req.user.id))}catch(error){return res.status(500).json({error:'Failed to fetch purchased leads'})}}
module.exports={purchase,purchases};
