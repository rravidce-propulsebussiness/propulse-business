const express=require('express');
const leadService=require('../services/metaLeadService');
const requireAuth=require('../middleware/authMiddleware');
const rateLimit=require('../middleware/rateLimitMiddleware');

const webhookRouter=express.Router();
const apiRouter=express.Router();
const connectionLimit=rateLimit({windowMs:60*1000,max:8});

webhookRouter.get('/',(req,res)=>{
  if(!leadService.validChallenge(req.query))return res.sendStatus(403);
  return res.status(200).type('text/plain').send(String(req.query['hub.challenge']||''));
});
webhookRouter.post('/',async(req,res)=>{
  if(!leadService.validSignature(req.body,req.get('x-hub-signature-256')))return res.sendStatus(403);
  let event;
  try{event=JSON.parse(req.body.toString('utf8'));}
  catch{return res.status(400).json({error:'Invalid webhook JSON'});}
  try{
    const outcome=await leadService.capture(event);
    return res.json({received:true,accepted:outcome.accepted});
  }catch(error){
    console.error('Meta webhook persistence failed:',error.code||'DATABASE_ERROR');
    return res.status(503).json({error:'Meta lead intake unavailable'});
  }
});

apiRouter.use(requireAuth);
function sendError(res,error){
  const code=String(error?.code||'SERVER_ERROR');
  const status=code==='FORBIDDEN'?403:code==='NOT_FOUND'?404:code==='META_PAGE_IN_USE'?409:
    code==='META_NOT_CONFIGURED'?503:code==='META_GRAPH_ERROR'?502:
    ['INVALID_META_PAGE','META_SUBSCRIPTION_FAILED'].includes(code)?400:500;
  if(status>=500)console.error('Meta Leads API failure:',code);
  return res.status(status).json({error:status>=500?(
    status===503?'Meta Lead Ads is not configured on the server':'Meta Lead Ads service unavailable'
  ):(error.message||'Request failed'),code});
}
apiRouter.get('/connections',async(req,res)=>{
  try{return res.json({connections:await leadService.connections(req.user)});}
  catch(error){return sendError(res,error);}
});
apiRouter.post('/connections',connectionLimit,async(req,res)=>{
  try{return res.status(201).json({connection:await leadService.connect(req.user,req.body||{})});}
  catch(error){return sendError(res,error);}
});
apiRouter.delete('/connections/:id',connectionLimit,async(req,res)=>{
  try{return res.json(await leadService.disconnect(req.user,req.params.id));}
  catch(error){return sendError(res,error);}
});
apiRouter.get('/leads',async(req,res)=>{
  try{return res.json(await leadService.list(req.user,req.query||{}));}
  catch(error){return sendError(res,error);}
});
apiRouter.post('/leads/:id/retry',connectionLimit,async(req,res)=>{
  try{return res.json(await leadService.retry(req.user,req.params.id));}
  catch(error){return sendError(res,error);}
});
module.exports={webhookRouter,apiRouter};
