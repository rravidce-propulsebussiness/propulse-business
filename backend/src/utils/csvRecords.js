// Shared CSV record parser for Admin, Lead Partner and Google Sheet preview flows.
// Each importer retains its own header aliases and column-mapping policy.
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
