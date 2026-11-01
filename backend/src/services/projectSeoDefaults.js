'use strict';

// Factual, zero-cost SEO defaults for newly published projects. Blank SEO fields
// remain editable: we derive useful metadata from the supplied project facts
// without inventing materials, finishes, budgets or customer testimonials.
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
function shorten(value,max){
  const s=clean(value);
  if(s.length<=max)return s;
  const cut=s.slice(0,max+1),last=cut.lastIndexOf(' ');
  return (last>=Math.floor(max*.65)?cut.slice(0,last):s.slice(0,max)).replace(/[\s,;:.!-]+$/g,'');
}
function containsLocation(text,location){
  const words=s=>clean(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean);
  const haystack=words(text);
  const needles=words(location);
  return needles.length>0&&needles.every(word=>haystack.includes(word));
}
const MAX_SEO_TITLE_LENGTH=68; // Leave room for the " | ProPulse" brand suffix.
function projectSeoTitle(project={}){
  const custom=clean(project.seo_title).replace(/\s*\|\s*ProPulse\s*$/i,'');
  // A promotional paragraph accidentally pasted into the title is not a useful
  // search result heading. Fall back to factual project data rather than publishing it.
  if(custom&&custom.length<=MAX_SEO_TITLE_LENGTH)return custom;
  const original=clean(project.title)||clean(project.project_type)||'Completed project';
  const title=original.split(/\s+\|\s+/)[0];
  const location=clean(project.location_text);
  return shorten(location&&!containsLocation(title,location)?title+' in '+location:title,MAX_SEO_TITLE_LENGTH);
}
function projectSeoDescription(project={}){
  if(clean(project.seo_description))return shorten(project.seo_description,180);
  const name=clean(project.title)||('Completed '+(clean(project.project_type)||'construction or interior design')+' project');
  const location=clean(project.location_text);
  const heading=name+(location&&!containsLocation(name,location)?' in '+location:'');
  const details=clean(project.description);
  const prefix='Explore '+heading+'.';
  // Prioritize a real scope summary, never generated claims about unverified work.
  return shorten(prefix+(details?' '+details:' View the published project details and completed work.'),180);
}
module.exports={projectSeoTitle,projectSeoDescription,shorten};
