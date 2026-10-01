const pool = require('../config/database');
const expertDirectoryService = require('./expertDirectoryService');
const projectVideoService = require('./projectVideoService');

function profileError(message,code='INVALID_PROFILE_SELECTION'){
  return Object.assign(new Error(message),{code});
}

function cleanText(value,max,label,{required=false}={}){
  const text=String(value??'').trim();
  if(required&&!text)throw profileError(`${label} is required`);
  if(text.length>max)throw profileError(`${label} must be ${max} characters or fewer`);
  return text||null;
}

function cleanUrl(value,label){
  const text=String(value??'').trim();
  if(!text)return null;
  if(text.length>2000)throw profileError(`${label} is too long`);
  if(text.startsWith('/uploads/'))return text;
  let parsed;
  try{parsed=new URL(text);}catch{throw profileError(`${label} must be a valid URL`);}
  if(!['http:','https:'].includes(parsed.protocol))throw profileError(`${label} must use http or https`);
  return text;
}

function normalizeProjects(projects){
  if(projects==null)return [];
  if(!Array.isArray(projects))throw profileError('Projects must be a list');
  if(projects.length>20)throw profileError('A maximum of 20 completed projects can be published');
  return projects.map((item,index)=>{
    const completionYear=item?.completionYear==null||item.completionYear===''?null:Number(item.completionYear);
    if(completionYear!==null&&(!Number.isInteger(completionYear)||completionYear<1950||completionYear>2200))throw profileError('Project completion year is invalid');
    return {
      id:Number.isInteger(Number(item?.id))&&Number(item.id)>0?Number(item.id):null,
      title:cleanText(item?.title,180,'Project title',{required:true}),
      projectType:cleanText(item?.projectType,120,'Project type'),
      description:cleanText(item?.description,3000,'Project description'),
      locationText:cleanText(item?.locationText,180,'Project location'),
      completionYear,
      areaText:cleanText(item?.areaText,120,'Project area'),
      budgetText:cleanText(item?.budgetText,120,'Project budget'),
      coverImageUrl:cleanUrl(item?.coverImageUrl,'Project image'),
      videoUrl:cleanUrl(item?.videoUrl,'Project video'),
      planUrl:cleanUrl(item?.planUrl,'Project plan'),
      sortOrder:index,
      isPublished:item?.isPublished!==false,
    };
  });
}

function normalizePlans(plans){
  if(plans==null)return [];
  if(!Array.isArray(plans))throw profileError('Service plans must be a list');
  if(plans.length>10)throw profileError('A maximum of 10 service plans can be published');
  return plans.map((item,index)=>{
    const rawPrice=item?.priceFrom;
    const priceFrom=rawPrice==null||rawPrice===''?null:Number(rawPrice);
    if(priceFrom!==null&&(!Number.isFinite(priceFrom)||priceFrom<0||priceFrom>1000000000))throw profileError('Plan starting price is invalid');
    const inclusions=Array.isArray(item?.inclusions)
      ? item.inclusions.map(value=>cleanText(value,160,'Plan inclusion')).filter(Boolean)
      : String(item?.inclusions||'').split('\n').map(value=>cleanText(value,160,'Plan inclusion')).filter(Boolean);
    if(inclusions.length>20)throw profileError('Each plan can contain at most 20 inclusions');
    return {
      title:cleanText(item?.title,160,'Plan title',{required:true}),
      description:cleanText(item?.description,2000,'Plan description'),
      priceFrom,
      durationLabel:cleanText(item?.durationLabel,120,'Plan duration'),
      inclusions,
      sortOrder:index,
      isPublished:item?.isPublished!==false,
    };
  });
}

