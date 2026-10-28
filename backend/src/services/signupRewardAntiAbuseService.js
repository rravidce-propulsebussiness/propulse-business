const crypto=require('node:crypto');

function tokenHash(value,scope){
  const secret=process.env.SIGNUP_REWARD_HASH_SECRET||process.env.JWT_SECRET;
  if(!secret||secret.length<32)throw new Error('Signup reward hash secret is not configured');
  return crypto.createHmac('sha256',secret).update(scope+':'+value).digest('hex');
}

async function recordSignupIdentity(client,userId,{deviceToken,ip}={}){
  if(!/^[a-f0-9]{64}$/i.test(String(deviceToken||'')))
    throw new Error('Registration device token is invalid');
  const deviceHash=tokenHash(String(deviceToken).toLowerCase(),'signup-device-v1');
  // Never persist raw IP addresses. IP is a shared-network risk signal,
  // not a reliable physical device identifier.
  const normalizedIp=String(ip||'').trim().toLowerCase().slice(0,128);
  const ipHash=normalizedIp?tokenHash(normalizedIp,'signup-ip-v1'):null;
  await client.query(`
    INSERT INTO signup_reward_identities(user_id,device_hash,ip_hash)
    VALUES($1,$2,$3) ON CONFLICT(user_id) DO NOTHING
  `,[userId,deviceHash,ipHash]);
}

async function allowAutomaticSignupReward(client,userId,registeredAt){
  const identity=(await client.query('SELECT device_hash,ip_hash FROM signup_reward_identities WHERE user_id=$1',[userId])).rows[0];
  const flag=async reason=>client.query(`INSERT INTO signup_reward_review_flags(user_id,reason) VALUES($1,$2) ON CONFLICT DO NOTHING`,[userId,reason]);
  if(!identity){
    const activation=(await client.query('SELECT activated_at FROM signup_reward_policy WHERE id=1')).rows[0]?.activated_at;
    // Existing businesses are grandfathered in; new accounts with missing
    // device tracking may sign up but must not auto-claim promotional credits.
    const legacy=Boolean(activation&&new Date(registeredAt)<new Date(activation));
    if(!legacy)await flag('missing_device');
    return legacy;
  }
  const [device,ip]=await Promise.all([
    client.query('SELECT user_id FROM signup_reward_device_claims WHERE device_hash=$1',[identity.device_hash]),
    identity.ip_hash?client.query('SELECT user_id FROM signup_reward_ip_claims WHERE ip_hash=$1',[identity.ip_hash]):Promise.resolve({rows:[]})
  ]);
  if(device.rows[0]&&Number(device.rows[0].user_id)!==Number(userId)){await flag('device_reused');return false;}
  if(ip.rows[0]&&Number(ip.rows[0].user_id)!==Number(userId)){await flag('shared_ip');return false;}

  // Unique DB constraints hold across concurrent signups. A second account
  // on the same browser or network is withheld for manual admin review.
  const deviceResult=await client.query(`
    INSERT INTO signup_reward_device_claims(device_hash,user_id)
    VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING user_id
  `,[identity.device_hash,userId]);
  if(!deviceResult.rowCount&&!device.rows[0]){await flag('device_reused');return false;}
  if(identity.ip_hash){
    const ipResult=await client.query(`
      INSERT INTO signup_reward_ip_claims(ip_hash,user_id)
      VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING user_id
    `,[identity.ip_hash,userId]);
    if(!ipResult.rowCount&&!ip.rows[0]){await flag('shared_ip');return false;}
  }
  return true;
}

module.exports={recordSignupIdentity,allowAutomaticSignupReward};
