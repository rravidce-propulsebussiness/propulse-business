import { INTERIOR_PACKAGES, getInteriorPackage } from '../data/interiorPackageCatalog'

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


function drawHouseLineArt(ctx,x,y,w,h){
  ctx.save();
  ctx.strokeStyle='#d8dee5';
  ctx.lineWidth=3;
  ctx.globalAlpha=.9;
  const base=y+h*.78;
  ctx.beginPath();
  ctx.moveTo(x,base);ctx.lineTo(x+w,base);
  ctx.moveTo(x+w*.12,base);ctx.lineTo(x+w*.12,y+h*.44);
  ctx.lineTo(x+w*.38,y+h*.18);
  ctx.lineTo(x+w*.64,y+h*.44);
  ctx.lineTo(x+w*.64,base);
  ctx.moveTo(x+w*.38,y+h*.18);ctx.lineTo(x+w*.86,y+h*.18);
  ctx.lineTo(x+w*.94,y+h*.34);
  ctx.lineTo(x+w*.94,base);
  ctx.moveTo(x+w*.25,base);ctx.lineTo(x+w*.25,y+h*.56);ctx.lineTo(x+w*.42,y+h*.56);ctx.lineTo(x+w*.42,base);
  ctx.moveTo(x+w*.70,base);ctx.lineTo(x+w*.70,y+h*.45);ctx.lineTo(x+w*.84,y+h*.45);ctx.lineTo(x+w*.84,base);
  ctx.stroke();
  ctx.restore();
}

function drawExactCostPanel(page,quotation){
  const{ctx}=page;
  const total=quotation.totalText||quotation.minimumText||money(quotation.total||quotation.minimum);
  ctx.fillStyle='#fff7f2';
  roundedRect(ctx,MARGIN,page.y,CONTENT_WIDTH,190,18);ctx.fill();
  ctx.fillStyle='#7b8b99';
  ctx.font='800 17px Arial, sans-serif';
  ctx.textAlign='center';
  ctx.fillText('EXACT PACKAGE QUOTATION',PAGE_WIDTH/2,page.y+42);
  ctx.fillStyle='#0a2d50';
  ctx.font='800 45px Arial, sans-serif';
  ctx.fillText(total,PAGE_WIDTH/2,page.y+102);
  ctx.fillStyle='#425f78';
  ctx.font='700 20px Arial, sans-serif';
  const detail=(quotation.packageRateText||quotation.effectiveRateText||'—')+' · '+(quotation.project?.constructionPackage||'Package')+' · '+Number(quotation.project?.builtUpArea||0).toLocaleString('en-IN')+' sq ft';
  ctx.fillText(detail,PAGE_WIDTH/2,page.y+145);
  ctx.fillStyle='#ff5a1f';
  ctx.fillRect(MARGIN+120,page.y+170,CONTENT_WIDTH-240,4);
  ctx.textAlign='left';
  page.y+=218;
}

function drawWorkCostTable(page,quotation){
  const{ctx}=page;
  const total=Number(quotation.total||quotation.minimum||0);
  const builtUp=Number(quotation.project?.builtUpArea||0);
  const floors=Math.max(1,Number(quotation.project?.floors||1));
  const rate=Number(quotation.packageRate||quotation.project?.packageRate||0);
  const floorArea=builtUp/floors;
  const names=['Ground Floor','First Floor','Second Floor','Third Floor','Fourth Floor'];
  const rows=[];
  for(let i=0;i<floors;i++){
    const area=i===floors-1?builtUp-Math.round(floorArea)*(floors-1):Math.round(floorArea);
    const amount=i===floors-1?total-rows.reduce((sum,row)=>sum+row.amount,0):Math.round(area*rate);
    rows.push({label:names[i]||('Floor '+(i+1)),area,rate,amount});
  }

  const widths=[390,200,200,246];
  const headers=['WORK DESCRIPTION','SFT','RATE','AMOUNT'];
  let x=MARGIN;
  ctx.fillStyle='#f1d1cc';
  ctx.fillRect(MARGIN,page.y,CONTENT_WIDTH,52);
  ctx.fillStyle='#173957';
  ctx.font='800 15px Arial, sans-serif';
  headers.forEach((header,index)=>{ctx.fillText(header,x+12,page.y+32);x+=widths[index]});
  page.y+=52;

  rows.forEach((row,index)=>{
    const h=58;
    ctx.fillStyle=index%2===0?'#fff':'#fbfcfd';
    ctx.fillRect(MARGIN,page.y,CONTENT_WIDTH,h);
    ctx.strokeStyle='#dfe5ea';ctx.strokeRect(MARGIN,page.y,CONTENT_WIDTH,h);
    ctx.fillStyle='#263f55';ctx.font='600 17px Arial, sans-serif';
    ctx.fillText(row.label,MARGIN+12,page.y+35);
    ctx.font='700 16px Arial, sans-serif';
    ctx.fillText(Math.round(row.area).toLocaleString('en-IN'),MARGIN+widths[0]+12,page.y+35);
    ctx.fillText(money(row.rate),MARGIN+widths[0]+widths[1]+12,page.y+35);
    ctx.fillText(money(row.amount),MARGIN+widths[0]+widths[1]+widths[2]+12,page.y+35);
    page.y+=h;
  });

  ctx.fillStyle='#0a2d50';
  ctx.fillRect(MARGIN,page.y,CONTENT_WIDTH,64);
  ctx.fillStyle='#fff';
  ctx.font='800 18px Arial, sans-serif';
  ctx.fillText('TOTAL',MARGIN+12,page.y+39);
  ctx.textAlign='right';
  ctx.fillText(money(total),PAGE_WIDTH-MARGIN-14,page.y+39);
  ctx.textAlign='left';
  page.y+=82;
}

