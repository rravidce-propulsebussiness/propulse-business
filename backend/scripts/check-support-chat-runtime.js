const assert=require('assert');
const crypto=require('crypto');
const pool=require('../src/config/database');
const support=require('../src/services/supportChatService');

async function main(){
  const originalSettings=(await pool.query(
    'SELECT enabled,allow_guests,widget_title,greeting,offline_message,poll_seconds,updated_by,updated_at FROM support_chat_settings WHERE id=1'
  )).rows[0];
  const oldChatId=process.env.TELEGRAM_SUPPORT_CHAT_ID;
  const oldToken=process.env.TELEGRAM_SUPPORT_BOT_TOKEN;
  const oldSecret=process.env.TELEGRAM_SUPPORT_WEBHOOK_SECRET;
  const oldUrl=process.env.TELEGRAM_SUPPORT_WEBHOOK_URL;
  let publicId=null;
  try{
    await support.updateSettings(null,{
      enabled:true,allowGuests:true,widgetTitle:'CI Support',greeting:'Hello',offlineMessage:'Leave a message',pollSeconds:3
    });

    delete process.env.TELEGRAM_SUPPORT_BOT_TOKEN;
    delete process.env.TELEGRAM_SUPPORT_WEBHOOK_SECRET;
    delete process.env.TELEGRAM_SUPPORT_WEBHOOK_URL;

    const created=await support.createConversation({
      payload:{
        name:'CI Guest',
        email:'ci-support-'+Date.now()+'@example.test',
        phone:'9000000000',
        message:'Need help from CI',
        page:'/profile'
      }
    });
    publicId=created.conversation.id;
    assert.ok(/^sc_[a-f0-9]{24}$/.test(publicId),'Expected opaque support conversation id');
    assert.ok(created.accessToken&&created.accessToken.length>=32,'Expected guest access token');
    assert.strictEqual(created.messages.length,1);
    assert.strictEqual(created.messages[0].senderType,'customer');

    const stored=(await pool.query(
      'SELECT access_token_hash FROM support_conversations WHERE public_id=$1',
      [publicId]
    )).rows[0];
    assert.ok(stored);
    assert.notStrictEqual(stored.access_token_hash,created.accessToken,'Raw guest access token must never be stored');
    assert.strictEqual(stored.access_token_hash,crypto.createHash('sha256').update(created.accessToken).digest('hex'));

    const loaded=await support.getConversation(publicId,{accessToken:created.accessToken});
    assert.strictEqual(loaded.messages.length,1);
    await assert.rejects(
      ()=>support.getConversation(publicId,{accessToken:'wrong-token'}),
      error=>error?.code==='SUPPORT_CHAT_NOT_FOUND'
    );

    const customerReply=await support.sendCustomerMessage(publicId,{accessToken:created.accessToken,message:'Second website message'});
    assert.strictEqual(customerReply.senderType,'customer');

    const conversationDb=(await pool.query('SELECT id FROM support_conversations WHERE public_id=$1',[publicId])).rows[0];
    const customerDb=(await pool.query(
      "SELECT id FROM support_messages WHERE conversation_id=$1 AND sender_type='customer' ORDER BY id DESC LIMIT 1",
      [conversationDb.id]
    )).rows[0];

    process.env.TELEGRAM_SUPPORT_CHAT_ID='-1001234567890';
    await pool.query(
      `INSERT INTO support_telegram_message_map(telegram_chat_id,telegram_message_id,conversation_id,support_message_id)
       VALUES($1,$2,$3,$4)`,
      ['-1001234567890',777001,conversationDb.id,customerDb.id]
    );

    const telegramResult=await support.processTelegramUpdate({
      message:{
        message_id:777002,
        chat:{id:-1001234567890},
        from:{id:42,is_bot:false,first_name:'CI',last_name:'Agent'},
        reply_to_message:{message_id:777001},
        text:'Reply from Telegram CI'
      }
    });
    assert.strictEqual(telegramResult.accepted,true);

    const afterTelegram=await support.getConversation(publicId,{accessToken:created.accessToken});
    const supportMessage=afterTelegram.messages.find(item=>item.body==='Reply from Telegram CI');
    assert.ok(supportMessage,'Telegram reply must appear in website conversation');
    assert.strictEqual(supportMessage.senderType,'support');
    assert.strictEqual(supportMessage.source,'telegram');

    const resolved=await support.resolveConversation(publicId,{accessToken:created.accessToken});
    assert.strictEqual(resolved.status,'resolved');

    console.log('Telegram support chat runtime checks passed.');
  }finally{
    if(publicId)await pool.query('DELETE FROM support_conversations WHERE public_id=$1',[publicId]);
    if(originalSettings){
      await pool.query(
        `UPDATE support_chat_settings
           SET enabled=$1,allow_guests=$2,widget_title=$3,greeting=$4,offline_message=$5,poll_seconds=$6,updated_by=$7,updated_at=$8
         WHERE id=1`,
        [
          originalSettings.enabled,originalSettings.allow_guests,originalSettings.widget_title,originalSettings.greeting,
          originalSettings.offline_message,originalSettings.poll_seconds,originalSettings.updated_by,originalSettings.updated_at
        ]
      );
    }
    if(oldChatId===undefined)delete process.env.TELEGRAM_SUPPORT_CHAT_ID;else process.env.TELEGRAM_SUPPORT_CHAT_ID=oldChatId;
    if(oldToken===undefined)delete process.env.TELEGRAM_SUPPORT_BOT_TOKEN;else process.env.TELEGRAM_SUPPORT_BOT_TOKEN=oldToken;
    if(oldSecret===undefined)delete process.env.TELEGRAM_SUPPORT_WEBHOOK_SECRET;else process.env.TELEGRAM_SUPPORT_WEBHOOK_SECRET=oldSecret;
    if(oldUrl===undefined)delete process.env.TELEGRAM_SUPPORT_WEBHOOK_URL;else process.env.TELEGRAM_SUPPORT_WEBHOOK_URL=oldUrl;
    await pool.end();
  }
}

main().catch(error=>{console.error(error);process.exitCode=1;});
