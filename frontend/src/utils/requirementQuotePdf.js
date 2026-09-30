const PAGE_WIDTH=1240;
const PAGE_HEIGHT=1754;
const PDF_WIDTH=595.28;
const PDF_HEIGHT=841.89;
const MARGIN=82;
const CONTENT_WIDTH=PAGE_WIDTH-MARGIN*2;
const encoder=new TextEncoder();

function bytes(text){return encoder.encode(text)}
function dataUrlBytes(dataUrl){
  const base64=String(dataUrl).split(',')[1]||'';
  const binary=atob(base64);
  const out=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);
  return out;
}
function concat(chunks){
  const length=chunks.reduce((sum,item)=>sum+item.length,0);
  const out=new Uint8Array(length);
  let offset=0;
  chunks.forEach(item=>{out.set(item,offset);offset+=item.length});
  return out;
}
function wrap(ctx,text,maxWidth){
  const source=String(text??'').trim()||'—';
  const words=source.split(/\s+/);
  const lines=[];
  let line='';
  words.forEach(word=>{
    const next=line?line+' '+word:word;
    if(ctx.measureText(next).width<=maxWidth||!line)line=next;
    else{lines.push(line);line=word}
  });
  if(line)lines.push(line);
  return lines.length?lines:['—'];
}
function money(value){
  const number=Number(value||0);
  return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number.isFinite(number)?number:0);
}
function shortDate(value){
  const date=value?new Date(value):new Date();
  return Number.isNaN(date.getTime())?'—':date.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
}
async function loadLogo(){
  return new Promise(resolve=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>resolve(null);
    image.src='/brand/propulse-logo.svg';
  });
}
function createPage(logo,pageNo,title='Quotation'){
  const canvas=document.createElement('canvas');
  canvas.width=PAGE_WIDTH;
  canvas.height=PAGE_HEIGHT;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#ffffff';
  ctx.fillRect(0,0,PAGE_WIDTH,PAGE_HEIGHT);

  if(logo)ctx.drawImage(logo,MARGIN,45,260,78);
  else{
    ctx.fillStyle='#0a2d50';
    ctx.font='800 38px Arial, sans-serif';
    ctx.fillText('ProPulse',MARGIN,98);
  }

  ctx.textAlign='right';
  ctx.fillStyle='#0a2d50';
  ctx.font='800 24px Arial, sans-serif';
  ctx.fillText(title, PAGE_WIDTH-MARGIN, 78);
  ctx.fillStyle='#7c8b99';
  ctx.font='500 16px Arial, sans-serif';
  ctx.fillText('Building spaces. Elevating lives.',PAGE_WIDTH-MARGIN,104);
  ctx.textAlign='left';

  ctx.fillStyle='#ff5a1f';
  ctx.fillRect(MARGIN,138,CONTENT_WIDTH,5);

  ctx.fillStyle='#8a98a7';
  ctx.font='500 15px Arial, sans-serif';
  ctx.fillText('ProPulse Business',MARGIN,1698);
  ctx.textAlign='right';
  ctx.fillText('Page '+pageNo,PAGE_WIDTH-MARGIN,1698);
  ctx.textAlign='left';

  return{canvas,ctx,y:196};
}
function roundedRect(ctx,x,y,w,h,r=12){
  ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);
  else ctx.rect(x,y,w,h);
}
function drawHero(page,title,subtitle,kicker='INDICATIVE QUOTATION'){
  const{ctx}=page;
  ctx.fillStyle='#fff7f2';
  roundedRect(ctx,MARGIN,page.y,CONTENT_WIDTH,190,18);ctx.fill();
  ctx.fillStyle='#ff5a1f';
  ctx.font='800 18px Arial, sans-serif';
  ctx.fillText(kicker,MARGIN+28,page.y+39);
  ctx.fillStyle='#0a2d50';
  ctx.font='800 48px Arial, sans-serif';
  wrap(ctx,title,CONTENT_WIDTH-56).slice(0,2).forEach((line,index)=>ctx.fillText(line,MARGIN+28,page.y+91+index*52));
  ctx.fillStyle='#5f7284';
  ctx.font='500 20px Arial, sans-serif';
  wrap(ctx,subtitle,CONTENT_WIDTH-56).slice(0,2).forEach((line,index)=>ctx.fillText(line,MARGIN+28,page.y+151+index*28));
  page.y+=216;
}
function drawSectionHeading(page,text,subtext=''){
  const{ctx}=page;
  ctx.fillStyle='#ff5a1f';
  ctx.font='800 21px Arial, sans-serif';
  ctx.fillText(String(text).toUpperCase(),MARGIN,page.y);
  page.y+=28;
  if(subtext){
    ctx.fillStyle='#718394';
    ctx.font='500 16px Arial, sans-serif';
    wrap(ctx,subtext,CONTENT_WIDTH).forEach(line=>{ctx.fillText(line,MARGIN,page.y);page.y+=22});
    page.y+=8;
  }
}
function drawMetaGrid(page,items){
  const{ctx}=page;
  const gap=18;
  const width=(CONTENT_WIDTH-gap)/2;
  items.forEach((item,index)=>{
    const x=MARGIN+(index%2)*(width+gap);
    const y=page.y+Math.floor(index/2)*90;
    ctx.fillStyle='#f7f9fb';
    roundedRect(ctx,x,y,width,72,10);ctx.fill();
    ctx.fillStyle='#7b8b99';
    ctx.font='700 14px Arial, sans-serif';
    ctx.fillText(String(item[0]).toUpperCase(),x+16,y+22);
    ctx.fillStyle='#173957';
    ctx.font='700 20px Arial, sans-serif';
    wrap(ctx,item[1],width-32).slice(0,2).forEach((line,lineIndex)=>ctx.fillText(line,x+16,y+49+lineIndex*21));
  });
  page.y+=Math.ceil(items.length/2)*90+12;
}
function drawCostCards(page,quotation){
  const{ctx}=page;
  const width=(CONTENT_WIDTH-24)/3;
  const cards=[
    ['ESTIMATED MINIMUM',quotation.minimumText||money(quotation.minimum)],
    ['ESTIMATED MAXIMUM',quotation.maximumText||money(quotation.maximum)],
    ['EFFECTIVE RATE',quotation.effectiveRateText||'—'],
  ];
  cards.forEach(([label,value],index)=>{
    const x=MARGIN+index*(width+12);
    ctx.fillStyle=index===1?'#0a2d50':'#fff7f2';
    roundedRect(ctx,x,page.y,width,104,12);ctx.fill();
    ctx.fillStyle=index===1?'#cdddea':'#a4512e';
    ctx.font='800 13px Arial, sans-serif';
    ctx.fillText(label,x+16,page.y+28);
    ctx.fillStyle=index===1?'#fff':'#0a2d50';
    ctx.font='800 22px Arial, sans-serif';
    wrap(ctx,value,width-32).slice(0,2).forEach((line,lineIndex)=>ctx.fillText(line,x+16,page.y+62+lineIndex*22));
  });
  page.y+=124;
}
function drawKeyValueRows(page,rows){
  const{ctx}=page;
  for(const [label,value] of rows){
    const valueLines=wrap(ctx,value,690);
    const labelLines=wrap(ctx,label,280);
    const height=Math.max(64,26+Math.max(valueLines.length,labelLines.length)*24);
    ctx.fillStyle='#fbfcfd';
    ctx.strokeStyle='#e3e8ed';
    ctx.lineWidth=1.5;
    roundedRect(ctx,MARGIN,page.y,CONTENT_WIDTH,height,9);ctx.fill();ctx.stroke();
    ctx.fillStyle='#526b82';
    ctx.font='700 17px Arial, sans-serif';
    labelLines.forEach((line,index)=>ctx.fillText(line,MARGIN+18,page.y+29+index*23));
    ctx.fillStyle='#173957';
    ctx.font='500 18px Arial, sans-serif';
    valueLines.forEach((line,index)=>ctx.fillText(line,MARGIN+330,page.y+29+index*24));
    page.y+=height+9;
  }
}
function drawBreakdownTable(page,rows){
  const{ctx}=page;
  const col1=500,col2=268,col3=268;
  ctx.fillStyle='#0a2d50';
  ctx.fillRect(MARGIN,page.y,CONTENT_WIDTH,50);
  ctx.fillStyle='#fff';
  ctx.font='800 16px Arial, sans-serif';
  ctx.fillText('Cost component',MARGIN+15,page.y+31);
  ctx.fillText('Minimum',MARGIN+col1+15,page.y+31);
  ctx.fillText('Maximum',MARGIN+col1+col2+15,page.y+31);
  page.y+=50;
  rows.forEach((row,index)=>{
    const h=58;
    ctx.fillStyle=index%2===0?'#fbfcfd':'#fff';
    ctx.fillRect(MARGIN,page.y,CONTENT_WIDTH,h);
    ctx.strokeStyle='#e4e9ee';ctx.strokeRect(MARGIN,page.y,CONTENT_WIDTH,h);
    ctx.fillStyle='#263f55';ctx.font='600 17px Arial, sans-serif';
    ctx.fillText(String(row.label||'Cost item').slice(0,48),MARGIN+15,page.y+35);
    ctx.fillStyle='#173957';ctx.font='700 17px Arial, sans-serif';
    ctx.fillText(row.minimumText||money(row.minimum),MARGIN+col1+15,page.y+35);
    ctx.fillText(row.maximumText||money(row.maximum),MARGIN+col1+col2+15,page.y+35);
    page.y+=h;
  });
  page.y+=16;
}
function drawSpecificationCards(page,specifications){
  const{ctx}=page;
  specifications.forEach(([label,value],index)=>{
    const lines=wrap(ctx,value,735);
    const height=Math.max(78,42+lines.length*23);
    ctx.fillStyle=index%2===0?'#fbfcfd':'#fff7f2';
    roundedRect(ctx,MARGIN,page.y,CONTENT_WIDTH,height,10);ctx.fill();
    ctx.fillStyle='#0a2d50';ctx.font='800 17px Arial, sans-serif';
    ctx.fillText(label,MARGIN+18,page.y+29);
    ctx.fillStyle='#5f7284';ctx.font='500 17px Arial, sans-serif';
    lines.forEach((line,lineIndex)=>ctx.fillText(line,MARGIN+280,page.y+29+lineIndex*23));
    page.y+=height+9;
  });
}
function drawPaymentTable(page,schedule){
  const{ctx}=page;
  const widths=[90,580,183,183];
  const headers=['%','Milestone','Minimum','Maximum'];
  let x=MARGIN;
  ctx.fillStyle='#0a2d50';ctx.fillRect(MARGIN,page.y,CONTENT_WIDTH,52);
  ctx.fillStyle='#fff';ctx.font='800 15px Arial, sans-serif';
  headers.forEach((header,index)=>{ctx.fillText(header,x+10,page.y+32);x+=widths[index]});
  page.y+=52;
  schedule.forEach((item,index)=>{
    const lines=wrap(ctx,item.milestone,540);
    const h=Math.max(58,25+lines.length*22);
    ctx.fillStyle=index%2===0?'#fbfcfd':'#fff';ctx.fillRect(MARGIN,page.y,CONTENT_WIDTH,h);
    ctx.strokeStyle='#e4e9ee';ctx.strokeRect(MARGIN,page.y,CONTENT_WIDTH,h);
    ctx.fillStyle='#173957';ctx.font='700 16px Arial, sans-serif';
    ctx.fillText(String(item.percent)+'%',MARGIN+12,page.y+31);
    ctx.font='500 16px Arial, sans-serif';
    lines.forEach((line,lineIndex)=>ctx.fillText(line,MARGIN+widths[0]+10,page.y+29+lineIndex*22));
    ctx.font='700 15px Arial, sans-serif';
    ctx.fillText(money(item.minimum),MARGIN+widths[0]+widths[1]+10,page.y+31);
    ctx.fillText(money(item.maximum),MARGIN+widths[0]+widths[1]+widths[2]+10,page.y+31);
    page.y+=h;
  });
  page.y+=14;
}
function drawBullets(page,items){
  const{ctx}=page;
  items.forEach(item=>{
    const lines=wrap(ctx,item,985);
    const h=Math.max(32,lines.length*23);
    ctx.fillStyle='#ff5a1f';ctx.beginPath();ctx.arc(MARGIN+8,page.y+12,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#526b82';ctx.font='500 17px Arial, sans-serif';
    lines.forEach((line,index)=>ctx.fillText(line,MARGIN+24,page.y+18+index*23));
    page.y+=h+5;
  });
}
function buildPdf(jpegs){
  const chunks=[];
  const offsets=[0];
  let length=0;
  const push=item=>{chunks.push(item);length+=item.length};
  const addObject=(number,parts)=>{
    offsets[number]=length;
    push(bytes(number+' 0 obj\n'));
    parts.forEach(push);
    push(bytes('\nendobj\n'));
  };

  push(new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31,0x2e,0x34,0x0a,0x25,0xe2,0xe3,0xcf,0xd3,0x0a]));
  const objectCount=2+jpegs.length*3;
  addObject(1,[bytes('<< /Type /Catalog /Pages 2 0 R >>')]);
  const kids=jpegs.map((_,i)=>(3+i*3)+' 0 R').join(' ');
  addObject(2,[bytes('<< /Type /Pages /Kids ['+kids+'] /Count '+jpegs.length+' >>')]);

  jpegs.forEach((jpeg,index)=>{
    const pageObj=3+index*3;
    const imageObj=pageObj+1;
    const contentObj=pageObj+2;
    const imageName='Im'+index;
    addObject(pageObj,[bytes('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+PDF_WIDTH+' '+PDF_HEIGHT+'] /Resources << /XObject << /'+imageName+' '+imageObj+' 0 R >> >> /Contents '+contentObj+' 0 R >>')]);
    addObject(imageObj,[
      bytes('<< /Type /XObject /Subtype /Image /Width '+PAGE_WIDTH+' /Height '+PAGE_HEIGHT+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n'),
      jpeg,
      bytes('\nendstream')
    ]);
    const command='q\n'+PDF_WIDTH+' 0 0 '+PDF_HEIGHT+' 0 0 cm\n/'+imageName+' Do\nQ';
    addObject(contentObj,[bytes('<< /Length '+bytes(command).length+' >>\nstream\n'+command+'\nendstream')]);
  });

  const xrefOffset=length;
  push(bytes('xref\n0 '+(objectCount+1)+'\n'));
  push(bytes('0000000000 65535 f \n'));
  for(let i=1;i<=objectCount;i++)push(bytes(String(offsets[i]||0).padStart(10,'0')+' 00000 n \n'));
  push(bytes('trailer\n<< /Size '+(objectCount+1)+' /Root 1 0 R >>\nstartxref\n'+xrefOffset+'\n%%EOF'));
  return concat(chunks);
}
function savePdf(images,filename){
  const pdf=buildPdf(images.map(item=>dataUrlBytes(item.canvas.toDataURL('image/jpeg',0.91))));
  const blob=new Blob([pdf],{type:'application/pdf'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

async function detailedQuotationPages({quotation,flowName,flowKey,leadId,customerName,phone,email,city,pincode,rows}){
  const logo=await loadLogo();
  const pages=[];
  const addPage=(title='Detailed Quotation')=>{
    const page=createPage(logo,pages.length+1,title);
    pages.push(page);
    return page;
  };

  let page=addPage('Detailed Quotation');
  drawHero(page,'Your '+(quotation?.title||'Project Quotation'),'Structured project pricing, specifications and milestone plan based on the details submitted to ProPulse.');
  drawMetaGrid(page,[
    ['Quotation No.',leadId?'PP-'+leadId:'PP-'+String(quotation?.calculationId||Date.now()).slice(-10)],
    ['Generated',shortDate(quotation?.generatedAt)],
    ['Valid Until',shortDate(quotation?.validUntil)],
    ['Service',flowName],
    ['Customer',customerName||'—'],
    ['Mobile',phone?'+91 '+String(phone).replace(/\D/g,'').slice(-10):'—'],
    ['Location',[city,pincode].filter(Boolean).join(' · ')||'—'],
    ['Email',email||'Not provided'],
  ]);
  drawSectionHeading(page,'Estimated project cost','This is the system-generated planning quotation from the Admin-configured rate engine.');
  drawCostCards(page,quotation);

  page=addPage('Project & Cost Details');
  drawSectionHeading(page,'Construction details');
  drawKeyValueRows(page,[
    ['Project Type',quotation.project?.projectType],
    ['Property Type',quotation.project?.propertyType],
    ['Plot Area',quotation.project?.plotArea?quotation.project.plotArea+' sq yards':'—'],
    ['Total Built-up Area',quotation.project?.builtUpArea?quotation.project.builtUpArea+' sq ft':'—'],
    ['Floors',quotation.project?.floors||'—'],
    ['Approx. Average / Floor',quotation.project?.averageFloorArea?Math.round(quotation.project.averageFloorArea)+' sq ft':'—'],
    ['Package',quotation.project?.constructionPackage],
    ['Specification Level',quotation.project?.quality],
    ['Site Access',quotation.project?.siteAccess],
    ['Basement',quotation.project?.basement],
    ['Expected Construction Duration',quotation.estimatedDuration],
  ]);
  drawSectionHeading(page,'Cost breakdown');
  drawBreakdownTable(page,quotation.costBreakdown||[]);

  page=addPage('Package Specifications');
  drawSectionHeading(page,(quotation.project?.quality||'Standard')+' package assumptions','These are planning assumptions used to make the quotation useful. The selected contractor must confirm final brands, models and quantities.');
  drawSpecificationCards(page,quotation.specifications||[]);

  page=addPage('Payment Schedule');
  drawSectionHeading(page,'Suggested milestone schedule','A structured milestone split similar to a professional construction quotation. Final payment terms are agreed with the selected business.');
  drawPaymentTable(page,quotation.paymentSchedule||[]);
  drawSectionHeading(page,'Estimated completion');
  drawKeyValueRows(page,[['Planning duration',quotation.estimatedDuration||'—'],['Quotation validity','30 days from generation']]);

  page=addPage('Scope, Exclusions & Terms');
  drawSectionHeading(page,'Customer requirement');
  drawKeyValueRows(page,(rows||[]).slice(0,18));
  if(quotation.project?.additional)drawKeyValueRows(page,[['Additional Information',quotation.project.additional]]);
  if(page.y>1180)page=addPage('Scope, Exclusions & Terms');
  drawSectionHeading(page,'Typical exclusions');
  drawBullets(page,quotation.exclusions||[]);
  if(page.y>1250)page=addPage('Terms & Notes');
  drawSectionHeading(page,'Important terms');
  drawBullets(page,quotation.terms||[]);
  page.y+=14;
  page.ctx.fillStyle='#fff7f2';
  roundedRect(page.ctx,MARGIN,page.y,CONTENT_WIDTH,130,12);page.ctx.fill();
  page.ctx.fillStyle='#b24a1f';page.ctx.font='800 18px Arial, sans-serif';
  page.ctx.fillText('IMPORTANT',MARGIN+20,page.y+30);
  page.ctx.fillStyle='#5e6f7f';page.ctx.font='500 17px Arial, sans-serif';
  const note=quotation.disclaimer||'This is an indicative quotation generated from the information provided. Final pricing is confirmed after professional review.';
  wrap(page.ctx,note,CONTENT_WIDTH-40).slice(0,4).forEach((line,index)=>page.ctx.fillText(line,MARGIN+20,page.y+59+index*23));

  return pages;
}

export async function downloadRequirementQuotePdf({
  flowName='Home Requirement',
  flowKey='requirement',
  leadId,
  customerName,
  phone,
  email,
  city,
  pincode,
  rows=[],
  quotation=null,
}={}){
  if(quotation){
    const pages=await detailedQuotationPages({quotation,flowName,flowKey,leadId,customerName,phone,email,city,pincode,rows});
    const safe=String(flowKey||'project').replace(/[^a-z0-9_-]+/gi,'-').toLowerCase();
    savePdf(pages,'propulse-'+safe+'-detailed-quotation-'+(leadId||Date.now())+'.pdf');
    return;
  }

  const logo=await loadLogo();
  const page=createPage(logo,1,'Quote Request Summary');
  drawHero(page,'Quote Request Summary','A structured record of the requirement you submitted through ProPulse.','QUOTE REQUEST');
  drawMetaGrid(page,[
    ['Request ID',leadId?'#'+leadId:'Submitted'],
    ['Submitted',new Date().toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})],
    ['Service',flowName],
    ['Location',[city,pincode].filter(Boolean).join(' · ')||'—'],
    ['Customer',customerName||'—'],
    ['Mobile',phone?'+91 '+String(phone).replace(/\D/g,'').slice(-10):'—'],
  ]);
  if(email)drawMetaGrid(page,[['Email',email]]);
  drawSectionHeading(page,'Submitted requirement');
  drawKeyValueRows(page,rows);
  page.y+=10;
  page.ctx.fillStyle='#fff7f2';roundedRect(page.ctx,MARGIN,page.y,CONTENT_WIDTH,125,12);page.ctx.fill();
  page.ctx.fillStyle='#b24a1f';page.ctx.font='800 18px Arial, sans-serif';page.ctx.fillText('IMPORTANT',MARGIN+20,page.y+30);
  page.ctx.fillStyle='#5e6f7f';page.ctx.font='500 17px Arial, sans-serif';
  const note='This is a quote request / requirement summary, not a final commercial quotation or contract. Final scope, measurements, materials, price, taxes and timeline must be confirmed by the business you choose.';
  wrap(page.ctx,note,CONTENT_WIDTH-40).forEach((line,index)=>page.ctx.fillText(line,MARGIN+20,page.y+60+index*23));
  const safe=String(flowKey||'requirement').replace(/[^a-z0-9_-]+/gi,'-').toLowerCase();
  savePdf([page],'propulse-'+safe+'-quote-request-'+(leadId||Date.now())+'.pdf');
}