function drawExactPaymentTable(page,schedule){
  const{ctx}=page;
  const widths=[90,610,160,176];
  const headers=['%','MILESTONE','AMOUNT','STATUS'];
  let x=MARGIN;
  ctx.fillStyle='#f1d1cc';ctx.fillRect(MARGIN,page.y,CONTENT_WIDTH,52);
  ctx.fillStyle='#173957';ctx.font='800 15px Arial, sans-serif';
  headers.forEach((header,index)=>{ctx.fillText(header,x+10,page.y+32);x+=widths[index]});
  page.y+=52;
  schedule.forEach((item,index)=>{
    const lines=wrap(ctx,item.milestone,565);
    const h=Math.max(58,26+lines.length*21);
    ctx.fillStyle=index%2===0?'#fff':'#fbfcfd';
    ctx.fillRect(MARGIN,page.y,CONTENT_WIDTH,h);
    ctx.strokeStyle='#e4e9ee';ctx.strokeRect(MARGIN,page.y,CONTENT_WIDTH,h);
    ctx.fillStyle='#173957';ctx.font='700 16px Arial, sans-serif';
    ctx.fillText(String(item.percent)+'%',MARGIN+12,page.y+31);
    ctx.font='500 15px Arial, sans-serif';
    lines.forEach((line,lineIndex)=>ctx.fillText(line,MARGIN+widths[0]+10,page.y+29+lineIndex*21));
    ctx.font='700 15px Arial, sans-serif';
    ctx.fillText(money(item.amount??item.minimum),MARGIN+widths[0]+widths[1]+10,page.y+31);
    ctx.fillStyle='#7b8b99';
    ctx.fillText('Milestone',MARGIN+widths[0]+widths[1]+widths[2]+10,page.y+31);
    page.y+=h;
  });
  page.y+=14;
}

