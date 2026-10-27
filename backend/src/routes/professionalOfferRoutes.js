const router=require('express').Router();
const pool=require('../config/database');
const auth=require('../middleware/authMiddleware');
const rateLimit=require('../middleware/rateLimitMiddleware');

const writeLimit=rateLimit({windowMs:60*1000,max:45});
const audiences=new Set(['all','new_registration','verified','unverified','non_member','grow','scale']);
const modes=new Set(['popup','banner','both']);
const frequencies=new Set(['once','daily']);
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const text=(v,max)=>String(v??'').trim().slice(0,max);
const int=(v,defaultValue,max)=>v===undefined?defaultValue:Math.max(0,Math.min(max,Math.trunc(Number(v)||0)));
const optionalDate=v=>{
  if(!v)return null;
  const d=new Date(v);
  if(Number.isNaN(d.getTime()))fail('Enter a valid offer date');
  return d.toISOString();
};
const safePath=value=>{
  const p=text(value||'/membership',350);
  if(!/^\/(?!\/)(?!api(?:\/|$))(?!admin(?:\/|$))[a-zA-Z0-9/?#=&_%.-]*$/.test(p))
    fail('Use a relative ProPulse page, such as /membership or /profile');
  return p;
};
const safeImage=value=>{
  const v=text(value,500);
  if(!v)return null;
  if(/^\/(?!\/)[a-zA-Z0-9/_%.\-]+$/.test(v))return v;
  try{
    const u=new URL(v);
    const h=u.hostname.toLowerCase();
    if(u.protocol==='https:'&&(h==='images.unsplash.com'||h.endsWith('.r2.cloudflarestorage.com')))
      return u.toString();
  }catch{}
  fail('Offer image must use a site image, Unsplash or Cloudflare R2 URL');
};
function normalized(body){
  const audience=text(body.audience,24)||'all';
  const display_mode=text(body.display_mode,12)||'both';
  const popup_frequency=text(body.popup_frequency,12)||'once';
  if(!audiences.has(audience)||!modes.has(display_mode)||!frequencies.has(popup_frequency))
    fail('Invalid offer audience or display settings');
  const title=text(body.title,120);
  if(!title)fail('Offer title is required');
  const starts_at=optionalDate(body.starts_at);
  const expires_at=optionalDate(body.expires_at);
  if(starts_at&&expires_at&&new Date(expires_at)<=new Date(starts_at))
    fail('End date must be after start date');
  return{
    title,description:text(body.description,600),
    eyebrow:text(body.eyebrow,60)||'PROPULSE OFFERS',
    cta_label:text(body.cta_label,48)||'Explore offer',
    cta_path:safePath(body.cta_path),
    image_url:safeImage(body.image_url),
    audience,registration_window_days:int(body.registration_window_days,0,365),
    display_mode,popup_frequency,starts_at,expires_at,
    priority:int(body.priority,100,10000),
    is_active:body.is_active===true
  };
}
const fields=['title','description','eyebrow','cta_label','cta_path','image_url','audience',
  'registration_window_days','display_mode','popup_frequency','starts_at','expires_at','priority','is_active'];
function errorResponse(res,e){
  if(e.status)return res.status(e.status).json({error:e.message});
  console.error('Professional offer request failed:',e);
  return res.status(500).json({error:'Unable to process professional offers'});
}
function requireBusiness(req,res,next){
  if(req.user?.role!=='business')return res.status(403).json({error:'Professional account required'});
  next();
}
function requireAdmin(req,res,next){
  if(req.user?.role!=='admin')return res.status(403).json({error:'Admin access required'});
  next();
}
router.use(auth);

// This query is the single eligibility gate for display, impressions and clicks.
// Never accept audience / user-id claims from the browser.
const eligibleSql=`
  WITH profile AS (
    SELECT u.id,u.created_at,
      EXISTS(SELECT 1 FROM company_proof_documents d
        WHERE d.user_id=u.id AND d.status='verified') AS verified,
      COALESCE((SELECT CASE WHEN LOWER(COALESCE(mp.plan_group,''))='scale' THEN 'scale' ELSE 'grow' END
        FROM memberships m JOIN membership_plans mp ON mp.id=m.membership_plan_id
        WHERE m.user_id=u.id AND m.status='active' AND m.starts_at<=CURRENT_TIMESTAMP
          AND m.expires_at>CURRENT_TIMESTAMP
          AND LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_'))='pro'
        ORDER BY m.expires_at DESC LIMIT 1),'non_member') AS tier
    FROM users u WHERE u.id=$1 AND u.role='business' AND u.is_active=TRUE
  )
  SELECT o.*,v.first_seen_at,v.last_seen_at,v.seen_count,v.dismissed_at,v.click_count,
    (v.offer_id IS NULL OR (o.popup_frequency='daily' AND v.last_seen_at::date<CURRENT_DATE)) AS popup_pending
  FROM professional_offer_campaigns o CROSS JOIN profile p
  LEFT JOIN professional_offer_views v ON v.offer_id=o.id AND v.user_id=p.id
  WHERE o.is_active=TRUE
    AND (o.starts_at IS NULL OR o.starts_at<=CURRENT_TIMESTAMP)
    AND (o.expires_at IS NULL OR o.expires_at>CURRENT_TIMESTAMP)
    AND ($2::int IS NULL OR o.id=$2)
    AND (o.audience='all'
      OR (o.audience='new_registration' AND p.created_at>=o.created_at)
      OR (o.audience='verified' AND p.verified)
      OR (o.audience='unverified' AND NOT p.verified)
      OR o.audience=p.tier)
    AND (o.registration_window_days=0 OR p.created_at>=CURRENT_TIMESTAMP
      -(o.registration_window_days*INTERVAL '1 day'))
  ORDER BY o.priority DESC,o.id DESC LIMIT 15
`;
async function eligible(userId,offerId=null){
  const result=await pool.query(eligibleSql,[userId,offerId]);
  return result.rows;
}
router.get('/',requireBusiness,async(req,res)=>{
  try{
    const offers=(await eligible(req.user.id)).map(o=>({
      id:o.id,title:o.title,description:o.description,eyebrow:o.eyebrow,
      cta_label:o.cta_label,cta_path:o.cta_path,image_url:o.image_url,
      display_mode:o.display_mode,expires_at:o.expires_at,popup_frequency:o.popup_frequency,
      show_popup:o.display_mode!=='banner' && o.popup_pending===true
    }));
    return res.json({offers});
  }catch(e){return errorResponse(res,e)}
});
router.post('/:id/seen',requireBusiness,writeLimit,async(req,res)=>{
  try{
    const id=Number(req.params.id);
    if(!Number.isSafeInteger(id)||id<=0)fail('Invalid offer',400);
    const offer=(await eligible(req.user.id,id))[0];
    if(!offer)fail('Offer is no longer available',404);
    // Daily impressions are idempotent, including React StrictMode double effects.
    await pool.query(`
      INSERT INTO professional_offer_views(offer_id,user_id) VALUES($1,$2)
      ON CONFLICT(offer_id,user_id) DO UPDATE SET
        seen_count=CASE WHEN professional_offer_views.last_seen_at::date<CURRENT_DATE
          THEN professional_offer_views.seen_count+1 ELSE professional_offer_views.seen_count END,
        last_seen_at=CASE WHEN professional_offer_views.last_seen_at::date<CURRENT_DATE
          THEN CURRENT_TIMESTAMP ELSE professional_offer_views.last_seen_at END
    `,[id,req.user.id]);
    return res.json({ok:true});
  }catch(e){return errorResponse(res,e)}
});
router.post('/:id/dismiss',requireBusiness,writeLimit,async(req,res)=>{
  try{
    const id=Number(req.params.id);
    if(!Number.isSafeInteger(id)||id<=0)fail('Invalid offer');
    if(!(await eligible(req.user.id,id)).length)fail('Offer is no longer available',404);
    await pool.query(`INSERT INTO professional_offer_views(offer_id,user_id,dismissed_at)
      VALUES($1,$2,CURRENT_TIMESTAMP)
      ON CONFLICT(offer_id,user_id) DO UPDATE SET dismissed_at=CURRENT_TIMESTAMP`,[id,req.user.id]);
    return res.json({ok:true});
  }catch(e){return errorResponse(res,e)}
});
router.post('/:id/click',requireBusiness,writeLimit,async(req,res)=>{
  try{
    const id=Number(req.params.id);
    if(!Number.isSafeInteger(id)||id<=0)fail('Invalid offer');
    if(!(await eligible(req.user.id,id)).length)fail('Offer is no longer available',404);
    await pool.query(`INSERT INTO professional_offer_views(offer_id,user_id,click_count,last_clicked_at)
      VALUES($1,$2,1,CURRENT_TIMESTAMP)
      ON CONFLICT(offer_id,user_id) DO UPDATE SET
        click_count=professional_offer_views.click_count+1,last_clicked_at=CURRENT_TIMESTAMP`,[id,req.user.id]);
    return res.json({ok:true});
  }catch(e){return errorResponse(res,e)}
});

router.get('/admin/manage',requireAdmin,async(req,res)=>{
  try{
    const rows=(await pool.query(`SELECT o.*,COALESCE(v.viewers,0)::int AS viewers,
      COALESCE(v.clicks,0)::int AS clicks,COALESCE(v.dismissals,0)::int AS dismissals
      FROM professional_offer_campaigns o LEFT JOIN LATERAL (
        SELECT COUNT(*) AS viewers,SUM(click_count) AS clicks,
          COUNT(*) FILTER(WHERE dismissed_at IS NOT NULL) AS dismissals
        FROM professional_offer_views WHERE offer_id=o.id
      ) v ON TRUE ORDER BY o.priority DESC,o.id DESC LIMIT 250`)).rows;
    return res.json({offers:rows});
  }catch(e){return errorResponse(res,e)}
});
router.post('/admin/manage',requireAdmin,writeLimit,async(req,res)=>{
  try{
    const data=normalized(req.body||{}),values=fields.map(f=>data[f]);
    const row=(await pool.query(`INSERT INTO professional_offer_campaigns
      (${fields.join(',')},created_by,updated_by)
      VALUES(${values.map((_,i)=>'$'+(i+1)).join(',')},$${values.length+1},$${values.length+1}) RETURNING *`,
      [...values,req.user.id])).rows[0];
    return res.status(201).json(row);
  }catch(e){return errorResponse(res,e)}
});
router.put('/admin/manage/:id',requireAdmin,writeLimit,async(req,res)=>{
  try{
    const id=Number(req.params.id);
    if(!Number.isSafeInteger(id)||id<=0)fail('Invalid offer');
    const data=normalized(req.body||{}),values=fields.map(f=>data[f]);
    const row=(await pool.query(`UPDATE professional_offer_campaigns SET
      ${fields.map((f,i)=>f+'=$'+(i+2)).join(',')},updated_by=$${values.length+2},
      updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,
      [id,...values,req.user.id])).rows[0];
    if(!row)fail('Offer not found',404);
    return res.json(row);
  }catch(e){return errorResponse(res,e)}
});
router.delete('/admin/manage/:id',requireAdmin,writeLimit,async(req,res)=>{
  try{
    const id=Number(req.params.id);
    if(!Number.isSafeInteger(id)||id<=0)fail('Invalid offer');
    const row=(await pool.query('DELETE FROM professional_offer_campaigns WHERE id=$1 RETURNING id',[id])).rows[0];
    if(!row)fail('Offer not found',404);
    return res.json({deleted:true});
  }catch(e){return errorResponse(res,e)}
});

module.exports=router;
