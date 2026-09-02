const service = require('../services/boosterOrderService');

async function create(req,res){
  try { return res.status(201).json({ success:true, order:await service.createBoosterOrder(req.user.id,req.body) }); }
  catch(error){ return res.status(400).json({ success:false, message:error.message }); }
}

async function submitPayment(req,res){
  try { return res.json({ success:true, order:await service.submitPaymentReference(req.user.id,req.params.id,req.body.paymentReference) }); }
  catch(error){ return res.status(400).json({ success:false, message:error.message }); }
}

async function list(req,res){
  try { return res.json({ success:true, orders:await service.listBoosterOrders(req.user.id) }); }
  catch(error){ return res.status(500).json({ success:false, message:'Unable to load Booster orders' }); }
}

module.exports = { create, submitPayment, list };