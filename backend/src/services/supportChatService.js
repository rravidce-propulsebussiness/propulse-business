const crypto=require('crypto');
const pool=require('../config/database');
const telegram=require('./telegramSupportService');
const notificationService=require('./notificationService');

function supportError(message,code,status=400){return Object.assign(new Error(message),{code,status});}
function cleanText(value,max){return String(value??'').replace(/\r/g,'').trim().slice(0,max);}
function cleanMessage(value){
  const body=cleanText(value,4000);
  if(!body)throw supportError('Message is required','SUPPORT_MESSAGE_REQUIRED',400);
  return body;
}
function cleanEmail(value){
  const email=cleanText(value,254).toLowerCase();
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw supportError('Enter a valid email address','SUPPORT_EMAIL_INVALID',400);
  return email;
}
function cleanPage(value){
  const page=cleanText(value,500);
  if(!page)return '/';
  if(page.startsWith('/')&&!page.startsWith('//'))return page;
  try{
    const url=new URL(page);
    return (url.pathname+url.search+url.hash).slice(0,500)||'/';
  }catch{return '/';}
}
function hashToken(token){return crypto.createHash('sha256').update(String(token||'')).digest('hex');}
function createAccessToken(){return crypto.randomBytes(32).toString('base64url');}
function createPublicId(){return 'sc_'+crypto.randomBytes(12).toString('hex');}
function safePage(value,fallback=1,max=100000){const n=Number.parseInt(value,10);return Number.isInteger(n)&&n>0?Math.min(n,max):fallback;}
function safeLimit(value,fallback=30,max=100){const n=Number.parseInt(value,10);return Number.isInteger(n)&&n>0?Math.min(n,max):fallback;}

function serializeConversation(row){
  if(!row)return null;
  return {
    id:row.public_id,
    status:row.status,
    customerName:row.customer_name||row.guest_name||null,
    customerEmail:row.customer_email||row.guest_email||null,
    customerPhone:row.guest_phone||null,
    sourcePage:row.source_page||'/',
    createdAt:row.created_at,
    updatedAt:row.updated_at,
    lastMessageAt:row.last_message_at,
    resolvedAt:row.resolved_at||null,
  };
}
function serializeMessage(row){
  return {
    id:Number(row.id),
    senderType:row.sender_type,
    senderName:row.sender_name||null,
    body:row.body,
    source:row.source,
    createdAt:row.created_at,
  };
}

async function getSettings(client=pool){
  let result=await client.query(
    'SELECT enabled,allow_guests,widget_title,greeting,offline_message,poll_seconds,updated_by,updated_at FROM support_chat_settings WHERE id=1'
  );
  if(!result.rows.length){
    await client.query('INSERT INTO support_chat_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING');
    result=await client.query(
      'SELECT enabled,allow_guests,widget_title,greeting,offline_message,poll_seconds,updated_by,updated_at FROM support_chat_settings WHERE id=1'
    );
  }
  const row=result.rows[0]||{};
  return {
    enabled:row.enabled!==false,
    allowGuests:row.allow_guests!==false,
    widgetTitle:row.widget_title||'Chat with us',
    greeting:row.greeting||'Hi! How can we help you today?',
    offlineMessage:row.offline_message||'Leave us a message and our support team will get back to you.',
    pollSeconds:Number(row.poll_seconds||4),
    updatedBy:row.updated_by||null,
    updatedAt:row.updated_at||null,
  };
}

async function getPublicConfig(){
  const settings=await getSettings();
  return {
    enabled:settings.enabled,
    allowGuests:settings.allowGuests,
    widgetTitle:settings.widgetTitle,
    greeting:settings.greeting,
    offlineMessage:settings.offlineMessage,
    pollSeconds:Math.max(3,Math.min(30,settings.pollSeconds)),
  };
}

async function getAdminConfig(){
  const settings=await getSettings();
  return {...settings,telegram:telegram.status()};
}

