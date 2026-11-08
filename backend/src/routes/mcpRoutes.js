const express=require('express');
const contactService=require('../services/contactService');
const faqService=require('../services/faqService');
const rateLimit=require('../middleware/rateLimitMiddleware');
const {resolveSeoOrigin}=require('./seoRoutes');

// Public, read-only MCP server (Streamable HTTP transport, JSON responses,
// stateless). It only exposes information that is already public on the site:
// business contact details, the service catalogue, homeowner FAQs and the
// links where a person can submit their own requirement. It never creates
// leads or reads account data.
const router=express.Router();
const SERVER_INFO={name:'propulse-business',title:'ProPulse Business',version:'1.0.0'};
const SUPPORTED_PROTOCOL_VERSIONS=['2025-11-25','2025-06-18','2025-03-26'];
const LATEST_PROTOCOL_VERSION=SUPPORTED_PROTOCOL_VERSIONS[0];
const INSTRUCTIONS='Read-only information about ProPulse, a house construction, interiors and construction-technology company in Hyderabad, India. Use get_business_info for contact details, list_services for what ProPulse offers, search_faqs for homeowner questions and get_requirement_link to send a person to the right enquiry form. Do not submit enquiries on a person\'s behalf.';

const SERVICES=[
  {key:'construction',name:'Home construction',delivered_by:'ProPulse directly',summary:'Independent house, villa and turnkey construction planned around the plot, built-up area, specifications and budget.',path:'/quote#construction'},
  {key:'interiors',name:'Interior design and execution',delivered_by:'ProPulse directly',summary:'Residential and commercial interiors with room-wise scope: modular kitchens, wardrobes, false ceilings, lighting and finishes.',path:'/quote#interiors'},
  {key:'renovation',name:'Renovation and remodelling',delivered_by:'ProPulse directly',summary:'Changes to an existing space, scoped from its current condition and the intended finish.',path:'/quote#interiors'},
  {key:'property',name:'Property buying and selling help',delivered_by:'Independent professionals via the ProPulse marketplace',summary:'Requirements for buying or selling property, matched with independent professionals.',path:'/quote#property'},
  {key:'marketplace',name:'Professional marketplace',delivered_by:'Independent businesses',summary:'Compare published profiles and projects of independent construction and interior businesses.',path:'/experts'},
  {key:'technology',name:'Technology and Business OS',delivered_by:'ProPulse directly',summary:'Software for construction and interior businesses: CRM and leads, quotations and contracts, project management, finance and billing, client portal and WhatsApp updates.',path:'/technology'},
];
const REQUIREMENT_PATHS={construction:'/quote#construction',interiors:'/quote#interiors',property:'/quote#property',packages:'/packages',contact:'/contact'};

const TOOLS=[
  {
    name:'get_business_info',
    title:'Get ProPulse contact details',
    description:'Returns ProPulse\'s company name, phone, WhatsApp, email, address, business hours, website and public social profiles.',
    inputSchema:{type:'object',properties:{},additionalProperties:false},
    annotations:{readOnlyHint:true,openWorldHint:false},
  },
  {
    name:'list_services',
    title:'List ProPulse services',
    description:'Lists the services ProPulse offers (construction, interiors, renovation, property, marketplace, technology), who delivers each and the page to start from.',
    inputSchema:{type:'object',properties:{},additionalProperties:false},
    annotations:{readOnlyHint:true,openWorldHint:false},
  },
  {
    name:'search_faqs',
    title:'Search homeowner FAQs',
    description:'Searches ProPulse\'s published homeowner FAQs about construction, interiors and real estate. Returns matching questions with answers.',
    inputSchema:{type:'object',properties:{query:{type:'string',description:'Words to search for, e.g. "construction cost per square foot".',minLength:2,maxLength:200},limit:{type:'integer',minimum:1,maximum:10,default:5}},required:['query'],additionalProperties:false},
    annotations:{readOnlyHint:true,openWorldHint:false},
  },
  {
    name:'get_requirement_link',
    title:'Get the enquiry form link',
    description:'Returns the page where a person can submit their own construction, interiors or property requirement, view packages or contact ProPulse. The person submits the form themselves.',
    inputSchema:{type:'object',properties:{service:{type:'string',enum:Object.keys(REQUIREMENT_PATHS)}},required:['service'],additionalProperties:false},
    annotations:{readOnlyHint:true,openWorldHint:false},
  },
];

