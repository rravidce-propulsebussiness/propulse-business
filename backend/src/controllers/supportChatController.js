const supportChatService=require('../services/supportChatService');
const telegramSupportService=require('../services/telegramSupportService');
const {sendError}=require('../utils/errorResponse');

function token(req){return String(req.get('x-support-chat-token')||'').trim();}

function fail(res,error,fallback){
  const status=Number(error?.status)||500;
  if(status>=500)console.error(fallback+':',error?.message||error);
  return sendError(res,status,error,fallback,{code:error?.code});
}

async function config(req,res){
  try{return res.json(await supportChatService.getPublicConfig());}
  catch(error){return fail(res,error,'Failed to load support chat');}
}
async function current(req,res){
  try{return res.json(await supportChatService.getCurrentConversation(req.user));}
  catch(error){return fail(res,error,'Failed to load support conversation');}
}
async function create(req,res){
  try{return res.status(201).json(await supportChatService.createConversation({user:req.user,payload:req.body||{}}));}
  catch(error){return fail(res,error,'Failed to start support chat');}
}
async function getConversation(req,res){
  try{return res.json(await supportChatService.getConversation(req.params.conversationId,{user:req.user,accessToken:token(req)}));}
  catch(error){return fail(res,error,'Failed to load support conversation');}
}
async function sendMessage(req,res){
  try{return res.status(201).json(await supportChatService.sendCustomerMessage(req.params.conversationId,{user:req.user,accessToken:token(req),message:req.body?.message}));}
  catch(error){return fail(res,error,'Failed to send support message');}
}
async function resolve(req,res){
  try{return res.json(await supportChatService.resolveConversation(req.params.conversationId,{user:req.user,accessToken:token(req)}));}
  catch(error){return fail(res,error,'Failed to resolve support chat');}
}
async function telegramWebhook(req,res){
  if(!telegramSupportService.verifyWebhookSecret(req.get('x-telegram-bot-api-secret-token'))){
    return res.status(401).json({error:'Invalid Telegram webhook secret'});
  }
  try{
    const result=await supportChatService.processTelegramUpdate(req.body||{});
    return res.json({ok:true,...result});
  }catch(error){
    console.error('Telegram support webhook failed:',error?.message||error);
    return res.status(500).json({ok:false,error:'Telegram support webhook failed'});
  }
}

async function adminConfig(req,res){
  try{return res.json(await supportChatService.getAdminConfig());}
  catch(error){return fail(res,error,'Failed to load support chat settings');}
}
async function updateAdminConfig(req,res){
  try{return res.json(await supportChatService.updateSettings(req.user?.id,req.body||{}));}
  catch(error){return fail(res,error,'Failed to save support chat settings');}
}
async function adminList(req,res){
  try{return res.json(await supportChatService.listAdminConversations(req.query||{}));}
  catch(error){return fail(res,error,'Failed to load support chats');}
}
async function adminGet(req,res){
  try{return res.json(await supportChatService.getAdminConversation(req.params.conversationId));}
  catch(error){return fail(res,error,'Failed to load support chat');}
}
async function adminReply(req,res){
  try{return res.status(201).json(await supportChatService.adminReply(req.params.conversationId,req.user,req.body?.message));}
  catch(error){return fail(res,error,'Failed to send support reply');}
}
async function adminStatus(req,res){
  try{return res.json(await supportChatService.adminSetStatus(req.params.conversationId,req.body?.status));}
  catch(error){return fail(res,error,'Failed to update support chat');}
}

module.exports={
  config,current,create,getConversation,sendMessage,resolve,telegramWebhook,
  adminConfig,updateAdminConfig,adminList,adminGet,adminReply,adminStatus,
};