async function updateSettings(actorId,payload={}){
  const current=await getSettings();
  const poll=Number.parseInt(payload.pollSeconds,10);
  const pollSeconds=Number.isInteger(poll)?Math.max(3,Math.min(30,poll)):current.pollSeconds;
  const widgetTitle=cleanText(payload.widgetTitle??current.widgetTitle,80)||'Chat with us';
  const greeting=cleanText(payload.greeting??current.greeting,500)||'Hi! How can we help you today?';
  const offlineMessage=cleanText(payload.offlineMessage??current.offlineMessage,500)||current.offlineMessage;
  await pool.query(
    `UPDATE support_chat_settings
       SET enabled=$1,allow_guests=$2,widget_title=$3,greeting=$4,offline_message=$5,poll_seconds=$6,updated_by=$7,updated_at=CURRENT_TIMESTAMP
     WHERE id=1`,
    [
      typeof payload.enabled==='boolean'?payload.enabled:current.enabled,
      typeof payload.allowGuests==='boolean'?payload.allowGuests:current.allowGuests,
      widgetTitle,greeting,offlineMessage,pollSeconds,actorId||null
    ]
  );
  return getAdminConfig();
}

async function conversationRowByPublicId(publicId,client=pool){
  return (await client.query(
    `SELECT sc.*,u.name AS customer_name,u.email AS customer_email
       FROM support_conversations sc
       LEFT JOIN users u ON u.id=sc.user_id
      WHERE sc.public_id=$1`,
    [cleanText(publicId,40)]
  )).rows[0]||null;
}

function hasConversationAccess(row,user,accessToken){
  if(!row)return false;
  if(user?.id&&Number(row.user_id)===Number(user.id))return true;
  const supplied=String(accessToken||'');
  return Boolean(supplied)&&hashToken(supplied)===row.access_token_hash;
}

async function requireConversation(publicId,{user=null,accessToken=''}={}){
  const row=await conversationRowByPublicId(publicId);
  if(!hasConversationAccess(row,user,accessToken))throw supportError('Support conversation not found','SUPPORT_CHAT_NOT_FOUND',404);
  return row;
}

async function listMessagesForConversation(conversationId,client=pool){
  const rows=(await client.query(
    'SELECT id,sender_type,sender_name,source,body,created_at FROM support_messages WHERE conversation_id=$1 ORDER BY id',
    [conversationId]
  )).rows;
  return rows.map(serializeMessage);
}

async function notifyAdminsOfCustomerMessage(conversation,message){
  const name=conversation.customer_name||conversation.guest_name||'Website visitor';
  await notificationService.notifyAdmins({
    type:'support_chat_message',
    category:'system',
    severity:'info',
    title:'New support chat message',
    message:name+': '+String(message.body||'').slice(0,240),
    actionUrl:'/admin/support-chats?conversation='+encodeURIComponent(conversation.public_id),
    relatedType:'support_conversation',
    relatedId:conversation.public_id,
    dedupeKey:'support-message:'+message.id,
    email:false,
  });
}

function telegramCustomerText(conversation,message){
  const name=conversation.customer_name||conversation.guest_name||'Website visitor';
  const email=conversation.customer_email||conversation.guest_email||'Not provided';
  const phone=conversation.guest_phone||'Not provided';
  const parts=[
    '🟠 ProPulse Support',
    'Conversation: '+conversation.public_id,
    'Customer: '+name,
    'Email: '+email,
    'Phone: '+phone,
    'Page: '+(conversation.source_page||'/'),
    '',
    String(message.body||'').slice(0,2500),
    '',
    'Reply to this Telegram message to answer the customer on the website.'
  ];
  return parts.join('\n').slice(0,4096);
}

async function mapTelegramMessage({chatId,messageId,conversationId,supportMessageId=null},client=pool){
  await client.query(
    `INSERT INTO support_telegram_message_map(telegram_chat_id,telegram_message_id,conversation_id,support_message_id)
     VALUES($1,$2,$3,$4)
     ON CONFLICT(telegram_chat_id,telegram_message_id) DO UPDATE
       SET conversation_id=EXCLUDED.conversation_id,support_message_id=EXCLUDED.support_message_id`,
    [String(chatId),Number(messageId),conversationId,supportMessageId]
  );
}

