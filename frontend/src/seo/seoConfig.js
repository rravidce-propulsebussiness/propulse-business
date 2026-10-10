import {HYDERABAD_SEO_ROUTES} from './hyderabadSeo.js'
import {REGIONAL_SEO_ROUTES} from './regionalSeo.js'
import {CONSTRUCTION_GUIDE_HUB_ROUTE,CONSTRUCTION_GUIDE_ROUTES} from './constructionGuides.js'

export const SITE_NAME='ProPulse Business'

export const HOME_SEO={
  path:'/',
  title:'Construction, Interiors & Real Estate Services | ProPulse',
  description:'Plan construction, interiors and real-estate requirements with ProPulse. Get structured quotes, explore completed projects and connect with relevant businesses.',
  heading:'Construction, interiors and real estate—start with one clear requirement',
  summary:'Use ProPulse to plan your requirement, compare relevant options, explore completed work and connect with registered businesses.',
}

export const CORE_PUBLIC_SEO_ROUTES=[
  HOME_SEO,
  {
    path:'/quote',
    title:'Construction, Interior & Property Quotes | ProPulse',
    description:'Share your construction, interior-design or real-estate requirement with ProPulse and create a structured brief for relevant businesses to respond to.',
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
    title:'About ProPulse | Construction, Interiors & Real Estate',
    description:'Learn about ProPulse, its Hyderabad construction and interiors operating background, and how the platform helps customers create clearer requirements.',
    heading:'About ProPulse Business',
    summary:'ProPulse is a customer starting point for structured construction, interiors and real-estate requirements.',
  },
  {
    path:'/contact',
    title:'Contact ProPulse | Construction, Interiors & Real Estate',
    description:'Contact ProPulse for help with construction, interior-design and real-estate requirements, website support or questions about the customer journey.',
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
