const faqService=require('../services/faqService');

async function list(req,res){
  try{return res.json(await faqService.list(String(req.query?.audience||'lead_partner'),false))}
  catch(error){const status=error.code==='INVALID_AUDIENCE'?400:500;console.error('List FAQs failed:',error.message);return res.status(status).json({error:error.message||'Failed to load FAQs',code:error.code})}
}
async function adminList(req,res){
  try{return res.json(await faqService.adminList(String(req.query?.audience||'lead_partner')))}
  catch(error){const status=error.code==='INVALID_AUDIENCE'?400:500;console.error('List admin FAQs failed:',error.message);return res.status(status).json({error:error.message||'Failed to load FAQs',code:error.code})}
}
async function create(req,res){
  try{return res.status(201).json(await faqService.create(req.body||{}))}
  catch(error){const status=['INVALID_ID','INVALID_AUDIENCE','INVALID_CATEGORY','INVALID_QUESTION','INVALID_ANSWER'].includes(error.code)?400:500;return res.status(status).json({error:error.message||'Failed to create FAQ',code:error.code})}
}
async function update(req,res){
  try{return res.json(await faqService.update(req.params.id,req.body||{}))}
  catch(error){const status=error.code==='NOT_FOUND'?404:['INVALID_ID','INVALID_AUDIENCE','INVALID_CATEGORY','INVALID_QUESTION','INVALID_ANSWER'].includes(error.code)?400:500;return res.status(status).json({error:error.message||'Failed to update FAQ',code:error.code})}
}
async function remove(req,res){
  try{return res.json(await faqService.remove(req.params.id))}
  catch(error){return res.status(error.code==='NOT_FOUND'?404:400).json({error:error.message||'Failed to delete FAQ',code:error.code})}
}
module.exports={list,adminList,create,update,remove};