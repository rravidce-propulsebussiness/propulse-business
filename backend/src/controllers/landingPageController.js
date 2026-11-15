const pool=require('../config/database');

const FIELDS=['seo_title','meta_description','hero_title','hero_summary'];
function clean(value,max){return String(value??'').trim().slice(0,max)}
function pagePath(value){
  const path=clean(value,500);
  return path.startsWith('/')&&!path.startsWith('//')&&!path.includes('?')&&!path.includes('#')?path:null;
}
async function list(req,res){
  try{const {rows}=await pool.query('SELECT page_path,seo_title,meta_description,hero_title,hero_summary,updated_at FROM website_landing_page_overrides ORDER BY page_path');res.json(rows)}
  catch(error){console.error('Landing page overrides list failed:',error.message);res.status(500).json({error:'Unable to load landing page edits'})}
}
async function save(req,res){
  const path=pagePath(req.body?.pagePath);
  if(!path)return res.status(400).json({error:'A valid page path is required'});
  const values=FIELDS.map((field,index)=>clean(req.body?.[field.replace(/_([a-z])/g,(_,letter)=>letter.toUpperCase())],index===0?160:500));
  try{
    const {rows}=await pool.query(`INSERT INTO website_landing_page_overrides(page_path,seo_title,meta_description,hero_title,hero_summary,updated_at)
      VALUES($1,$2,$3,$4,$5,NOW()) ON CONFLICT(page_path) DO UPDATE SET seo_title=EXCLUDED.seo_title,meta_description=EXCLUDED.meta_description,hero_title=EXCLUDED.hero_title,hero_summary=EXCLUDED.hero_summary,updated_at=NOW()
      RETURNING page_path,seo_title,meta_description,hero_title,hero_summary,updated_at`,[path,...values]);
    res.json(rows[0]);
  }catch(error){console.error('Landing page override save failed:',error.message);res.status(500).json({error:'Unable to save landing page edits'})}
}
async function remove(req,res){
  const path=pagePath(req.body?.pagePath||req.query?.path);
  if(!path)return res.status(400).json({error:'A valid page path is required'});
  try{await pool.query('DELETE FROM website_landing_page_overrides WHERE page_path=$1',[path]);res.json({ok:true})}
  catch(error){console.error('Landing page override reset failed:',error.message);res.status(500).json({error:'Unable to reset landing page edits'})}
}
async function publicOverride(req,res){
  const path=pagePath(req.query?.path);
  if(!path)return res.status(400).json({error:'A valid page path is required'});
  try{const {rows}=await pool.query('SELECT seo_title,meta_description,hero_title,hero_summary FROM website_landing_page_overrides WHERE page_path=$1',[path]);res.set('Cache-Control','public, max-age=60, stale-while-revalidate=300');res.json(rows[0]||{})}
  catch(error){console.error('Public landing page override read failed:',error.message);res.status(200).json({})}
}
module.exports={list,save,remove,publicOverride};
