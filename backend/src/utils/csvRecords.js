// Low-level CSV record parser shared by lead-partner import entry points.
// Header aliases and column mapping stay in their respective import services.
function parseCsvRecords(text){
  const source=String(text??'');
  const rows=[];
  let row=[];
  let cell='';
  let quoted=false;
  const clean=value=>String(value??'').trim();
  for(let i=0;i<source.length;i+=1){
    const c=source[i];
    if(c==='"'){
      if(quoted&&source[i+1]==='"'){cell+='"';i+=1;}
      else quoted=!quoted;
    }else if(c===','&&!quoted){
      row.push(cell);cell='';
    }else if((c==='\n'||c==='\r')&&!quoted){
      if(c==='\r'&&source[i+1]==='\n')i+=1;
      row.push(cell);
      if(row.some(v=>clean(v)))rows.push(row);
      row=[];cell='';
    }else cell+=c;
  }
  row.push(cell);
  if(row.some(v=>clean(v)))rows.push(row);
  return rows;
}
module.exports={parseCsvRecords};