async function getProfile(userId, client = pool) {
  const profileResult = await client.query(
    `SELECT id, phone, business_name, business_details, public_headline, public_summary,
            years_experience, public_profile_enabled
     FROM business_profiles WHERE user_id = $1`,
    [userId]
  );
  const profile = profileResult.rows[0];
  if (!profile) return null;

  const [services, locations, companyProofs, projects, plans, directoryStatus] = await Promise.all([
    client.query(
      `SELECT bps.id, bps.industry_id, i.name AS industry_name,
              bps.service_id, s.name AS service_name,
              bps.subservice_id, ss.name AS subservice_name
       FROM business_profile_services bps
       JOIN industries i ON i.id = bps.industry_id
       JOIN services s ON s.id = bps.service_id
       LEFT JOIN subservices ss ON ss.id = bps.subservice_id
       WHERE bps.business_profile_id = $1 AND bps.is_active = TRUE
       ORDER BY i.name, s.name, ss.name`, [profile.id]
    ),
    client.query(
      `SELECT bpl.id, bpl.state_id, st.name AS state_name,
              bpl.city_id, c.name AS city_name, bpl.subcity_id, sc.name AS subcity_name, bpl.pincode
       FROM business_profile_locations bpl
       JOIN states st ON st.id = bpl.state_id
       JOIN cities c ON c.id = bpl.city_id
       LEFT JOIN subcities sc ON sc.id = bpl.subcity_id
       WHERE bpl.business_profile_id = $1 AND bpl.is_active = TRUE
       ORDER BY st.name, c.name`, [profile.id]
    ),
    client.query(
      `SELECT id, original_name, mime_type, file_size, file_url, status, created_at
       FROM company_proof_documents
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC`, [userId]
    ),
    client.query(
      `SELECT id,title,project_type,description,location_text,completion_year,area_text,budget_text,
              cover_image_url,video_url,video_published_at,plan_url,sort_order,is_published
       FROM business_profile_projects
       WHERE business_profile_id=$1
       ORDER BY sort_order,id`, [profile.id]
    ),
    client.query(
      `SELECT id,title,description,price_from,duration_label,inclusions,sort_order,is_published
       FROM business_profile_service_plans
       WHERE business_profile_id=$1
       ORDER BY sort_order,id`, [profile.id]
    ),
    expertDirectoryService.getUserDirectoryStatus(userId,client),
  ]);

  return {
    ...profile,
    services: services.rows,
    locations: locations.rows,
    company_proofs: companyProofs.rows,
    projects: projects.rows,
    service_plans: plans.rows,
    directory_status: directoryStatus,
  };
}

async function validateSelections(client, services, locations) {
  if (!Array.isArray(services) || !services.length) throw profileError('At least one service is required');
  if (!Array.isArray(locations) || !locations.length) throw profileError('At least one location is required');

  const normalizedServices=services.map(item=>{
    const industryId=Number(item?.industryId);
    const serviceId=Number(item?.serviceId);
    const subserviceId=item?.subserviceId==null||item.subserviceId===''?null:Number(item.subserviceId);
    if(!Number.isInteger(industryId)||industryId<=0||!Number.isInteger(serviceId)||serviceId<=0||(subserviceId!==null&&(!Number.isInteger(subserviceId)||subserviceId<=0))){
      throw profileError('Every service needs a valid industry and service');
    }
    return{industryId,serviceId,subserviceId};
  });
  const serviceKeys=new Set(normalizedServices.map(x=>`${x.industryId}:${x.serviceId}:${x.subserviceId||''}`));
  if(serviceKeys.size!==normalizedServices.length)throw profileError('Duplicate service selections are not allowed');

  const normalizedLocations=locations.map(item=>{
    const stateId=Number(item?.stateId);
    const cityId=Number(item?.cityId);
    const subcityId=item?.subcityId==null||item.subcityId===''?null:Number(item.subcityId);
    const pincode=item?.pincode==null||item.pincode===''?null:String(item.pincode).trim();
    if(!Number.isInteger(stateId)||stateId<=0||!Number.isInteger(cityId)||cityId<=0||(subcityId!==null&&(!Number.isInteger(subcityId)||subcityId<=0))){
      throw profileError('Every location needs a valid state and city');
    }
    if(pincode&&!/^\d{6}$/.test(pincode))throw profileError('Pincode must be a valid 6-digit code');
    return{stateId,cityId,subcityId,pincode};
  });
  const locationKeys=new Set(normalizedLocations.map(x=>`${x.stateId}:${x.cityId}:${x.subcityId||''}:${x.pincode||''}`));
  if(locationKeys.size!==normalizedLocations.length)throw profileError('Duplicate locations are not allowed');

  const [serviceResult,locationResult]=await Promise.all([
    client.query(`
      WITH requested AS (
        SELECT * FROM UNNEST($1::int[],$2::int[],$3::int[]) AS x(industry_id,service_id,subservice_id)
      )
      SELECT COUNT(*)::int valid_count
      FROM requested r
      JOIN services s ON s.id=r.service_id AND s.industry_id=r.industry_id AND s.is_active=TRUE
      LEFT JOIN subservices ss ON ss.id=r.subservice_id AND ss.service_id=r.service_id AND ss.is_active=TRUE
      WHERE r.subservice_id IS NULL OR ss.id IS NOT NULL
    `,[normalizedServices.map(x=>x.industryId),normalizedServices.map(x=>x.serviceId),normalizedServices.map(x=>x.subserviceId)]),
    client.query(`
      WITH requested AS (
        SELECT * FROM UNNEST($1::int[],$2::int[],$3::int[]) AS x(state_id,city_id,subcity_id)
      )
      SELECT COUNT(*)::int valid_count
      FROM requested r
      JOIN states st ON st.id=r.state_id AND st.is_active=TRUE
      JOIN cities c ON c.id=r.city_id AND c.state_id=r.state_id AND c.is_active=TRUE
      LEFT JOIN subcities sc ON sc.id=r.subcity_id AND sc.city_id=r.city_id AND sc.is_active=TRUE
      WHERE r.subcity_id IS NULL OR sc.id IS NOT NULL
    `,[normalizedLocations.map(x=>x.stateId),normalizedLocations.map(x=>x.cityId),normalizedLocations.map(x=>x.subcityId)])
  ]);

  if(Number(serviceResult.rows[0]?.valid_count||0)!==normalizedServices.length)throw profileError('Invalid industry, service or subservice selection');
  if(Number(locationResult.rows[0]?.valid_count||0)!==normalizedLocations.length)throw profileError('Invalid state, city or subcity selection');

  const byCity=new Map();
  for(const location of normalizedLocations)byCity.set(`${location.stateId}:${location.cityId}`,location);
  return{services:normalizedServices,locations:[...byCity.values()]};
}

