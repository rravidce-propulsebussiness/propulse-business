const crypto = require('node:crypto');
const pool = require('../config/database');

const safeId = value => (/^[0-9]{5,40}$/.test(String(value || '')) ? String(value) : '');
const graphVersion = /^v[0-9]{1,2}\.[0-9]{1,2}$/.test(process.env.META_LEADS_GRAPH_VERSION || '')
  ? process.env.META_LEADS_GRAPH_VERSION : 'v25.0';
const asString = (v, length = 500) => String(v == null ? '' : v).trim().slice(0, length);
const publicConnection = c => ({
  id: c.id, pageId: c.page_id, pageName: c.page_name, ownerType: c.owner_type,
  ownerUserId: c.owner_user_id, status: c.status, connectedAt: c.connected_at
});

function tokenKey() {
  const value = asString(process.env.META_LEADS_ENCRYPTION_KEY, 300);
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) throw Object.assign(new Error('Meta Leads encryption key must be 32 random bytes encoded in base64'), {code: 'META_NOT_CONFIGURED'});
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32) throw Object.assign(new Error('Invalid Meta Leads encryption key'), {code: 'META_NOT_CONFIGURED'});
  return key;
}
function encrypt(token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', tokenKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join('.');
}
function decrypt(value) {
  const pieces = String(value || '').split('.');
  if (pieces.length !== 3) throw new Error('Invalid stored Meta token');
  const decipher = crypto.createDecipheriv('aes-256-gcm', tokenKey(), Buffer.from(pieces[0], 'base64'));
  decipher.setAuthTag(Buffer.from(pieces[1], 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(pieces[2], 'base64')), decipher.final()]).toString('utf8');
}
function validSignature(bytes, header) {
  const secret = String(process.env.META_LEADS_APP_SECRET || '');
  if (!secret || !Buffer.isBuffer(bytes) || !/^sha256=[a-f0-9]{64}$/i.test(String(header || ''))) return false;
  const given = Buffer.from(String(header).slice(7), 'hex');
  const expected = crypto.createHmac('sha256', secret).update(bytes).digest();
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
function validChallenge(query) {
  const configured = String(process.env.META_LEADS_VERIFY_TOKEN || '');
  const received = String(query?.['hub.verify_token'] || '');
  if (query?.['hub.mode'] !== 'subscribe' || !configured || !received) return false;
  const a = Buffer.from(configured), b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a,b);
}
async function graph(endpoint, token, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const url = new URL('https://graph.facebook.com/' + graphVersion + '/' + endpoint);
    for (const [key, value] of Object.entries(options.params || {})) url.searchParams.set(key, value);
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {Authorization: 'Bearer ' + token, ...(options.body ? {'Content-Type': 'application/x-www-form-urlencoded'} : {})},
      body: options.body ? new URLSearchParams(options.body).toString() : undefined,
      signal: controller.signal
    });
    const raw = await response.text();
    let payload;
    try { payload = JSON.parse(raw); } catch { payload = {}; }
    if (!response.ok || payload.error) {
      const error = new Error('Meta Graph API request failed');
      error.code = 'META_GRAPH_ERROR';
      error.graphCode = Number(payload.error?.code || response.status);
      throw error;
    }
    return payload;
  } finally { clearTimeout(timeout); }
}
async function checkUser(user) {
  if (!user?.id || !['admin','lead_partner'].includes(user.role)) throw Object.assign(new Error('Not authorized'), {code:'FORBIDDEN'});
  if (user.role === 'lead_partner') {
    const r = await pool.query("SELECT 1 FROM lead_partners WHERE user_id=$1 AND status='active'", [user.id]);
    if (!r.rowCount) throw Object.assign(new Error('Lead Partner account is not active'), {code:'FORBIDDEN'});
  }
  return user.role === 'admin' ? 'admin' : 'partner';
}
async function connect(user, input) {
  const ownerType = await checkUser(user);
  const pageId = safeId(input?.pageId);
  const pageToken = asString(input?.pageAccessToken, 2500);
  if (!pageId || !pageToken || pageToken.length < 30) throw Object.assign(new Error('Enter a valid Page ID and Page access token'), {code:'INVALID_META_PAGE'});
  if (!process.env.META_LEADS_APP_SECRET || !process.env.META_LEADS_VERIFY_TOKEN) throw Object.assign(new Error('Meta Leads webhook credentials are not configured on the server'), {code:'META_NOT_CONFIGURED'});
  const encrypted = encrypt(pageToken);
  const previous = (await pool.query('SELECT owner_type,owner_user_id FROM meta_lead_connections WHERE page_id=$1', [pageId])).rows[0];
  if (previous && (previous.owner_type !== ownerType || Number(previous.owner_user_id) !== Number(user.id))) {
    throw Object.assign(new Error('This Meta Page is connected to another ProPulse account'), {code:'META_PAGE_IN_USE'});
  }
  const page = await graph('me', pageToken, {params:{fields:'id,name'}});
  if (String(page.id) !== pageId) throw Object.assign(new Error('Access token does not belong to the selected Meta Page'), {code:'INVALID_META_PAGE'});
  const subscription = await graph(pageId + '/subscribed_apps', pageToken, {method:'POST',body:{subscribed_fields:'leadgen'}});
  if (subscription.success !== true) throw Object.assign(new Error('Meta Page leadgen subscription was not confirmed'), {code:'META_SUBSCRIPTION_FAILED'});
  const r = await pool.query(
    "INSERT INTO meta_lead_connections(page_id,page_name,owner_type,owner_user_id,encrypted_page_token,status) VALUES($1,$2,$3,$4,$5,'active') " +
    "ON CONFLICT(page_id) DO UPDATE SET page_name=EXCLUDED.page_name,encrypted_page_token=EXCLUDED.encrypted_page_token,status='active',updated_at=CURRENT_TIMESTAMP " +
    "WHERE meta_lead_connections.owner_type=EXCLUDED.owner_type AND meta_lead_connections.owner_user_id=EXCLUDED.owner_user_id RETURNING *",
    [pageId, asString(page.name,255) || 'Meta Page', ownerType, Number(user.id), encrypted]
  );
  if (!r.rowCount) throw Object.assign(new Error('This Meta Page is already owned by another account'), {code:'META_PAGE_IN_USE'});
  return publicConnection(r.rows[0]);
}
async function connections(user) {
  const scope = await checkUser(user);
  const r = await pool.query(
    'SELECT id,page_id,page_name,owner_type,owner_user_id,status,connected_at FROM meta_lead_connections ' +
    (scope === 'admin' ? 'ORDER BY connected_at DESC' : 'WHERE owner_type=$1 AND owner_user_id=$2 ORDER BY connected_at DESC'),
    scope === 'admin' ? [] : ['partner',user.id]
  );
  return r.rows.map(publicConnection);
}
async function disconnect(user,id) {
  const scope = await checkUser(user);
  const r = await pool.query(
    "UPDATE meta_lead_connections SET status='disconnected',updated_at=NOW() WHERE id=$1 " +
    (scope === 'admin' ? '' : "AND owner_type='partner' AND owner_user_id=$2") + ' RETURNING id',
    scope === 'admin' ? [id] : [id,user.id]
  );
  if (!r.rowCount) throw Object.assign(new Error('Page connection not found'), {code:'NOT_FOUND'});
  return {disconnected: true};
}
async function capture(payload) {
  if (!payload || payload.object !== 'page' || !Array.isArray(payload.entry)) return {accepted:0};
  let accepted = 0;
  for (const entry of payload.entry.slice(0,100)) {
    for (const change of (Array.isArray(entry.changes) ? entry.changes : []).slice(0,100)) {
      if (change.field !== 'leadgen') continue;
      const data = change.value || {};
      const pageId = safeId(data.page_id || entry.id);
      const leadId = safeId(data.leadgen_id);
      if (!pageId || !leadId) continue;
      const connection = (await pool.query("SELECT id FROM meta_lead_connections WHERE page_id=$1 AND status='active'",[pageId])).rows[0];
      if (!connection) continue;
      const submitted = Number(data.created_time);
      const submittedAt = Number.isFinite(submitted) && submitted > 0 ? new Date(submitted*1000) : null;
      const r = await pool.query(
        'INSERT INTO meta_ads_leads(connection_id,meta_leadgen_id,page_id,form_id,ad_id,adgroup_id,submitted_at) ' +
        'VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(meta_leadgen_id) DO NOTHING RETURNING id',
        [connection.id,leadId,pageId,safeId(data.form_id)||null,safeId(data.ad_id)||null,safeId(data.adgroup_id)||null,submittedAt]
      );
      accepted += r.rowCount;
    }
  }
  return {accepted};
}
function extractFields(data) {
  const fields = {};
  for (const row of Array.isArray(data?.field_data) ? data.field_data.slice(0,150) : []) {
    const name = asString(row?.name,150).toLowerCase();
    if (!name) continue;
    fields[name] = Array.isArray(row.values) ? row.values.slice(0,25).map(v=>asString(v,1200)) : [];
  }
  const pick = (...keys) => keys.map(k=>asString(fields[k]?.[0],500)).find(Boolean) || '';
  const name = pick('full_name','name') || [pick('first_name'),pick('last_name')].filter(Boolean).join(' ');
  return {fields,name,phone:pick('phone_number','phone','mobile_number'),email:pick('email')};
}
async function list(user,opts={}) {
  const scope = await checkUser(user);
  const page = Math.max(1,Math.floor(Number(opts.page)||1)), limit = 30, offset=(page-1)*limit;
  const status = ['pending','retry','received','failed'].includes(opts.status) ? opts.status : 'all';
  const conditions = [], values = [];
  if (scope === 'partner') { values.push(user.id);conditions.push("c.owner_type='partner' AND c.owner_user_id=$"+values.length); }
  if (status !== 'all') {values.push(status);conditions.push('l.status=$'+values.length);}
  const where = conditions.length ? ' WHERE '+conditions.join(' AND ') : '';
  const count = await pool.query('SELECT COUNT(*)::int AS total FROM meta_ads_leads l JOIN meta_lead_connections c ON c.id=l.connection_id'+where,values);
  values.push(limit,offset);
  const result = await pool.query(
    'SELECT l.id,l.meta_leadgen_id,l.page_id,l.form_id,l.ad_id,l.adgroup_id,l.submitted_at,l.customer_name,l.customer_phone,l.customer_email,l.fields,l.status,l.attempts,l.last_error,l.received_at,l.created_at,c.page_name,c.owner_type,c.owner_user_id ' +
    'FROM meta_ads_leads l JOIN meta_lead_connections c ON c.id=l.connection_id'+where +
    ' ORDER BY l.created_at DESC,l.id DESC LIMIT $'+(values.length-1)+' OFFSET $'+values.length,values
  );
  return {items:result.rows,pagination:{page,limit,total:count.rows[0].total}};
}
async function retry(user,id) {
  const scope=await checkUser(user);
  const r=await pool.query(
    "UPDATE meta_ads_leads l SET status='pending',attempts=0,next_attempt_at=NOW(),lease_until=NULL,last_error=NULL,updated_at=NOW() FROM meta_lead_connections c " +
    "WHERE l.connection_id=c.id AND l.id=$1 AND c.status='active' " + (scope==='admin'?'':"AND c.owner_type='partner' AND c.owner_user_id=$2") + ' RETURNING l.id',
    scope==='admin'?[id]:[id,user.id]
  );
  if (!r.rowCount) throw Object.assign(new Error('Lead not found or Page disconnected'),{code:'NOT_FOUND'});
  return {queued:true};
}
async function processPending(batchSize=5) {
  const client=await pool.connect();
  let jobs=[];
  try {
    await client.query('BEGIN');
    const claim=await client.query(
      "SELECT l.id,l.meta_leadgen_id,c.encrypted_page_token FROM meta_ads_leads l JOIN meta_lead_connections c ON c.id=l.connection_id " +
      "WHERE l.status IN ('pending','retry') AND l.next_attempt_at<=NOW() AND (l.lease_until IS NULL OR l.lease_until<NOW()) AND c.status='active' " +
      'ORDER BY l.id LIMIT $1 FOR UPDATE OF l SKIP LOCKED',[Math.min(10,Math.max(1,batchSize))]
    );
    jobs=claim.rows;
    if(jobs.length)await client.query("UPDATE meta_ads_leads SET lease_until=NOW()+INTERVAL '2 minutes',attempts=attempts+1 WHERE id=ANY($1::bigint[])",[jobs.map(j=>j.id)]);
    await client.query('COMMIT');
  } catch (e) {await client.query('ROLLBACK').catch(()=>{});throw e;}
  finally {client.release();}
  let received=0,failed=0;
  for(const job of jobs) {
    try {
      const lead=await graph(job.meta_leadgen_id,decrypt(job.encrypted_page_token),{params:{fields:'id,created_time,ad_id,form_id,field_data'}});
      if(String(lead.id)!==String(job.meta_leadgen_id))throw new Error('Meta lead ID mismatch');
      const field=extractFields(lead);
      await pool.query(
        "UPDATE meta_ads_leads SET status='received',fields=$2::jsonb,lead_data=$3::jsonb,customer_name=$4,customer_phone=$5,customer_email=$6,received_at=NOW(),lease_until=NULL,last_error=NULL,updated_at=NOW() WHERE id=$1",
        [job.id,JSON.stringify(field.fields),JSON.stringify({id:lead.id,created_time:lead.created_time,ad_id:lead.ad_id,form_id:lead.form_id}),field.name||null,field.phone||null,field.email||null]
      );
      received++;
    } catch (error) {
      failed++;
      const code=asString(error?.code||'META_FETCH_FAILED',60);
      await pool.query(
        "UPDATE meta_ads_leads SET status=CASE WHEN attempts>=8 THEN 'failed' ELSE 'retry' END," +
        "next_attempt_at=NOW()+LEAST(3600,POWER(2,LEAST(attempts,7))*30)*INTERVAL '1 second',lease_until=NULL,last_error=$2,updated_at=NOW() WHERE id=$1",
        [job.id,code]
      );
    }
  }
  return {claimed:jobs.length,received,failed};
}
module.exports={connect,connections,disconnect,capture,list,retry,processPending,validSignature,validChallenge,extractFields};
