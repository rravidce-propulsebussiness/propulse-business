const pool=require('../config/database');
const s3=require('./s3PrivateObjectStorageService');
const imageService=require('./projectImageService');
const videoService=require('./projectVideoService');
const planService=require('./projectPlanService');

function inputError(message,code='INVALID_COMPLETED_PROJECT'){
  const error=new Error(message);
  error.code=code;
  return error;
}
function integer(value){
  const n=Number(value);
  return Number.isSafeInteger(n)&&n>0?n:null;
}
function string(value,label,max=180){
  const text=String(value??'').trim();
  if(text.length>max)throw inputError(label+' is too long');
  return text;
}
function mediaUrl(value,label){
  const url=string(value,label,2048);
  if(!url)return '';
  if(url.startsWith('/uploads/business-projects/')||s3.isReference(url))return url;
  try{
    const parsed=new URL(url);
    if(parsed.protocol==='https:'&&parsed.username===''&&parsed.password==='')return url;
  }catch{}
  throw inputError(label+' must be a valid HTTPS URL');
}
function normalized(input,current={}){
  const field=(key,snake)=>Object.prototype.hasOwnProperty.call(input,key)?input[key]:current[snake];
  const published=Object.prototype.hasOwnProperty.call(input,'isPublished')?input.isPublished===true:current.is_published===true;
  const title=string(field('title','title'),'Project name',180);
  const projectType=string(field('projectType','project_type'),'Project type',120);
  const locationText=string(field('locationText','location_text'),'Location',180);
  const areaText=string(field('areaText','area_text'),'Area',120);
  const budgetText=string(field('budgetText','budget_text'),'Actual project budget',120);
  const description=string(field('description','description'),'Description',3000);
  const packageName=string(field('packageName','package_name'),'Package name',160);
  const yearValue=field('completionYear','completion_year');
  const completionYear=yearValue==null||yearValue===''?null:Number(yearValue);
  if(completionYear!==null&&(!Number.isInteger(completionYear)||completionYear<1950||completionYear>new Date().getFullYear()))throw inputError('Use a valid completion year, not a future date');
  const coverImageUrl=mediaUrl(field('coverImageUrl','cover_image_url'),'Cover photo');
  const rawImages=field('imageUrls','image_urls')??[];
  if(!Array.isArray(rawImages)||rawImages.length>8)throw inputError('Supply at most eight genuine project photos');
  const imageUrls=[...new Set(rawImages.map((url)=>mediaUrl(url,'Gallery photo')).filter(Boolean))];
  const videoUrl=mediaUrl(field('videoUrl','video_url'),'Project video');
  const planUrl=mediaUrl(field('planUrl','plan_url'),'Plan or drawing');
  const cover=coverImageUrl||imageUrls[0]||'';
  if(!title)throw inputError('Enter the actual project name');
  if(published&&(!projectType||!locationText||!areaText||!budgetText||!completionYear||!cover)){
    throw inputError('To publish, enter project name, type, location, area, actual budget, completion year and at least one real project photo. Save as draft if details are incomplete.');
  }
  return {title,projectType,locationText,areaText,budgetText,description,packageName,completionYear,coverImageUrl:cover,imageUrls,videoUrl,planUrl,isPublished:published};
}
function validateStorageOwnership(userId,item){
  for(const image of [item.coverImageUrl,...item.imageUrls]){
    if(s3.isReference(image)||image.startsWith('/uploads/business-projects/'))imageService.managedImageInfo(userId,image);
  }
  if(s3.isReference(item.videoUrl)||item.videoUrl.startsWith('/uploads/business-projects/'))videoService.managedVideoInfo(userId,item.videoUrl);
  if(s3.isReference(item.planUrl)||item.planUrl.startsWith('/uploads/business-projects/'))planService.managedPlanInfo(userId,item.planUrl);
}
async function uploadPhoto(userId,mime,buffer){
  const id=integer(userId);
  if(!id)throw inputError('Select a business before uploading photos');
  const result=await pool.query(`SELECT bp.id FROM business_profiles bp JOIN users u ON u.id=bp.user_id WHERE u.id=$1 AND u.role='business' LIMIT 1`,[id]);
  if(!result.rows.length)throw inputError('Business profile not found','BUSINESS_PROFILE_NOT_FOUND');
  return imageService.saveProjectImage(id,mime,buffer);
}
async function list({page=1,pageSize=20}={}){
  const n=Math.max(1,Math.min(100000,integer(page)||1));
  const size=Math.max(1,Math.min(50,integer(pageSize)||20));
  const total=Number((await pool.query('SELECT COUNT(*)::int AS count FROM business_profile_projects')).rows[0]?.count||0);
  const result=await pool.query(`
    SELECT p.id,p.title,p.project_type,p.description,p.location_text,p.completion_year,p.area_text,
      p.budget_text,p.cover_image_url,p.image_urls,p.package_name,p.video_url,p.plan_url,
      p.is_published,p.published_at,p.created_at,u.id AS business_user_id,bp.business_name
    FROM business_profile_projects p
    JOIN business_profiles bp ON bp.id=p.business_profile_id
    JOIN users u ON u.id=bp.user_id
    ORDER BY p.updated_at DESC,p.id DESC LIMIT $1 OFFSET $2
  `,[size,(n-1)*size]);
  const data=await Promise.all(result.rows.map(async row=>({...row,cover_image_display_url:row.cover_image_url?await imageService.displayUrl(row.cover_image_url):''})));
  return {data,pagination:{page:n,pageSize:size,total,totalPages:Math.ceil(total/size),hasNextPage:n*size<total,hasPreviousPage:n>1}};
}
async function save(payload,{id=null}={}){
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw inputError('Invalid project payload');
  if(id===null){
    const userId=integer(payload.businessUserId);
    if(!userId)throw inputError('Select the business that completed this work');
    const business=(await pool.query(`
      SELECT bp.id FROM business_profiles bp JOIN users u ON u.id=bp.user_id
      WHERE u.id=$1 AND u.role='business' LIMIT 1
    `,[userId])).rows[0];
    if(!business)throw inputError('The selected business profile is unavailable','BUSINESS_PROFILE_NOT_FOUND');
    const item=normalized(payload);
    validateStorageOwnership(userId,item);
    const result=await pool.query(`
      INSERT INTO business_profile_projects
      (business_profile_id,title,project_type,description,location_text,completion_year,area_text,
       budget_text,cover_image_url,image_urls,package_name,video_url,plan_url,is_published,published_at,sort_order)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,CASE WHEN $14 THEN CURRENT_TIMESTAMP ELSE NULL END,0)
      RETURNING id,is_published
    `,[business.id,item.title,item.projectType,item.description,item.locationText,item.completionYear,item.areaText,
      item.budgetText,item.coverImageUrl,JSON.stringify(item.imageUrls),item.packageName,item.videoUrl,item.planUrl,item.isPublished]);
    return result.rows[0];
  }
  const projectId=integer(id);
  if(!projectId)throw inputError('Invalid project ID');
  const current=(await pool.query('SELECT * FROM business_profile_projects WHERE id=$1',[projectId])).rows[0];
  if(!current)throw inputError('Project not found','COMPLETED_PROJECT_NOT_FOUND');
  const item=normalized(payload,current);
  const owner=(await pool.query('SELECT user_id FROM business_profiles WHERE id=$1',[current.business_profile_id])).rows[0];
  if(!owner)throw inputError('Business profile unavailable','BUSINESS_PROFILE_NOT_FOUND');
  validateStorageOwnership(owner.user_id,item);
  const result=await pool.query(`
    UPDATE business_profile_projects SET
      title=$2,project_type=$3,description=$4,location_text=$5,completion_year=$6,area_text=$7,
      budget_text=$8,cover_image_url=$9,image_urls=$10::jsonb,package_name=$11,video_url=$12,
      plan_url=$13,is_published=$14,
      published_at=CASE WHEN $14 THEN COALESCE(published_at,CURRENT_TIMESTAMP) ELSE NULL END,
      updated_at=CURRENT_TIMESTAMP
    WHERE id=$1 RETURNING id,is_published
  `,[projectId,item.title,item.projectType,item.description,item.locationText,item.completionYear,item.areaText,
    item.budgetText,item.coverImageUrl,JSON.stringify(item.imageUrls),item.packageName,item.videoUrl,item.planUrl,item.isPublished]);
  return result.rows[0];
}
module.exports={list,save,uploadPhoto};
