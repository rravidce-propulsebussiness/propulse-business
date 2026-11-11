import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {
  FESTIVAL_EVENTS,FESTIVE_SEO_ROUTES,CAMPAIGN_SERVICES,
  festivalBySlug,festivalPath,campaignStatus,activeFestivals,activeFestival,indiaToday,dateOffset,
} from '../src/seo/festiveCampaigns.js'

const here=path.dirname(fileURLToPath(import.meta.url))
const frontend=path.resolve(here,'..')
const ids=FESTIVAL_EVENTS.map(item=>item.slug)
assert.equal(ids.length,26,'Expected a curated list of selected major festivals and observances')
assert.equal(FESTIVAL_EVENTS.filter(item=>item.homepage).length,18,'Only major festivals should become the homepage')
assert.ok(FESTIVAL_EVENTS.filter(item=>item.homepage).every(item=>item.kind!=='remembrance'),'Remembrance observances must never replace the homepage')
assert.equal(new Set(ids).size,ids.length,'Campaign slugs must be unique')
assert.equal(FESTIVE_SEO_ROUTES.length,ids.length*2+1)
const seoPaths=FESTIVE_SEO_ROUTES.map(item=>item.path)
assert.equal(new Set(seoPaths).size,seoPaths.length,'Every campaign path must be unique')
assert.deepEqual(Object.keys(CAMPAIGN_SERVICES).sort(),['construction','interiors'])
for(const event of FESTIVAL_EVENTS){
  assert.match(event.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  for(const prop of ['date','start','end'])assert.match(event[prop],/^20\d\d-\d\d-\d\d$/)
  assert.equal(event.start,dateOffset(event.date,-2),'Campaign must start two days before: '+event.slug)
  assert.equal(event.end,event.date,'Campaign must finish on festival day: '+event.slug)
  assert.equal(dateOffset(event.start,2),event.end,'Exactly three inclusive days required: '+event.slug)
  assert.equal(festivalBySlug(event.slug),event)
  for(const service of ['construction','interiors']){
    const url=festivalPath(event,service)
    const route=FESTIVE_SEO_ROUTES.find(page=>page.path===url)
    assert.ok(route,'Missing SEO route for '+url)
    assert.equal(route.type,'festive-offer')
    assert.ok(route.title.includes(event.name))
    assert.ok(route.description.length>=120)
    assert.equal(route.campaignEnd,event.end)
  }
}
assert.equal(activeFestival('2026-11-06')?.slug,'diwali-2026','Diwali must be featured on November 6')
assert.equal(activeFestival('2026-11-07')?.slug,'diwali-2026','Diwali must be featured on November 7')
assert.equal(activeFestival('2026-11-08')?.slug,'diwali-2026','Diwali must be featured on November 8')
assert.equal(campaignStatus(festivalBySlug('diwali-2026'),'2026-11-05'),'upcoming')
assert.equal(campaignStatus(festivalBySlug('diwali-2026'),'2026-11-09'),'past')
assert.ok(activeFestivals('2026-11-06').some(item=>item.slug==='diwali-2026'),'Major festival should activate the homepage')
assert.ok(!activeFestivals('2026-11-06').some(item=>item.slug==='dhanteras-2026'),'Minor dates must not replace or crowd the homepage')
assert.equal(festivalPath(festivalBySlug('diwali-2026'),'construction'),'/offers/diwali-2026/construction')
assert.equal(festivalPath(festivalBySlug('diwali-2026'),'interiors'),'/offers/diwali-2026/interiors')
assert.equal(activeFestival('2027-01-26')?.slug,'republic-day-2027')
assert.equal(activeFestival('2027-02-12'),null,'Remembrance dates must not replace the festival homepage')
assert.equal(activeFestival('2027-02-13'),null,'Remembrance dates must not replace the festival homepage')
assert.equal(activeFestival('2027-02-14'),null,'Remembrance dates must not replace the festival homepage')
assert.equal(campaignStatus(festivalBySlug('pulwama-black-day-2027'),'2027-02-15'),'past')
assert.equal(festivalBySlug('pulwama-black-day-2027').kind,'remembrance')
for(const service of ['construction','interiors']){
  const url=festivalPath(festivalBySlug('pulwama-black-day-2027'),service)
  const route=FESTIVE_SEO_ROUTES.find(item=>item.path===url)
  assert.equal(route.campaignKind,'remembrance')
  assert.ok(!route.title.includes('Offers'),'Remembrance must not advertise offers')
  assert.ok(!route.description.includes('Request a scope-based quote'),'Remembrance must not advertise quotes')
}
assert.equal(activeFestival('2027-07-26'),null,'Remembrance dates must not replace the festival homepage')
assert.ok(festivalBySlug('mumbai-attacks-remembrance-2026'))
assert.ok(festivalBySlug('army-day-2027'))
assert.ok(festivalBySlug('navy-day-2026'))
assert.equal(activeFestival('2027-04-07')?.slug,'ugadi-2027')
assert.equal(activeFestival('2027-10-29')?.slug,'diwali-2027')
assert.equal(activeFestival('2027-11-30'),null,'After calendar completion normal homepage returns')
assert.equal(campaignStatus(festivalBySlug('diwali-2026'),'2026-11-13'),'past')
assert.equal(campaignStatus(festivalBySlug('diwali-2027'),'2027-10-10'),'upcoming')
assert.match(indiaToday(new Date('2026-11-08T19:00:00Z')),/^2026-11-09$/,'Must use Asia/Kolkata')
const wrapper=fs.readFileSync(path.resolve(frontend,'../hostinger-server.js'),'utf8')
assert.ok(wrapper.includes("'/offers'"),'Hostinger must whitelist festival hub')
assert.ok(wrapper.includes('offers\\/'), 'Hostinger must accept festival detail URLs')
const app=fs.readFileSync(path.resolve(frontend,'src/App.jsx'),'utf8')
assert.ok(app.includes('activeFestival()'),'Homepage needs date-based campaign switching')
assert.ok(app.includes('path="/offers/:festivalSlug/:serviceSlug"'),'Detail routes must exist')
const htmlGenerator=fs.readFileSync(path.resolve(frontend,'scripts/generate-seo-static-pages.mjs'),'utf8')
assert.ok(htmlGenerator.includes('festiveContent(route)'),'Static HTML must include festival text')
const dist=path.resolve(frontend,'dist')
if(fs.existsSync(path.join(dist,'offers'))){
  for(const route of FESTIVE_SEO_ROUTES){
    const generated=path.join(dist,route.path.slice(1)+'.html')
    assert.ok(fs.existsSync(generated),'Missing prerendered SEO HTML: '+generated)
    const html=fs.readFileSync(generated,'utf8')
    assert.ok(html.includes(route.title),'Missing page-specific title: '+route.path)
    assert.ok(html.includes('application/ld+json'),'Missing JSON-LD: '+route.path)
    assert.ok(html.includes('canonical'),'Missing canonical: '+route.path)
    if(route.type==='festive-offer')assert.ok(html.includes('Frequently asked questions'),'Missing crawlable FAQ: '+route.path)
    if(route.type==='festive-offer'&&route.campaignKind!=='remembrance'){
      const ownOffer=route.serviceType==='construction'?'₹5 lakh':'10% off interiors'
      const otherOffer=route.serviceType==='construction'?'10% off interiors':'₹5 lakh'
      assert.ok(html.includes(ownOffer),'Missing service offer: '+route.path)
      assert.ok(!html.includes(otherOffer),'Wrong service offer leaked into '+route.path)
    }
    if(route.campaignKind==='remembrance'){
      assert.ok(html.includes('respectful memorial')||html.includes('IN RESPECTFUL REMEMBRANCE'),'Missing commemorative content')
      assert.ok(!html.includes('guaranteed '+route.festivalName+' discount'),'Memorial page must avoid sale copy')
    }
  }
}
console.log('Festival campaigns verified:',FESTIVAL_EVENTS.length,'occasions,',FESTIVE_SEO_ROUTES.length,'SEO routes.')

// Production backend and legacy wrapper must accept every generated service URL.
const productionServer=fs.readFileSync(path.resolve(frontend,'../backend/src/server.js'),'utf8')
for(const [label,source] of [['production',productionServer],['legacy',wrapper]]){
  assert.ok(source.includes("'/offers'"),label+' must serve the occasion hub directly')
  const declaration=source.match(/(?:const publicDynamicFrontendPath=requestPath=>|function publicDynamicFrontendPath\(requestPath\)\{return )([^\n]+)/)
  assert.ok(declaration,label+' dynamic route declaration must be found')
  const expression=declaration[1].replace(/;?}$/, '').replace(/;$/, '')
  const accepts=new Function('requestPath','return '+expression)
  for(const event of FESTIVAL_EVENTS)for(const service of ['construction','interiors'])assert.ok(accepts(festivalPath(event,service)),label+' missing deep link '+festivalPath(event,service))
  for(const route of ['/offers/invalid_slug/construction','/offers/diwali-2026/admin','/offers/diwali-2026/construction/private'])assert.equal(accepts(route),false,label+' must reject malformed occasion paths')
  assert.ok(source.includes('redirect:false'),label+' must not redirect file-backed routes into directories')
  const slashHandler=source.match(/app.use\(\(req,res,next\)=>\{\s*const clean=req.path.replace[\s\S]+?return next\(\);\s*}\);/)
  assert.ok(slashHandler,label+' must normalize trailing slashes internally')
  const handler=new Function('knownSpaFrontendPath','return '+slashHandler[0].slice(8,-2))(p=>p==='/offers'||accepts(p))
  for(const route of ['/offers/','/offers/diwali-2026/construction/']){
    const req={method:'GET',path:route,url:route+'?source=audit'}
    let continued=false
    handler(req,{redirect(){throw Error(label+' must not redirect trailing-slash requests')}},()=>{continued=true})
    assert.equal(req.url,route.slice(0,-1)+'?source=audit',label+' must preserve query strings')
    assert.ok(continued)
  }
}
