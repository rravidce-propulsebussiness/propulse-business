const crypto = require('crypto');
const pool = require('../config/database');
const customerFlowService = require('./customerFlowService');
const { isEmpty, isVisible, formatAnswer } = require('./customerFlowValidationService');

const PDF_SECRET = process.env.ESTIMATE_PDF_SECRET || process.env.FLOW_TOKEN_SECRET || process.env.JWT_SECRET || 'development-estimate-pdf-secret-only';
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 48;
const RIGHT = 547;

function fail(message, code='ESTIMATE_PDF_ERROR', status=400) {
  throw Object.assign(new Error(message),{code,status});
}

function safeAscii(value) {
  return String(value ?? '')
    .replace(/₹/g,'Rs. ')
    .replace(/[–—]/g,'-')
    .replace(/[“”]/g,'"')
    .replace(/[‘’]/g,"'")
    .replace(/•/g,'-')
    .replace(/[^\x20-\x7E]/g,'?');
}

function pdfEscape(value) {
  return safeAscii(value).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
}

function wrapText(value, maxChars=88) {
  const words=safeAscii(value).trim().split(/\s+/).filter(Boolean);
  if(!words.length)return [''];
  const lines=[];
  let line='';
  for(const word of words){
    if(!line){line=word;continue}
    if((line+' '+word).length<=maxChars){line+=' '+word;continue}
    lines.push(line);line=word;
  }
  if(line)lines.push(line);
  return lines;
}

function tokenSignature(publicId, expiresAt) {
  return crypto.createHmac('sha256',PDF_SECRET).update(`${publicId}.${expiresAt}`).digest('base64url');
}

function createPdfToken(publicId, ttlSeconds=7200) {
  const expiresAt=Math.floor(Date.now()/1000)+Math.max(300,Number(ttlSeconds)||7200);
  return `${expiresAt}.${tokenSignature(publicId,expiresAt)}`;
}

function verifyPdfToken(publicId, token) {
  const parts=String(token||'').split('.');
  if(parts.length!==2)fail('Estimate download link is invalid','INVALID_ESTIMATE_PDF_TOKEN',403);
  const expiresAt=Number(parts[0]);
  if(!Number.isInteger(expiresAt)||expiresAt<Math.floor(Date.now()/1000))fail('Estimate download link has expired','ESTIMATE_PDF_TOKEN_EXPIRED',403);
  const expected=Buffer.from(tokenSignature(publicId,expiresAt));
  const actual=Buffer.from(parts[1]||'');
  if(expected.length!==actual.length||!crypto.timingSafeEqual(expected,actual))fail('Estimate download link is invalid','INVALID_ESTIMATE_PDF_TOKEN',403);
  return true;
}

function selectedPackage(packages, answers) {
  for(const item of Array.isArray(packages)?packages:[]){
    if(item?.isActive===false||!item?.selectorQuestionKey)continue;
    const answer=answers?.[item.selectorQuestionKey];
    const matched=Array.isArray(answer)?answer.map(String).includes(String(item.selectorValue)):String(answer??'')===String(item.selectorValue);
    if(matched)return item;
  }
  return null;
}

