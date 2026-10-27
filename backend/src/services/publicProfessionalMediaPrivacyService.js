const pool=require('../config/database');
const projectImage=require('./projectImageService');
const projectPlan=require('./projectPlanService');
const projectVideo=require('./projectVideoService');

// Never expose raw external/company asset URLs without review. Replacing a
// public contact link cannot remove pixels, speech, embedded QR codes or PDFs.
async function approvedUrls(profileId,urls){
  const values=[...new Set((urls||[]).filter(value=>typeof value==='string'&&value.length>0))];
  if(!Number.isSafeInteger(Number(profileId))||!values.length)return new Set();
  const {rows}=await pool.query(
    'SELECT asset_url FROM public_professional_media_approvals WHERE business_profile_id=$1 AND asset_url=ANY($2::text[])',
    [profileId,values],
  );
  return new Set(rows.map(row=>row.asset_url));
}
function safePublicText(value){
  return String(value||'')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[contact through ProPulse]')
    .replace(/(?:https?:\/\/|www\.)\S+/gi,'[contact through ProPulse]')
    .replace(/(?:\+?\d[\d .()\-]{8,}\d)/g,'[contact through ProPulse]');
}
async function project(row){
  const id=Number(row.business_profile_id);
  const urls=[row.cover_image_url,row.video_url,row.plan_url,row.brochure_url,...(row.image_urls||[])];
  const allowed=await approvedUrls(id,urls);
  const show=url=>url&&allowed.has(url)?url:null;
  return {
    ...row,
    title:safePublicText(row.title),
    description:safePublicText(row.description),
    cover_image_url:show(row.cover_image_url)?await projectImage.displayUrl(row.cover_image_url):null,
    image_urls:await Promise.all((row.image_urls||[]).filter(allowed.has,allowed).map(url=>projectImage.displayUrl(url))),
    video_url:show(row.video_url)?await projectVideo.displayUrl(row.video_url):null,
    plan_url:show(row.plan_url)?await projectPlan.displayUrl(row.plan_url):null,
    brochure_url:show(row.brochure_url)?await projectPlan.displayUrl(row.brochure_url):null,
  };
}
async function brochure(profileId,url){
  const approved=await approvedUrls(profileId,[url]);
  return url&&approved.has(url)?projectPlan.displayUrl(url):null;
}
module.exports={approvedUrls,safePublicText,project,brochure};
