const service = require('../services/paymentReceivingDetailsService');
const availability = require('../services/paymentAvailabilityService');
const razorpay = require('../services/razorpayGatewayService');
const {sendError}=require('../utils/errorResponse');

async function listPublic(req,res){try{res.json(await service.getPublic())}catch(e){console.error('Public payment details failed:',e.message);return sendError(res,500,e,'Failed to fetch payment details')}}
async function listAdmin(req,res){try{res.json(await service.list({includeInactive:true}))}catch(e){console.error('Admin payment details failed:',e.message);return sendError(res,500,e,'Failed to fetch payment details')}}
async function create(req,res){try{res.status(201).json(await service.create(req.body))}catch(e){const status=['LABEL_REQUIRED','INVALID_METHOD_TYPE'].includes(e.code)?400:500;if(status===500)console.error('Create payment details failed:',e.message);return sendError(res,status,e,'Failed to create payment details',{code:e.code})}}
async function update(req,res){try{res.json(await service.update(req.params.id,req.body))}catch(e){const status=e.code==='NOT_FOUND'?404:['LABEL_REQUIRED','INVALID_METHOD_TYPE'].includes(e.code)?400:500;if(status===500)console.error('Update payment details failed:',e.message);return sendError(res,status,e,'Failed to update payment details',{code:e.code})}}
async function getOptions(req,res){try{const options=await availability.get();return res.json({...options,gatewayConfigured:razorpay.isCheckoutConfigured()})}catch(e){console.error('Payment availability load failed:',e.message);return sendError(res,500,e,'Failed to load payment availability')}}
async function updateOptions(req,res){try{const options=await availability.update({...req.body,adminId:req.user.id});return res.json({...options,gatewayConfigured:razorpay.isCheckoutConfigured()})}catch(e){const status=e.code==='INVALID_ONLINE_DISPLAY_MODE'?400:500;if(status===500)console.error('Payment availability update failed:',e.message);return sendError(res,status,e,'Failed to update payment availability',{code:e.code})}}
async function remove(req,res){try{res.json(await service.remove(req.params.id))}catch(e){const status=e.code==='NOT_FOUND'?404:500;if(status===500)console.error('Delete payment details failed:',e.message);return sendError(res,status,e,'Failed to delete payment details',{code:e.code})}}

module.exports={listPublic,listAdmin,getOptions,updateOptions,create,update,remove};
