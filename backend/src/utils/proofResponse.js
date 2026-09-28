const path=require('path');

async function sendProofDescriptor(res,descriptor){
  if(!descriptor)return res.status(404).json({error:'Proof not found'});
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  if(descriptor.externalUrl){
    return res.redirect(302,descriptor.externalUrl);
  }
  if(descriptor.mime)res.type(descriptor.mime);
  res.setHeader('Content-Disposition','inline');
  if(Number.isFinite(Number(descriptor.size)))res.setHeader('Content-Length',String(descriptor.size));
  if(descriptor.filePath){
    const filePath=path.resolve(descriptor.filePath);
    return res.sendFile(filePath);
  }
  if(Buffer.isBuffer(descriptor.buffer))return res.send(descriptor.buffer);
  return res.status(404).json({error:'Proof not found'});
}

module.exports={sendProofDescriptor};
