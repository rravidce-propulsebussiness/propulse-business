const service = require('../services/paymentReceivingDetailsService');

async function listPublic(req,res){try{res.json(await service.getPublic())}catch(e){console.error('Public payment details failed:',e.message);res.status(500).json({error:'Failed to fetch payment details'})}}
async function listAdmin(req,res){try{res.json(await service.list({includeInactive:true}))}catch(e){console.error('Admin payment details failed:',e.message);res.status(500).json({error:'Failed to fetch payment details'})}}
async function create(req,res){try{res.status(201).json(await service.create(req.body))}catch(e){const status=e.code==='LABEL_REQUIRED'||e.code==='INVALID_METHOD_TYPE'?400:500;res.status(status).json({error:e.message||'Failed to create payment details',code:e.code})}}
async function update(req,res){try{res.json(await service.update(req.params.id,req.body))}catch(e){const status=e.code==='NOT_FOUND'?404:(e.code==='LABEL_REQUIRED'||e.code==='INVALID_METHOD_TYPE'?400:500);res.status(status).json({error:e.message||'Failed to update payment details',code:e.code})}}
async function remove(req,res){try{res.json(await service.remove(req.params.id))}catch(e){res.status(e.code==='NOT_FOUND'?404:500).json({error:e.message||'Failed to delete payment details',code:e.code})}}

module.exports={listPublic,listAdmin,create,update,remove};