function drawCover(page,quotation,customerName,city){
  const{ctx}=page;
  page.y=230;
  ctx.fillStyle='#ff5a1f';
  ctx.font='800 22px Arial, sans-serif';
  ctx.fillText('CONSTRUCTION QUOTATION',MARGIN,page.y);
  ctx.fillStyle='#0a2d50';
  ctx.font='800 64px Arial, sans-serif';
  ctx.fillText('Build your dream',MARGIN,page.y+86);
  ctx.fillText('home with clarity.',MARGIN,page.y+154);
  ctx.fillStyle='#5f7284';
  ctx.font='500 22px Arial, sans-serif';
  wrap(ctx,'Package pricing, project details, specifications, payment milestones and important terms in one professional quotation.',CONTENT_WIDTH-80)
    .slice(0,3).forEach((line,index)=>ctx.fillText(line,MARGIN,page.y+213+index*31));

  ctx.fillStyle='#fff7f2';
  roundedRect(ctx,MARGIN,page.y+330,CONTENT_WIDTH,220,18);ctx.fill();
  ctx.fillStyle='#7b8b99';ctx.font='800 15px Arial, sans-serif';
  ctx.fillText('CUSTOMER',MARGIN+26,page.y+370);
  ctx.fillStyle='#173957';ctx.font='800 26px Arial, sans-serif';
  ctx.fillText(customerName||'Customer',MARGIN+26,page.y+405);
  ctx.fillStyle='#7b8b99';ctx.font='800 15px Arial, sans-serif';
  ctx.fillText('SITE / LOCATION',MARGIN+26,page.y+456);
  ctx.fillStyle='#173957';ctx.font='700 21px Arial, sans-serif';
  ctx.fillText(city||'To be confirmed',MARGIN+26,page.y+490);

  ctx.fillStyle='#ff5a1f';
  roundedRect(ctx,PAGE_WIDTH-MARGIN-330,page.y+355,300,150,16);ctx.fill();
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='800 16px Arial, sans-serif';
  ctx.fillText(String(quotation.project?.constructionPackage||'PACKAGE').toUpperCase(),PAGE_WIDTH-MARGIN-180,page.y+390);
  ctx.font='800 37px Arial, sans-serif';
  ctx.fillText(quotation.packageRateText||quotation.effectiveRateText||'—',PAGE_WIDTH-MARGIN-180,page.y+440);
  ctx.font='700 15px Arial, sans-serif';
  ctx.fillText('CURRENT PROPULSE PACKAGE RATE',PAGE_WIDTH-MARGIN-180,page.y+476);
  ctx.textAlign='left';

  drawHouseLineArt(ctx,MARGIN+60,page.y+650,CONTENT_WIDTH-120,420);
  ctx.fillStyle='#0a2d50';ctx.font='800 22px Arial, sans-serif';
  ctx.fillText('ProPulse Business',MARGIN,page.y+1160);
  ctx.fillStyle='#7b8b99';ctx.font='500 16px Arial, sans-serif';
  ctx.fillText('Structured homeowner quotation · Generated from your submitted project details',MARGIN,page.y+1192);
}

function drawWhyChoose(page){
  const items=[
    ['Transparent package pricing','Quotation amount is calculated from the selected package rate and confirmed built-up area.'],
    ['Clear specifications','Material allowances and package inclusions are listed before you proceed.'],
    ['Structured payment milestones','A milestone-based payment view makes the project easier to plan.'],
    ['Relevant professionals','Your submitted requirement can be connected to relevant professionals for final commercial confirmation.'],
    ['Customer-controlled details','You can review the area, package and requirement details before final contractor engagement.'],
  ];
  drawSectionHeading(page,'Why choose ProPulse?','A clearer starting point for comparing construction options.');
  items.forEach(([title,body],index)=>{
    const y=page.y;
    const ctx=page.ctx;
    ctx.fillStyle=index%2===0?'#fff7f2':'#f7f9fb';
    roundedRect(ctx,MARGIN,y,CONTENT_WIDTH,112,12);ctx.fill();
    ctx.fillStyle='#ff5a1f';ctx.font='800 22px Arial, sans-serif';
    ctx.fillText('✓',MARGIN+20,y+39);
    ctx.fillStyle='#173957';ctx.font='800 19px Arial, sans-serif';
    ctx.fillText(title,MARGIN+58,y+35);
    ctx.fillStyle='#5f7284';ctx.font='500 16px Arial, sans-serif';
    wrap(ctx,body,CONTENT_WIDTH-90).slice(0,2).forEach((line,lineIndex)=>ctx.fillText(line,MARGIN+58,y+65+lineIndex*21));
    page.y+=124;
  });
}

