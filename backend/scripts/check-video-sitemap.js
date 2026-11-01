const assert=require('node:assert/strict');
const express=require('express');
const pool=require('../src/config/database');
const directory=require('../src/services/expertDirectoryService');
const experts=require('../src/services/publicExpertService');
const videoSeo=require('../src/services/projectVideoSeoService');

const originalQuery=pool.query;
const originalSettings=directory.getSettings;
const originalList=experts.listIndexableVideoEntries;
const rows=[
  {project_id:3,seo_slug:'modern-3bhk-interior-design-in-uppal',
   title:'Modern 3BHK Interior Design & Execution',seo_title:'Modern 3BHK in Uppal',
   description:'Real complete interior work & video',seo_description:'Kitchen, wardrobes & living interiors',
   video_url:'private-object-s3:business-project-redacted/7-3-'+'a'.repeat(32)+'.mp4',
   video_thumbnail_url:'private-object-s3:business-project-thumbnails/7-3-'+'b'.repeat(32)+'.jpg',
   video_duration_seconds:54,video_published_at:'2026-10-30T10:30:00Z',
   updated_at:'2026-10-31T00:00:00Z',business_name:'ProPulse'},
  {project_id:4,seo_slug:'hidden-other-video',title:'Hidden',
   video_url:'private-object-s3:business-project-redacted/7-4-'+'a'.repeat(32)+'.mp4',
   video_thumbnail_url:'private-object-s3:business-project-thumbnails/7-3-'+'b'.repeat(32)+'.jpg',
   video_published_at:'2026-10-30T10:30:00Z',updated_at:'2026-10-31T00:00:00Z'}
];
const queries=[];
directory.getSettings=async()=>({
  directoryEnabled:false,showProjects:false,showVideos:false,
  requireVerified:true,requireActiveMembership:true,allowedPlanGroups:['grow']
});
pool.query=async(sql,params=[])=>{queries.push({sql,params});return {rows}};
(async()=>{
  const videoEntries=await experts.listIndexableVideoEntries();
  assert.equal(videoEntries.length,1,'Only a source-valid thumbnail should be indexed');
  assert.equal(videoEntries[0].path,'/projects/modern-3bhk-interior-design-in-uppal');
  assert.equal(videoEntries[0].video['@type'],'VideoObject');
  assert.equal(videoEntries[0].video.duration,'PT54S');
  assert.equal(videoEntries[0].lastmod,'2026-10-31');
  assert.equal(queries.length,1);
  const query=queries[0].sql;
  for(const part of [
    'bpp.is_published=TRUE','bpp.completion_year BETWEEN 1950',
    "bpp.video_redaction_status='ready'",
    'bpp.video_redaction_source_url=bpp.video_url',
    'bpp.video_thumbnail_source_url=bpp.video_url',
    'COALESCE(beds.is_hidden,FALSE)=FALSE',
    'COALESCE(beds.is_official,FALSE)=TRUE OR',
  ])assert(query.includes(part),'Video sitemap must enforce '+part);
  assert(!query.includes('video_reward_status'),'Lead reward must not gate video indexing');

  experts.listIndexableVideoEntries=async()=>videoEntries;
  process.env.PUBLIC_APP_URL='https://propulsetechnologies.online';
  const seoRoutes=require('../src/routes/seoRoutes');
  const app=express();
  app.use(seoRoutes);
  const server=app.listen(0,'127.0.0.1');
  try{
    await new Promise((resolve,reject)=>{if(server.listening)resolve();else server.once('listening',resolve).once('error',reject)});
    const origin='http://127.0.0.1:'+server.address().port;
    const [robots,indexSitemap,sitemap]=await Promise.all([
      fetch(origin+'/robots.txt'),fetch(origin+'/sitemap.xml'),fetch(origin+'/video-sitemap.xml')
    ]);
    assert.equal(robots.status,200);
    const robotsText=await robots.text();
    assert.match(robotsText,/Sitemap: https:\/\/propulsetechnologies\.online\/sitemap\.xml/);
    assert.match(robotsText,/Sitemap: https:\/\/propulsetechnologies\.online\/video-sitemap\.xml/);
    assert.equal(indexSitemap.status,200,'Main sitemap must be publicly fetchable');
    assert.match(indexSitemap.headers.get('content-type'),/^application\/xml\s*;?\s*charset=utf-8/i,'Main sitemap must explicitly be served as XML, not HTML or plain text');
    const indexXml=await indexSitemap.text();
    assert.match(indexXml,/^<\?xml version="1\.0" encoding="UTF-8"\?>/,'Main sitemap must start with an XML declaration');
    assert.match(indexXml,/<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/,'Main sitemap must contain the standard sitemap urlset root');
    assert.match(indexXml,/<url><loc>https:\/\/propulsetechnologies\.online\//,'Main sitemap must contain canonical production URLs');
    assert.match(indexXml,/<\/urlset>\s*$/,'Main sitemap XML must close its urlset root');
    assert.equal(sitemap.status,200);
    assert.match(sitemap.headers.get('content-type'),/xml/);
    const xml=await sitemap.text();
    assert(xml.includes('xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"'));
    assert.match(xml,/<video:video>/);
    assert.match(xml,/<video:thumbnail_loc>https:\/\/propulsetechnologies\.online\/project-video-thumbnail\/modern-3bhk-interior-design-in-uppal<\/video:thumbnail_loc>/);
    assert.match(xml,/<video:title>Modern 3BHK in Uppal<\/video:title>/);
    assert.match(xml,/<video:description>Kitchen, wardrobes &amp; living interiors<\/video:description>/);
    assert.match(xml,/<video:content_loc>https:\/\/propulsetechnologies\.online\/project-video-stream\/modern-3bhk-interior-design-in-uppal\.mp4<\/video:content_loc>/);
    assert.match(xml,/<video:publication_date>2026-10-30T10:30:00\.000Z<\/video:publication_date>/);
    assert.match(xml,/<video:duration>54<\/video:duration>/);
    assert(!xml.includes('private-object-s3:'),'Private R2 references must never enter public sitemap');
    assert(!xml.includes('Hidden'),'Invalid project media must not be indexed');
    assert(!xml.includes('&#39;'),'Avoid unneeded XML escaping');
    assert(!xml.includes('\\n'),'XML must use newlines, not literal backslash-n sequences');
    experts.listIndexableVideoEntries=async()=>[];
    const empty=await fetch(origin+'/video-sitemap.xml');
    assert.equal(empty.status,200);
    assert(!(await empty.text()).includes('<video:video>'));
    experts.listIndexableVideoEntries=async()=>{throw new Error('simulated database outage')};
    const failed=await fetch(origin+'/video-sitemap.xml');
    assert.equal(failed.status,503,'Database outages must not produce misleading empty sitemaps');
    assert.match(failed.headers.get('cache-control'),/no-store/);
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
  console.log('Published project video sitemap, true thumbnail, XML escaping and failure behavior checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{
  pool.query=originalQuery;
  directory.getSettings=originalSettings;
  experts.listIndexableVideoEntries=originalList;
});
