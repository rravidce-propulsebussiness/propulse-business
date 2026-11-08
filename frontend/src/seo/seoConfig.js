import {INTERIOR_SEO_ROUTES} from './interiorSeo.js'
import {TERMS_ROUTE} from './termsContent.js'
import {HYDERABAD_SEO_ROUTES} from './hyderabadSeo.js'
import {REGIONAL_SEO_ROUTES} from './regionalSeo.js'
import {CONSTRUCTION_GUIDE_HUB_ROUTE,CONSTRUCTION_GUIDE_ROUTES} from './constructionGuides.js'

export const SITE_NAME='ProPulse Business'

export const HOME_SEO={
  path:'/',
  title:'House Construction Company in Hyderabad | ProPulse',
  description:'Plan house and villa construction in Hyderabad with ProPulse. Explore construction scope, materials, estimates and project planning, compare independent professionals, or discuss your requirements with our team.',
  heading:'House Construction Company in Hyderabad',
  summary:'Plan independent house and villa construction in Hyderabad. Define your plot, built-up area, floors, materials, budget and timeline before requesting an estimate. Explore interiors and independent professionals too.',
}

export const CORE_PUBLIC_SEO_ROUTES=[
  HOME_SEO,
  {
    path:'/blog',
    type:'blog-hub',
    title:'Hyderabad Home Construction & Interior Design Blog | ProPulse',
    description:'Explore Hyderabad homeowner guides on house construction cost, floor plans, materials, building permissions, interiors, modular kitchens, waterproofing, renovation and project planning. Browse 1,000 research-led topic ideas.',
    heading:'Hyderabad home construction and interior design guides',
    summary:'Research construction costs, approvals, materials, floor plans, home interiors, repairs and renovation with practical homeowner-focused guidance for Hyderabad.',
  },
  {
    path:'/construction-blog',
    type:'construction-blog',
    title:'House Construction Blog Hyderabad | Costs, Materials & Plans | ProPulse',
    description:'Practical house construction guides for Hyderabad homeowners: construction cost, 2BHK and 3BHK budgets, steel, cement, concrete defects, floor plans, permissions, waterproofing and contractor selection.',
    heading:'House construction guides, costs and practical answers',
    summary:'Understand house construction costs, materials, structural defects, floor plans, approvals, waterproofing and how to choose a contractor.',
  },
  {
    path:'/interior-blog',
    type:'interior-blog',
    title:'Interior Design Blog Hyderabad | 2BHK Costs, TV Units, Laminates & Vastu | ProPulse',
    description:'Interior design guides for Hyderabad homeowners covering 2BHK and 3BHK interior costs, TV unit prices, modular kitchens, wardrobes, laminates, false ceilings, lighting and Vastu planning questions.',
    heading:'Interior design ideas, costs and material guides',
    summary:'Find practical answers about interior budgets, TV units, laminates, kitchens, wardrobes, lighting, execution and Vastu preferences.',
  },
  {
    path:'/technology',
    type:'services-hub',
    title:'Digital Products & Services | Websites, SEO, Marketing & Business OS | ProPulse',
    description:'Explore ProPulse digital services including website and software development, SEO and AI search optimization, digital marketing and lead generation, graphic design, video editing, hosting, WhatsApp Business API and marketing, plus Business OS for construction, interior and real-estate companies.',
    heading:'Products & Services for modern businesses',
    summary:'Build your digital presence, get found in search and AI answers, generate leads, create content, stay online and run your construction or interior business with ProPulse Business OS.',
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
    title:'Construction & Interior Professionals in Hyderabad | ProPulse',
    description:'Explore published construction and interior professionals, their real project work, services and areas served. ProPulse direct services are clearly identified.',
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
  TERMS_ROUTE,
  {
    path:'/faq',
    title:'Construction, Interior & Real Estate FAQs | ProPulse',
    description:'Search practical construction, interior and real-estate questions about lintels, honeycombing, cracks, steel, cement, interiors, RERA, carpet area and property checks.',
    heading:'Construction, interior and real-estate questions answered',
    summary:'Search practical homeowner questions by category and use the answers to plan better construction, interior and property decisions.',
  },
  {
    path:'/best-construction-company-hyderabad',
    type:'construction-trust-guide',
    title:'Best Construction Company in Hyderabad? How to Choose a Trusted Builder | ProPulse',
    description:'Compare house construction companies in Hyderabad using project evidence, engineer-approved drawings, material specifications, BOQ transparency, site supervision, payment milestones and written warranties.',
    heading:'How to choose a trusted construction company in Hyderabad',
    summary:'Searching for the best construction company in Hyderabad? Use this independent homeowner checklist to compare builders on documented quality, transparent scope, real project evidence and clear accountability—not advertising claims.'
  },
  {
    path:'/best-interior-designers-hyderabad',
    type:'interior-trust-guide',
    title:'Best Interior Designers in Hyderabad | How to Choose a Trusted Company | ProPulse',
    description:'Compare interior designers in Hyderabad by real projects, design drawings, plywood grades, laminates, hardware, BOQ transparency, installation quality, payment stages and warranty terms.',
    heading:'How to choose the best interior designers in Hyderabad',
    summary:'Find a reliable interior design company in Hyderabad by comparing real work, room-wise scope, materials, hardware, execution quality, timelines and written after-sales commitments.'
  },
]

export const PUBLIC_SEO_ROUTES=[
  ...CORE_PUBLIC_SEO_ROUTES,
  ...HYDERABAD_SEO_ROUTES,
  ...INTERIOR_SEO_ROUTES,
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
