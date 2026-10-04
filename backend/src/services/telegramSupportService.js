const crypto=require('crypto');

function clean(value){return String(value??'').trim();}
function botToken(){return clean(process.env.TELEGRAM_SUPPORT_BOT_TOKEN);}
function chatId(){return clean(process.env.TELEGRAM_SUPPORT_CHAT_ID);}
function webhookSecret(){return clean(process.env.TELEGRAM_SUPPORT_WEBHOOK_SECRET);}
function messageThreadId(){
  const value=Number.parseInt(clean(process.env.TELEGRAM_SUPPORT_MESSAGE_THREAD_ID),10);
  return Number.isInteger(value)&&value>0?value:null;
}
function publicAppUrl(){return clean(process.env.PUBLIC_APP_URL).replace(/\/+$/,'');}

function approverMap(){
  const raw=clean(process.env.TELEGRAM_SUPPORT_APPROVER_MAP);
  if(!raw)return {};
  try{
    const parsed=JSON.parse(raw);
    if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')return {};
    const output={};
    for(const [telegramUserId,adminUserId] of Object.entries(parsed)){
      const telegramId=clean(telegramUserId);
      const adminId=Number.parseInt(String(adminUserId),10);
      if(/^\d+$/.test(telegramId)&&Number.isInteger(adminId)&&adminId>0)output[telegramId]=adminId;
    }
    return output;
  }catch{return {};}
}

function approverAdminId(telegramUserId){
  return approverMap()[clean(telegramUserId)]||null;
}

function webhookUrl(){
  const explicit=clean(process.env.TELEGRAM_SUPPORT_WEBHOOK_URL);
  if(explicit)return explicit;
  const base=publicAppUrl();
  return base?base+'/api/support-chat/telegram/webhook':'';
}

function validSecret(value=webhookSecret()){
  return /^[A-Za-z0-9_-]{16,256}$/.test(String(value||''));
}

function isConfigured(){
  return Boolean(botToken()&&chatId()&&validSecret()&&webhookUrl());
}

function isApprovalConfigured(){
  return isConfigured()&&Object.keys(approverMap()).length>0;
}

function status(){
  const approvers=Object.keys(approverMap()).length;
  return {
    configured:isConfigured(),
    botTokenConfigured:Boolean(botToken()),
    chatIdConfigured:Boolean(chatId()),
    webhookSecretConfigured:validSecret(),
    webhookUrl:webhookUrl()||null,
    messageThreadId:messageThreadId(),
    paymentApprovalConfigured:isConfigured()&&approvers>0,
    paymentApproverCount:approvers,
  };
}

function secureEqual(left,right){
  const a=Buffer.from(String(left||''),'utf8');
  const b=Buffer.from(String(right||''),'utf8');
  return a.length===b.length&&a.length>0&&crypto.timingSafeEqual(a,b);
}

function verifyWebhookSecret(value){
  const expected=webhookSecret();
  return validSecret(expected)&&secureEqual(value,expected);
}

async function apiCall(method,payload){
  const token=botToken();
  if(!token)throw Object.assign(new Error('Telegram support bot is not configured'),{code:'TELEGRAM_NOT_CONFIGURED'});
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  timer.unref?.();
  try{
    const response=await fetch('https://api.telegram.org/bot'+token+'/'+method,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload||{}),
      signal:controller.signal,
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data?.ok!==true){
      const error=new Error(String(data?.description||'Telegram API request failed'));
      error.code='TELEGRAM_API_ERROR';
      error.status=response.status;
      throw error;
    }
    return data.result;
  }finally{
    clearTimeout(timer);
  }
}

function messagePayload({text,replyToMessageId=null,replyMarkup=null}={}){
  const payload={
    chat_id:chatId(),
    text:String(text||'').slice(0,4096),
    disable_web_page_preview:true,
    ...(messageThreadId()?{message_thread_id:messageThreadId()}:{})
  };
  if(replyToMessageId)payload.reply_parameters={message_id:Number(replyToMessageId),allow_sending_without_reply:true};
  if(replyMarkup)payload.reply_markup=replyMarkup;
  return payload;
}

async function sendMessage({text,replyToMessageId=null,replyMarkup=null}={}){
  if(!isConfigured())throw Object.assign(new Error('Telegram support is not configured'),{code:'TELEGRAM_NOT_CONFIGURED'});
  return apiCall('sendMessage',messagePayload({text,replyToMessageId,replyMarkup}));
}

async function editMessageText({messageId,text,replyMarkup=null}={}){
  if(!isConfigured())throw Object.assign(new Error('Telegram support is not configured'),{code:'TELEGRAM_NOT_CONFIGURED'});
  const payload={
    chat_id:chatId(),
    message_id:Number(messageId),
    text:String(text||'').slice(0,4096),
    disable_web_page_preview:true,
  };
  if(replyMarkup)payload.reply_markup=replyMarkup;
  return apiCall('editMessageText',payload);
}

async function editMessageReplyMarkup({messageId,replyMarkup}={}){
  if(!isConfigured())throw Object.assign(new Error('Telegram support is not configured'),{code:'TELEGRAM_NOT_CONFIGURED'});
  return apiCall('editMessageReplyMarkup',{
    chat_id:chatId(),
    message_id:Number(messageId),
    reply_markup:replyMarkup||{inline_keyboard:[]},
  });
}

async function answerCallbackQuery({callbackQueryId,text='',showAlert=false}={}){
  if(!isConfigured())throw Object.assign(new Error('Telegram support is not configured'),{code:'TELEGRAM_NOT_CONFIGURED'});
  return apiCall('answerCallbackQuery',{
    callback_query_id:String(callbackQueryId||''),
    text:String(text||'').slice(0,200),
    show_alert:Boolean(showAlert),
  });
}

async function configureWebhook(){
  if(!isConfigured())throw Object.assign(new Error('Telegram support configuration is incomplete'),{code:'TELEGRAM_NOT_CONFIGURED'});
  const payload={
    url:webhookUrl(),
    secret_token:webhookSecret(),
    allowed_updates:['message','callback_query'],
    drop_pending_updates:false,
  };
  return apiCall('setWebhook',payload);
}

function expectedChatId(){return chatId();}

module.exports={
  isConfigured,isApprovalConfigured,status,verifyWebhookSecret,
  sendMessage,editMessageText,editMessageReplyMarkup,answerCallbackQuery,
  configureWebhook,expectedChatId,webhookUrl,approverAdminId,
};
