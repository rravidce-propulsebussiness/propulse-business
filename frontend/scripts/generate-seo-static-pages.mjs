import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {PUBLIC_SEO_ROUTES,SITE_NAME} from '../src/seo/seoConfig.js'

const here=path.dirname(fileURLToPath(import.meta.url))
const dist=path.resolve(here,'../dist')
const indexPath=path.join(dist,'index.html')
const template=fs.readFileSync(indexPath,'utf8')
const configuredOrigin=String(process.env.VITE_PUBLIC_SITE_URL||'').trim().replace(/\/+$/,'')
const origin=/^https?:\/\//i.test(configuredOrigin)?configuredOrigin:''

function escapeHtml(value=''){
  return String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;')
}

function replaceTitle(html,value){
  return html.replace(/<title>[^<]*<\/title>/i,'<title>'+escapeHtml(value)+'</title>')
}

function replaceMeta(html,attribute,key,value){
  const re=new RegExp('<meta\\s+[^>]*'+attribute+'="'+key+'"[^>]*>','i')
  const tag='<meta '+attribute+'="'+escapeHtml(key)+'" content="'+escapeHtml(value)+'">'
  if(re.test(html))return html.replace(re,tag)
  return html.replace('</head>','  '+tag+'\\n  </head>')
}

function replaceCanonical(html,value){
  const tag='<link rel="canonical" href="'+escapeHtml(value)+'">'
  if(/<link\s+[^>]*rel=["']canonical["'][^>]*>/i.test(html)){
    return html.replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>/i,tag)
  }
  return html.replace('</head>','  '+tag+'\\n  </head>')
}

function absolute(urlPath){
  return origin?origin+urlPath:urlPath
}

function fallback(route){
  const links=[
    ['Home','/'],
    ['Get Quote','/quote'],
    ['Find Professionals','/experts'],
    ['Packages','/packages'],
    ['Projects','/projects'],
    ['How It Works','/how-it-works'],
    ['About','/about'],
    ['Contact','/contact'],
    ['FAQs','/faq'],
  ]
  const nav=links.map(function(item){
    return '<a href="'+item[1]+'" style="margin-right:14px;color:#173f5e">'+item[0]+'</a>'
  }).join('')
  return '<main data-seo-static-fallback="true" style="font-family:Arial,sans-serif;max-width:1100px;margin:0 auto;padding:32px;color:#173f5e">'+
    '<header style="display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap">'+
      '<a href="/" aria-label="'+escapeHtml(SITE_NAME)+' home"><img src="/brand/propulse-logo.svg" alt="'+escapeHtml(SITE_NAME)+'" width="180" height="48"></a>'+
      '<nav aria-label="Primary">'+nav+'</nav>'+
    '</header>'+
    '<section style="padding:72px 0 48px">'+
      '<p style="font-weight:700;color:#f05b24">PROPULSE BUSINESS</p>'+
      '<h1 style="max-width:850px;font-size:44px;line-height:1.08;margin:12px 0">'+escapeHtml(route.heading)+'</h1>'+
      '<p style="max-width:780px;font-size:18px;line-height:1.6">'+escapeHtml(route.summary)+'</p>'+
      '<p style="max-width:780px;line-height:1.6">'+escapeHtml(route.description)+'</p>'+
      '<p><a href="/quote" style="font-weight:700;color:#d94f22">Start your requirement</a> · <a href="/experts" style="font-weight:700;color:#173f5e">Find professionals</a></p>'+
    '</section>'+
  '</main>'
}

function render(route){
  const canonical=absolute(route.path)
  let html=template
  html=replaceTitle(html,route.title)
  html=replaceMeta(html,'name','description',route.description)
  html=replaceMeta(html,'name','robots','index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1')
  html=replaceMeta(html,'name','googlebot','index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1')
  html=replaceMeta(html,'property','og:title',route.title)
  html=replaceMeta(html,'property','og:description',route.description)
  html=replaceMeta(html,'property','og:url',canonical)
  html=replaceMeta(html,'property','og:image',absolute('/brand/propulse-logo.png'))
  html=replaceMeta(html,'name','twitter:title',route.title)
  html=replaceMeta(html,'name','twitter:description',route.description)
  html=replaceMeta(html,'name','twitter:image',absolute('/brand/propulse-logo.png'))
  html=replaceCanonical(html,canonical)
  html=html.replace('<div id="root"></div>','<div id="root">'+fallback(route)+'</div>')
  return html
}

for(const route of PUBLIC_SEO_ROUTES){
  const html=render(route)
  if(route.path==='/'){
    fs.writeFileSync(indexPath,html)
  }else{
    fs.writeFileSync(path.join(dist,route.path.slice(1)+'.html'),html)
  }
}

console.log('Generated SEO HTML for '+PUBLIC_SEO_ROUTES.length+' public routes.')
