import {useEffect} from 'react'
import {useLocation} from 'react-router-dom'
import {HOME_SEO,SITE_NAME,isIndexablePath,seoForPath} from '../seo/seoConfig'

const SERVICE_LABELS={
  construction:'Construction',
  'interior-designers':'Interior Design',
  'real-estate':'Real Estate',
}

function ensureMeta(selector,attributes={}){
  let node=document.head.querySelector(selector)
  if(!node){
    node=document.createElement('meta')
    Object.entries(attributes).forEach(([key,value])=>node.setAttribute(key,value))
    document.head.appendChild(node)
  }
  return node
}

function setNamedMeta(name,content){
  const node=ensureMeta('meta[name="'+name+'"]',{name})
  node.setAttribute('content',content)
}

function setPropertyMeta(property,content){
  const node=ensureMeta('meta[property="'+property+'"]',{property})
  node.setAttribute('content',content)
}

function setCanonical(href){
  let node=document.head.querySelector('link[rel="canonical"]')
  if(!node){
    node=document.createElement('link')
    node.setAttribute('rel','canonical')
    document.head.appendChild(node)
  }
  node.setAttribute('href',href)
}

function siteOrigin(){
  const configured=String(import.meta.env.VITE_PUBLIC_SITE_URL||'').trim()
  if(/^https?:\/\//i.test(configured)){
    try{return new URL(configured).origin}catch{}
  }
  return window.location.origin
}

function pageJsonLd(route,origin){
  const home=origin+'/'
  const page={
    '@context':'https://schema.org',
    '@type':route.type==='city-hub'?'CollectionPage':'WebPage',
    name:route.title,
    url:origin+route.path,
    description:route.description,
    isPartOf:{'@type':'WebSite',name:SITE_NAME,url:home},
    inLanguage:'en-IN',
  }
  if(route.type==='cost-guide'){
    page.about={
      '@type':'Service',
      name:'House construction cost planning',
      areaServed:{'@type':'City',name:'Hyderabad, Telangana, India'},
    }
  }
  if(route.type==='city-service'||route.type==='local-service'){
    page.about={
      '@type':'Service',
      name:route.serviceSlug==='construction'
        ?'Home construction'
        :route.serviceSlug==='interior-designers'
          ?'Interior design'
          :'Real estate services',
      areaServed:route.type==='local-service'
        ?{'@type':'Place',name:route.localityName+', Hyderabad, Telangana, India'}
        :{'@type':'City',name:'Hyderabad, Telangana, India'},
    }
  }
  return page
}

function breadcrumbItems(route,origin){
  const home=origin+'/'
  const items=[{'@type':'ListItem',position:1,name:'Home',item:home}]
  if(!route.path.startsWith('/hyderabad')){
    items.push({'@type':'ListItem',position:2,name:route.heading,item:origin+route.path})
    return items
  }
  if(route.type==='city-hub'){
    items.push({'@type':'ListItem',position:2,name:'Hyderabad',item:origin+'/hyderabad'})
    return items
  }
  items.push({'@type':'ListItem',position:2,name:'Hyderabad',item:origin+'/hyderabad'})
  if(route.type==='cost-guide'){
    items.push({'@type':'ListItem',position:3,name:'Construction Cost',item:origin+route.path})
    return items
  }
  if(route.type==='city-service'){
    items.push({'@type':'ListItem',position:3,name:route.heading,item:origin+route.path})
    return items
  }
  if(route.type==='local-service'){
    const servicePath='/hyderabad/'+route.serviceSlug
    items.push({'@type':'ListItem',position:3,name:SERVICE_LABELS[route.serviceSlug]||route.serviceSlug,item:origin+servicePath})
    items.push({'@type':'ListItem',position:4,name:route.localityName,item:origin+route.path})
    return items
  }
  if(route.type==='comparison'){
    const servicePath='/hyderabad/'+route.serviceSlug
    items.push({'@type':'ListItem',position:3,name:SERVICE_LABELS[route.serviceSlug]||route.serviceSlug,item:origin+servicePath})
    items.push({'@type':'ListItem',position:4,name:'Compare options',item:origin+route.path})
    return items
  }
  return items
}

function jsonLdFor(route,origin){
  const home=origin+'/'
  const organization={
    '@context':'https://schema.org',
    '@type':'Organization',
    name:SITE_NAME,
    url:home,
    logo:origin+'/brand/propulse-logo.png',
    description:HOME_SEO.description,
  }
  const website={
    '@context':'https://schema.org',
    '@type':'WebSite',
    name:SITE_NAME,
    url:home,
    inLanguage:'en-IN',
    description:HOME_SEO.description,
  }
  if(route.path==='/')return [organization,website]

  return [
    organization,
    pageJsonLd(route,origin),
    {
      '@context':'https://schema.org',
      '@type':'BreadcrumbList',
      itemListElement:breadcrumbItems(route,origin),
    },
  ]
}

function setJsonLd(route,origin){
  let node=document.head.querySelector('script[data-propulse-seo="jsonld"]')
  if(!node){
    node=document.createElement('script')
    node.type='application/ld+json'
    node.dataset.propulseSeo='jsonld'
    document.head.appendChild(node)
  }
  node.textContent=JSON.stringify(jsonLdFor(route,origin))
}

export default function SeoManager(){
  const location=useLocation()

  useEffect(()=>{
    const route=seoForPath(location.pathname)
    const indexable=isIndexablePath(location.pathname)
    const origin=siteOrigin()
    const effective=route||HOME_SEO
    const canonical=origin+(route?.path||location.pathname||'/')
    const robots=indexable
      ?'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
      :'noindex,nofollow,noarchive'

    document.title=effective.title
    document.documentElement.lang='en-IN'
    setNamedMeta('description',effective.description)
    setNamedMeta('robots',robots)
    setNamedMeta('googlebot',robots)
    setNamedMeta('application-name',SITE_NAME)
    setNamedMeta('theme-color','#0c3152')

    setPropertyMeta('og:site_name',SITE_NAME)
    setPropertyMeta('og:type','website')
    setPropertyMeta('og:title',effective.title)
    setPropertyMeta('og:description',effective.description)
    setPropertyMeta('og:url',canonical)
    setPropertyMeta('og:image',origin+'/brand/propulse-logo.png')
    setPropertyMeta('og:image:alt','ProPulse Business logo')
    setPropertyMeta('og:locale','en_IN')

    setNamedMeta('twitter:card','summary')
    setNamedMeta('twitter:title',effective.title)
    setNamedMeta('twitter:description',effective.description)
    setNamedMeta('twitter:image',origin+'/brand/propulse-logo.png')

    setCanonical(canonical)

    if(indexable&&route)setJsonLd(route,origin)
    else document.head.querySelector('script[data-propulse-seo="jsonld"]')?.remove()
  },[location.pathname])

  return null
}
