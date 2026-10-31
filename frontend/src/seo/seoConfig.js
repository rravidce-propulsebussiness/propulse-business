import {HYDERABAD_SEO_ROUTES} from './hyderabadSeo.js'
import {REGIONAL_SEO_ROUTES} from './regionalSeo.js'
import {CONSTRUCTION_GUIDE_HUB_ROUTE,CONSTRUCTION_GUIDE_ROUTES} from './constructionGuides.js'

export const SITE_NAME='ProPulse Business'

export const HOME_SEO={
  path:'/',
  title:'Construction Company, Interiors & Technology in Hyderabad | ProPulse',
  description:'ProPulse directly builds homes and designs interiors in Hyderabad, connects homeowners with independent professionals, and develops Business OS technology.',
  heading:'Direct construction, interior execution, marketplace and technology',
  summary:'Hire ProPulse directly for construction and interiors, compare independent contractors, or explore technology products.',
}

export const CORE_PUBLIC_SEO_ROUTES=[
  HOME_SEO,
  {
    path:'/technology',
    title:'Construction Business Software & Technology | ProPulse',
    description:'Explore ProPulse technology for construction and interior companies, including Business OS for CRM, quotations, projects, operations and finance.',
    heading:'ProPulse Technology & Business OS',
    summary:'Business software for construction and interiors, alongside ProPulse direct services and lead marketplace.',
  },
  {
    path:'/quote',
    title:'Construction, Interior & Property Quotes | ProPulse',
    description:'Submit construction, interior or property requirements to compare independent professionals. For direct ProPulse execution, contact the company.',
    heading:'Get a structured quote for construction, interiors or property',
    summary:'Choose your requirement type, add project details and create a clear brief that relevant businesses can understand.',
  },
  {
    path:'/experts',
    title:'Find Construction & Interior Professionals | ProPulse',
    description:'Browse registered construction, interior and real-estate businesses on ProPulse, review public project work and find professionals relevant to your requirement.',
    heading:'Find professionals for your project',
    summary:'Explore public business profiles, completed projects and service information before deciding who you want to contact.',
  },
  {
    path:'/packages',
    title:'Construction & Interior Packages | ProPulse',
    description:'Explore ProPulse construction and interior package information, scope options and indicative planning details before requesting a project quote.',
    heading:'Explore construction and interior packages',
    summary:'Review package options and planning details, then create a requirement that matches the scope you are considering.',
  },
  {
    path:'/projects',
    title:'Construction & Interior Projects | ProPulse',
    description:'Explore completed construction, interior and property projects shared by eligible ProPulse businesses, including project images, videos and plans where available.',
    heading:'Explore completed construction and interior projects',
    summary:'Browse recent public project work from businesses on ProPulse and use it as inspiration for your own requirement.',
  },
  {
    path:'/how-it-works',
    title:'How ProPulse Works | Construction, Interiors & Property',
    description:'Explore each step of a construction, interior or real-estate project, from requirement forms, packages and designs through approvals, execution, inspections and handover.',
    heading:'From first idea to final handover',
    summary:'Understand the nine stages of construction, interiors and real estate, and what to check with your chosen professionals before proceeding.',
  },
  {
    path:'/about',
    title:'Our Story & Vision | Why We Started ProPulse',
    description:'Learn about ProPulse direct construction and interiors, its professional lead marketplace and technology for construction businesses.',
    heading:'Why we started ProPulse',
    summary:'Our founding story, the challenges faced by homeowners and professionals, and our vision for easier business and quality-led execution.',
  },
  {
    path:'/contact',
    title:'Contact ProPulse | Construction, Interiors & Real Estate',
    description:'Contact ProPulse for direct construction and interior execution in Hyderabad, technology products and professional marketplace assistance.',
    heading:'Contact ProPulse',
    summary:'Get in touch with ProPulse for requirement support, platform questions or help with your customer journey.',
  },
  {
    path:'/faq',
    title:'Construction, Interior & Real Estate FAQs | ProPulse',
    description:'Search practical construction, interior and real-estate questions about lintels, honeycombing, cracks, steel, cement, interiors, RERA, carpet area and property checks.',
    heading:'Construction, interior and real-estate questions answered',
    summary:'Search practical homeowner questions by category and use the answers to plan better construction, interior and property decisions.',
  },
]

export const PUBLIC_SEO_ROUTES=[
  ...CORE_PUBLIC_SEO_ROUTES,
  ...HYDERABAD_SEO_ROUTES,
  ...REGIONAL_SEO_ROUTES,
  CONSTRUCTION_GUIDE_HUB_ROUTE,
  ...CONSTRUCTION_GUIDE_ROUTES,
].filter(Boolean)

export const PUBLIC_SEO_PATHS=new Set(PUBLIC_SEO_ROUTES.map(route=>route.path))

export function normalizeSeoPath(pathname='/'){
  const clean=String(pathname||'/').split('?')[0].split('#')[0].replace(/\/{2,}/g,'/')
  if(clean==='/'||!clean)return '/'
  return clean.endsWith('/')?clean.slice(0,-1):clean
}

export function seoForPath(pathname='/'){
  const path=normalizeSeoPath(pathname)
  return PUBLIC_SEO_ROUTES.find(route=>route.path===path)||null
}

export function isIndexablePath(pathname='/'){
  return Boolean(seoForPath(pathname))
}
