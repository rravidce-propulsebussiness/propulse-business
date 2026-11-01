const assert=require('node:assert/strict');
const {parseVideoEntries,extractVideoObject,audit}=require('./audit-live-video-seo');
const base='https://propulsetechnologies.online';
const slug='modern-3bhk-interior-design-in-uppal';
const watch=base+'/projects/'+slug;
const poster=base+'/project-video-thumbnail/'+slug;
const playback=base+'/project-video-stream/'+slug+'.mp4';
const signed='https://r2.example.com/business-project-redacted/7-3-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.mp4?X-Amz-Signature=redacted';
const xml='<?xml version="1.0"?><urlset xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">'+
'<url><loc>'+watch+'</loc><video:video>'+
'<video:thumbnail_loc>'+poster+'</video:thumbnail_loc>'+
'<video:title>Modern 3BHK Interiors &amp; Design</video:title>'+
'<video:description>Completed genuine Uppal interiors</video:description>'+
'<video:content_loc>'+playback+'</video:content_loc>'+
'<video:publication_date>2026-10-30T10:30:00.000Z</video:publication_date>'+
'<video:duration>54</video:duration></video:video></url></urlset>';
const expected=parseVideoEntries(xml,new URL(base));
assert.equal(expected.length,1);
assert.equal(expected[0].title,'Modern 3BHK Interiors & Design');
assert.equal(expected[0].video,playback);
assert.throws(()=>parseVideoEntries(xml.replace('<video:content_loc>'+playback,'<video:content_loc>private-object-s3:business-projects/original.mp4'),
  new URL(base)),/Raw private R2/);
assert.throws(()=>parseVideoEntries(xml.replace(poster,'https://other-domain.com/thumbnail.jpg'),
  new URL(base)),/public ProPulse origin/);
const jsonLd={'@context':'https://schema.org','@graph':[
  {'@type':'WebPage',name:'Project'},
  {'@type':'VideoObject',name:'Modern 3BHK Interiors & Design',
    thumbnailUrl:poster,contentUrl:playback,uploadDate:'2026-10-30T10:30:00.000Z'}
]};
const html='<html><head><link rel="canonical" href="'+watch+'"/>'+
  '<script type="application/ld+json" data-propulse-project-seo="server">'+
  JSON.stringify(jsonLd)+'</script></head><body>'+
  '<div id="root"><main data-seo-project-fallback="true">'+
  '<h1>Modern interiors</h1><video controls playsinline poster="'+poster+'"></video>'+
  '</main></div></body></html>';
assert.equal(extractVideoObject(html).thumbnailUrl,poster);
assert.equal(extractVideoObject('<html></html>'),null);
const savedFetch=global.fetch;
const urls=[];
global.fetch=async(uri,opts={})=>{
  const url=String(uri);urls.push(url);
  if(url.endsWith('/robots.txt'))return new Response('User-agent: *\nAllow: /\nSitemap: '+base+'/video-sitemap.xml',{status:200});
  if(url.endsWith('/video-sitemap.xml'))return new Response(xml,{status:200,headers:{'Content-Type':'application/xml'}});
  if(url===watch)return new Response(html,{status:200,headers:{'Content-Type':'text/html'}});
  if(url===poster)return new Response(Buffer.concat([Buffer.from([0xff,0xd8,0xff]),Buffer.alloc(1300,1)]),{status:200,headers:{'Content-Type':'image/jpeg'}});
  if(url===playback)return new Response('',{status:302,headers:{location:signed}});
  if(url===signed)return new Response(Buffer.from([0,0,0,0,0,0,0,16,102,116,121,112]),{
    status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes 0-11/15000000'}});
  return new Response('Unknown mock '+url,{status:404});
};
(async()=>{
  try{
    const passing=await audit({origin:base,limit:5});
    assert.equal(passing.status,'pass',JSON.stringify(passing.errors));
    assert.equal(passing.totalVideos,1);
    assert.equal(passing.checked,1);
    assert(urls.includes(signed),'Audit must check actual MP4 bytes rather than only a signed redirect');
    const originalFetch=global.fetch;
    global.fetch=async(url,opts)=>{
      if(String(url)===poster)return new Response('Unavailable',{status:404});
      return originalFetch(url,opts);
    };
    const failed=await audit({origin:base,limit:5});
    assert.equal(failed.status,'fail');
    assert.equal(failed.errors.length,1);
    assert.match(failed.errors[0].error,/thumbnail must be HTTP 200/);
  }finally{global.fetch=savedFetch}
  console.log('Daily video SEO monitoring covers sitemap, JSON-LD, frame bytes, video bytes and failure reports.');
})().catch(error=>{global.fetch=savedFetch;console.error(error);process.exitCode=1});