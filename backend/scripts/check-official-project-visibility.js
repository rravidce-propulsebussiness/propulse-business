const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../..',p),'utf8');

const serviceSource=read('backend/src/services/publicExpertService.js');
const details=read('frontend/src/pages/ProjectDetail.jsx');
const quoteUi=read('frontend/src/pages/ProjectQuote.jsx');
const listing=read('frontend/src/pages/Projects.jsx');
const quoteService=read('backend/src/services/professionalProjectQuoteService.js');
const callbackService=read('backend/src/services/projectCallbackService.js');
const seoRoutes=read('backend/src/routes/seoRoutes.js');
assert.match(serviceSource,/function addProjectEligibilityConditions/);
assert.match(serviceSource,/COALESCE\(beds\.is_official,FALSE\)=TRUE OR/);
assert.match(serviceSource,/COALESCE\(beds\.is_hidden,FALSE\)=FALSE/);
assert.match(serviceSource,/bpp\.is_published=TRUE/);
assert.match(serviceSource,/bpp\.completion_year BETWEEN 1950 AND EXTRACT\(YEAR FROM CURRENT_DATE\)/);
assert.match(serviceSource,/addProjectEligibilityConditions\(settings,params,conditions,\{videosOnly:true\}\)/);
assert.match(serviceSource,/publicProjectVideoColumn\('bpp',!settings\.showVideos\)/);
assert.match(serviceSource,/listIndexableProjectPaths/);
assert.match(seoRoutes,/publicExpertService\.listIndexableProjectPaths\(\)/);
assert.match(seoRoutes,/<lastmod>/);
assert.match(details,/project\.official\?[^\n]*to="\/contact#direct-project"/);
assert.match(quoteUi,/project\?\.official\)return <Navigate to="\/contact#direct-project" replace\/>/);
assert.match(listing,/project\.official/);
for(const source of [quoteService,callbackService]){
  assert.match(source,/NOT EXISTS \([\s\S]*?business_expert_directory_settings official/);
  assert.match(source,/official\.is_official=TRUE/);
}

const pool=require('../src/config/database');
const directory=require('../src/services/expertDirectoryService');
const publicExpert=require('../src/services/publicExpertService');
const queryOriginal=pool.query;
const settingsOriginal=directory.getSettings;
const calls=[];
const settings={
  directoryEnabled:false,showProjects:false,showVideos:false,showPlans:false,
  requireVerified:true,requireActiveMembership:true,allowedPlanGroups:['grow','scale']
};
directory.getSettings=async()=>settings;
pool.query=async(sql,params=[])=>{
  calls.push({sql,params});
  if(sql.includes('COUNT(*)::int AS total'))return{rows:[{total:1}]};
  if(sql.includes('SELECT bpp.id,bpp.seo_slug,bpp.updated_at'))return{rows:[{
    id:3,seo_slug:'modern-3bhk-interior-design-in-uppal',updated_at:'2026-10-31T00:00:00Z'
  }]};
  return{rows:[{project_id:3,id:3,seo_slug:'modern-3bhk-interior-design-in-uppal',
    title:'Completed ProPulse 3BHK Interior',business_name:'Propulse Constructions and Interiors',
    is_official:true,image_urls:[],video_url:null,cover_image_url:null,plan_url:null,brochure_url:null}]};
};
(async()=>{
  try{
    const projects=await publicExpert.listRecentProjects({page:1,pageSize:5});
    assert.equal(projects.data.length,1,'An official published project stays visible even with marketplace directory disabled');
    assert.equal(projects.data[0].is_official,true);
    assert.equal(projects.pagination.total,1);
    const project=await publicExpert.getPublicProject('modern-3bhk-interior-design-in-uppal');
    assert.equal(project.is_official,true);
    const videos=await publicExpert.listRecentProjectVideos({page:1,pageSize:5});
    assert.equal(videos.data.length,1,'Official video listing ignores marketplace showVideos toggle');
    const paths=await publicExpert.listIndexableProjectPaths();
    assert.equal(paths[0].path,'/projects/modern-3bhk-interior-design-in-uppal');
    assert.equal(paths[0].lastmod,'2026-10-31');
    for(const {sql} of calls){
      assert.match(sql,/COALESCE\(beds\.is_official,FALSE\)=TRUE/,'Every public query needs official-project eligibility');
      assert.match(sql,/COALESCE\(beds\.is_hidden,FALSE\)=FALSE/,'Admin hide controls must still apply');
      assert.match(sql,/bpp\.is_published=TRUE/,'Drafts must never be published');
      assert.doesNotMatch(sql,/video_reward_status='approved'/,'Reward approval must not gate publication');
    }
    console.log('Official ProPulse project listing, direct CTA isolation and sitemap checks passed.');
  }finally{
    pool.query=queryOriginal;
    directory.getSettings=settingsOriginal;
    await pool.end();
  }
})().catch(err=>{console.error(err);process.exitCode=1});
