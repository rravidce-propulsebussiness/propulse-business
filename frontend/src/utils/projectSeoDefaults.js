// Keep browser navigation metadata aligned with the public server HTML.
// Only use facts entered for the completed project; no invented features.
const clean=value=>String(value??'').replace(/\s+/g,' ').trim()
function shorten(value,max){
  const text=clean(value)
  if(text.length<=max)return text
  const cut=text.slice(0,max+1)
  const last=cut.lastIndexOf(' ')
  return (last>=Math.floor(max*.65)?cut.slice(0,last):text.slice(0,max)).replace(/[\s,;:.!-]+$/g,'')
}
function includesLocation(text,location){
  const words=value=>clean(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean)
  const titleWords=words(text)
  const locationWords=words(location)
  return locationWords.length>0&&locationWords.every(word=>titleWords.includes(word))
}
const MAX_SEO_TITLE_LENGTH=68 // Account for the appended ' | ProPulse' branding.
export function projectSeoTitle(project={}){
  const custom=clean(project.seoTitle).replace(/\s*\|\s*ProPulse\s*$/i,'')
  if(custom&&custom.length<=MAX_SEO_TITLE_LENGTH)return custom
  const original=clean(project.title)||clean(project.type)||'Completed project'
  const title=original.split(/\s+\|\s+/)[0]
  const location=clean(project.location)
  return shorten(location&&!includesLocation(title,location)?title+' in '+location:title,MAX_SEO_TITLE_LENGTH)
}
export function projectSeoDescription(project={}){
  if(clean(project.seoDescription))return shorten(project.seoDescription,180)
  const name=clean(project.title)||'Completed project'
  const location=clean(project.location)
  const heading=name+(location&&!includesLocation(name,location)?' in '+location:'')
  const details=clean(project.description)
  return shorten('Explore '+heading+'.'+(details?' '+details:' View the published project details and completed work.'),180)
}