function pageBuilder(pageNumber,totalPages) {
  const ops=[];
  const text=(x,y,value,size=10,bold=false)=>{
    ops.push(`BT /${bold?'F2':'F1'} ${size} Tf ${x} ${y} Td (${pdfEscape(value)}) Tj ET`);
  };
  const line=(x1,y1,x2,y2,width=.6)=>{
    ops.push(`${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
  };
  const rect=(x,y,w,h,fillGray=.97,strokeGray=.88)=>{
    ops.push(`${fillGray} g ${x} ${y} ${w} ${h} re f`);
    ops.push(`${strokeGray} G ${x} ${y} ${w} ${h} re S 0 G 0 g`);
  };
  text(LEFT,810,'PRO PULSE - PROJECT ESTIMATE',9,true);
  text(RIGHT-86,810,`Page ${pageNumber} of ${totalPages}`,8,false);
  line(LEFT,800,RIGHT,800,.8);
  text(LEFT,24,'Indicative estimate - final pricing depends on site review, drawings, measurements and approved specifications.',7,false);
  return {ops,text,line,rect};
}

function makePdfDocument(pages) {
  const pageCount=pages.length;
  const fontRegularId=3+pageCount*2;
  const fontBoldId=fontRegularId+1;
  const objects=[];
  objects[1]=`<< /Type /Catalog /Pages 2 0 R >>`;
  const kids=[];
  for(let i=0;i<pageCount;i++){
    const pageId=3+i*2,contentId=4+i*2;
    kids.push(`${pageId} 0 R`);
    const stream=pages[i].join('\n');
    objects[pageId]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId]=`<< /Length ${Buffer.byteLength(stream,'ascii')} >>\nstream\n${stream}\nendstream`;
  }
  objects[2]=`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pageCount} >>`;
  objects[fontRegularId]=`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;
  objects[fontBoldId]=`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`;

  let pdf='%PDF-1.4\n';
  const offsets=[0];
  for(let id=1;id<objects.length;id++){
    offsets[id]=Buffer.byteLength(pdf,'ascii');
    pdf+=`${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref=Buffer.byteLength(pdf,'ascii');
  pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for(let id=1;id<objects.length;id++)pdf+=String(offsets[id]).padStart(10,'0')+' 00000 n \n';
  pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf,'ascii');
}

function money(value) {
  const amount=Number(value);
  if(!Number.isFinite(amount))return 'Rs. 0';
  const prefix=amount<0?'-Rs. ':'Rs. ';
  return prefix+Math.abs(amount).toLocaleString('en-IN',{maximumFractionDigits:2});
}

function moneyRange(minimum,maximum) {
  const min=Number(minimum),max=Number(maximum);
  if(Number.isFinite(min)&&Number.isFinite(max)&&Math.abs(min-max)<0.005)return money(min);
  return `${money(minimum)} - ${money(maximum)}`;
}

function renderEstimatePdf(data) {
  const sections=[];
  const mode=String(data.answers?.estimate_mode||'rough').toLowerCase();
  const singleExperience=data.flow?.config?.estimateExperience==='single';
  const modeLabel=singleExperience?String(data.flow?.config?.estimateLabel||'Project Estimate'):(mode==='detailed'?'Detailed Estimate':'Rough Estimate');
  sections.push({type:'title',title:data.flow.name||'Project Cost Estimate',subtitle:modeLabel});
  const summaryRows=[
    ['Customer',data.lead.customer_name||'Customer'],
    ['Mobile',data.lead.customer_phone||''],
    ['Email',data.lead.customer_email||'Not provided'],
    ['Location',[data.cityName,data.stateName,data.pincode].filter(Boolean).join(', ')],
    ['Estimate ID',data.publicId],
    ['Estimate version',`v${data.versionNo}`],
    ['Generated',data.createdAt?new Date(data.createdAt).toISOString().slice(0,10):''],
    ['Estimate range',moneyRange(data.minimum,data.maximum)],
  ];
  const builtUpArea=Number(data.answers?.built_up_area);
  if(Number.isFinite(builtUpArea)&&builtUpArea>0){
    summaryRows.push(['Built-up area',`${builtUpArea.toLocaleString('en-IN')} sq ft`]);
    summaryRows.push(['Average estimate / sq ft',moneyRange(Number(data.minimum)/builtUpArea,Number(data.maximum)/builtUpArea)]);
  }
  sections.push({type:'summary',rows:summaryRows});

  const breakdownRows=(Array.isArray(data.breakdown)?data.breakdown:[]).map(item=>[
    item.kind==='adjustment'?`${item.label} (adjustment)`:item.label,
    moneyRange(item.minimum,item.maximum),
  ]);
  if(breakdownRows.length){
    sections.push({type:'heading',text:'Estimate calculation'});
    sections.push({type:'table',title:'Cost breakdown',rows:breakdownRows});
    sections.push({type:'note',text:'The line items below are the exact saved calculation breakdown for this estimate version. The total estimate range above is the authoritative result.'});
  }

  if(data.package){
    sections.push({type:'heading',text:`${data.package.label} package`});
    if(data.package.summary)sections.push({type:'paragraph',text:data.package.summary});
    if(data.package.priceNote)sections.push({type:'note',text:data.package.priceNote});
    const activeDetails=(data.package.details||[]).filter(detail=>detail.isActive!==false);
    if(mode!=='rough'){
      const bySection=new Map();
      for(const detail of activeDetails){
        const key=detail.section||'Specifications';
        if(!bySection.has(key))bySection.set(key,[]);
        bySection.get(key).push([detail.label,detail.note?`${detail.value} - ${detail.note}`:detail.value]);
      }
      for(const [section,rows] of bySection)sections.push({type:'table',title:section,rows});
    }else if(activeDetails.length){
      sections.push({type:'table',title:'Package highlights',rows:activeDetails.slice(0,6).map(detail=>[
        detail.label,
        detail.note?`${detail.value} - ${detail.note}`:detail.value,
      ])});
      if(activeDetails.length>6)sections.push({type:'note',text:'This rough estimate shows package highlights only. Use Detailed Estimate to include the full published specification catalogue in the PDF.'});
    }
  }

  const detailedPattern=/specification|laminate|hardware|finish|flooring|brick|steel|cement|sand|wire|switch/i;
  const detailed=data.answerRows.filter(row=>detailedPattern.test(row[0]));
  const projectRows=data.answerRows.filter(row=>!detailedPattern.test(row[0]));
  sections.push({type:'heading',text:'Project details'});
  sections.push({type:'table',rows:projectRows});

  if(detailed.length){
    sections.push({type:'heading',text:'Detailed selections'});
    sections.push({type:'table',rows:detailed});
  }

  if(data.consultationTitle||data.consultationText){
    sections.push({type:'heading',text:data.consultationTitle||'Consultation next step'});
    sections.push({type:'paragraph',text:data.consultationText||'Use this saved estimate and project brief during the consultation so measurements, site conditions, drawings and final specifications can be confirmed without re-entering the same information.'});
  }

  sections.push({type:'heading',text:'Estimate notes'});
  sections.push({type:'paragraph',text:data.disclaimer||'This is an indicative planning estimate. Final quotation may change after site inspection, measurements, drawings, specifications and professional review.'});
  sections.push({type:'note',text:'This estimate is based on the package and pricing configuration active when it was generated. Later price changes do not alter this saved estimate.'});

  const rawPages=[[]];
  let pageIndex=0;
  let y=770;
  const startNewPage=()=>{rawPages.push([]);pageIndex+=1;y=770};
  const ensure=height=>{if(y-height<55)startNewPage()};
  const pushText=(value,size=10,bold=false,indent=0,maxChars=90,leading=13)=>{
    const lines=wrapText(value,maxChars);
    ensure(lines.length*leading+4);
    for(const line of lines){rawPages[pageIndex].push({kind:'text',x:LEFT+indent,y,text:line,size,bold});y-=leading}
  };
  const pushRule=()=>{ensure(12);rawPages[pageIndex].push({kind:'line',x1:LEFT,y1:y,x2:RIGHT,y2:y});y-=12};

  for(const section of sections){
    if(section.type==='title'){
      ensure(78);
      pushText(section.title,24,true,0,45,27);
      pushText(section.subtitle,11,true,0,80,17);
      y-=4;pushRule();
    }else if(section.type==='heading'){
      y-=4;pushText(section.text,14,true,0,65,19);y-=2;
    }else if(section.type==='paragraph'){
      pushText(section.text,9,false,0,92,13);y-=5;
    }else if(section.type==='note'){
      ensure(34);
      const lines=wrapText(section.text,84);
      const h=lines.length*12+14;
      rawPages[pageIndex].push({kind:'rect',x:LEFT,y:y-h+5,w:RIGHT-LEFT,h});
      y-=7;
      for(const line of lines){rawPages[pageIndex].push({kind:'text',x:LEFT+8,y,text:line,size:8,bold:false});y-=12}
      y-=5;
    }else if(section.type==='summary'||section.type==='table'){
      if(section.title){pushText(section.title,10,true,0,70,15)}
      for(const row of section.rows||[]){
        const left=String(row[0]||''),right=String(row[1]||'');
        const rightLines=wrapText(right,58);
        const h=Math.max(24,rightLines.length*11+10);
        ensure(h+2);
        rawPages[pageIndex].push({kind:'rect',x:LEFT,y:y-h+5,w:RIGHT-LEFT,h,fillGray:.99,strokeGray:.91});
        rawPages[pageIndex].push({kind:'text',x:LEFT+8,y:y-7,text:left,size:8,bold:true});
        let ry=y-7;
        for(const line of rightLines){rawPages[pageIndex].push({kind:'text',x:LEFT+178,y:ry,text:line,size:8,bold:false});ry-=11}
        y-=h+2;
      }
      y-=6;
    }
  }

  const total=rawPages.length;
  const rendered=rawPages.map((items,index)=>{
    const page=pageBuilder(index+1,total);
    for(const item of items){
      if(item.kind==='text')page.text(item.x,item.y,item.text,item.size,item.bold);
      else if(item.kind==='line')page.line(item.x1,item.y1,item.x2,item.y2);
      else if(item.kind==='rect')page.rect(item.x,item.y,item.w,item.h,item.fillGray,item.strokeGray);
    }
    return page.ops;
  });
  return makePdfDocument(rendered);
}

async function getEstimatePdf(publicId, token) {
  const id=String(publicId||'').trim();
  if(!/^[A-Za-z0-9_-]{20,64}$/.test(id))fail('Estimate not found','ESTIMATE_NOT_FOUND',404);
  verifyPdfToken(id,token);

  const row=(await pool.query(
    `SELECT ec.*,c.name city_name,st.name state_name,l.customer_name,l.customer_phone,l.customer_email,
            d.name flow_name,v.version_no,v.config
       FROM estimator_calculations ec
       JOIN customer_flow_definitions d ON d.id=ec.definition_id
       JOIN customer_flow_versions v ON v.id=ec.version_id
       LEFT JOIN cities c ON c.id=ec.city_id
       LEFT JOIN states st ON st.id=c.state_id
       LEFT JOIN leads l ON l.id=ec.lead_id
      WHERE ec.public_id=$1 LIMIT 1`,
    [id]
  )).rows[0];
  if(!row)fail('Estimate not found','ESTIMATE_NOT_FOUND',404);
  if(!row.customer_name||!row.customer_phone)fail('Estimate contact details are incomplete','ESTIMATE_CONTACT_REQUIRED',409);

  const flow=await customerFlowService.getVersionFlow(row.version_id);
  const answers=row.answers&&typeof row.answers==='object'&&!Array.isArray(row.answers)?row.answers:{};
  const answerRows=[];
  for(const question of flow.questions||[]){
    if(!isVisible(question,answers)||isEmpty(answers[question.questionKey])||question.visibility==='internal')continue;
    const value=formatAnswer(question,answers[question.questionKey]);
    if(value)answerRows.push([question.label,value]);
  }
  const packageSnapshot=selectedPackage(row.config_snapshot?.packages||flow.packages,answers);
  const disclaimer=String(flow.config?.estimatorDisclaimer||'Indicative planning estimate only. Final pricing depends on site inspection, drawings, measurements, materials and final quotation.');
  const buffer=renderEstimatePdf({
    publicId:id,flow,versionNo:row.version_no,minimum:row.result_min,maximum:row.result_max,createdAt:row.created_at,
    cityName:row.city_name,stateName:row.state_name,pincode:row.pincode,answers,answerRows,breakdown:Array.isArray(row.breakdown)?row.breakdown:[],
    package:packageSnapshot,disclaimer,
    consultationTitle:String(flow.config?.consultationTitle||'Consultation next step'),
    consultationText:String(flow.config?.consultationText||'Use this saved estimate and project brief during the consultation so measurements, site conditions, drawings and final specifications can be confirmed without re-entering the same information.'),
    lead:{customer_name:row.customer_name,customer_phone:row.customer_phone,customer_email:row.customer_email},
  });
  return {buffer,filename:`propulse-estimate-${id.slice(0,8)}.pdf`};
}

module.exports={createPdfToken,verifyPdfToken,getEstimatePdf,renderEstimatePdf};
