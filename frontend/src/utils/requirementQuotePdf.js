const PAGE_WIDTH=1240;
const PAGE_HEIGHT=1754;
const PDF_WIDTH=595.28;
const PDF_HEIGHT=841.89;
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
async function loadLogo(){
  return new Promise(resolve=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>resolve(null);
    image.src='/brand/propulse-logo.svg';
  });
}
function createPage(logo,pageNo){
  const canvas=document.createElement('canvas');
  canvas.width=PAGE_WIDTH;
  canvas.height=PAGE_HEIGHT;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#ffffff';
  ctx.fillRect(0,0,PAGE_WIDTH,PAGE_HEIGHT);
  if(logo)ctx.drawImage(logo,86,54,250,72);
  else{
    ctx.fillStyle='#0a2d50';
    ctx.font='700 38px Arial, sans-serif';
    ctx.fillText('ProPulse',86,102);
  }
  ctx.fillStyle='#ff5a1f';
  ctx.fillRect(86,142,1068,5);
  ctx.fillStyle='#6c7d8d';
  ctx.font='500 18px Arial, sans-serif';
  ctx.textAlign='right';
  ctx.fillText('Building spaces. Elevating lives.',1154,100);
  ctx.textAlign='left';
  ctx.fillStyle='#8a98a7';
  ctx.font='500 16px Arial, sans-serif';
  ctx.fillText('ProPulse Business · Quote Request Summary',86,1690);
  ctx.textAlign='right';
  ctx.fillText('Page '+pageNo,1154,1690);
  ctx.textAlign='left';
  return{canvas,ctx,y:210};
}
function drawTitle(page,title,subtitle){
  const{ctx}=page;
  ctx.fillStyle='#0a2d50';
  ctx.font='800 48px Arial, sans-serif';
  ctx.fillText(title,86,page.y);
  page.y+=58;
  ctx.fillStyle='#60768a';
  ctx.font='400 22px Arial, sans-serif';
  wrap(ctx,subtitle,1068).forEach(line=>{ctx.fillText(line,86,page.y);page.y+=31});
  page.y+=24;
}
function drawMeta(page,items){
  const{ctx}=page;
  const width=520;
  const gap=28;
  items.forEach((item,index)=>{
    const x=86+(index%2)*(width+gap);
    const y=page.y+Math.floor(index/2)*92;
    ctx.fillStyle='#f7f9fb';
    ctx.fillRect(x,y,width,72);
    ctx.fillStyle='#77899a';
    ctx.font='700 16px Arial, sans-serif';
    ctx.fillText(String(item[0]).toUpperCase(),x+18,y+24);
    ctx.fillStyle='#173957';
    ctx.font='700 21px Arial, sans-serif';
    const value=String(item[1]||'—');
    ctx.fillText(value.length>42?value.slice(0,39)+'…':value,x+18,y+52);
  });
  page.y+=Math.ceil(items.length/2)*92+18;
}
function drawSectionHeading(page,text){
  const{ctx}=page;
  ctx.fillStyle='#ff5a1f';
  ctx.font='800 19px Arial, sans-serif';
  ctx.fillText(String(text).toUpperCase(),86,page.y);
  page.y+=28;
}
function drawRow(page,label,value){
  const{ctx}=page;
  const valueLines=wrap(ctx,value,715);
  const height=Math.max(72,34+valueLines.length*26);
  ctx.fillStyle='#fbfcfd';
  ctx.strokeStyle='#e3e8ed';
  ctx.lineWidth=2;
  ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(86,page.y,1068,height,12);
  else ctx.rect(86,page.y,1068,height);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle='#526b82';
  ctx.font='700 18px Arial, sans-serif';
  const labelLines=wrap(ctx,label,260).slice(0,2);
  labelLines.forEach((line,index)=>ctx.fillText(line,108,page.y+29+index*24));

  ctx.fillStyle='#173957';
  ctx.font='500 20px Arial, sans-serif';
  valueLines.forEach((line,index)=>ctx.fillText(line,400,page.y+29+index*26));
  page.y+=height+12;
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
}={}){
  const logo=await loadLogo();
  const pages=[];
  let page=createPage(logo,1);
  pages.push(page);

  drawTitle(page,'Quote Request Summary','A structured record of the requirement you submitted through ProPulse.');
  drawMeta(page,[
    ['Request ID',leadId?'#'+leadId:'Submitted'],
    ['Submitted',new Date().toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})],
    ['Service',flowName],
    ['Location',[city,pincode].filter(Boolean).join(' · ')||'—'],
    ['Customer',customerName||'—'],
    ['Mobile',phone?'+91 '+String(phone).replace(/\D/g,'').slice(-10):'—'],
  ]);
  if(email)drawMeta(page,[['Email',email]]);

  drawSectionHeading(page,'Submitted requirement');
  for(const row of rows.filter(item=>item&&item[1]!==undefined&&item[1]!==null&&String(item[1]).trim()&&String(item[1]).trim()!=='—')){
    if(page.y>1510){
      page=createPage(logo,pages.length+1);
      pages.push(page);
      drawSectionHeading(page,'Submitted requirement continued');
    }
    drawRow(page,row[0],row[1]);
  }

  if(page.y>1450){
    page=createPage(logo,pages.length+1);
    pages.push(page);
  }
  page.y+=18;
  page.ctx.fillStyle='#fff7f2';
  page.ctx.fillRect(86,page.y,1068,116);
  page.ctx.fillStyle='#b24a1f';
  page.ctx.font='800 18px Arial, sans-serif';
  page.ctx.fillText('IMPORTANT',108,page.y+31);
  page.ctx.fillStyle='#5e6f7f';
  page.ctx.font='500 18px Arial, sans-serif';
  const note='This is a quote request / requirement summary, not a final commercial quotation or contract. Final scope, measurements, materials, price, taxes and timeline must be confirmed by the business you choose.';
  wrap(page.ctx,note,1000).forEach((line,index)=>page.ctx.fillText(line,108,page.y+60+index*25));

  const images=pages.map(item=>dataUrlBytes(item.canvas.toDataURL('image/jpeg',0.9)));
  const pdf=buildPdf(images);
  const blob=new Blob([pdf],{type:'application/pdf'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  const safe=String(flowKey||'requirement').replace(/[^a-z0-9_-]+/gi,'-').toLowerCase();
  anchor.href=url;
  anchor.download='propulse-'+safe+'-quote-request-'+(leadId||Date.now())+'.pdf';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
