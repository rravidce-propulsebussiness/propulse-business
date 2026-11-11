import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const tech=read('src/pages/Technology.jsx')
const css=read('src/pages/Technology.css')
const home=read('src/pages/Home.jsx')
const about=read('src/pages/About.jsx')
const seo=read('src/seo/seoConfig.js')

// Technology is the full digital-services division, not only Business OS.
const block=tech.slice(tech.indexOf('const serviceGroups = ['),tech.indexOf(']\n\nfunction Icon'))
const services=[...block.matchAll(/\{ icon: '([a-z]+)', title: '([^']+)', shortTitle: '([^']+)', description: '([^']+)' \}/g)].map(m=>({icon:m[1],title:m[2],shortTitle:m[3],description:m[4]}))
assert.equal(services.length,24,'Products & Services must list all 24 digital services')
assert.equal(new Set(services.map(s=>s.title)).size,services.length,'Service titles must be unique')
assert.equal(new Set(services.map(s=>s.icon)).size,services.length,'Each service needs its own icon')
for(const required of ['Website Development','Mobile App Development','Custom Software & Web Apps','CRM & Business Automation','SEO & AI Search','Digital Marketing & Lead Generation','Social Media Management','WhatsApp Marketing & Automation','Branding & Graphic Design','Video, Photography & Media','Chrome Extension Development','E-commerce Solutions','UI/UX Design','Google Business Profile & Local SEO','Content Writing & Copywriting','Email & SMS Marketing','Online Reputation Management','Influencer Marketing','AI Chatbots & AI Automation','Analytics & Reporting','Payment Gateway & Integrations','Website Maintenance & Support','Digital Strategy & Consulting','Hosting & Digital Infrastructure'])
  assert(services.some(s=>s.title===required),'Missing service: '+required)
for(const s of services){
  if(s.icon!=='whatsapp') assert(tech.includes(`if (name === '${s.icon}')`),'Missing SVG for icon '+s.icon)
  if(s.icon!=='code') assert(css.includes('.ps-icon-'+s.icon+'{'),'Missing colour for icon '+s.icon)
  assert(s.description.length<=90,'Keep the card description short: '+s.title)
}
// 24 cards fill every row at 2, 3 and 4 columns.
assert.equal(services.length%12,0,'Service count must fill 2/3/4-column grids evenly')
assert(tech.includes('href="/contact"'),'Service cards must link to contact')

// Homepage and About must not present Technology as Business OS only.
assert(!home.includes("eyebrow: 'Technology & Business OS'"),'Homepage pillar must not be Business-OS only')
for(const word of ['mobile apps','Chrome extension','digital marketing','social media','CRM']) assert(home.toLowerCase().includes(word.toLowerCase()),'Homepage Technology copy must mention '+word)
assert(!about.includes('ProPulse develops software including Business OS.'),'About page must describe the full technology division')
assert(/social media management/.test(seo)&&/mobile app/.test(seo),'Technology SEO must describe full services')
console.log('Technology services checks passed ('+services.length+' services)')
