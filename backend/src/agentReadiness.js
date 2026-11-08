const fs=require('fs');
const path=require('path');

// Agent discovery for the homepage, shared by the Hostinger wrapper and the
// backend (when it serves the frontend itself):
// - every homepage response advertises llms.txt, the Markdown alternate and the
//   MCP server card in an RFC 8288 Link header;
// - a request that prefers text/markdown over text/html gets index.md.
const HOMEPAGE_LINK_HEADER=[
  '</index.md>; rel="alternate"; type="text/markdown"',
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</.well-known/mcp/server-card.json>; rel="service-desc"; type="application/json"',
].join(', ');

function acceptQuality(accept,type){
  let best=-1;
  const [major]=type.split('/');
  for(const part of String(accept||'').split(',')){
    const [rawType,...params]=part.trim().toLowerCase().split(';');
    const mediaType=rawType.trim();
    if(!mediaType)continue;
    const matches=mediaType===type?3:mediaType===major+'/*'?2:mediaType==='*/*'?1:0;
    if(!matches)continue;
    let q=1;
    for(const param of params){
      const [key,value]=param.split('=').map(item=>item.trim());
      if(key==='q'){const parsed=Number(value);q=Number.isFinite(parsed)?parsed:0}
    }
    // A more specific match decides; ties keep the highest quality.
    const score=matches*10+q;
    if(score>best)best=score;
  }
  if(best<0)return 0;
  return best-Math.floor(best/10)*10;
}

// True only when the client explicitly asks for Markdown and does not rank HTML higher.
function prefersMarkdown(accept){
  const value=String(accept||'').toLowerCase();
  if(!/text\/markdown|text\/x-markdown/.test(value))return false;
  const markdown=Math.max(acceptQuality(value,'text/markdown'),acceptQuality(value,'text/x-markdown'));
  if(markdown<=0)return false;
  return markdown>=acceptQuality(value,'text/html');
}

function homepageAgentDiscovery(frontendRoot){
  const markdownFile=()=>path.join(typeof frontendRoot==='function'?frontendRoot():frontendRoot,'index.md');
  return(req,res,next)=>{
    if(!['GET','HEAD'].includes(req.method))return next();
    if(req.path!=='/'&&req.path!=='/index.html')return next();
    res.setHeader('Link',HOMEPAGE_LINK_HEADER);
    res.vary('Accept');
    if(!prefersMarkdown(req.get('accept')))return next();
    const file=markdownFile();
    if(!fs.existsSync(file))return next();
    res.setHeader('Cache-Control','no-cache');
    res.type('text/markdown; charset=utf-8');
    return res.sendFile(file,{headers:{'Content-Type':'text/markdown; charset=utf-8'}},error=>error?next(error):undefined);
  };
}

module.exports={HOMEPAGE_LINK_HEADER,homepageAgentDiscovery,prefersMarkdown};