async function detailedQuotationPages({quotation,flowName,flowKey,leadId,customerName,phone,email,city,pincode,rows}){
  const logo=await loadLogo();
  const pages=[];
  const addPage=(title='Detailed Quotation')=>{
    const page=createPage(logo,pages.length+1,title);
    pages.push(page);
    return page;
  };

  let page=addPage('Construction Quotation');
  drawCover(page,quotation,customerName,city);

  page=addPage('Quotation');
  drawHero(page,'Quotation Details','Customer, site and package information captured from the submitted requirement.','QUOTATION');
  drawMetaGrid(page,[
    ['Quotation No.',leadId?'PP-'+leadId:'PP-'+String(Date.now()).slice(-10)],
    ['Date',shortDate(quotation?.generatedAt)],
    ['Validity',shortDate(quotation?.validUntil)],
    ['Customer',customerName||'—'],
    ['Mobile',phone?'+91 '+String(phone).replace(/\D/g,'').slice(-10):'—'],
    ['Email',email||'Not provided'],
    ['Site Location',[city,pincode].filter(Boolean).join(' · ')||'—'],
    ['Plot Area',quotation.project?.plotArea?quotation.project.plotArea+' sq yards':'—'],
  ]);
  drawSectionHeading(page,'Package selected');
  drawKeyValueRows(page,[
    ['Package',quotation.project?.constructionPackage||'—'],
    ['Package Rate',quotation.packageRateText||quotation.effectiveRateText||'—'],
    ['Built-up Area',quotation.project?.builtUpArea?Number(quotation.project.builtUpArea).toLocaleString('en-IN')+' sq ft':'—'],
    ['Floors',quotation.project?.floors||'—'],
    ['Site Access',quotation.project?.siteAccess||'—'],
    ['Expected Start',quotation.project?.timeline||'—'],
  ]);

  page=addPage('Specification and Cost');
  drawSectionHeading(page,'Specification and Cost','Exact quotation using the current ProPulse package rate shown on the Packages page.');
  drawExactCostPanel(page,quotation);
  drawKeyValueRows(page,[
    ['Calculation',Number(quotation.project?.builtUpArea||0).toLocaleString('en-IN')+' sq ft × '+(quotation.packageRateText||'—')],
    ['Final Quotation Amount',quotation.totalText||quotation.minimumText||'—'],
    ['Package',quotation.project?.constructionPackage||'—'],
    ['Validity','30 days from generation'],
  ]);

  page=addPage('Work Description & Cost');
  drawSectionHeading(page,'Work Description & Cost','Floor-wise allocation is shown for planning clarity; the final quoted total remains the exact package-rate calculation.');
  drawWorkCostTable(page,quotation);
  drawKeyValueRows(page,[
    ['Total Built-up Area',Number(quotation.project?.builtUpArea||0).toLocaleString('en-IN')+' sq ft'],
    ['Package Rate',quotation.packageRateText||'—'],
    ['Final Amount',quotation.totalText||quotation.minimumText||'—'],
  ]);

  const specs=Array.isArray(quotation.specifications)?quotation.specifications:[];
  const chunkSize=7;
  for(let offset=0;offset<specs.length;offset+=chunkSize){
    page=addPage((quotation.project?.constructionPackage||'Package')+' Specifications');
    drawSectionHeading(
      page,
      (quotation.project?.constructionPackage||'Package')+' Specifications',
      offset===0?'Package inclusions and material allowances currently shown on ProPulse Packages.':'Continued package specifications.'
    );
    drawSpecificationCards(page,specs.slice(offset,offset+chunkSize));
  }

  page=addPage('Schedule of Payments');
  drawSectionHeading(page,'Schedule of Payments','Suggested milestone split applied to the exact quotation amount.');
  drawKeyValueRows(page,[['Total Project Cost',quotation.totalText||quotation.minimumText||'—']]);
  drawExactPaymentTable(page,quotation.paymentSchedule||[]);

  page=addPage('Work Schedule & Exclusions');
  drawSectionHeading(page,'Work Schedule and Completion Time');
  drawKeyValueRows(page,[
    ['Estimated Duration',quotation.estimatedDuration||'—'],
    ['Expected Start',quotation.project?.timeline||'—'],
  ]);
  drawSectionHeading(page,'Works / Costs Not Included','Unless specifically included in the selected package or final contractor agreement.');
  drawBullets(page,quotation.exclusions||[]);

  page=addPage('Points to Note');
  drawSectionHeading(page,'Points to Note','Important commercial and quotation conditions.');
  drawBullets(page,quotation.terms||[]);
  if(quotation.project?.additional){
    page.y+=14;
    drawSectionHeading(page,'Additional Requirement');
    drawKeyValueRows(page,[['Customer Notes',quotation.project.additional]]);
  }

  page=addPage('Why Choose ProPulse');
  drawWhyChoose(page);

  page=addPage('Thank You');
  page.y=300;
  page.ctx.textAlign='center';
  page.ctx.fillStyle='#ff5a1f';
  page.ctx.font='800 20px Arial, sans-serif';
  page.ctx.fillText('THANK YOU FOR CHOOSING PROPULSE',PAGE_WIDTH/2,page.y);
  page.ctx.fillStyle='#0a2d50';
  page.ctx.font='800 52px Arial, sans-serif';
  page.ctx.fillText('Your quotation is ready.',PAGE_WIDTH/2,page.y+82);
  page.ctx.fillStyle='#5f7284';
  page.ctx.font='500 20px Arial, sans-serif';
  wrap(page.ctx,'Use this document to review your package, project area, exact package-rate amount, specifications and payment plan before final contractor confirmation.',CONTENT_WIDTH-120)
    .slice(0,4).forEach((line,index)=>page.ctx.fillText(line,PAGE_WIDTH/2,page.y+135+index*29));
  page.ctx.fillStyle='#fff7f2';
  roundedRect(page.ctx,MARGIN+110,page.y+310,CONTENT_WIDTH-220,190,18);page.ctx.fill();
  page.ctx.fillStyle='#7b8b99';page.ctx.font='800 15px Arial, sans-serif';
  page.ctx.fillText('FINAL QUOTATION AMOUNT',PAGE_WIDTH/2,page.y+355);
  page.ctx.fillStyle='#0a2d50';page.ctx.font='800 44px Arial, sans-serif';
  page.ctx.fillText(quotation.totalText||quotation.minimumText||'—',PAGE_WIDTH/2,page.y+420);
  page.ctx.fillStyle='#425f78';page.ctx.font='700 18px Arial, sans-serif';
  page.ctx.fillText((quotation.project?.constructionPackage||'Package')+' · '+(quotation.packageRateText||'—'),PAGE_WIDTH/2,page.y+462);
  page.ctx.textAlign='left';
  drawHouseLineArt(page.ctx,MARGIN+120,page.y+600,CONTENT_WIDTH-240,350);
  page.ctx.fillStyle='#5f7284';page.ctx.font='500 15px Arial, sans-serif';
  wrap(page.ctx,quotation.disclaimer||'',CONTENT_WIDTH-80).slice(0,5).forEach((line,index)=>page.ctx.fillText(line,MARGIN+40,page.y+1040+index*22));

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


export async function downloadInteriorBrochurePdf({
  packageKey='standard',
  requestId,
  customerName='',
  city='',
}={}){
  const logo=await loadLogo();
  const selected=getInteriorPackage(packageKey);
  const pages=[];

  const cover=createPage(logo,1,'Interior Package Brochure');
  pages.push(cover);
  cover.y=250;
  cover.ctx.fillStyle='#ff5a1f';
  cover.ctx.font='800 18px Arial, sans-serif';
  cover.ctx.fillText('INTERIOR PACKAGE BROCHURE',MARGIN,cover.y);
  cover.ctx.fillStyle='#0a2d50';
  cover.ctx.font='800 58px Arial, sans-serif';
  cover.ctx.fillText(selected.name+' Interiors',MARGIN,cover.y+78);
  cover.ctx.fillStyle='#5f7284';
  cover.ctx.font='500 20px Arial, sans-serif';
  wrap(cover.ctx,selected.description,CONTENT_WIDTH-50).slice(0,3).forEach((line,index)=>cover.ctx.fillText(line,MARGIN,cover.y+126+index*30));

  cover.ctx.fillStyle='#fff7f2';
  roundedRect(cover.ctx,MARGIN,cover.y+245,CONTENT_WIDTH,250,18);cover.ctx.fill();
  cover.ctx.fillStyle='#7b8b99';
  cover.ctx.font='800 14px Arial, sans-serif';
  cover.ctx.fillText('SELECTED PACKAGE',MARGIN+28,cover.y+286);
  cover.ctx.fillStyle='#0a2d50';
  cover.ctx.font='800 38px Arial, sans-serif';
  cover.ctx.fillText(selected.name,MARGIN+28,cover.y+338);
  cover.ctx.fillStyle='#ff5a1f';
  cover.ctx.font='800 34px Arial, sans-serif';
  cover.ctx.fillText(money(selected.price)+'/sq ft',MARGIN+28,cover.y+393);
  cover.ctx.fillStyle='#6f8190';
  cover.ctx.font='600 16px Arial, sans-serif';
  cover.ctx.fillText('Package reference rate — not a final project quotation',MARGIN+28,cover.y+429);

  const meta=[];
  if(requestId)meta.push(['Request ID','#'+requestId]);
  if(customerName)meta.push(['Customer',customerName]);
  if(city)meta.push(['Location',city]);
  if(meta.length){
    cover.y+=540;
    drawMetaGrid(cover,meta);
  }else{
    cover.y+=560;
  }

  drawSectionHeading(cover,'Package Highlights');
  drawBullets(cover,selected.highlights||[]);

  const specsPage=createPage(logo,2,selected.name+' Package');
  pages.push(specsPage);
  drawHero(specsPage,selected.name+' Interior Package','Material and finish references currently shown on the ProPulse Packages page.','PACKAGE SPECIFICATIONS');
  drawSpecificationCards(specsPage,Object.entries(selected.specs||{}));
  specsPage.y+=8;
  specsPage.ctx.fillStyle='#fff7f2';
  roundedRect(specsPage.ctx,MARGIN,specsPage.y,CONTENT_WIDTH,145,12);specsPage.ctx.fill();
  specsPage.ctx.fillStyle='#b24a1f';
  specsPage.ctx.font='800 16px Arial, sans-serif';
  specsPage.ctx.fillText('IMPORTANT',MARGIN+20,specsPage.y+32);
  specsPage.ctx.fillStyle='#5f7284';
  specsPage.ctx.font='500 16px Arial, sans-serif';
  wrap(specsPage.ctx,'This brochure is a package guide, not a final quotation. Final interior price depends on site measurements, selected work, design, quantities, brands, materials, taxes and site conditions.',CONTENT_WIDTH-40)
    .forEach((line,index)=>specsPage.ctx.fillText(line,MARGIN+20,specsPage.y+64+index*22));

  const compare=createPage(logo,3,'Interior Package Comparison');
  pages.push(compare);
  drawHero(compare,'Compare Interior Packages','Use this guide to review the current ProPulse interior package references before final commercial confirmation.','PACKAGE COMPARISON');

  const colLabel=280;
  const packageWidth=(CONTENT_WIDTH-colLabel)/INTERIOR_PACKAGES.length;
  compare.ctx.fillStyle='#0a2d50';
  compare.ctx.fillRect(MARGIN,compare.y,CONTENT_WIDTH,62);
  compare.ctx.fillStyle='#fff';
  compare.ctx.font='800 16px Arial, sans-serif';
  compare.ctx.fillText('Specification',MARGIN+14,compare.y+38);
  INTERIOR_PACKAGES.forEach((pkg,index)=>{
    compare.ctx.fillText(pkg.name,MARGIN+colLabel+index*packageWidth+14,compare.y+38);
  });
  compare.y+=62;

  const specLabels=[...new Set(INTERIOR_PACKAGES.flatMap(pkg=>Object.keys(pkg.specs||{})))];
  const rows=[
    ['Reference Rate',...INTERIOR_PACKAGES.map(pkg=>money(pkg.price)+'/sq ft')],
    ...specLabels.map(label=>[label,...INTERIOR_PACKAGES.map(pkg=>pkg.specs?.[label]||'—')]),
  ];

  rows.forEach((row,rowIndex)=>{
    const values=row.slice(1);
    const lineSets=values.map(value=>wrap(compare.ctx,value,packageWidth-28));
    const labelLines=wrap(compare.ctx,row[0],colLabel-28);
    const maxLines=Math.max(labelLines.length,...lineSets.map(lines=>lines.length));
    const h=Math.max(58,28+maxLines*22);
    compare.ctx.fillStyle=rowIndex%2===0?'#fbfcfd':'#fff7f2';
    compare.ctx.fillRect(MARGIN,compare.y,CONTENT_WIDTH,h);
    compare.ctx.strokeStyle='#e3e8ed';
    compare.ctx.strokeRect(MARGIN,compare.y,CONTENT_WIDTH,h);
    compare.ctx.fillStyle='#173957';
    compare.ctx.font='700 15px Arial, sans-serif';
    labelLines.forEach((line,index)=>compare.ctx.fillText(line,MARGIN+14,compare.y+29+index*21));
    values.forEach((value,index)=>{
      compare.ctx.fillStyle='#526b82';
      compare.ctx.font='500 14px Arial, sans-serif';
      lineSets[index].forEach((line,lineIndex)=>compare.ctx.fillText(line,MARGIN+colLabel+index*packageWidth+14,compare.y+29+lineIndex*21));
    });
    compare.y+=h;
  });

  savePdf(pages,'propulse-interior-'+selected.key+'-package-brochure-'+(requestId||Date.now())+'.pdf');
}