async function updateProfile(userId, payload) {
  const {
    name,email,phone,businessName,businessDetails,services,locations,
    publicHeadline,publicSummary,yearsExperience,publicProfileEnabled,projects,plans,
  }=payload||{};
  const normalizedProjects=normalizeProjects(projects);
  const normalizedPlans=normalizePlans(plans);
  const normalizedHeadline=cleanText(publicHeadline,180,'Public headline');
  const normalizedSummary=cleanText(publicSummary,3000,'Public summary');
  const normalizedYears=yearsExperience==null||yearsExperience===''?null:Number(yearsExperience);
  if(normalizedYears!==null&&(!Number.isInteger(normalizedYears)||normalizedYears<0||normalizedYears>100))throw profileError('Years of experience must be between 0 and 100');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query(
      `UPDATE users SET name = $1, email = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND is_active = TRUE RETURNING id, name, email, role`,
      [name.trim(), email.trim().toLowerCase(), userId]
    );
    if (!user.rows.length) throw profileError('Account not found','PROFILE_ACCOUNT_NOT_FOUND');

    const validatedSelections=await validateSelections(client, services, locations);
    const profile = await client.query(
      `UPDATE business_profiles
       SET phone=$1,business_name=$2,business_details=$3,public_headline=$4,public_summary=$5,
           years_experience=$6,public_profile_enabled=$7,updated_at=CURRENT_TIMESTAMP
       WHERE user_id=$8 RETURNING id`,
      [phone.trim(),businessName.trim(),businessDetails.trim(),normalizedHeadline,normalizedSummary,normalizedYears,publicProfileEnabled!==false,userId]
    );
    if (!profile.rows.length) throw profileError('Business profile not found','PROFILE_NOT_FOUND');

    const profileId = profile.rows[0].id;
    const existingProjects=(await client.query(
      'SELECT id,video_url,video_published_at FROM business_profile_projects WHERE business_profile_id=$1',
      [profileId]
    )).rows;
    const existingById=new Map(existingProjects.map(item=>[Number(item.id),item]));
    const projectsForSave=normalizedProjects.map(item=>{
      let videoPublishedAt=null;
      if(item.videoUrl){
        if(item.videoUrl.startsWith('/uploads/')&&!item.videoUrl.startsWith('/uploads/business-projects/')){
          throw profileError('Uploaded project video URL is invalid');
        }
        const managed=projectVideoService.managedVideoInfo(userId,item.videoUrl);
        if(managed) videoPublishedAt=managed.uploadedAt;
        else{
          const previous=item.id?existingById.get(item.id):null;
          videoPublishedAt=previous&&previous.video_url===item.videoUrl&&previous.video_published_at
            ? previous.video_published_at
            : new Date();
        }
      }
      return {...item,videoPublishedAt};
    });
    const currentManagedUrls=new Set(projectsForSave.map(item=>item.videoUrl).filter(url=>String(url||'').startsWith('/uploads/business-projects/')));
    const removedManagedUrls=existingProjects
      .map(item=>item.video_url)
      .filter(url=>String(url||'').startsWith('/uploads/business-projects/')&&!currentManagedUrls.has(url));
    await client.query('UPDATE business_profile_services SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE business_profile_id = $1', [profileId]);
    await client.query(`
      INSERT INTO business_profile_services (business_profile_id,industry_id,service_id,subservice_id,is_active)
      SELECT $1,x.industry_id,x.service_id,x.subservice_id,TRUE
      FROM UNNEST($2::int[],$3::int[],$4::int[]) AS x(industry_id,service_id,subservice_id)
      ON CONFLICT (business_profile_id,industry_id,service_id,subservice_id)
      DO UPDATE SET is_active=TRUE,updated_at=CURRENT_TIMESTAMP
    `,[profileId,validatedSelections.services.map(x=>x.industryId),validatedSelections.services.map(x=>x.serviceId),validatedSelections.services.map(x=>x.subserviceId)]);

    await client.query('UPDATE business_profile_locations SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE business_profile_id = $1', [profileId]);
    await client.query(`
      INSERT INTO business_profile_locations (business_profile_id,state_id,city_id,subcity_id,pincode,is_active)
      SELECT $1,x.state_id,x.city_id,x.subcity_id,x.pincode,TRUE
      FROM UNNEST($2::int[],$3::int[],$4::int[],$5::text[]) AS x(state_id,city_id,subcity_id,pincode)
      ON CONFLICT (business_profile_id,state_id,city_id)
      DO UPDATE SET subcity_id=EXCLUDED.subcity_id,pincode=EXCLUDED.pincode,is_active=TRUE,updated_at=CURRENT_TIMESTAMP
    `,[profileId,validatedSelections.locations.map(x=>x.stateId),validatedSelections.locations.map(x=>x.cityId),validatedSelections.locations.map(x=>x.subcityId),validatedSelections.locations.map(x=>x.pincode)]);

    await client.query('DELETE FROM business_profile_projects WHERE business_profile_id=$1',[profileId]);
    if(projectsForSave.length){
      await client.query(`
        INSERT INTO business_profile_projects
          (business_profile_id,title,project_type,description,location_text,completion_year,area_text,budget_text,cover_image_url,video_url,video_published_at,plan_url,sort_order,is_published)
        SELECT $1,x.title,x.project_type,x.description,x.location_text,x.completion_year,x.area_text,x.budget_text,x.cover_image_url,x.video_url,x.video_published_at,x.plan_url,x.sort_order,x.is_published
        FROM jsonb_to_recordset($2::jsonb) AS x(
          title text,project_type text,description text,location_text text,completion_year int,area_text text,budget_text text,
          cover_image_url text,video_url text,video_published_at timestamp,plan_url text,sort_order int,is_published boolean
        )
      `,[profileId,JSON.stringify(projectsForSave.map(item=>({
        title:item.title,project_type:item.projectType,description:item.description,location_text:item.locationText,
        completion_year:item.completionYear,area_text:item.areaText,budget_text:item.budgetText,cover_image_url:item.coverImageUrl,
        video_url:item.videoUrl,video_published_at:item.videoPublishedAt?new Date(item.videoPublishedAt).toISOString():null,plan_url:item.planUrl,sort_order:item.sortOrder,is_published:item.isPublished,
      })))]);
    }

    await client.query('DELETE FROM business_profile_service_plans WHERE business_profile_id=$1',[profileId]);
    if(normalizedPlans.length){
      await client.query(`
        INSERT INTO business_profile_service_plans
          (business_profile_id,title,description,price_from,duration_label,inclusions,sort_order,is_published)
        SELECT $1,x.title,x.description,x.price_from,x.duration_label,x.inclusions,x.sort_order,x.is_published
        FROM jsonb_to_recordset($2::jsonb) AS x(
          title text,description text,price_from numeric,duration_label text,inclusions jsonb,sort_order int,is_published boolean
        )
      `,[profileId,JSON.stringify(normalizedPlans.map(item=>({
        title:item.title,description:item.description,price_from:item.priceFrom,duration_label:item.durationLabel,
        inclusions:item.inclusions,sort_order:item.sortOrder,is_published:item.isPublished,
      })))]);
    }

    const result = await getProfile(userId, client);
    await client.query('COMMIT');
    projectVideoService.removeManagedProjectVideos(userId,removedManagedUrls)
      .catch(error=>console.error('Remove unused project video failed:',error?.message||error));
    return { user: { ...user.rows[0], profile: result } };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { getProfile, updateProfile, validateSelections, normalizeProjects, normalizePlans };