function clean(value){return String(value??'').trim()}
function absolute(origin,pathname){return origin+pathname}

async function businessInfo(origin){
  let contact={};
  try{contact=await contactService.get('website')||{}}catch{contact={}}
  const socials=(Array.isArray(contact.social_handles)?contact.social_handles:[])
    .filter(item=>item&&item.enabled!==false&&/^https:\/\//i.test(clean(item.url)))
    .map(item=>({platform:clean(item.platform),url:clean(item.url)}));
  return{
    company_name:clean(contact.company_name)||'ProPulse Business Private Limited',
    brand:'ProPulse',
    phone:clean(contact.phone)||'+91 9000360812',
    whatsapp:clean(contact.whatsapp)||clean(contact.phone)||'+91 9000360812',
    email:clean(contact.email)||'info@propulsetechnologies.online',
    address:clean(contact.address)||'Hitech City, Hyderabad, Telangana - 500081, India',
    business_hours:clean(contact.business_hours)||'Mon - Sat, 9:00 AM - 6:00 PM',
    website:absolute(origin,'/'),
    contact_page:absolute(origin,'/contact'),
    service_area:'Hyderabad, Telangana; selected locations in Telangana and Andhra Pradesh',
    social_profiles:socials,
  };
}

async function searchFaqs(query,limit){
  const terms=clean(query).toLowerCase().split(/[^a-z0-9]+/).filter(term=>term.length>2);
  if(!terms.length)return[];
  const rows=await faqService.list('homeowner');
  return rows
    .map(row=>{
      const question=clean(row.question).toLowerCase();
      const answer=clean(row.answer).toLowerCase();
      const score=terms.reduce((total,term)=>total+(question.includes(term)?3:0)+(answer.includes(term)?1:0),0);
      return{row,score};
    })
    .filter(item=>item.score>0)
    .sort((a,b)=>b.score-a.score)
    .slice(0,limit)
    .map(({row})=>({category:clean(row.category),question:clean(row.question),answer:clean(row.answer)}));
}

function textResult(data){
  return{content:[{type:'text',text:JSON.stringify(data,null,2)}],structuredContent:Array.isArray(data)?{results:data}:data,isError:false};
}
function toolError(message){return{content:[{type:'text',text:message}],isError:true}}

async function callTool(name,args,origin){
  const input=args&&typeof args==='object'?args:{};
  if(name==='get_business_info')return textResult(await businessInfo(origin));
  if(name==='list_services')return textResult(SERVICES.map(service=>({...service,url:absolute(origin,service.path)})));
  if(name==='search_faqs'){
    const query=clean(input.query);
    if(query.length<2||query.length>200)return toolError('query must be 2 to 200 characters.');
    const limit=Math.min(10,Math.max(1,Math.floor(Number(input.limit)||5)));
    try{return textResult(await searchFaqs(query,limit))}catch{return toolError('FAQs are temporarily unavailable. Browse '+absolute(origin,'/faq')+' instead.')}
  }
  if(name==='get_requirement_link'){
    const service=clean(input.service);
    if(!REQUIREMENT_PATHS[service])return toolError('service must be one of: '+Object.keys(REQUIREMENT_PATHS).join(', ')+'.');
    return textResult({service,url:absolute(origin,REQUIREMENT_PATHS[service]),note:'Share this link so the person can submit their own requirement. Estimates are confirmed only after ProPulse reviews the details.'});
  }
  return null;
}

function rpcError(id,code,message){return{jsonrpc:'2.0',id:id??null,error:{code,message}}}

async function handleMessage(message,origin){
  if(!message||typeof message!=='object'||message.jsonrpc!=='2.0'||typeof message.method!=='string')return rpcError(message?.id,-32600,'Invalid Request');
  const hasId=Object.prototype.hasOwnProperty.call(message,'id');
  if(!hasId)return undefined; // Notifications (e.g. notifications/initialized) need no reply.
  const {id,method,params={}}=message;
  if(method==='initialize'){
    const requested=clean(params?.protocolVersion);
    return{jsonrpc:'2.0',id,result:{
      protocolVersion:SUPPORTED_PROTOCOL_VERSIONS.includes(requested)?requested:LATEST_PROTOCOL_VERSION,
      capabilities:{tools:{listChanged:false}},
      serverInfo:SERVER_INFO,
      instructions:INSTRUCTIONS,
    }};
  }
  if(method==='ping')return{jsonrpc:'2.0',id,result:{}};
  if(method==='tools/list')return{jsonrpc:'2.0',id,result:{tools:TOOLS}};
  if(method==='tools/call'){
    const result=await callTool(clean(params?.name),params?.arguments,origin);
    if(!result)return rpcError(id,-32602,'Unknown tool: '+clean(params?.name));
    return{jsonrpc:'2.0',id,result};
  }
  return rpcError(id,-32601,'Method not found: '+method);
}

function publicCors(req,res,next){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id');
  res.setHeader('Access-Control-Expose-Headers','MCP-Protocol-Version');
  if(req.method==='OPTIONS')return res.status(204).end();
  return next();
}

function serverCard(origin){
  const endpoint=absolute(origin,'/mcp');
  return{
    name:SERVER_INFO.name,
    title:SERVER_INFO.title,
    version:SERVER_INFO.version,
    description:'Read-only information about ProPulse: contact details, construction, interiors and technology services, homeowner FAQs and enquiry links.',
    serverInfo:SERVER_INFO,
    protocolVersion:LATEST_PROTOCOL_VERSION,
    supportedProtocolVersions:SUPPORTED_PROTOCOL_VERSIONS,
    endpoint,
    transport:{type:'streamable-http',endpoint},
    remotes:[{type:'streamable-http',url:endpoint}],
    capabilities:{tools:{listChanged:false}},
    authentication:{required:false},
    tools:TOOLS.map(({name,title,description})=>({name,title,description})),
    websiteUrl:absolute(origin,'/'),
    documentationUrl:absolute(origin,'/llms.txt'),
    contact:{email:'info@propulsetechnologies.online'},
  };
}

const mcpLimit=rateLimit({windowMs:60*1000,max:120,keyGenerator:req=>'mcp:'+(req.ip||'unknown')});

router.options(['/mcp','/.well-known/mcp/server-card.json','/.well-known/mcp.json'],publicCors);
router.get(['/.well-known/mcp/server-card.json','/.well-known/mcp.json'],publicCors,(req,res)=>{
  res.setHeader('Cache-Control','public, max-age=3600');
  res.json(serverCard(resolveSeoOrigin(req)));
});
router.get('/mcp',publicCors,(req,res)=>{
  // Stateless server: no server-initiated SSE stream.
  res.setHeader('Allow','POST, OPTIONS');
  res.status(405).json({error:'Use POST with JSON-RPC 2.0 messages. Server card: /.well-known/mcp/server-card.json'});
});
router.delete('/mcp',publicCors,(req,res)=>{res.setHeader('Allow','POST, OPTIONS');res.status(405).end()});
router.post('/mcp',publicCors,mcpLimit,express.json({limit:'32kb',type:['application/json','application/*+json']}),async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  const origin=resolveSeoOrigin(req);
  const body=req.body;
  if(Array.isArray(body))return res.status(400).json(rpcError(null,-32600,'Batch requests are not supported'));
  try{
    const reply=await handleMessage(body,origin);
    if(reply===undefined)return res.status(202).end();
    if(reply.result?.protocolVersion)res.setHeader('MCP-Protocol-Version',reply.result.protocolVersion);
    return res.json(reply);
  }catch(error){
    console.error('[mcp] request failed:',error?.message||error);
    return res.status(500).json(rpcError(body?.id,-32603,'Internal error'));
  }
});

router.use('/mcp',(err,req,res,next)=>{
  if(err?.type==='entity.parse.failed')return res.status(400).json(rpcError(null,-32700,'Parse error'));
  if(err?.type==='entity.too.large')return res.status(413).json(rpcError(null,-32600,'Request too large'));
  return next(err);
});

router.TOOLS=TOOLS;
router.handleMessage=handleMessage;
module.exports=router;
