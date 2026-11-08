const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const rateLimit = require('../middleware/rateLimitMiddleware');
const oauth = require('../services/metaLeadOAuthService');

const router = express.Router();
const limit = rateLimit({windowMs:60*1000,max:8});
const noStore = (req,res,next) => {
  res.setHeader('Cache-Control','no-store, private');
  res.setHeader('Referrer-Policy','no-referrer');
  next();
};
router.use(noStore);
function failure(res, e) {
  const code = String(e?.code || 'META_OAUTH_FAILED');
  const status = code === 'FORBIDDEN' ? 403 :
    code === 'INVALID_META_PAGE' ? 400 :
    code === 'META_OAUTH_EXPIRED' ? 401 :
    code === 'META_PAGE_IN_USE' ? 409 :
    code === 'META_NOT_CONFIGURED' ? 503 :
    code === 'META_GRAPH_ERROR' ? 502 : 500;
  if (status >= 500) console.error('Meta Page linking failed:',code);
  return res.status(status).json({code,error:
    status === 503 ? 'Meta Facebook Login is not configured on the server.' :
    status >= 500 ? 'Facebook Page linking is temporarily unavailable.' :
    e.message || 'Page linking failed'});
}
router.post('/start',requireAuth,limit,async(req,res)=>{
  try { return res.json(await oauth.start(req.user,res)); }
  catch(e) { return failure(res,e); }
});
router.get('/callback',limit,async(req,res)=>{
  // Meta redirects here directly without ProPulse auth headers. The encrypted,
  // short-lived, HttpOnly state cookie authenticates the OAuth transaction.
  try { return await oauth.callback(req,res); }
  catch(e) {
    console.error('Meta OAuth callback unexpected failure:',e.code || 'META_OAUTH_ERROR');
    return res.redirect(303,'/admin/leads/meta?metaConnect=meta_rejected');
  }
});
router.get('/pages',requireAuth,limit,async(req,res)=>{
  try { return res.json(await oauth.pages(req.user,req)); }
  catch(e) { return failure(res,e); }
});
router.post('/complete',requireAuth,limit,async(req,res)=>{
  try { return res.status(201).json(await oauth.complete(req.user,req,res,req.body?.pageId)); }
  catch(e) { return failure(res,e); }
});
router.post('/cancel',requireAuth,limit,(req,res)=>res.json(oauth.cancel(res)));
module.exports=router;
