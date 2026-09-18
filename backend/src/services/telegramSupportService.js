const TELEGRAM_API='https://api.telegram.org';

function getConfig(){
  const token=String(process.env.TELEGRAM_BOT_TOKEN||'').trim();
  const adminChatId=String(process.env.TELEGRAM_SUPPORT_CHAT_ID||'').trim();
  if(!token||!adminChatId) return null;
  return {token,adminChatId};
}

async function telegramRequest(method, body){
  const config=getConfig();
  if(!config) return {configured:false};
  const response=await fetch(`${TELEGRAM_API}/bot${config.token}/${method}`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data.ok!==true) throw new Error(data.description||'Telegram request failed');
  return {configured:true,data:data.result};
}

async function sendSupportMessage(text){
  const config=getConfig();
  if(!config) return {configured:false};
  return telegramRequest('sendMessage',{chat_id:config.adminChatId,text});
}

async function setWebhook(url){
  const config=getConfig();
  if(!config) return {configured:false};
  const secret=String(process.env.TELEGRAM_WEBHOOK_SECRET||'').trim();
  const body={url};
  if(secret) body.secret_token=secret;
  return telegramRequest('setWebhook',body);
}

module.exports={getConfig,telegramRequest,sendSupportMessage,setWebhook};
