const express=require('express');

const router=express.Router();

const HYDERABAD_CONSTRUCTION_LOCALITIES=[
  'uppal','habsiguda','tarnaka','nagole','kothapet','lb-nagar','saroornagar','vanasthalipuram','hayathnagar','dilsukhnagar',
  'gachibowli','financial-district','nanakramguda','kondapur','madhapur','hitec-city','manikonda','kokapet','narsingi','tellapur','nallagandla',
  'tolichowki','mehdipatnam','attapur',
  'kukatpally','ferozguda','balanagar','bowenpally','miyapur','bachupally','pragathi-nagar','ameenpur','kompally',
  'banjara-hills','jubilee-hills',
  'ghatkesar','pocharam','boduppal','peerzadiguda','medipally','ecil','kapra','alwal','suchitra','quthbullapur','jeedimetla','medchal','shamirpet',
  'shamshabad','tukkuguda','adibatla','nadergul','rajendranagar','bandlaguda-jagir','puppalaguda',
  'patancheru','chandanagar','lingampally','beeramguda','kollur','mokila','shankarpally',
  'keesara','nagaram','dammaiguda','rampally','cherlapally','sainikpuri','yapral','safilguda','malkajgiri',
  'karmanghat','champapet','hastinapuram','meerpet','badangpet','balapur','turkayamjal','ibrahimpatnam','bongloor','maheshwaram',
  'nizampet','mallampet','dundigal','gandimaisamma','bhel','ramachandrapuram','velimela','osman-nagar','gandipet','manchirevula','moinabad',
  'secunderabad','begumpet','ameerpet','panjagutta','somajiguda','khairatabad','amberpet','ramanthapur',
];

const TELANGANA_DISTRICTS=[
  'adilabad','bhadradri-kothagudem','hanumakonda','hyderabad','jagtial','jangaon','jayashankar-bhupalpally','jogulamba-gadwal','kamareddy',
  'karimnagar','khammam','kumuram-bheem-asifabad','mahabubabad','mahabubnagar','mancherial','medak','medchal-malkajgiri','mulugu',
  'nagarkurnool','nalgonda','narayanpet','nirmal','nizamabad','peddapalli','rajanna-sircilla','rangareddy','sangareddy','siddipet',
  'suryapet','vikarabad','wanaparthy','warangal','yadadri-bhuvanagiri',
];

const ANDHRA_PRADESH_DISTRICTS=[
  'alluri-sitharama-raju','anakapalli','anantapuramu','annamayya','bapatla','chittoor','east-godavari','eluru','guntur','kakinada',
  'dr-br-ambedkar-konaseema','krishna','kurnool','markapuram','nandyal','ntr','palnadu','parvathipuram-manyam','polavaram','prakasam',
  'sri-potti-sriramulu-nellore','sri-sathya-sai','srikakulam','tirupati','visakhapatnam','vizianagaram','west-godavari','ysr-kadapa',
];

const CONSTRUCTION_GUIDES=[
  'best-steel-for-house-construction',
  'prevent-cracks-in-house',
  '2bhk-interiors-hyderabad',
  'choose-construction-contractor-hyderabad',
  'home-construction-checklist',
  'waterproofing-precautions-new-house',
];

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
  '/hyderabad',
  '/hyderabad/construction',
  '/hyderabad/construction-cost',
  '/hyderabad/interior-designers',
  '/hyderabad/real-estate',
  ...HYDERABAD_CONSTRUCTION_LOCALITIES.map(locality=>'/hyderabad/construction/'+locality),
  '/telangana/construction',
  ...TELANGANA_DISTRICTS.map(district=>'/telangana/construction/'+district),
  '/andhra-pradesh/construction',
  ...ANDHRA_PRADESH_DISTRICTS.map(district=>'/andhra-pradesh/construction/'+district),
  ...CONSTRUCTION_GUIDES.map(guide=>'/guides/'+guide),
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
