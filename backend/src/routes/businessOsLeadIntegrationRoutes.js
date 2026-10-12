const express = require('express');
const crypto = require('node:crypto');
const pool = require('../config/database');
const authService = require('../services/authService');
const { getPurchases } = require('../services/leadPurchaseCouponService');
const rateLimit = require('../middleware/rateLimitMiddleware');
const router = express.Router();
const fingerprint = (value) => crypto.createHash('sha256').update(value).digest('hex');
const secureToken = () => crypto.randomBytes(32).toString('base64url');
const privateHeaders = (res) => {
  res.setHeader('Cache-Control','no-store, private');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
};
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, ch => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
})[ch]);

router.get('/link/code', rateLimit({windowMs:60000,max:8}), async(req,res) => {
  privateHeaders(res);
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'; base-uri 'none'; style-src 'unsafe-inline'");
  const token = String(req.headers.cookie||'').split(';')
    .map(s=>s.trim()).find(s=>s.startsWith('propulse_auth='))?.slice(14);
  let principal = null;
  try {
    if (token) {
      const user=authService.verifyToken(decodeURIComponent(token));
      principal=await authService.getAuthenticatedUser(user.id,user.auth_version);
    }
  } catch { principal=null; }
  if (!principal) return res.redirect(303,
    '/login?returnTo='+encodeURIComponent('/api/business-os/link/code'));
  try {
    const code=secureToken();
    await pool.query(
      "INSERT INTO business_os_pairing_codes(code_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '5 minutes')",
      [fingerprint(code),principal.id],
    );
    return res.status(200).type('html').send(
      '<!doctype html><html lang="en"><meta charset="utf-8">'+
      '<meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<title>Link ProPulse to Business OS</title>'+
      '<body style="margin:0;padding:36px;background:#f3f6fc;font:16px system-ui;color:#172b4d">'+
      '<main style="margin:10vh auto;max-width:530px;padding:32px;background:white;border-radius:16px">'+
      '<h1>Connect your ProPulse leads</h1>'+
      '<p>Signed in as '+escapeHtml(principal.email||'ProPulse user')+'.</p>'+
      '<p>Copy this one-time code into <strong>Business OS → CRM Leads → Connect ProPulse</strong>. '+
      'It expires in 5 minutes and can only be used once. It grants read-only access '+
      'to your purchased or active entitlement leads, not your marketplace account.</p>'+
      '<div style="overflow-wrap:anywhere;font:600 19px monospace;background:#eaf2ff;padding:18px;border-radius:10px">'+
      escapeHtml(code)+'</div>'+
      '<p style="color:#66768c">Different email addresses are supported. Keep this code private.</p>'+
      '</main></body></html>'
    );
  } catch(e) {
    console.error('Business OS pairing code unavailable:',e.message);
    return res.status(503).json({error:'temporarily_unavailable'});
  }
});

router.post('/link/redeem', rateLimit({windowMs:60000,max:12}),
  express.json({limit:'2kb'}), async(req,res)=>{
    privateHeaders(res);
    const code=String(req.body?.code||'');
    if (!/^[A-Za-z0-9_-]{43}$/.test(code)) return res.status(400).json({error:'invalid_code'});
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      // Consumes the code atomically; a replay cannot issue a second grant.
      const row=(await client.query(
        "DELETE FROM business_os_pairing_codes WHERE code_hash=$1 AND expires_at>NOW() RETURNING user_id",
        [fingerprint(code)]
      )).rows[0];
      if(!row){await client.query('ROLLBACK');return res.status(400).json({error:'invalid_or_expired_code'});}
      const user=(await client.query('SELECT id,name,email,is_active FROM users WHERE id=$1',
        [row.user_id])).rows[0];
      if(!user?.is_active){await client.query('ROLLBACK');return res.status(403).json({error:'account_inactive'});}
      const grant=secureToken();
      await client.query(
        "INSERT INTO business_os_lead_grants(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '30 days')",
        [fingerprint(grant),user.id]
      );
      await client.query('COMMIT');
      return res.json({token:grant,expires_in:2592000,subject:'propulse:'+user.id,
        display_name:user.name||'',email:user.email||''});
    }catch(e){
      await client.query('ROLLBACK').catch(()=>{});
      console.error('Business OS lead pair redeem failed:',e.message);
      return res.status(503).json({error:'temporarily_unavailable'});
    }finally{client.release();}
});

async function grantUser(req) {
  const h=String(req.headers.authorization||'');
  const token=h.startsWith('Bearer ')?h.slice(7).trim():'';
  if(!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
  const row=(await pool.query(
    "SELECT g.user_id FROM business_os_lead_grants g JOIN users u ON u.id=g.user_id "+
    "WHERE g.token_hash=$1 AND g.revoked_at IS NULL AND g.expires_at>NOW() AND u.is_active=TRUE",
    [fingerprint(token)]
  )).rows[0];
  return row?.user_id||null;
}
router.get('/leads',rateLimit({windowMs:60000,max:90}),async(req,res)=>{
  privateHeaders(res);
  try {
    const userId=await grantUser(req);
    if(!userId)return res.status(401).json({error:'invalid_token'});
    // getPurchases is the same purchase + active entitlement gate as
    // /api/leads/purchased. Never return public marketplace contacts.
    const records=await getPurchases(userId);
    const page=Number(req.query.page||'1');
    if(!Number.isInteger(page)||page<1||page>10000)
      return res.status(400).json({error:'invalid_page'});
    const pageSize=50;
    return res.json({
      page,has_more:records.length>page*pageSize,
      leads:records.slice((page-1)*pageSize,page*pageSize).map(row=>({
        lead_id:row.lead_id,
        customer_name:row.customer_name,
        customer_phone:row.customer_phone,
        customer_email:row.customer_email,
        requirement:row.requirement,
        service:row.service_name||row.industry_name||row.property_type||'',
        city:row.city_name||'',
        budget:row.budget||'',
        source:row.source||'propulse',
        access_type:row.pricing_tier||'',
      }))
    });
  }catch(e) {
    console.error('Business OS eligible leads unavailable:',e.message);
    return res.status(503).json({error:'temporarily_unavailable'});
  }
});
router.post('/link/revoke',rateLimit({windowMs:60000,max:30}),async(req,res)=>{
  privateHeaders(res);
  const h=String(req.headers.authorization||'');
  const token=h.startsWith('Bearer ')?h.slice(7).trim():'';
  if(!/^[A-Za-z0-9_-]{43}$/.test(token))return res.status(401).json({error:'invalid_token'});
  try {
    await pool.query('UPDATE business_os_lead_grants SET revoked_at=NOW() WHERE token_hash=$1',[fingerprint(token)]);
    return res.json({revoked:true});
  }catch{return res.status(503).json({error:'temporarily_unavailable'});}
});
module.exports=router;