const pool=require('../config/database');
const telegram=require('../services/telegramSupportService');

const MAX_MESSAGE_LENGTH=4000;

function normalize(value){return String(value||'').toLowerCase().replace(/[^a-z0-9\\s]/g,' ').replace(/\\s+/g,' ').trim();}
function senderType(user){return user?.role==='lead_partner'?'lead_partner':'user';}

async function getOrCreateConversation(userId){
  const existing=await pool.query(
    "SELECT * FROM chat_conversations WHERE user_id=$1 AND status IN ('open','human') ORDER BY updated_at DESC LIMIT 1",
    [userId]
  );
  if(existing.rows[0]) return existing.rows[0];
  const created=await pool.query(
    "INSERT INTO chat_conversations(user_id) VALUES($1) RETURNING *",[userId]
  );
  return created.rows[0];
}

async function getAudience(userId){
  const result=await pool.query("SELECT EXISTS(SELECT 1 FROM lead_partners WHERE user_id=$1 AND status IN ('pending','active','suspended')) AS is_partner",[userId]);
  return result.rows[0]?.is_partner?'lead_partner':'user';
}

async function findFaq(message,audience){
  const rows=await pool.query(
    "SELECT id,question,answer,category FROM chat_faqs WHERE enabled=true AND (audience='all' OR audience=$1) ORDER BY id",
    [audience]
  );
  const input=normalize(message);
  if(!input) return null;
  for(const faq of rows.rows){
    const q=normalize(faq.question);
    if(input===q||input.includes(q)||q.includes(input)) return faq;
    const words=q.split(' ').filter(w=>w.length>=4);
    const matches=words.filter(w=>input.includes(w)).length;
    if(words.length>=2 && matches>=Math.ceil(words.length*.7)) return faq;
  }
  return null;
}

async function addMessage(conversationId,user,message,isAutomated=false,sender='user'){
  const result=await pool.query(
    "INSERT INTO chat_messages(conversation_id,sender_type,sender_user_id,message,is_automated) VALUES($1,$2,$3,$4,$5) RETURNING id,conversation_id,sender_type,message,is_automated,created_at",
    [conversationId,sender,user.id,message,isAutomated]
  );
  await pool.query("UPDATE chat_conversations SET last_message_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$1",[conversationId]);
  return result.rows[0];
}

async function getConversationForUser(conversationId,userId){
  const result=await pool.query("SELECT * FROM chat_conversations WHERE id=$1 AND user_id=$2",[conversationId,userId]);
  return result.rows[0]||null;
}

exports.getConversation=async(req,res)=>{
  try{
    const conversation=await getOrCreateConversation(req.user.id);
    const messages=await pool.query(
      "SELECT id,conversation_id,sender_type,message,is_automated,created_at FROM chat_messages WHERE conversation_id=$1 ORDER BY created_at ASC,id ASC",
      [conversation.id]
    );
    res.json({conversation,messages:messages.rows});
  }catch(error){console.error('chat getConversation:',error);res.status(500).json({error:'Unable to load support chat'});}
};

exports.sendMessage=async(req,res)=>{
  const text=String(req.body?.message||'').trim();
  if(!text) return res.status(400).json({error:'Message is required'});
  if(text.length>MAX_MESSAGE_LENGTH) return res.status(400).json({error:`Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`});
  try{
    const conversation=await getOrCreateConversation(req.user.id);
    const userMessage=await addMessage(conversation.id,req.user,text,false);
    const audience=await getAudience(req.user.id);
    const faq=await findFaq(text,audience);
    if(faq){
      const automated=await pool.query(
        "INSERT INTO chat_messages(conversation_id,sender_type,message,is_automated) VALUES($1,'ai',$2,true) RETURNING id,conversation_id,sender_type,message,is_automated,created_at",
        [conversation.id,faq.answer]
      );
      await pool.query("UPDATE chat_conversations SET last_message_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$1",[conversation.id]);
      return res.status(201).json({message:userMessage,reply:automated.rows[0],automated:true});
    }

    await pool.query("UPDATE chat_conversations SET status='human',last_message_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$1",[conversation.id]);
    const identity=`#${conversation.id} | User #${req.user.id} | ${audience}`;
    const tgText=`Propulse Support\\n\\n${identity}\\n\\nCustomer: ${text}\\n\\nReply to this message to send the response back to the website.`;
    const sent=await telegram.sendSupportMessage(tgText);
    if(sent.configured){
      await pool.query(
        "INSERT INTO telegram_support_chats(conversation_id,telegram_chat_id) VALUES($1,$2) ON CONFLICT(conversation_id) DO UPDATE SET telegram_chat_id=EXCLUDED.telegram_chat_id,updated_at=CURRENT_TIMESTAMP",
        [conversation.id,String(process.env.TELEGRAM_SUPPORT_CHAT_ID)]
      );
      await pool.query(
        "INSERT INTO telegram_support_messages(conversation_id,telegram_chat_id,telegram_message_id,direction) VALUES($1,$2,$3,'outbound') ON CONFLICT DO NOTHING",
        [conversation.id,String(process.env.TELEGRAM_SUPPORT_CHAT_ID),sent.data.message_id]
      );
    }
    res.status(201).json({message:userMessage,reply:sent.configured?null:{sender_type:'system',message:'Your message has been received. Telegram support is not configured yet; please try again later.'},automated:false,supportConfigured:sent.configured});
  }catch(error){console.error('chat sendMessage:',error);res.status(500).json({error:'Unable to send support message'});}
};

exports.setupTelegramWebhook=async(req,res)=>{
  try{
    const base=String(process.env.PUBLIC_APP_URL||'').trim().replace(/\\/$/,'');
    if(!base) return res.status(400).json({error:'PUBLIC_APP_URL is not configured'});
    const result=await telegram.setWebhook(base+'/api/telegram/webhook');
    if(!result.configured) return res.status(503).json({error:'Telegram support is not configured'});
    return res.json({ok:true,webhook:base+'/api/telegram/webhook'});
  }catch(error){console.error('setupTelegramWebhook:',error);return res.status(500).json({error:'Unable to configure Telegram webhook'});}
};

exports.telegramWebhook=async(req,res)=>{
  const secret=String(process.env.TELEGRAM_WEBHOOK_SECRET||'').trim();
  if(secret&&req.headers['x-telegram-bot-api-secret-token']!==secret) return res.status(401).json({error:'Unauthorized'});
  const update=req.body||{};
  const message=update.message;
  if(!message?.chat?.id||!message?.text) return res.json({ok:true});
  const replyTo=message.reply_to_message?.message_id;
  if(!replyTo) return res.json({ok:true});
  try{
    const mapping=await pool.query(
      "SELECT conversation_id FROM telegram_support_messages WHERE telegram_chat_id=$1 AND telegram_message_id=$2 LIMIT 1",
      [String(message.chat.id),String(replyTo)]
    );
    if(!mapping.rows[0]) return res.json({ok:true});
    const conversationId=mapping.rows[0].conversation_id;
    await pool.query(
      "INSERT INTO chat_messages(conversation_id,sender_type,message,is_automated) VALUES($1,'admin',NULLIF(btrim($2),''),false)",
      [conversationId,message.text]
    );
    await pool.query("UPDATE chat_conversations SET status='human',last_message_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$1",[conversationId]);
    return res.json({ok:true});
  }catch(error){console.error('telegramWebhook:',error);return res.status(500).json({error:'Webhook processing failed'});}
};
