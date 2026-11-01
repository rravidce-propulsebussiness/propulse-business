#!/usr/bin/env node
'use strict';
// Public-only indexing-readiness audit. Never requires private Supabase/R2 credentials.
// Passing this check is NOT a claim that Google has crawled or indexed a URL.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

const DEFAULT_BASE='https://propulsetechnologies.online';
const MAX_VIDEO_CHECKS=25;
const escXml=text=>String(text??'').replaceAll('&amp;','&').replaceAll('&lt;','<')
  .replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&apos;',"'");
const tag=(xml,name)=>{
  const match=xml.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'));
  return match?escXml(match[1].trim()):null;
};
function parseVideoEntries(xml,base){
  assert(xml.includes('xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"'),
    'Video sitemap has no Google video namespace');
  assert(!xml.includes('private-object-s3:'),'Raw private R2 references leaked in sitemap');
  const entries=[];
  for(const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)){
    const block=match[1];
    if(!block.includes('<video:video>'))continue;
    const entry={
      watch:tag(block,'loc'),thumbnail:tag(block,'video:thumbnail_loc'),
      video:tag(block,'video:content_loc'),title:tag(block,'video:title'),
      description:tag(block,'video:description'),uploaded:tag(block,'video:publication_date'),
      duration:tag(block,'video:duration')
    };
    assert(entry.watch&&entry.thumbnail&&entry.video&&entry.title&&entry.description&&entry.uploaded,
      'Video sitemap entry missing required video metadata');
    for(const [name,value,pattern] of [
      ['watch',entry.watch,/^\/projects\/[a-z0-9-]+$/],
      ['thumbnail',entry.thumbnail,/^\/project-video-thumbnail\/[a-z0-9-]+$/],
      ['video',entry.video,/^\/project-video-stream\/[a-z0-9-]+\.mp4$/],
    ]){
      const uri=new URL(value);
      assert.equal(uri.origin,base.origin,name+' must use the public ProPulse origin');
      assert(pattern.test(uri.pathname),name+' path does not match expected public route');
    }
    assert(!Number.isNaN(Date.parse(entry.uploaded)),'Publication date must be parseable');
    if(entry.duration)assert(Number.isSafeInteger(Number(entry.duration))&&+entry.duration>0,
      'Duration must be positive whole seconds');
    entries.push(entry);
  }
  const seen=new Set();
  for(const entry of entries){
    assert(!seen.has(entry.watch),'Duplicate video watch URL in sitemap: '+entry.watch);
    seen.add(entry.watch);
  }
  return entries;
}
function extractVideoObject(html){
  const scripts=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for(const [,raw] of scripts){
    let payload;
    try{payload=JSON.parse(raw)}catch{continue}
    const graph=payload['@graph']||[payload];
    const item=graph.find?.(object=>object?.['@type']==='VideoObject');
    if(item)return item;
  }
  return null;
}
async function fetchAudit(url,{redirect='manual',headers={},timeout=18000}={}){
  let result,lastError;
  for(let attempt=0;attempt<3;attempt++){
    try{
      result=await fetch(url,{
        redirect,signal:AbortSignal.timeout(timeout),
        headers:{'User-Agent':'ProPulseVideoSEOAudit/1.0 (+https://propulsetechnologies.online/robots.txt)',...headers}
      });
      if(![502,503,504].includes(result.status))return result;
      await result.body?.cancel();
    }catch(err){lastError=err}
    if(attempt<2)await new Promise(resolve=>setTimeout(resolve,(attempt+1)*1200));
  }
  if(result)return result;
  throw lastError||new Error('Repeated HTTP request failures');
}
async function checkEntry(entry){
  const watch=await fetchAudit(entry.watch,{headers:{accept:'text/html'}});
  assert.equal(watch.status,200,'Watch page must be HTTP 200');
  assert.match(String(watch.headers.get('content-type')||''),/text\/html/i);
  const html=await watch.text();
  assert(html.includes('data-seo-project-fallback="true"'),'Watch page has no server-rendered project content');
  assert(html.includes('data-propulse-project-seo="server"'),'Watch page has no server-authored schema');
  assert(html.includes('<video controls playsinline'),'Video must be visibly embedded in initial HTML');
  assert(html.includes('href="'+entry.watch+'"'),'Canonical must match video sitemap watch URL');
  assert(!html.includes('private-object-s3:'),'Watch page leaked private object references');
  const video=extractVideoObject(html);
  assert(video,'Watch page needs VideoObject JSON-LD');
  assert.equal(video.thumbnailUrl,entry.thumbnail,'VideoObject thumbnail must match sitemap');
  assert.equal(video.contentUrl,entry.video,'VideoObject playback URL must match sitemap');
  assert.equal(video.name,entry.title,'Video title must match schema');
  assert.equal(video.uploadDate,entry.uploaded,'Publication date must match schema');
  const poster=new URL(entry.thumbnail);
  const image=await fetchAudit(entry.thumbnail,{headers:{accept:'image/jpeg'},timeout:23000});
  assert.equal(image.status,200,'Generated thumbnail must be HTTP 200');
  assert.match(String(image.headers.get('content-type')||''),/image\/jpeg/i);
  const jpg=Buffer.from(await image.arrayBuffer());
  assert(jpg.length>1024&&jpg[0]===255&&jpg[1]===216&&jpg[2]===255,
    'Generated video poster is not a valid JPEG header');

  const redirect=await fetchAudit(entry.video,{headers:{accept:'video/mp4'}});
  assert.equal(redirect.status,302,'Playback must redirect to a processed video');
  const location=redirect.headers.get('location');
  assert(location,'Video redirect is missing');
  const target=new URL(location);
  assert.equal(target.protocol,'https:','Video playback redirect must use HTTPS');
  assert(target.pathname.includes('business-project-redacted/'),
    'Video redirect points somewhere other than the processed playback derivative');
  assert(!target.pathname.includes('/business-projects/'),
    'Video redirect must not expose original uploads');
  // Fetch only a small byte range from the signed derivative, to confirm
  // that an unauthenticated crawler can actually get MP4 bytes.
  const videoResponse=await fetchAudit(target.toString(),{
    headers:{Range:'bytes=0-1023',accept:'video/mp4'},timeout:24000
  });
  assert([200,206].includes(videoResponse.status),'Signed playback object must permit unauthenticated bytes');
  const type=videoResponse.headers.get('content-type')||'';
  assert(/video\/mp4|application\/octet-stream/i.test(type),
    'Playback bytes must have an MP4-compatible content type');
  await videoResponse.body?.cancel();
  return {watch:entry.watch,thumbnail:poster.pathname,video:'public playback accessible',status:'pass'};
}
async function audit({origin=DEFAULT_BASE,limit=MAX_VIDEO_CHECKS}={}){
  const base=new URL(origin);
  assert(base.protocol==='https:'||base.hostname==='localhost','Audit requires HTTPS except localhost');
  const hardLimit=Math.min(MAX_VIDEO_CHECKS,Math.max(1,Number(limit)||MAX_VIDEO_CHECKS));
  const date=new Date().toISOString();
  const report={date,site:base.origin,status:'pass',totalVideos:0,checked:0,
    sampleLimit:hardLimit,entries:[],warnings:[],errors:[]};
  try{
    const robots=await fetchAudit(new URL('/robots.txt',base));
    assert.equal(robots.status,200,'robots.txt must be publicly accessible');
    assert((await robots.text()).includes('Sitemap: '+base.origin+'/video-sitemap.xml'),
      'robots.txt must advertise video sitemap');
    const res=await fetchAudit(new URL('/video-sitemap.xml',base));
    assert.equal(res.status,200,'Video sitemap must be publicly accessible');
    assert.match(String(res.headers.get('content-type')||''),/xml/i);
    const xml=await res.text();
    const entries=parseVideoEntries(xml,base);
    report.totalVideos=entries.length;
    if(!entries.length)report.warnings.push('No eligible videos in sitemap (verify publication settings)');
    // Always check the newest video and cycle over older entries across days,
    // making all projects eligible for sampling without a high bandwidth cost.
    const count=Math.min(hardLimit,entries.length);
    const selected=entries.length<=count?entries:(()=>{
      const day=Math.floor(Date.now()/86400000);
      const offsets=[0];
      for(let i=1;offsets.length<count&&i<=entries.length;i++){
        const index=1+((day*Math.max(1,count-1)+i-1)%(entries.length-1));
        if(!offsets.includes(index))offsets.push(index);
      }
      return offsets.map(index=>entries[index]);
    })();
    for(const entry of selected){
      try{
        report.entries.push(await checkEntry(entry));
      }catch(error){
        report.entries.push({watch:entry.watch,status:'fail',error:String(error?.message||error).slice(0,400)});
        report.errors.push({watch:entry.watch,error:String(error?.message||error).slice(0,400)});
      }
      report.checked++;
    }
  }catch(error){
    report.errors.push({watch:null,error:String(error?.message||error).slice(0,400)});
  }
  report.status=report.errors.length?'fail':'pass';
  return report;
}
async function main(){
  const output=process.env.AUDIT_REPORT_PATH||path.resolve(process.cwd(),'video-seo-audit.json');
  const report=await audit({origin:process.env.AUDIT_BASE_URL||DEFAULT_BASE,limit:process.env.AUDIT_VIDEO_LIMIT});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,totalVideos:report.totalVideos,
    checked:report.checked,errors:report.errors,warnings:report.warnings},null,2));
  if(process.env.GITHUB_STEP_SUMMARY){
    const rows=[
      '## ProPulse public video SEO health',
      '| Metric | Value |','|---|---|',
      '| Result | '+report.status+' |',
      '| Sitemap videos | '+report.totalVideos+' |',
      '| Sampled videos | '+report.checked+' |',
      '| Failures | '+report.errors.length+' |',
      ...report.errors.map(e=>'- '+(e.watch||'Site')+': '+e.error.replaceAll('|','/')),
    ];
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,rows.join('\n')+'\n');
  }
  if(report.errors.length)process.exitCode=1;
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1});
module.exports={parseVideoEntries,extractVideoObject,audit};