async function deliverCustomerMessage(messageId){
  const row=(await pool.query(
    `SELECT sm.id,sm.conversation_id,sm.body,sc.public_id,sc.user_id,sc.guest_name,sc.guest_email,sc.guest_phone,
            sc.source_page,sc.telegram_last_message_id,u.name AS customer_name,u.email AS customer_email
       FROM support_messages sm
       JOIN support_conversations sc ON sc.id=sm.conversation_id
       LEFT JOIN users u ON u.id=sc.user_id
      WHERE sm.id=$1`,
    [messageId]
  )).rows[0];
  if(!row)return null;
  if(!telegram.isConfigured()){
    await pool.query(
      "UPDATE support_messages SET telegram_delivery_status='not_configured',telegram_delivery_error=NULL WHERE id=$1",
      [messageId]
    );
    return {status:'not_configured'};
  }
  await pool.query("UPDATE support_messages SET telegram_delivery_status='pending',telegram_delivery_error=NULL WHERE id=$1",[messageId]);
  try{
    const sent=await telegram.sendMessage({
      text:telegramCustomerText(row,row),
      replyToMessageId:row.telegram_last_message_id||null,
    });
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      await client.query(
        "UPDATE support_messages SET telegram_delivery_status='sent',telegram_delivery_error=NULL,telegram_message_id=$1 WHERE id=$2",
        [sent.message_id,messageId]
      );
      await client.query(
        'UPDATE support_conversations SET telegram_last_message_id=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2',
        [sent.message_id,row.conversation_id]
      );
      await mapTelegramMessage({
        chatId:telegram.expectedChatId(),
        messageId:sent.message_id,
        conversationId:row.conversation_id,
        supportMessageId:messageId,
      },client);
      await client.query('COMMIT');
    }catch(error){await client.query('ROLLBACK');throw error}finally{client.release();}
    return {status:'sent',messageId:sent.message_id};
  }catch(error){
    await pool.query(
      "UPDATE support_messages SET telegram_delivery_status='failed',telegram_delivery_error=$1 WHERE id=$2",
      [cleanText(error?.message||'Telegram delivery failed',500),messageId]
    );
    console.error('Telegram support delivery failed:',error?.message||error);
    return {status:'failed'};
  }
}

