const s3=require('./s3PrivateObjectStorageService');
const SITE='https://propulsetechnologies.online';
const THUMB_PREFIX='business-project-thumbnails/';
const VIDEO_PREFIX='business-project-redacted/';
const projectKey=project=>{
  const slug=String(project?.seo_slug||'').trim();
  if(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)&&slug.length<=100)return slug;
  const id=Number(project?.project_id||project?.id);
  return Number.isSafeInteger(id)&&id>0?'project-'+id:null;
};
function thumbnailReference(project){
  if(!project?.video_url||!project.video_thumbnail_url)return null;
  // getPublicProject exposes only source-matched ready playback derivatives.
  const text=String(project.video_thumbnail_url);
  const key=s3.parseReference(text);
  if(!key||!key.startsWith(THUMB_PREFIX)||!/^business-project-thumbnails\/\d+-\d+-[a-f0-9]{32}\.jpg$/.test(key))return null;
  const expectedId=String(project.project_id||project.id);
  if(!key.match(new RegExp('^business-project-thumbnails/\\d+-'+expectedId+'-')))return null;
  return key;
}
function thumbnailPath(project){
  return projectKey(project)&&thumbnailReference(project)?'/project-video-thumbnail/'+projectKey(project):null;
}
function playbackReference(project){
  if(!project?.video_url)return null;
  const key=s3.parseReference(project.video_url);
  if(!key||!key.startsWith(VIDEO_PREFIX)||!/^business-project-redacted\/\d+-\d+-[a-f0-9]{32}\.mp4$/.test(key))return null;
  const expectedId=String(project.project_id||project.id);
  if(!key.match(new RegExp('^business-project-redacted/\\d+-'+expectedId+'-')))return null;
  return key;
}
function contentPath(project){
  return projectKey(project)&&playbackReference(project)?'/project-video-stream/'+projectKey(project)+'.mp4':null;
}
async function readThumbnail(project){
  const key=thumbnailReference(project);
  if(!key)return null;
  const result=await s3.getObjectBuffer(key,{maxBytes:4*1024*1024,timeoutMs:12000});
  const image=result.buffer;
  if(!Buffer.isBuffer(image)||image.length<1024||image.length>4*1024*1024
    ||image[0]!==255||image[1]!==216||image[2]!==255)
    throw new Error('Invalid video thumbnail JPEG');
  return image;
}
function videoObject(project){
  const image=thumbnailPath(project),stream=contentPath(project);
  if(!image||!stream)return null;
  const date=project.video_published_at||project.published_at;
  const parsed=date?new Date(date):null;
  if(!parsed||Number.isNaN(parsed.getTime()))return null;
  const title=String(project.seo_title||project.title||'Completed project video').trim();
  const description=String(project.seo_description||project.description||title).replace(/\s+/g,' ').trim().slice(0,500);
  const duration=Number(project.video_duration_seconds);
  return {
    '@type':'VideoObject',
    '@id':SITE+'/projects/'+projectKey(project)+'#video',
    name:title,description,
    thumbnailUrl:SITE+image,
    uploadDate:parsed.toISOString(),
    contentUrl:SITE+stream,
    creator:{'@type':'Organization',name:String(project.business_name||'ProPulse').trim()},
    ...(Number.isFinite(duration)&&duration>0?{duration:'PT'+Math.round(duration)+'S'}:{})
  };
}
module.exports={thumbnailReference,thumbnailPath,playbackReference,contentPath,readThumbnail,videoObject,projectKey};
