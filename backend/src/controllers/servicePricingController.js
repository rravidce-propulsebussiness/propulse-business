const servicePricingService=require('../services/servicePricingService');
async function getPublic(req,res){try{return res.json(await servicePricingService.list(true))}catch(e){console.error('Get public pricing failed:',e.message);return res.status(500).json({error:'Failed to load pricing'})}}
async function getAdmin(req,res){try{return res.json(await servicePricingService.list(false))}catch(e){console.error('Get admin pricing failed:',e.message);return res.status(500).json({error:'Failed to load pricing settings'})}}
async function create(req,res){try{return res.status(201).json(await servicePricingService.create(req.body||{}))}catch(e){const status=e.code==='INVALID_PRICING'?400:e.code==='23505'?409:500;return res.status(status).json({error:e.code==='23505'?'Pricing slug already exists':e.message||'Failed to create pricing item',code:e.code})}}
async function update(req,res){try{const item=await servicePricingService.update(req.params.id,req.body||{});if(!item)return res.status(404).json({error:'Pricing item not found'});return res.json(item)}catch(e){const status=e.code==='INVALID_PRICING'?400:e.code==='23505'?409:500;return res.status(status).json({error:e.code==='23505'?'Pricing slug already exists':e.message||'Failed to update pricing item',code:e.code})}}
async function uploadImage(req,res){
  try{
    const item=await servicePricingService.replaceImage(req.params.id,req.body?.dataUrl)
    if(!item)return res.status(404).json({error:'Pricing item not found'})
    return res.json(item)
  }catch(e){
    const status=['INVALID_IMAGE','IMAGE_TOO_LARGE'].includes(e.code)?400:500
    return res.status(status).json({error:e.message||'Failed to upload pricing image',code:e.code})
  }
}
async function removeImage(req,res){
  try{
    const item=await servicePricingService.removeImage(req.params.id)
    if(!item)return res.status(404).json({error:'Pricing item not found'})
    return res.json(item)
  }catch(e){return res.status(500).json({error:'Failed to remove pricing image'})}
}
async function remove(req,res){try{const item=await servicePricingService.remove(req.params.id);if(!item)return res.status(404).json({error:'Pricing item not found'});return res.json({message:'Pricing item deleted'})}catch(e){return res.status(500).json({error:'Failed to delete pricing item'})}}
module.exports={getPublic,getAdmin,create,update,remove,uploadImage,removeImage};