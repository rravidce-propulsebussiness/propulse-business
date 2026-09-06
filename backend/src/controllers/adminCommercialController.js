const svc=require('../services/adminCommercialService');
async function investorSettings(req,res){try{res.json(await svc.getInvestorSettings())}catch(e){console.error(e);res.status(500).json({error:'Failed to load investor settings'})}}
async function updateInvestor(req,res){try{res.json(await svc.updateInvestorSettings(req.body))}catch(e){console.error(e);const status=e.code==='INVALID_LOCATION_CONFIG'||e.code==='INVALID_INVESTMENT_CONFIG'?400:500;res.status(status).json({error:e.message||'Failed to save investor settings',code:e.code})}}
async function coupons(req,res){try{res.json(await svc.getCoupons())}catch(e){res.status(500).json({error:'Failed to load coupons'})}}
async function createCoupon(req,res){try{res.status(201).json(await svc.createCoupon(req.body))}catch(e){console.error(e);res.status(500).json({error:e.code==='23505'?'Coupon code already exists':'Failed to create coupon'})}}
async function updateCoupon(req,res){try{const x=await svc.updateCoupon(req.params.id,req.body);if(!x)return res.status(404).json({error:'Coupon not found'});res.json(x)}catch(e){res.status(500).json({error:'Failed to update coupon'})}}
async function couponStatus(req,res){try{const x=await svc.setCouponStatus(req.params.id,Boolean(req.body.isActive));if(!x)return res.status(404).json({error:'Coupon not found'});res.json(x)}catch(e){res.status(500).json({error:'Failed to update coupon'})}}
async function deleteCoupon(req,res){try{const x=await svc.deleteCoupon(req.params.id);if(!x)return res.status(404).json({error:'Coupon not found'});res.json({message:'Coupon deleted'})}catch(e){res.status(500).json({error:'Failed to delete coupon'})}}
module.exports={investorSettings,updateInvestor,coupons,createCoupon,updateCoupon,couponStatus,deleteCoupon};