async function createConversation({user=null,payload={}}={}){
  const settings=await getSettings();
  if(!settings.enabled)throw supportError('Support chat is currently unavailable','SUPPORT_CHAT_DISABLED',503);
  if(!user&&!settings.allowGuests)throw supportError('Sign in to use support chat','SUPPORT_CHAT_LOGIN_REQUIRED',401);
  const messageBody=cleanMessage(payload.message);
  const guestName=user?null:cleanText(payload.name,120);
  const guestEmail=user?null:cleanEmail(payload.email);
  const guestPhone=user?null:cleanText(payload.phone,32);
  if(!user&&guestName.length<2)throw supportError('Enter your name','SUPPORT_NAME_REQUIRED',400);
  const publicId=createPublicId();
  const accessToken=createAccessToken();
  const tokenHash=hashToken(accessToken);
  const page=cleanPage(payload.page);
  const client=await pool.connect();
  let conversation,message;
  try{
    await client.query('BEGIN');
    conversation=(await client.query(
      `INSERT INTO support_conversations(public_id,access_token_hash,user_id,guest_name,guest_email,guest_phone,source_page)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [publicId,tokenHash,user?.id||null,guestName,guestEmail,guestPhone,page]
    )).rows[0];
    message=(await client.query(
      `INSERT INTO support_messages(conversation_id,sender_type,sender_user_id,sender_name,source,body,telegram_delivery_status)
       VALUES($1,'customer',$2,$3,'website',$4,'pending')
       RETURNING *`,
      [conversation.id,user?.id||null,user?.name||guestName||'Customer',messageBody]
    )).rows[0];
    await client.query(
      'UPDATE support_conversations SET last_message_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$1',
      [conversation.id]
    );
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release();}
  const enriched=await conversationRowByPublicId(publicId);
  await Promise.allSettled([
    deliverCustomerMessage(message.id),
    notifyAdminsOfCustomerMessage(enriched,message),
  ]);
  return {
    conversation:serializeConversation(enriched),
    accessToken,
    messages:[serializeMessage(message)],
  };
}

async function getCurrentConversation(user){
  if(!user?.id)return null;
  const row=(await pool.query(
    `SELECT sc.*,u.name AS customer_name,u.email AS customer_email
       FROM support_conversations sc
       LEFT JOIN users u ON u.id=sc.user_id
      WHERE sc.user_id=$1 AND sc.status='open'
      ORDER BY sc.last_message_at DESC,sc.id DESC
      LIMIT 1`,
    [user.id]
  )).rows[0];
  if(!row)return null;
  return {conversation:serializeConversation(row),messages:await listMessagesForConversation(row.id)};
}

async function getConversation(publicId,{user=null,accessToken=''}={}){
  const row=await requireConversation(publicId,{user,accessToken});
  return {conversation:serializeConversation(row),messages:await listMessagesForConversation(row.id)};
}

async function sendCustomerMessage(publicId,{user=null,accessToken='',message}={}){
  const row=await requireConversation(publicId,{user,accessToken});
  if(row.status!=='open')throw supportError('This conversation is resolved. Start a new chat.','SUPPORT_CHAT_RESOLVED',409);
  const body=cleanMessage(message);
  const inserted=(await pool.query(
    `INSERT INTO support_messages(conversation_id,sender_type,sender_user_id,sender_name,source,body,telegram_delivery_status)
     VALUES($1,'customer',$2,$3,'website',$4,'pending')
     RETURNING *`,
    [row.id,user?.id||row.user_id||null,user?.name||row.customer_name||row.guest_name||'Customer',body]
  )).rows[0];
  await pool.query(
    'UPDATE support_conversations SET last_message_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$1',
    [row.id]
  );
  await Promise.allSettled([
    deliverCustomerMessage(inserted.id),
    notifyAdminsOfCustomerMessage(row,inserted),
  ]);
  return serializeMessage(inserted);
}

async function resolveConversation(publicId,{user=null,accessToken=''}={}){
  const row=await requireConversation(publicId,{user,accessToken});
  const updated=(await pool.query(
    `UPDATE support_conversations SET status='resolved',resolved_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
     WHERE id=$1 RETURNING *`,
    [row.id]
  )).rows[0];
  return serializeConversation({...updated,customer_name:row.customer_name,customer_email:row.customer_email});
}

async function listAdminConversations({status='open',search='',page=1,limit=50}={}){
  const values=[],where=[];
  const normalizedStatus=String(status||'open').toLowerCase();
  if(['open','resolved'].includes(normalizedStatus)){values.push(normalizedStatus);where.push(`sc.status=$${values.length}`);}
  const q=cleanText(search,160);
  if(q){
    values.push('%'+q+'%');
    const n=values.length;
    where.push(`(sc.public_id ILIKE $${n} OR COALESCE(u.name,sc.guest_name,'') ILIKE $${n} OR COALESCE(u.email,sc.guest_email,'') ILIKE $${n})`);
  }
  const clause=where.length?'WHERE '+where.join(' AND '):'';
  const currentPage=safePage(page),pageSize=safeLimit(limit,50,100),offset=(currentPage-1)*pageSize;
  const total=Number((await pool.query(
    `SELECT COUNT(*)::int AS total FROM support_conversations sc LEFT JOIN users u ON u.id=sc.user_id ${clause}`,
    values
  )).rows[0]?.total||0);
  const params=[...values,pageSize,offset];
  const rows=(await pool.query(
    `SELECT sc.*,u.name AS customer_name,u.email AS customer_email,
            latest.body AS latest_message,latest.sender_type AS latest_sender
       FROM support_conversations sc
       LEFT JOIN users u ON u.id=sc.user_id
       LEFT JOIN LATERAL (
         SELECT body,sender_type FROM support_messages sm WHERE sm.conversation_id=sc.id ORDER BY sm.id DESC LIMIT 1
       ) latest ON TRUE
       ${clause}
       ORDER BY sc.last_message_at DESC,sc.id DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`,
    params
  )).rows;
  return {
    data:rows.map(row=>({...serializeConversation(row),latestMessage:row.latest_message||'',latestSender:row.latest_sender||null,userId:row.user_id||null})),
    pagination:{page:currentPage,limit:pageSize,total,totalPages:total?Math.ceil(total/pageSize):0}
  };
}

async function getAdminConversation(publicId){
  const row=await conversationRowByPublicId(publicId);
  if(!row)throw supportError('Support conversation not found','SUPPORT_CHAT_NOT_FOUND',404);
  return {conversation:serializeConversation(row),messages:await listMessagesForConversation(row.id)};
}

async function mirrorAdminReply(row,message,adminName){
  if(!telegram.isConfigured())return {status:'not_configured'};
  try{
    const sent=await telegram.sendMessage({
      text:[
        '🔵 ProPulse Admin reply',
        'Conversation: '+row.public_id,
        'Agent: '+(adminName||'Admin'),
        '',
        String(message.body||'').slice(0,3000)
      ].join('\n'),
      replyToMessageId:row.telegram_last_message_id||null,
    });
    await pool.query(
      'UPDATE support_conversations SET telegram_last_message_id=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2',
      [sent.message_id,row.id]
    );
    await mapTelegramMessage({
      chatId:telegram.expectedChatId(),messageId:sent.message_id,conversationId:row.id,supportMessageId:message.id
    });
    return {status:'sent'};
  }catch(error){
    console.error('Telegram admin support mirror failed:',error?.message||error);
    return {status:'failed'};
  }
}

async function adminReply(publicId,admin,messageText){
  const row=await conversationRowByPublicId(publicId);
  if(!row)throw supportError('Support conversation not found','SUPPORT_CHAT_NOT_FOUND',404);
  const body=cleanMessage(messageText);
  const message=(await pool.query(
    `INSERT INTO support_messages(conversation_id,sender_type,sender_user_id,sender_name,source,body)
     VALUES($1,'support',$2,$3,'admin',$4)
     RETURNING *`,
    [row.id,admin?.id||null,admin?.name||'Support',body]
  )).rows[0];
  await pool.query(
    `UPDATE support_conversations
       SET status='open',resolved_at=NULL,last_message_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
     WHERE id=$1`,
    [row.id]
  );
  await mirrorAdminReply(row,message,admin?.name);
  return serializeMessage(message);
}

async function adminSetStatus(publicId,status){
  const next=String(status||'').toLowerCase();
  if(!['open','resolved'].includes(next))throw supportError('Invalid support status','SUPPORT_STATUS_INVALID',400);
  const row=(await pool.query(
    `UPDATE support_conversations
       SET status=$1,resolved_at=CASE WHEN $1='resolved' THEN CURRENT_TIMESTAMP ELSE NULL END,updated_at=CURRENT_TIMESTAMP
     WHERE public_id=$2
     RETURNING *`,
    [next,cleanText(publicId,40)]
  )).rows[0];
  if(!row)throw supportError('Support conversation not found','SUPPORT_CHAT_NOT_FOUND',404);
  return serializeConversation(row);
}

async function processTelegramUpdate(update){
  const message=update?.message;
  if(!message||message?.from?.is_bot)return {ignored:true,reason:'no_user_message'};
  if(String(message?.chat?.id)!==String(telegram.expectedChatId()))return {ignored:true,reason:'wrong_chat'};
  const configuredThread=telegram.status().messageThreadId;
  if(configuredThread&&Number(message.message_thread_id||0)!==Number(configuredThread))return {ignored:true,reason:'wrong_thread'};
  let body=cleanText(message.text||message.caption,4000);
  if(!body)return {ignored:true,reason:'no_text'};
  let conversationId=null;
  const replyId=message.reply_to_message?.message_id;
  if(replyId){
    conversationId=(await pool.query(
      'SELECT conversation_id FROM support_telegram_message_map WHERE telegram_chat_id=$1 AND telegram_message_id=$2',
      [String(message.chat.id),Number(replyId)]
    )).rows[0]?.conversation_id||null;
  }
  if(!conversationId){
    const command=body.match(/^\/reply\s+(sc_[a-f0-9]{24})\s+([\s\S]+)$/i);
    if(command){
      const row=(await pool.query('SELECT id FROM support_conversations WHERE public_id=$1',[command[1]])).rows[0];
      conversationId=row?.id||null;
      body=cleanMessage(command[2]);
    }
  }
  if(!conversationId)return {ignored:true,reason:'unmapped_reply'};
  const senderName=cleanText(
    [message.from?.first_name,message.from?.last_name].filter(Boolean).join(' ')||message.from?.username||'Telegram Support',
    160
  );
  const client=await pool.connect();
  let inserted;
  try{
    await client.query('BEGIN');
    inserted=(await client.query(
      `INSERT INTO support_messages(conversation_id,sender_type,sender_name,source,body,telegram_message_id)
       VALUES($1,'support',$2,'telegram',$3,$4)
       RETURNING *`,
      [conversationId,senderName,body,Number(message.message_id)]
    )).rows[0];
    await mapTelegramMessage({
      chatId:String(message.chat.id),messageId:Number(message.message_id),conversationId,supportMessageId:inserted.id
    },client);
    await client.query(
      `UPDATE support_conversations
         SET status='open',resolved_at=NULL,telegram_last_message_id=$1,last_message_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
       WHERE id=$2`,
      [Number(message.message_id),conversationId]
    );
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release();}
  return {accepted:true,message:serializeMessage(inserted)};
}

module.exports={
  getSettings,getPublicConfig,getAdminConfig,updateSettings,
  createConversation,getCurrentConversation,getConversation,sendCustomerMessage,resolveConversation,
  listAdminConversations,getAdminConversation,adminReply,adminSetStatus,processTelegramUpdate,
};
