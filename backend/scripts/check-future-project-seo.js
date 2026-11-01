'use strict';
const assert=require('node:assert/strict');
const {projectSeoTitle,projectSeoDescription}=require('../src/services/projectSeoDefaults');
const {renderProjectHtml}=require('../src/services/projectSeoPageService');
const pool=require('../src/config/database');
const admin=require('../src/services/adminCompletedProjectService');
const videoService=require('../src/services/projectVideoService');

const project={
  project_id:44,title:'Completed 3BHK Apartment Interiors',project_type:'Interior Design',
  location_text:'Uppal, Hyderabad',completion_year:2026,
  is_official:true,business_name:'ProPulse'
};
assert.equal(projectSeoTitle(project),'Completed 3BHK Apartment Interiors in Uppal, Hyderabad');
const generated=projectSeoDescription(project);
assert(generated.includes('Uppal, Hyderabad'),'Location should be discoverable without manual metadata');
assert(!/modular kitchen|premium|warranty|five.star/i.test(generated),'Do not fabricate project features');
assert.equal(projectSeoTitle({...project,seo_title:'Custom title'}),'Custom title');
assert.equal(projectSeoDescription({...project,seo_description:'Custom factual description'}),'Custom factual description');
assert.equal(projectSeoTitle({...project,title:'3BHK apartment interiors in Uppal, Hyderabad'}),
  '3BHK apartment interiors in Uppal, Hyderabad','Do not repeat an existing locality');
const htmlTemplate='<html><head><title>Home</title></head><body><div id="root"></div></body></html>';
const html=renderProjectHtml(htmlTemplate,project).html;
assert(html.includes('<title>Completed 3BHK Apartment Interiors in Uppal, Hyderabad | ProPulse</title>'));
assert(html.includes('data-seo-project-fallback="true"'));
assert(html.includes('data-propulse-project-seo="server"'));
assert(html.includes('name="description" content="'+generated+'"'));
assert(!html.includes('private-object-s3:'));

const originalQuery=pool.query;
const originalInfo=videoService.managedVideoInfo;
const video='private-object-s3:business-projects/7-1762000000000-aaaaaaaaaaaaaaaaaaaaaaaa.mp4';
const calls=[];
pool.query=async(sql,params=[])=>{
  calls.push(sql);
  if(sql.includes('SELECT bp.id FROM business_profiles'))return {rows:[{id:12}]};
  if(sql.includes('COUNT(*)::int AS count FROM business_profile_projects'))return {rows:[{count:0}]};
  if(sql.includes('INSERT INTO business_profile_projects'))return {rows:[{id:44,is_published:true}]};
  throw new Error('Unexpected SQL in auto-SEO test: '+sql.slice(0,120));
};
videoService.managedVideoInfo=()=>({key:'business-projects/example.mp4'});
(async()=>{
  try{
    const saved=await admin.save({
      businessUserId:7,title:project.title,projectType:project.project_type,
      locationText:project.location_text,completionYear:2026,
      videoUrl:video,isPublished:true
    });
    assert.equal(saved.is_published,true,'Real video-only projects must publish without mandatory photos');
    assert(calls.some(sql=>sql.includes('INSERT INTO business_profile_projects')));
    await assert.rejects(()=>admin.save({
      businessUserId:7,title:project.title,projectType:project.project_type,
      locationText:project.location_text,completionYear:2026,isPublished:true
    }),/at least one real project video or photo/,'Media-free projects may not claim completed work');
    console.log('Automatic factual SEO, server HTML and video-only admin publication verified.');
  }finally{
    pool.query=originalQuery;
    videoService.managedVideoInfo=originalInfo;
    await pool.end();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
