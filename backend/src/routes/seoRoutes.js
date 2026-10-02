const express=require('express');

const router=express.Router();

const PUBLIC_PATHS=[
  '/',
  '/quote',
  '/experts',
  '/packages',
  '/projects',
  '/how-it-works',
  '/about',
  '/contact',
  '/faq',
  '/hyderabad/construction',
  '/hyderabad/interior-designers',
  '/hyderabad/real-estate',
  '/hyderabad/construction/compare-options',
  '/hyderabad/interior-designers/compare-options',
  '/hyderabad/real-estate/compare-options',
];

function safeOrigin(req){
  const configured=String(process.env.PUBLIC_APP_URL||process.env.FRONTEND_URL||'').trim();
  if(configured){
    try{
      const url=new URL(configured);
      if(['http:','https:'].includes(url.protocol))return url.origin;
    }catch{}
  }
  const forwardedProto=String(req.get('x-forwarded-proto')||'').split(',')[0].trim().toLowerCase();
  const protocol=['http','https'].includes(forwardedProto)?forwardedProto:(req.protocol==='https'?'https':'http');
  const forwardedHost=String(req.get('x-forwarded-host')||'').split(',')[0].trim();
  const host=forwardedHost||String(req.get('host')||'').trim();
  if(/^[A-Za-z0-9.-]+(?::\d{1,5})?$/.test(host))return protocol+'://'+host;
  return 'http://localhost:5173';
}

function xmlEscape(value){
  return String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&apos;");
}

router.get('/robots.txt',(req,res)=>{
  const origin=safeOrigin(req);
  res.type('text/plain');
  res.setHeader('Cache-Control','public, max-age=3600');
  res.send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /profile',
    'Disallow: /wallet',
    'Disallow: /membership',
    'Disallow: /notifications',
    'Disallow: /purchased-leads',
    'Disallow: /my-leads',
    'Disallow: /investment/',
    'Disallow: /lead-partner/',
    'Disallow: /requirements/',
    'Disallow: /estimate/',
    '',
    'Sitemap: '+origin+'/sitemap.xml',
    ''
  ].join('\n'));
});

router.get('/sitemap.xml',(req,res)=>{
  const origin=safeOrigin(req);
  const body=[
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...PUBLIC_PATHS.map(path=>'  <url><loc>'+xmlEscape(origin+(path==='/'?'/':path))+'</loc></url>'),
    '</urlset>',
    ''
  ].join('\n');
  res.type('application/xml');
  res.setHeader('Cache-Control','public, max-age=3600');
  res.send(body);
});

module.exports=router;
